import { BaseProvider, ProviderConfig } from './base-provider'
import { RequestData, ProviderMatch } from '@pixeltracer/shared'

/**
 * Validation test case
 */
export interface ValidationTestCase {
  /** Test case name */
  name: string
  /** Description of what this test validates */
  description: string
  /** Mock request data */
  request: RequestData
  /** Expected results */
  expected: {
    /** Should the provider handle this request? */
    shouldHandle: boolean
    /** Minimum expected confidence */
    minConfidence?: number
    /** Maximum expected confidence */
    maxConfidence?: number
    /** Expected event type */
    eventType?: string
    /** Expected parameters */
    parameters?: Record<string, any>
  }
}

/**
 * Validation result for a single test case
 */
export interface ValidationResult {
  /** Test case that was run */
  testCase: ValidationTestCase
  /** Whether the test passed */
  passed: boolean
  /** Error messages (if any) */
  errors: string[]
  /** Warnings (if any) */
  warnings: string[]
  /** Actual provider match result */
  actualResult: ProviderMatch | null
  /** Test execution time */
  executionTime: number
}

/**
 * Complete validation report for a provider
 */
export interface ValidationReport {
  /** Provider that was validated */
  provider: BaseProvider
  /** Validation timestamp */
  timestamp: number
  /** Total tests run */
  totalTests: number
  /** Tests that passed */
  passedTests: number
  /** Tests that failed */
  failedTests: number
  /** Pass rate (0.0 to 1.0) */
  passRate: number
  /** Individual test results */
  testResults: ValidationResult[]
  /** Overall validation errors */
  overallErrors: string[]
  /** Overall warnings */
  overallWarnings: string[]
  /** Total validation time */
  totalTime: number
}

/**
 * Provider validator that tests provider implementations
 * against various scenarios and edge cases
 */
export class ProviderValidator {
  /**
   * Validate a provider against a set of test cases
   */
  async validate(provider: BaseProvider, testCases: ValidationTestCase[]): Promise<ValidationReport> {
    const startTime = performance.now()
    const testResults: ValidationResult[] = []
    const overallErrors: string[] = []
    const overallWarnings: string[] = []

    // Validate provider configuration first
    const configErrors = this.validateConfig(provider.getConfig())
    overallErrors.push(...configErrors)

    // Run all test cases
    for (const testCase of testCases) {
      const result = await this.runTestCase(provider, testCase)
      testResults.push(result)
    }

    const passedTests = testResults.filter(r => r.passed).length
    const failedTests = testResults.length - passedTests

    return {
      provider,
      timestamp: Date.now(),
      totalTests: testResults.length,
      passedTests,
      failedTests,
      passRate: testResults.length > 0 ? passedTests / testResults.length : 0,
      testResults,
      overallErrors,
      overallWarnings,
      totalTime: performance.now() - startTime
    }
  }

