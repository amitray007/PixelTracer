import { BaseProvider, RequestData } from '../base/base-provider';
import { TrackingEvent } from '@pixeltracer/shared';
/**
 * Facebook Pixel provider
 * Detects and parses Facebook Pixel events including Meta Pixel
 *
 * Supports:
 * - Standard events (PageView, Purchase, AddToCart, etc.)
 * - Custom events
 * - Conversions API events
 * - Meta Pixel (new branding)
 * - Server-side events
 * - Enhanced matching
 */
export declare class FacebookPixelProvider extends BaseProvider {
    constructor();
    /**
     * Facebook-specific confidence calculation
     */
    protected calculateCustomConfidence(request: RequestData): Promise<number>;
    /**
     * Parse Facebook Pixel parameters
     */
    protected parseParameters(request: RequestData): Promise<Record<string, any>>;
    /**
     * Extract Facebook event type
     */
    protected extractEventType(request: RequestData, parameters: Record<string, any>): Promise<string | null>;
    /**
     * Enrich Facebook Pixel event with additional context
     */
    protected enrichEvent(event: TrackingEvent, request: RequestData): Promise<void>;
    /**
     * Parse POST request body
     */
    private parsePostBody;
    /**
     * Flatten server-side API event structure
     */
    private flattenServerSideEvent;
    /**
     * Apply parameter aliases
     */
    private applyParameterAliases;
    /**
     * Categorize Facebook events
     */
    private categorizeEvent;
}
