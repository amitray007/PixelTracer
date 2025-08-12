import { RequestData } from './base-provider';
/**
 * Request filtering configuration
 */
export interface FilterConfig {
    /** Allowed HTTP methods */
    methods?: ('GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS')[];
    /** URL patterns to include */
    includeUrls?: (string | RegExp)[];
    /** URL patterns to exclude */
    excludeUrls?: (string | RegExp)[];
    /** Domains to include */
    includeDomains?: (string | RegExp)[];
    /** Domains to exclude */
    excludeDomains?: (string | RegExp)[];
    /** Minimum URL length */
    minUrlLength?: number;
    /** Maximum URL length */
    maxUrlLength?: number;
    /** Required query parameters */
    requiredParams?: string[];
    /** Exclude requests with these parameters */
    excludeParams?: string[];
    /** Content-Type filters */
    contentTypes?: string[];
    /** Custom filter functions */
    customFilters?: ((request: RequestData) => boolean)[];
}
/**
 * Request filtering statistics
 */
export interface FilterStats {
    /** Total requests processed */
    totalRequests: number;
    /** Requests that passed filters */
    passedRequests: number;
    /** Requests blocked by filters */
    blockedRequests: number;
    /** Pass rate (0.0 to 1.0) */
    passRate: number;
    /** Breakdown by filter type */
    blockReasons: Record<string, number>;
    /** Processing time statistics */
    avgProcessingTime: number;
    /** Last reset time */
    lastReset: number;
}
/**
 * Filter result
 */
export interface FilterResult {
    /** Whether request passed all filters */
    passed: boolean;
    /** Reasons why request was blocked (if any) */
    blockReasons: string[];
    /** Processing time in milliseconds */
    processingTime: number;
}
/**
 * High-performance request filter for tracking detection
 * Filters out irrelevant requests before expensive provider analysis
 */
export declare class RequestFilter {
    private config;
    private stats;
    private urlCache;
    private domainCache;
    constructor(config?: FilterConfig);
    /**
     * Filter a request through all configured filters
     */
    filter(request: RequestData): FilterResult;
    /**
     * Batch filter multiple requests
     */
    filterBatch(requests: RequestData[]): FilterResult[];
    /**
     * Update filter configuration
     */
    updateConfig(config: Partial<FilterConfig>): void;
    /**
     * Get current filter statistics
     */
    getStats(): FilterStats;
    /**
     * Reset filter statistics
     */
    resetStats(): void;
    /**
     * Create common filter configurations
     */
    static createTrackingFilter(): FilterConfig;
    static createPixelFilter(): FilterConfig;
    static createStrictFilter(): FilterConfig;
    /**
     * Check if a string matches any of the given patterns
     */
    private matchesPatterns;
    /**
     * Extract domain from URL with caching
     */
    private extractDomain;
    /**
     * Update processing time statistics
     */
    private updateProcessingTimeStats;
}
