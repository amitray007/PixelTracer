/**
 * Default provider initialization
 * Registers all built-in providers with the registry
 */
/**
 * Initialize all default providers
 */
export declare function initializeDefaultProviders(): Promise<void>;
/**
 * Get all registered provider instances
 */
export declare function getRegisteredProviders(): import("..").BaseProvider[];
/**
 * Get provider registry statistics
 */
export declare function getProviderStats(): import("./provider-registry").RegistryStats;
/**
 * Analyze request with all registered providers
 */
export declare function analyzeRequest(request: RequestData): Promise<import("./provider-registry").AnalysisResult>;
import { RequestData } from '../base/base-provider';
