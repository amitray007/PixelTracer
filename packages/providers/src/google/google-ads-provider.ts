import { BaseProvider, ProviderConfig } from '../base/base-provider'
import { TrackingEvent, RequestData } from '@pixeltracer/shared'

/**
 * Google Ads provider
 * Detects and parses Google Ads conversion tracking events
 * 
 * Supports:
 * - Conversion tracking
 * - Enhanced conversions with first-party data
 * - View-through conversions
 * - Remarketing/audience lists
 * - Google Tag Manager integration
 */
export class GoogleAdsProvider extends BaseProvider {
  constructor() {
    const config: ProviderConfig = {
      id: 'google-ads',
      name: 'Google Ads',
      version: '1.0.0',
      description: 'Google Ads conversion tracking and remarketing',
      website: 'https://support.google.com/google-ads/answer/1722022',
      icon: 'https://www.google.com/adsense/static/en_US/images/google-ads-icon.svg',
      category: 'advertising',
      
      patterns: {
        urlPatterns: [
          /\/pagead\/(?:viewthrough)conversion/
        ],
        
        domains: [
          'www.googleadservices.com',
          'googleads.g.doubleclick.net',
          'www.google.com'
        ],
        
        paths: [
          '/pagead/conversion*',
          '/pagead/viewthroughconversion*',
          '/pagead/1p-conversion*',
          '/gtag/js*'
        ],
        
        queryPatterns: {
          // Conversion tracking
          'id': /^\d+$/,
          'label': /^[\w-]+$/,
          'value': /^\d*\.?\d+$/,
          'currency_code': /^[A-Z]{3}$/,
          
          // Enhanced conversions
          'em': /.+/, // Hashed email
          'phone': /.+/, // Hashed phone
          'fn': /.+/, // Hashed first name
          'ln': /.+/, // Hashed last name
          
          // General
          'fmt': /^[13]$/,
          'gtm': /.+/,
          'tid': /^(G|AW|DC|GTM)-[A-Z0-9]+$/,
          'cid': /.+/
        },
        
        methods: ['GET', 'POST']
      },
      
      parameters: {
        required: [], // No strictly required parameters
        
        optional: [
          // Core conversion parameters
          'label',
          'value',
          'currency_code',
          'transaction_id',
          'order_id',
          'en',  // Event name
          
          // Enhanced conversions (hashed PII)
          'em', // Email
          'phone', // Phone
          'fn', // First name
          'ln', // Last name
          'country', // Country
          'postal_code', // Postal code
          
          // Technical parameters
          'fmt',
          'async',
          'random',
          'gtm',
          'tid',
          'cid',
          'bg',
          
          // Audience/Remarketing
          'aud', // Audience list ID
          'data', // Custom data (often JSON)
          
          // Timing
          'tiba', // Time in between actions
          'uaa', // User agent architecture
          'uab', // User agent bitness
          'uafvl', // User agent full version list
          'uamb', // User agent mobile
          'uam', // User agent model
          'uap', // User agent platform
          'uapv', // User agent platform version
          'uaw' // User agent wow64
        ],
        
        aliases: {
          'conversion_id': ['id', 'conversionId'],
          'conversion_label': ['label', 'conversionLabel'],
          'conversion_value': ['value', 'cv', 'revenue'],
          'order_id': ['transaction_id', 'transactionId', 'tid'],
          'email_hash': ['em', 'email'],
          'phone_hash': ['phone', 'ph']
        },
        
        parsers: {
          'id': (value: string) => parseInt(value, 10),
          'value': (value: string) => parseFloat(value),
          'random': (value: string) => parseInt(value, 10),
          'fmt': (value: string) => parseInt(value, 10),
          
          // Parse JSON data parameter
          'data': (value: string) => {
            try {
              return JSON.parse(decodeURIComponent(value))
            } catch {
              return { raw: value }
            }
          }
        },
        
        validators: {
          'id': (value: any) => typeof value === 'number' && value > 0,
          'label': (value: any) => typeof value === 'string' && value.length > 0,
          'value': (value: any) => typeof value === 'number' && value >= 0,
          'currency_code': (value: any) => typeof value === 'string' && /^[A-Z]{3}$/.test(value)
        }
      }
    }
    
    super(config)
  }

