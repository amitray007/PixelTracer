import { TrackingEvent } from '@pixeltracer/shared';
/**
 * Pattern matching configuration for URL/request detection
 */
export interface PatternConfig {
    /** URL patterns to match (can include wildcards) */
    urlPatterns: (string | RegExp)[];
    /** Domain patterns to match */
    domains?: (string | RegExp)[];
    /** Path patterns to match */
    paths?: (string | RegExp)[];
    /** Query parameter patterns */
    queryPatterns?: Record<string, string | RegExp>;
    /** Header patterns to match */
    headerPatterns?: Record<string, string | RegExp>;
    /** HTTP methods to match */
    methods?: ('GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH')[];
}
/**
 * Configuration for parameter parsing
 */
export interface ParameterConfig {
    /** Required parameters that must be present */
    required?: string[];
    /** Optional parameters */
    optional?: string[];
    /** Parameter aliases (different names for same data) */
    aliases?: Record<string, string[]>;
    /** Custom parsers for complex parameters */
    parsers?: Record<string, (value: string) => any>;
    /** Parameter validation rules */
    validators?: Record<string, (value: any) => boolean>;
}
/**
 * Provider metadata and configuration
 */
export interface ProviderConfig {
    /** Unique provider identifier */
    id: string;
    /** Human-readable provider name */
    name: string;
    /** Provider version */
    version: string;
    /** Provider description */
    description: string;
    /** Provider website/documentation URL */
    website?: string;
    /** Provider icon/logo URL */
    icon?: string;
    /** Provider category (advertising, analytics, etc.) */
    category: 'advertising' | 'analytics' | 'social' | 'marketing' | 'other';
    /** Pattern matching configuration */
    patterns: PatternConfig;
    /** Parameter parsing configuration */
    parameters: ParameterConfig;
}
/**
 * Request data structure for analysis
 */
export interface RequestData {
    /** Request URL */
    url: string;
    /** HTTP method */
    method: string;
    /** Request headers */
    headers: Record<string, string>;
    /** Request body (for POST requests) */
    body?: string;
    /** Query parameters */
    query: Record<string, string>;
    /** Parsed URL components */
    parsedUrl: {
        protocol: string;
        hostname: string;
        pathname: string;
        search: string;
        hash: string;
    };
    /** Request timestamp */
    timestamp: number;
    /** Request type (xhr, fetch, script, etc.) */
    type?: string;
}
/**
 * Provider analysis result
 */
export interface ProviderMatch {
    /** Matching provider instance */
    provider: BaseProvider;
    /** Confidence score (0.0 to 1.0) */
    confidence: number;
    /** Parsed tracking event */
    event: TrackingEvent;
    /** Raw matched data */
    rawData: Record<string, any>;
    /** Match metadata */
    metadata: {
        /** Which patterns matched */
        matchedPatterns: string[];
        /** Parsing errors (if any) */
        errors: string[];
        /** Processing time in milliseconds */
        processingTime: number;
    };
}
/**
 * Base Provider class that all tracking providers extend
 * Implements the core pattern matching and confidence scoring system
 */
export declare abstract class BaseProvider {
    protected config: ProviderConfig;
    constructor(config: ProviderConfig);
    /**
     * Get provider configuration
     */
    getConfig(): ProviderConfig;
    /**
     * Get provider ID
     */
    getId(): string;
    /**
     * Get provider name
     */
    getName(): string;
    /**
     * Get provider version
     */
    getVersion(): string;
    /**
     * Check if this provider can handle the given request
     * Returns confidence score (0.0 = no match, 1.0 = perfect match)
     */
    canHandle(request: RequestData): Promise<number>;
    /**
     * Parse the request and extract tracking event data
     */
    parse(request: RequestData): Promise<ProviderMatch>;
    /**
     * Match a value against an array of patterns
     */
    protected matchPatterns(value: string, patterns: (string | RegExp)[]): boolean;
    /**
     * Score query parameter matches
     */
    protected scoreQueryPatterns(query: Record<string, string>, patterns: Record<string, string | RegExp>): number;
    /**
     * Score required parameter presence
     */
    protected scoreRequiredParameters(request: RequestData, required: string[]): number;
    /**
     * Generate unique event ID
     */
    protected generateEventId(request: RequestData): string;
    /**
     * Simple hash function for URLs
     */
    protected simpleHash(str: string): string;
    /**
     * Provider-specific confidence calculation
     */
    protected abstract calculateCustomConfidence(request: RequestData): Promise<number>;
    /**
     * Parse parameters from the request
     */
    protected abstract parseParameters(request: RequestData): Promise<Record<string, any>>;
    /**
     * Extract event type from request/parameters
     */
    protected abstract extractEventType(request: RequestData, parameters: Record<string, any>): Promise<string | null>;
    /**
     * Enrich the tracking event with provider-specific data
     */
    protected abstract enrichEvent(event: TrackingEvent, request: RequestData): Promise<void>;
}
