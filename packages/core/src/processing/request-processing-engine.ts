/**
 * Request Processing Engine
 * 
 * Manages Web Workers for high-performance request analysis.
 * Features batching, deduplication, filtering, and monitoring.
 */

import type { RequestData, AnalysisResult } from '@pixeltracer/providers'
import type { WorkerMessage, WorkerResponse } from '../workers/request-processor.worker'

export interface ProcessingOptions {
  /** Maximum number of concurrent workers */
  maxWorkers?: number
  /** Batch size for processing multiple requests */
  batchSize?: number
  /** Enable request deduplication */
  enableDeduplication?: boolean
  /** Request timeout in milliseconds */
  timeoutMs?: number
  /** Enable performance monitoring */
  enableMonitoring?: boolean
}

export interface ProcessingStats {
  totalRequests: number
  processedRequests: number
  failedRequests: number
  duplicateRequests: number
  averageProcessingTime: number
  activeWorkers: number
  queueSize: number
  uptime: number
}

interface PendingRequest {
  id: string
  requestData: RequestData
  resolve: (result: AnalysisResult) => void
  reject: (error: Error) => void
  timestamp: number
  timeout?: NodeJS.Timeout
}

interface WorkerInfo {
  worker: Worker
  busy: boolean
  requestCount: number
  errorCount: number
  lastUsed: number
}

export class RequestProcessingEngine {
  private workers: WorkerInfo[] = []
  private pendingRequests = new Map<string, PendingRequest>()
  private requestQueue: RequestData[] = []
  private duplicateCache = new Map<string, AnalysisResult>()
  private processingStats: ProcessingStats
  private options: Required<ProcessingOptions>
  private startTime = Date.now()
  private messageIdCounter = 0
  private isInitialized = false

  constructor(options: ProcessingOptions = {}) {
    this.options = {
      maxWorkers: options.maxWorkers ?? 2,
      batchSize: options.batchSize ?? 10,
      enableDeduplication: options.enableDeduplication ?? true,
      timeoutMs: options.timeoutMs ?? 5000,
      enableMonitoring: options.enableMonitoring ?? true
    }

    this.processingStats = {
      totalRequests: 0,
      processedRequests: 0,
      failedRequests: 0,
      duplicateRequests: 0,
      averageProcessingTime: 0,
      activeWorkers: 0,
      queueSize: 0,
      uptime: 0
    }
  }

  /**
   * Initialize the processing engine and workers
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Create workers
      for (let i = 0; i < this.options.maxWorkers; i++) {
        await this.createWorker()
      }

      // Initialize all workers
      await Promise.all(
        this.workers.map(workerInfo => 
          this.sendToWorker(workerInfo, 'INITIALIZE', {})
        )
      )

      this.isInitialized = true

      // Start monitoring if enabled
      if (this.options.enableMonitoring) {
        this.startMonitoring()
      }

    } catch (error) {
      throw error
    }
  }

  /**
   * Process a single request
   */
  async processRequest(requestData: RequestData): Promise<AnalysisResult> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    this.processingStats.totalRequests++

    // Check for duplicates
    if (this.options.enableDeduplication) {
      const cacheKey = this.generateCacheKey(requestData)
      const cached = this.duplicateCache.get(cacheKey)
      if (cached) {
        this.processingStats.duplicateRequests++
        return cached
      }
    }

    // Find available worker
    const availableWorker = this.workers.find(w => !w.busy)
    if (!availableWorker) {
      // All workers busy, queue the request
      return new Promise((_resolve, reject) => {
        this.requestQueue.push(requestData)
        this.processingStats.queueSize++
        // Implementation would handle queued requests when workers become available
        setTimeout(() => reject(new Error('Request timeout in queue')), this.options.timeoutMs)
      })
    }

