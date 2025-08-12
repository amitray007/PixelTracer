import { BaseProvider, ProviderMatch, RequestData } from '../base/base-provider';
/**
 * Provider registration information
 */
export interface ProviderRegistration {
    /** Provider instance */
    provider: BaseProvider;
    /** Registration metadata */
    metadata: {
        /** When the provider was registered */
        registeredAt: number;
        /** Provider loading time in milliseconds */
        loadTime: number;
        /** Whether provider is enabled */
        enabled: boolean;
        /** Provider priority (higher = checked first) */
        priority: number;
    };
}
/**
 * Provider registry statistics
 */
export interface RegistryStats {
    /** Total number of registered providers */
    totalProviders: number;
    /** Number of enabled providers */
    enabledProviders: number;
    /** Provider breakdown by category */
    byCategory: Record<string, number>;
    /** Average provider loading time */
    avgLoadTime: number;
    /** Registry uptime in milliseconds */
    uptime: number;
}
/**
 * Provider analysis result with multiple matches
 */
export interface AnalysisResult {
    /** All provider matches sorted by confidence */
    matches: ProviderMatch[];
    /** Best match (highest confidence) */
    bestMatch: ProviderMatch | null;
    /** Total analysis time in milliseconds */
    analysisTime: number;
    /** Number of providers analyzed */
    providersAnalyzed: number;
}
/**
 * Provider registry that manages all tracking providers
 * Handles dynamic loading, priority management, and request analysis
 */
export declare class ProviderRegistry {
    private providers;
    private startTime;
    private analysisCache;
    private cacheMaxSize;
    private cacheMaxAge;
    /**
     * Register a provider with the registry
     */
    register(provider: BaseProvider, options?: {
        enabled?: boolean;
        priority?: number;
    }): Promise<void>;
    /**
     * Unregister a provider
     */
    unregister(providerId: string): boolean;
    /**
     * Get a specific provider by ID
     */
    getProvider(providerId: string): BaseProvider | null;
    /**
     * Get all registered providers
     */
    getAllProviders(): BaseProvider[];
    /**
     * Get providers by category
     */
    getProvidersByCategory(category: string): BaseProvider[];
    /**
     * Enable/disable a provider
     */
    setProviderEnabled(providerId: string, enabled: boolean): boolean;
    /**
     * Set provider priority
     */
    setProviderPriority(providerId: string, priority: number): boolean;
    /**
     * Analyze a request against all registered providers
     */
    analyze(request: RequestData, options?: {
        maxMatches?: number;
        minConfidence?: number;
        useCache?: boolean;
    }): Promise<AnalysisResult>;
    /**
     * Get registry statistics
     */
    getStats(): RegistryStats;
    /**
     * Clear the analysis cache
     */
    clearCache(): void;
    /**
     * Validate provider configuration
     */
    private validateProviderConfig;
    /**
     * Generate cache key for a request
     */
    private getCacheKey;
    /**
     * Cache analysis result
     */
    private cacheAnalysisResult;
    /**
     * Clear cache entries for a specific provider
     */
    private clearCacheForProvider;
}
export declare const providerRegistry: ProviderRegistry;
