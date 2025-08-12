import { BaseProvider, RequestData } from '../base/base-provider';
import { TrackingEvent } from '@pixeltracer/shared';
/**
 * TikTok Pixel provider
 * Detects and parses TikTok advertising pixel events
 *
 * Supports:
 * - TikTok Pixel standard events (PageView, Purchase, etc.)
 * - Custom events
 * - TikTok Events API (server-side)
 * - Enhanced matching
 * - TikTok for Business campaigns
 */
export declare class TikTokPixelProvider extends BaseProvider {
    constructor();
    /**
     * TikTok-specific confidence calculation
     */
    protected calculateCustomConfidence(request: RequestData): Promise<number>;
    /**
     * Parse TikTok parameters
     */
    protected parseParameters(request: RequestData): Promise<Record<string, any>>;
    /**
     * Extract TikTok event type
     */
    protected extractEventType(request: RequestData, parameters: Record<string, any>): Promise<string | null>;
    /**
     * Enrich TikTok event with additional context
     */
    protected enrichEvent(event: TrackingEvent, request: RequestData): Promise<void>;
    /**
     * Parse POST request body
     */
    private parsePostBody;
    /**
     * Apply parameter aliases
     */
    private applyParameterAliases;
    /**
     * Categorize TikTok events
     */
    private categorizeEvent;
}