    // Process immediately
    return this.processWithWorker(availableWorker, requestData)
  }

  /**
   * Process multiple requests as a batch
   */
  async processBatch(requests: RequestData[]): Promise<AnalysisResult[]> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    const results: AnalysisResult[] = []
    const batchSize = this.options.batchSize

    // Split into batches and process
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize)
      const availableWorker = this.workers.find(w => !w.busy)
      
      if (availableWorker) {
        const batchResults = await this.sendToWorker(availableWorker, 'BATCH_ANALYZE', batch)
        results.push(...batchResults)
      } else {
        // Fall back to sequential processing if no workers available
        const sequentialResults = await Promise.all(
          batch.map(request => this.processRequest(request))
        )
        results.push(...sequentialResults)
      }
    }

    return results
  }

  /**
   * Get processing statistics
   */
  getStats(): ProcessingStats {
    return {
      ...this.processingStats,
      activeWorkers: this.workers.filter(w => w.busy).length,
      queueSize: this.requestQueue.length,
      uptime: Date.now() - this.startTime
    }
  }

  /**
   * Clear caches and reset statistics
   */
  clearCaches(): void {
    this.duplicateCache.clear()
    this.processingStats = {
      totalRequests: 0,
      processedRequests: 0,
      failedRequests: 0,
      duplicateRequests: 0,
      averageProcessingTime: 0,
      activeWorkers: 0,
      queueSize: 0,
      uptime: Date.now() - this.startTime
    }
  }

  /**
   * Shutdown the processing engine
   */
  async shutdown(): Promise<void> {
    // Cancel all pending requests
    for (const [, pendingRequest] of this.pendingRequests) {
      if (pendingRequest.timeout) {
        clearTimeout(pendingRequest.timeout)
      }
      pendingRequest.reject(new Error('Processing engine shutting down'))
    }

    // Terminate all workers
    for (const workerInfo of this.workers) {
      workerInfo.worker.terminate()
    }

    this.workers = []
    this.pendingRequests.clear()
    this.isInitialized = false
  }

  /**
   * Create a new worker
   */
  private async createWorker(): Promise<WorkerInfo> {
    const worker = new Worker(
      new URL('../workers/request-processor.worker.ts', import.meta.url),
      { type: 'module' }
    )

    const workerInfo: WorkerInfo = {
      worker,
      busy: false,
      requestCount: 0,
      errorCount: 0,
      lastUsed: Date.now()
    }

    // Set up message handler
    worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
      this.handleWorkerMessage(workerInfo, event.data)
    })

    // Set up error handler
    worker.addEventListener('error', (event) => {
      workerInfo.errorCount++
      this.handleWorkerError(workerInfo, event)
    })

    this.workers.push(workerInfo)
    return workerInfo
  }

  /**
   * Send a message to a specific worker
   */
  private async sendToWorker(workerInfo: WorkerInfo, type: WorkerMessage['type'], payload: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = `msg_${++this.messageIdCounter}`
      const message: WorkerMessage = { id, type, payload }

      // Set up timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id)
        workerInfo.busy = false
        reject(new Error('Worker request timeout'))
      }, this.options.timeoutMs)

      // Store pending request
      this.pendingRequests.set(id, {
        id,
        requestData: payload,
        resolve,
        reject,
        timestamp: Date.now(),
        timeout
      })

      workerInfo.busy = true
      workerInfo.worker.postMessage(message)
    })
  }

  /**
   * Handle worker response messages
   */
  private handleWorkerMessage(workerInfo: WorkerInfo, response: WorkerResponse): void {
    const pendingRequest = this.pendingRequests.get(response.id)
    if (!pendingRequest) return

    // Clear timeout
    if (pendingRequest.timeout) {
      clearTimeout(pendingRequest.timeout)
    }

    // Update worker state
    workerInfo.busy = false
    workerInfo.lastUsed = Date.now()
    workerInfo.requestCount++

    // Process response
    switch (response.type) {
      case 'ANALYSIS_RESULT':
      case 'BATCH_RESULT':
      case 'INITIALIZED':
        const result = response.payload
        
        // Cache result if deduplication is enabled
        if (this.options.enableDeduplication && response.type === 'ANALYSIS_RESULT') {
          const cacheKey = this.generateCacheKey(pendingRequest.requestData)
          this.duplicateCache.set(cacheKey, result)
          
          // Limit cache size
          if (this.duplicateCache.size > 1000) {
            const firstKey = this.duplicateCache.keys().next().value
            if (firstKey !== undefined) {
              this.duplicateCache.delete(firstKey)
            }
          }
        }

        // Update stats
        this.processingStats.processedRequests++
        const processingTime = Date.now() - pendingRequest.timestamp
        this.updateAverageProcessingTime(processingTime)

        pendingRequest.resolve(result)
        break

      case 'ERROR':
        this.processingStats.failedRequests++
        workerInfo.errorCount++
        pendingRequest.reject(new Error(response.payload.message))
        break
    }

    this.pendingRequests.delete(response.id)
    this.processQueuedRequests()
  }

  /**
   * Handle worker errors
   */
  private handleWorkerError(workerInfo: WorkerInfo, _event: ErrorEvent): void {
    // Mark worker as not busy and reject any pending requests for this worker
    workerInfo.busy = false
    
    // If worker has too many errors, replace it
    if (workerInfo.errorCount > 5) {
      this.replaceWorker(workerInfo)
    }
  }

  /**
   * Replace a problematic worker
   */
  private async replaceWorker(oldWorkerInfo: WorkerInfo): Promise<void> {
    const index = this.workers.indexOf(oldWorkerInfo)
    if (index === -1) return

    // Terminate old worker
    oldWorkerInfo.worker.terminate()

    try {
      // Create new worker
      const newWorkerInfo = await this.createWorker()
      await this.sendToWorker(newWorkerInfo, 'INITIALIZE', {})
      
      // Replace in array
      this.workers[index] = newWorkerInfo
      
    } catch (error) {
      // Remove the faulty worker without replacement
      this.workers.splice(index, 1)
    }
  }

  /**
   * Process queued requests when workers become available
   */
  private processQueuedRequests(): void {
    if (this.requestQueue.length === 0) return

    const availableWorker = this.workers.find(w => !w.busy)
    if (availableWorker) {
      const queuedRequest = this.requestQueue.shift()
      if (queuedRequest) {
        this.processingStats.queueSize--
        this.processWithWorker(availableWorker, queuedRequest)
      }
    }
  }

  /**
   * Process request with specific worker
   */
  private async processWithWorker(workerInfo: WorkerInfo, requestData: RequestData): Promise<AnalysisResult> {
    return this.sendToWorker(workerInfo, 'ANALYZE_REQUEST', requestData)
  }

  /**
   * Generate cache key for deduplication
   */
  private generateCacheKey(requestData: RequestData): string {
    // Create a hash-like key from URL, method, and key parameters
    const keyParts = [
      requestData.url,
      requestData.method,
      JSON.stringify(requestData.query)
    ]
    return keyParts.join('|')
  }

  /**
   * Update rolling average processing time
   */
  private updateAverageProcessingTime(newTime: number): void {
    const currentAvg = this.processingStats.averageProcessingTime
    const totalProcessed = this.processingStats.processedRequests
    
    this.processingStats.averageProcessingTime = 
      (currentAvg * (totalProcessed - 1) + newTime) / totalProcessed
  }

  /**
   * Start performance monitoring
   */
  private startMonitoring(): void {
    setInterval(() => {
      this.getStats()
    }, 30000) // Monitor every 30 seconds
  }
}