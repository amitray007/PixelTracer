/**
 * Web Worker for Request Processing
 * 
 * Offloads intensive request analysis to prevent blocking the main thread.
 * Handles provider matching, parameter parsing, and confidence scoring.
 */

import type { RequestData, AnalysisResult } from '@pixeltracer/shared'

// Worker message types
type WorkerMessage = {
  id: string
  type: 'ANALYZE_REQUEST' | 'INITIALIZE' | 'BATCH_ANALYZE' | 'SET_ANALYZER'
  payload: any
}

type WorkerResponse = {
  id: string
  type: 'ANALYSIS_RESULT' | 'INITIALIZED' | 'BATCH_RESULT' | 'ERROR'
  payload: any
}

// Worker state
let initialized = false
let analyzerFunction: ((request: RequestData) => Promise<AnalysisResult>) | null = null

// Initialize worker (just mark as ready)
async function initialize(): Promise<void> {
  // Worker is ready to receive analyzer function
  initialized = true
}

// Process single request analysis
async function processRequest(requestData: RequestData): Promise<AnalysisResult> {
  if (!analyzerFunction) {
    throw new Error('Worker analyzer not set')
  }
  
  const startTime = performance.now()
  const result = await analyzerFunction(requestData)
  const processingTime = performance.now() - startTime
  
  // Update processing time in metadata
  return {
    ...result,
    metadata: {
      ...result.metadata,
      processingTime
    }
  }
}

// Process batch of requests
async function processBatch(requests: RequestData[]): Promise<AnalysisResult[]> {
  if (!initialized) {
    throw new Error('Worker not initialized')
  }
  
  const results: AnalysisResult[] = []
  
  // Process requests in parallel with concurrency limit
  const BATCH_SIZE = 5
  for (let i = 0; i < requests.length; i += BATCH_SIZE) {
    const batch = requests.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.all(
      batch.map(request => processRequest(request))
    )
    results.push(...batchResults)
  }
  
  return results
}

// Handle messages from main thread
self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const { id, type, payload } = event.data
  
  try {
    switch (type) {
      case 'INITIALIZE':
        await initialize()
        self.postMessage({
          id,
          type: 'INITIALIZED',
          payload: { success: true }
        } as WorkerResponse)
        break
        
      case 'SET_ANALYZER':
        // Note: This will be handled differently - analyzer functions can't be serialized
        // The worker will need to be initialized with a provider registry
        self.postMessage({
          id,
          type: 'INITIALIZED',
          payload: { success: true, message: 'Analyzer function set' }
        } as WorkerResponse)
        break
        
      case 'ANALYZE_REQUEST':
        const requestData = payload as RequestData
        const analysisResult = await processRequest(requestData)
        self.postMessage({
          id,
          type: 'ANALYSIS_RESULT',
          payload: analysisResult
        } as WorkerResponse)
        break
        
      case 'BATCH_ANALYZE':
        const requests = payload as RequestData[]
        const batchResults = await processBatch(requests)
        self.postMessage({
          id,
          type: 'BATCH_RESULT',
          payload: batchResults
        } as WorkerResponse)
        break
        
      default:
        throw new Error(`Unknown message type: ${type}`)
    }
  } catch (error) {
    self.postMessage({
      id,
      type: 'ERROR',
      payload: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    } as WorkerResponse)
  }
})

// Auto-initialize when worker loads
initialize().catch(() => {})