  /**
   * Run a single test case
   */
  private async runTestCase(provider: BaseProvider, testCase: ValidationTestCase): Promise<ValidationResult> {
    const startTime = performance.now()
    const errors: string[] = []
    const warnings: string[] = []
    let actualResult: ProviderMatch | null = null

    try {
      // Check if provider can handle the request
      const confidence = await provider.canHandle(testCase.request)
      
      if (testCase.expected.shouldHandle && confidence === 0) {
        errors.push('Provider should handle this request but returned 0 confidence')
      } else if (!testCase.expected.shouldHandle && confidence > 0) {
        errors.push('Provider should not handle this request but returned > 0 confidence')
      }

      // Check confidence bounds
      if (testCase.expected.minConfidence !== undefined && confidence < testCase.expected.minConfidence) {
        errors.push(`Confidence ${confidence} below minimum ${testCase.expected.minConfidence}`)
      }
      if (testCase.expected.maxConfidence !== undefined && confidence > testCase.expected.maxConfidence) {
        errors.push(`Confidence ${confidence} above maximum ${testCase.expected.maxConfidence}`)
      }

      // If provider should handle request, test parsing
      if (testCase.expected.shouldHandle && confidence > 0) {
        try {
          actualResult = await provider.parse(testCase.request)
          
          // Validate event type
          if (testCase.expected.eventType && actualResult.event.eventType !== testCase.expected.eventType) {
            errors.push(`Expected event type '${testCase.expected.eventType}', got '${actualResult.event.eventType}'`)
          }

          // Validate parameters
          if (testCase.expected.parameters) {
            for (const [key, expectedValue] of Object.entries(testCase.expected.parameters)) {
              const actualValue = actualResult.event.parameters[key]
              if (actualValue === undefined) {
                errors.push(`Missing expected parameter: ${key}`)
              } else if (expectedValue !== null && actualValue !== expectedValue) {
                warnings.push(`Parameter ${key}: expected ${expectedValue}, got ${actualValue}`)
              }
            }
          }

          // Validate confidence consistency
          if (Math.abs(actualResult.confidence - confidence) > 0.01) {
            warnings.push(`Confidence mismatch between canHandle (${confidence}) and parse (${actualResult.confidence})`)
          }

        } catch (parseError) {
          errors.push(`Parse error: ${parseError instanceof Error ? parseError.message : String(parseError)}`)
        }
      }

    } catch (error) {
      errors.push(`Test execution error: ${error instanceof Error ? error.message : String(error)}`)
    }

    return {
      testCase,
      passed: errors.length === 0,
      errors,
      warnings,
      actualResult,
      executionTime: performance.now() - startTime
    }
  }

  /**
   * Validate provider configuration
   */
  private validateConfig(config: ProviderConfig): string[] {
    const errors: string[] = []

    // Required fields
    if (!config.id) errors.push('Provider ID is required')
    if (!config.name) errors.push('Provider name is required')
    if (!config.version) errors.push('Provider version is required')

    // ID format validation
    if (config.id && !/^[a-z0-9-]+$/.test(config.id)) {
      errors.push('Provider ID must be lowercase alphanumeric with hyphens only')
    }

    // Version format validation
    if (config.version && !/^\d+\.\d+\.\d+/.test(config.version)) {
      errors.push('Provider version must follow semantic versioning (e.g., 1.0.0)')
    }

    // Pattern validation
    if (!config.patterns || !config.patterns.urlPatterns || config.patterns.urlPatterns.length === 0) {
      errors.push('Provider must define at least one URL pattern')
    }

    // Category validation
    const validCategories = ['advertising', 'analytics', 'social', 'marketing', 'other']
    if (config.category && !validCategories.includes(config.category)) {
      errors.push(`Invalid category '${config.category}'. Must be one of: ${validCategories.join(', ')}`)
    }

    return errors
  }

  /**
   * Generate standard test cases for common tracking scenarios
   */
  static generateStandardTestCases(providerId: string): ValidationTestCase[] {
    const baseUrl = this.getProviderBaseUrl(providerId)
    
    return [
      // Basic tracking request
      {
        name: 'basic-tracking',
        description: 'Basic tracking request should be handled',
        request: this.createMockRequest(`${baseUrl}/track?param=value`),
        expected: {
          shouldHandle: true,
          minConfidence: 0.5
        }
      },

      // Invalid URL should not be handled
      {
        name: 'invalid-url',
        description: 'Unrelated URL should not be handled',
        request: this.createMockRequest('https://example.com/page'),
        expected: {
          shouldHandle: false,
          maxConfidence: 0.1
        }
      },

      // Empty parameters
      {
        name: 'no-parameters',
        description: 'Request without parameters',
        request: this.createMockRequest(`${baseUrl}/track`),
        expected: {
          shouldHandle: true,
          minConfidence: 0.3
        }
      },

      // POST request
      {
        name: 'post-request',
        description: 'POST request with body data',
        request: this.createMockRequest(`${baseUrl}/track`, 'POST', 'param=value&data=test'),
        expected: {
          shouldHandle: true,
          minConfidence: 0.5
        }
      },

      // Large parameter set
      {
        name: 'complex-parameters',
        description: 'Request with many parameters',
        request: this.createMockRequest(`${baseUrl}/track?p1=v1&p2=v2&p3=v3&data=${encodeURIComponent('{"complex": "json"}')}`),
        expected: {
          shouldHandle: true,
          minConfidence: 0.6
        }
      }
    ]
  }

