import { BaseProvider, RequestData, ProviderMatch } from './base-provider';
/**
 * Validation test case
 */
export interface ValidationTestCase {
    /** Test case name */
    name: string;
    /** Description of what this test validates */
    description: string;
    /** Mock request data */
    request: RequestData;
    /** Expected results */
    expected: {
        /** Should the provider handle this request? */
        shouldHandle: boolean;
        /** Minimum expected confidence */
        minConfidence?: number;
        /** Maximum expected confidence */
        maxConfidence?: number;
        /** Expected event type */
        eventType?: string;
        /** Expected parameters */
        parameters?: Record<string, any>;
    };
}
/**
 * Validation result for a single test case
 */
export interface ValidationResult {
    /** Test case that was run */
    testCase: ValidationTestCase;
    /** Whether the test passed */
    passed: boolean;
    /** Error messages (if any) */
    errors: string[];
    /** Warnings (if any) */
    warnings: string[];
    /** Actual provider match result */
    actualResult: ProviderMatch | null;
    /** Test execution time */
    executionTime: number;
}
/**
 * Complete validation report for a provider
 */
export interface ValidationReport {
    /** Provider that was validated */
    provider: BaseProvider;
    /** Validation timestamp */
    timestamp: number;
    /** Total tests run */
    totalTests: number;
    /** Tests that passed */
    passedTests: number;
    /** Tests that failed */
    failedTests: number;
    /** Pass rate (0.0 to 1.0) */
    passRate: number;
    /** Individual test results */
    testResults: ValidationResult[];
    /** Overall validation errors */
    overallErrors: string[];
    /** Overall warnings */
    overallWarnings: string[];
    /** Total validation time */
    totalTime: number;
}
/**
 * Provider validator that tests provider implementations
 * against various scenarios and edge cases
 */
export declare class ProviderValidator {
    /**
     * Validate a provider against a set of test cases
     */
    validate(provider: BaseProvider, testCases: ValidationTestCase[]): Promise<ValidationReport>;
    /**
     * Run a single test case
     */
    private runTestCase;
    /**
     * Validate provider configuration
     */
    private validateConfig;
    /**
     * Generate standard test cases for common tracking scenarios
     */
    static generateStandardTestCases(providerId: string): ValidationTestCase[];
    /**
     * Get base URL for known providers
     */
    private static getProviderBaseUrl;
    /**
     * Create mock request data for testing
     */
    static createMockRequest(url: string, method?: string, body?: string): RequestData;
    /**
     * Format validation report as human-readable text
     */
    static formatReport(report: ValidationReport): string;
}
