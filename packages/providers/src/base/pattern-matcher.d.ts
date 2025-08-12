/**
 * Advanced pattern matching utilities for URL and request analysis
 * Supports wildcards, regex, domain matching, and complex patterns
 */
export interface MatchOptions {
    /** Case sensitivity */
    caseSensitive?: boolean;
    /** Enable wildcard matching (* and ?) */
    wildcards?: boolean;
    /** Enable domain-specific matching */
    domainMode?: boolean;
    /** Enable path-specific matching */
    pathMode?: boolean;
}
export interface MatchResult {
    /** Whether the pattern matched */
    matched: boolean;
    /** Confidence score (0.0 to 1.0) */
    confidence: number;
    /** Which part of the pattern matched */
    matchedSegment?: string;
    /** Extracted groups from regex patterns */
    groups?: Record<string, string>;
    /** Match metadata */
    metadata: {
        /** Pattern that matched */
        pattern: string | RegExp;
        /** Match type used */
        matchType: 'exact' | 'wildcard' | 'regex' | 'domain' | 'path';
        /** Processing time in milliseconds */
        processingTime: number;
    };
}
/**
 * Advanced pattern matcher with support for multiple matching strategies
 */
export declare class PatternMatcher {
    private static instance;
    private domainCache;
    private regexCache;
    static getInstance(): PatternMatcher;
    /**
     * Match a value against a single pattern
     */
    match(value: string, pattern: string | RegExp, options?: MatchOptions): MatchResult;
    /**
     * Match a value against multiple patterns, return best match
     */
    matchBest(value: string, patterns: (string | RegExp)[], options?: MatchOptions): MatchResult | null;
    /**
     * Match a value against multiple patterns, return all matches
     */
    matchAll(value: string, patterns: (string | RegExp)[], options?: MatchOptions): MatchResult[];
    /**
     * Exact string matching
     */
    private matchExact;
    /**
     * Wildcard pattern matching (* and ? support)
     */
    private matchWildcard;
    /**
     * Regular expression matching
     */
    private matchRegex;
    /**
     * Domain-specific matching (handles subdomains, TLDs, etc.)
     */
    private matchDomain;
    /**
     * Path-specific matching
     */
    private matchPath;
    /**
     * Extract domain from URL or domain string
     */
    private extractDomain;
    /**
     * Split domain into components
     */
    private getDomainSegments;
    /**
     * Clear internal caches
     */
    clearCache(): void;
}