  /**
   * Get base URL for known providers
   */
  private static getProviderBaseUrl(providerId: string): string {
    const providerUrls: Record<string, string> = {
      'facebook-pixel': 'https://www.facebook.com/tr',
      'google-analytics': 'https://www.google-analytics.com/collect',
      'google-ads': 'https://googleads.g.doubleclick.net/pagead/conversion',
      'tiktok-pixel': 'https://analytics.tiktok.com/api/v2/pixel/track',
      'linkedin-insight': 'https://www.linkedin.com/li/track',
      'twitter-pixel': 'https://t.co/i/adsct'
    }
    
    return providerUrls[providerId] || 'https://example.com'
  }

  /**
   * Create mock request data for testing
   */
  static createMockRequest(url: string, method: string = 'GET', body?: string): RequestData {
    const parsedUrl = new URL(url)
    const query: Record<string, string> = {}
    
    parsedUrl.searchParams.forEach((value, key) => {
      query[key] = value
    })

    return {
      url,
      method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Test Browser)',
        'Content-Type': method === 'POST' ? 'application/x-www-form-urlencoded' : 'text/html'
      },
      body,
      query,
      parsedUrl: {
        protocol: parsedUrl.protocol,
        hostname: parsedUrl.hostname,
        pathname: parsedUrl.pathname,
        search: parsedUrl.search,
        hash: parsedUrl.hash
      },
      timestamp: Date.now(),
      type: 'xhr'
    }
  }

  /**
   * Format validation report as human-readable text
   */
  static formatReport(report: ValidationReport): string {
    const lines: string[] = []
    
    lines.push(`🔍 Validation Report for ${report.provider.getName()}`)
    lines.push(`📅 ${new Date(report.timestamp).toISOString()}`)
    lines.push(`⏱️  Total Time: ${Math.round(report.totalTime)}ms`)
    lines.push('')
    
    lines.push(`📊 Results: ${report.passedTests}/${report.totalTests} passed (${Math.round(report.passRate * 100)}%)`)
    
    if (report.overallErrors.length > 0) {
      lines.push('')
      lines.push('❌ Configuration Errors:')
      report.overallErrors.forEach(error => lines.push(`   • ${error}`))
    }
    
    if (report.overallWarnings.length > 0) {
      lines.push('')
      lines.push('⚠️  Configuration Warnings:')
      report.overallWarnings.forEach(warning => lines.push(`   • ${warning}`))
    }
    
    // Failed tests
    const failedTests = report.testResults.filter(r => !r.passed)
    if (failedTests.length > 0) {
      lines.push('')
      lines.push(`❌ Failed Tests (${failedTests.length}):`)
      failedTests.forEach(test => {
        lines.push(`   ${test.testCase.name}: ${test.testCase.description}`)
        test.errors.forEach(error => lines.push(`      • ${error}`))
      })
    }
    
    // Warnings
    const testsWithWarnings = report.testResults.filter(r => r.warnings.length > 0)
    if (testsWithWarnings.length > 0) {
      lines.push('')
      lines.push(`⚠️  Tests with Warnings (${testsWithWarnings.length}):`)
      testsWithWarnings.forEach(test => {
        lines.push(`   ${test.testCase.name}:`)
        test.warnings.forEach(warning => lines.push(`      • ${warning}`))
      })
    }
    
    return lines.join('\n')
  }
}