  /**
   * Google Ads specific confidence calculation
   */
  protected async calculateCustomConfidence(request: RequestData): Promise<number> {
    let customScore = 0

    // High confidence for Google Ads domains
    if (request.url.includes('googleadservices.com') || request.url.includes('googleads.g.doubleclick.net')) {
      customScore += 0.4
    }

    // Conversion ID validation
    if (request.query.id && /^\d+$/.test(request.query.id)) {
      customScore += 0.3
    }

    // Conversion label presence
    if (request.query.label && /^[\w-]+$/.test(request.query.label)) {
      customScore += 0.2
    }

    // Enhanced conversions data
    if (request.query.em || request.query.phone || request.query.fn || request.query.ln) {
      customScore += 0.15
    }

    // Google Tag Manager integration
    if (request.query.gtm) {
      customScore += 0.1
    }

    // Conversion value indicates purchase/high-value action
    if (request.query.value && parseFloat(request.query.value) > 0) {
      customScore += 0.1
    }

    return Math.min(1.0, customScore)
  }

  /**
   * Parse Google Ads parameters
   */
  protected async parseParameters(request: RequestData): Promise<Record<string, any>> {
    const parameters: Record<string, any> = {}
    
    // Parse URL parameters
    for (const [key, value] of Object.entries(request.query)) {
      const parser = this.config.parameters.parsers?.[key]
      parameters[key] = parser ? parser(String(value)) : value
    }
    
    // Parse POST body if present
    if (request.method === 'POST' && request.body) {
      const bodyData = this.parsePostBody(request.body)
      Object.assign(parameters, bodyData)
    }
    
    // Apply aliases first to normalize parameter names
    this.applyParameterAliases(parameters)
    
    // Try to extract conversion ID from multiple sources
    let conversionId = parameters.id || parameters.conversion_id || parameters.conversionId;
    
    // If no conversion ID found in parameters, try to extract from URL
    if (!conversionId) {
      // Method 1: Direct conversion path (e.g., /pagead/conversion/123456789/)
      const conversionPathMatch = request.url.match(/\/conversion\/(\d+)/);
      if (conversionPathMatch) {
        conversionId = parseInt(conversionPathMatch[1], 10);
      }
      
      // Method 2: Look for any numeric ID in the path after /pagead/
      if (!conversionId) {
        const pageadMatch = request.url.match(/\/pagead\/[^\/]*\/(\d+)/);
        if (pageadMatch) {
          conversionId = parseInt(pageadMatch[1], 10);
        }
      }
      
      // Method 3: Look for standalone numeric segments (more flexible)
      if (!conversionId) {
        const numericSegmentMatch = request.url.match(/\/(\d{6,})\//);
        if (numericSegmentMatch) {
          conversionId = parseInt(numericSegmentMatch[1], 10);
        }
      }
      
      // Method 4: Extract from AW- format in URL
      if (!conversionId) {
        const awMatch = request.url.match(/\/(AW-(\d+))/);
        if (awMatch) {
          conversionId = parseInt(awMatch[2], 10);
          if (!parameters.tid) {
            parameters.tid = awMatch[1];
          }
        }
      }
    }
    
    // Extract other format IDs (G-, DC-, GTM-) for tid if not already set
    if (!parameters.tid) {
      const tidMatch = request.url.match(/\/(AW-\d+|G-[A-Z0-9]+|DC-\d+|GTM-[A-Z0-9]+)/);
      if (tidMatch) {
        parameters.tid = tidMatch[1];
      }
    }
    
    // If we found a conversion ID through any method, ensure it's set in all expected places
    if (conversionId) {
      parameters.id = conversionId;
      parameters.conversion_id = conversionId;
    }
    
    // Ensure conversion_label is normalized
    if (parameters.label && !parameters.conversion_label) {
      parameters.conversion_label = parameters.label;
    }
    
    // Final fallback: if we have a label but no ID, try to extract ID from the full URL
    if (parameters.label && !parameters.conversion_id) {
      // Google Ads always has a conversion ID when there's a label
      // Try one more aggressive pattern
      const anyNumberMatch = request.url.match(/(\d{6,})/);
      if (anyNumberMatch) {
        parameters.id = parseInt(anyNumberMatch[1], 10);
        parameters.conversion_id = parameters.id;
      }
    }
    
    return parameters
  }

  /**
   * Extract Google Ads account ID
   */
  protected async extractAccountId(_request: RequestData, parameters: Record<string, any>): Promise<string | null> {
    const conversionId = parameters.conversion_id || parameters.id || parameters.conversionId || parameters.tid;
    const conversionLabel = parameters.conversion_label || parameters.label || parameters.conversionLabel;
    
    
    if (!conversionId) {
      return null;
    }
    
    // Use pattern format: value$/$value for line break
    if (conversionLabel) {
      return `${conversionId}$/$${conversionLabel}`;
    }
    
    return String(conversionId);
  }

  /**
   * Extract Google Ads event type
   */
  protected async extractEventType(request: RequestData, parameters: Record<string, any>): Promise<string | null> {
    // Use 'en' parameter for event name if available
    if (parameters.en) {
      // Convert gtag.config to Config for better readability
      if (parameters.en === 'gtag.config') {
        return 'Config'
      }
      return parameters.en
    }
    
    // Use label as event type if available
    if (parameters.label) {
      return parameters.label
    }
    
    // Determine event type from URL
    if (request.url.includes('viewthroughconversion')) {
      return 'view_through_conversion'
    }
    
    if (request.url.includes('1p-conversion')) {
      return 'first_party_conversion'
    }
    
    if (request.url.includes('/conversion')) {
      return 'conversion'
    }
    
    // Check for audience/remarketing
    if (parameters.aud) {
      return 'audience_remarketing'
    }
    
    return 'conversion'
  }

  /**
   * Enrich Google Ads event with additional context
   */
  protected async enrichEvent(event: TrackingEvent, _request: RequestData): Promise<void> {
    const params = event.parameters
    
    const conversionId = params.conversion_id || params.id || params.conversionId || params.tid;
    const conversionLabel = params.conversion_label || params.label || params.conversionLabel;
    
    // Add Google Ads specific metadata
    event.rawData = {
      ...event.rawData,
      google_ads: {
        conversion_id: conversionId,
        conversion_label: conversionLabel,
        gtm_id: params.gtm,
        tid: params.tid,
        format: params.fmt === 1 ? 'gif' : params.fmt === 3 ? 'js' : 'unknown',
        has_enhanced_conversions: !!(params.em || params.phone || params.fn || params.ln),
        is_remarketing: !!params.aud
      }
    }
    
    // Conversion data
    if (params.value || params.currency_code || params.transaction_id) {
      event.rawData!.conversion_data = {
        value: params.value,
        currency: params.currency_code || 'USD',
        transaction_id: params.transaction_id || params.order_id,
        label: params.label
      }
    }
    
    // Enhanced conversions info (without exposing PII)
    if (params.em || params.phone || params.fn || params.ln) {
      event.rawData!.enhanced_conversions = {
        has_email: !!params.em,
        has_phone: !!params.phone,
        has_name: !!(params.fn || params.ln),
        has_address: !!(params.country || params.postal_code),
        matching_fields: [
          params.em && 'email',
          params.phone && 'phone',
          params.fn && 'first_name',
          params.ln && 'last_name',
          params.country && 'country',
          params.postal_code && 'postal_code'
        ].filter(Boolean).length
      }
    }
    
    // Parse custom data if present
    if (params.data && typeof params.data === 'object') {
      event.rawData!.custom_data = params.data
    }
    
    // Audience/remarketing data
    if (params.aud) {
      event.rawData!.audience = {
        list_id: params.aud,
        type: 'remarketing_list'
      }
    }
    
    // Add event categorization
    event.rawData!.event_category = this.categorizeEvent(event.eventType || 'unknown')
  }

  /**
   * Parse POST request body
   */
  private parsePostBody(body: string): Record<string, any> {
    try {
      // Try JSON first
      return JSON.parse(body)
    } catch {
      // Fall back to URL-encoded
      const parameters: Record<string, any> = {}
      const urlParams = new URLSearchParams(body)
      urlParams.forEach((value, key) => {
        parameters[key] = value
      })
      return parameters
    }
  }

  /**
   * Apply parameter aliases
   */
  private applyParameterAliases(parameters: Record<string, any>): void {
    if (!this.config.parameters.aliases) return

    for (const [canonical, aliases] of Object.entries(this.config.parameters.aliases)) {
      for (const alias of aliases) {
        if (parameters[alias] !== undefined && parameters[canonical] === undefined) {
          parameters[canonical] = parameters[alias]
          break
        }
      }
    }
  }

  /**
   * Categorize Google Ads events
   */
  private categorizeEvent(eventType: string): string {
    const categories: Record<string, string> = {
      'conversion': 'conversion',
      'view_through_conversion': 'conversion',
      'first_party_conversion': 'conversion',
      'audience_remarketing': 'audience',
    }
    
    return categories[eventType] || 'advertising'
  }
}