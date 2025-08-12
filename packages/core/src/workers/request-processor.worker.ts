/**
 * Web Worker for Request Processing
 * 
 * Offloads intensive request analysis to prevent blocking the main thread.
 * Handles provider matching, parameter parsing, and confidence scoring.
 */

import { initializeDefaultProviders, analyzeRequest } from '@pixeltracer/providers'
import type { RequestData, AnalysisResult } from '@pixeltracer/providers'

// Worker message types
interface WorkerMessage {
  id: string
  type: 'ANALYZE_REQUEST' | 'INITIALIZE' | 'BATCH_ANALYZE'
  payload: any
}

interface WorkerResponse {
  id: string
  type: 'ANALYSIS_RESULT' | 'INITIALIZED' | 'BATCH_RESULT' | 'ERROR'
  payload: any
}

// Worker state
let initialized = false
let initializationPromise: Promise<void> | null = null

// Initialize providers when worker starts
async function initialize(): Promise<void> {
  if (initialized) return
  if (initializationPromise) return initializationPromise
  
  initializationPromise = (async () => {
    try {
      await initializeDefaultProviders()
      initialized = true
    } catch (error) {
      throw error
    }
  })()
  
  return initializationPromise
}

// Process single request analysis
async function processRequest(requestData: RequestData): Promise<AnalysisResult> {
  if (!initialized) {
    throw new Error('Worker not initialized')
  }
  
  const startTime = performance.now()
  const result = await analyzeRequest(requestData)
  const processingTime = performance.now() - startTime
  
  // Add processing time to analysis time field
  return {
    ...result,
    analysisTime: processingTime
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

// Export types for main thread
export type { WorkerMessage, WorkerResponse }