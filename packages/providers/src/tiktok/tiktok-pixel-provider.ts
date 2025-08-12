import { BaseProvider, ProviderConfig } from '../base/base-provider'
import { TrackingEvent, RequestData } from '@pixeltracer/shared'
import { ParameterGroup, GroupedParameter, ParameterGroupingProvider } from '../base/parameter-group'

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
export class TikTokPixelProvider extends BaseProvider implements ParameterGroupingProvider {
  constructor() {
    const config: ProviderConfig = {
      id: 'tiktok-pixel',
      name: 'TikTok Pixel',
      version: '1.0.0',
      description: 'TikTok advertising pixel and Events API tracking',
      website: 'https://ads.tiktok.com/marketing_api/docs',
      icon: 'https://sf16-website-login.neutral.ttwstatic.com/obj/tiktok_web_login_static/tiktok/webapp/main/webapp-desktop/8152caf0c8e8bc67ae0d.png',
      category: 'advertising',
      
      patterns: {
        urlPatterns: [
          // Primary TikTok Analytics API patterns
          // More specific to avoid matching non-tracking endpoints like /pixel/act
          /https:\/\/analytics\.tiktok\.com\/api\/v[0-9]\/track/,
          /https:\/\/analytics\.tiktok\.com\/api\/v[0-9]\/pixel$/,  // Matches /pixel but not /pixel/act
          /https:\/\/analytics\.tiktok\.com\/api\/v[0-9]\/pixel\?/,  // Matches /pixel?params
        ],
        
        domains: [
          'analytics.tiktok.com',
          'business-api.tiktok.com',
          'sf16-fe-tos-sg.ibytetos.com',
          'sf16-website-login.neutral.ttwstatic.com'
        ],
        
        paths: [
          '/api/v2/pixel/track*',
          '/api/v1/pixel/track*',
          '/pixel/track*',
          '/open_api/*/pixel/track*',
          '/i18n/pixel/static*',
          '/i18n/pixel/events.js*'
        ],
        
        queryPatterns: {
          // Pixel ID
          'pixel_code': /^[A-Z0-9]{20}$/, // TikTok pixel codes
          'advertiser_id': /^\d+$/,
          
          // Event data
          'event': /^(PageView|ViewContent|ClickButton|Search|AddToCart|InitiateCheckout|AddPaymentInfo|Purchase|CompleteRegistration|CompletePayment|Contact|Download|Subscribe|SubmitForm|PlaceAnOrder|Click|AddToWishlist|Custom)$/,
          'event_id': /.+/,
          
          // Event source and version
          'type': /^(track|page|identify)$/,
          'version': /^\d+\.\d+\.\d+$/,
          'partner': /^tiktok$/,
          
          // User identification
          'external_id': /.+/,
          'email': /.+/,
          'phone_number': /.+/,
          
          // Device and context
          'user_agent': /.+/,
          'timestamp': /^\d+$/,
          'url': /.+/,
          'referrer': /.+/
        },
        
        methods: ['GET', 'POST']
      },
      
      parameters: {
        required: [], // Pixel code is extracted from various locations (query params or nested in POST body)
        
        optional: [
          'pixel_code', // Can be in query or nested in context.pixel.code
          // Core tracking
          'event',
          'event_id',
          'type',
          'version',
          'partner',
          'advertiser_id',
          
          // Event properties
          'properties',
          'context',
          'timestamp',
          
          // E-commerce data
          'value', // Purchase value
          'currency', // Currency code
          'content_id', // Product ID
          'content_type', // Product type
          'content_name', // Product name
          'content_category', // Product category
          'quantity', // Item quantity
          'price', // Item price
          'order_id', // Transaction ID
          'shop_id', // Shop identifier
          
          // Enhanced matching (PII - hashed)
          'email', // Email address
          'phone_number', // Phone number
          'external_id', // External user ID
          
          // Device and context
          'user_agent',
          'ip', // IP address
          'url', // Page URL
          'referrer', // Referrer URL
          'title', // Page title
          
          // TikTok specific
          'callback', // JSONP callback
          'lib', // Library version
          'language', // User language
          'screen_width',
          'screen_height',
          'tz', // Timezone
          
          // Privacy
          'limited_data_use', // CCPA compliance
          'test_event_code' // Test mode
        ],
        
        aliases: {
          'pixel_id': ['pixel_code', 'pixelCode'],
          'event_name': ['event', 'eventName'],
          'purchase_value': ['value', 'revenue'],
          'transaction_id': ['order_id', 'orderId'],
          'user_email': ['email', 'em'],
          'user_phone': ['phone_number', 'ph'],
          'page_url': ['url', 'current_url'],
          'page_title': ['title', 'page_title']
        },
        
        parsers: {
          'value': (value: string) => parseFloat(value),
          'quantity': (value: string) => parseInt(value, 10),
          'price': (value: string) => parseFloat(value),
          'timestamp': (value: string) => parseInt(value, 10),
          'screen_width': (value: string) => parseInt(value, 10),
          'screen_height': (value: string) => parseInt(value, 10),
          'advertiser_id': (value: string) => parseInt(value, 10),
          
          // Parse JSON properties
          'properties': (value: string) => {
            try {
              return JSON.parse(decodeURIComponent(value))
            } catch {
              return { raw: value }
            }
          },
          
          'context': (value: string) => {
            try {
              return JSON.parse(decodeURIComponent(value))
            } catch {
              return { raw: value }
            }
          }
        },
        
        validators: {
          'pixel_code': (value: any) => typeof value === 'string' && /^[A-Z0-9]{20}$/.test(value),
          'event': (value: any) => typeof value === 'string' && value.length > 0,
          'value': (value: any) => typeof value === 'number' && value >= 0,
          'currency': (value: any) => typeof value === 'string' && /^[A-Z]{3}$/.test(value),
          'email': (value: any) => typeof value === 'string' && value.includes('@'),
          'advertiser_id': (value: any) => typeof value === 'number' && value > 0
        }
      }
    }
    
    super(config)
  }

  /**
   * TikTok-specific confidence calculation
   */
  protected async calculateCustomConfidence(request: RequestData): Promise<number> {
    let customScore = 0

    // High confidence for TikTok domains
    if (request.url.includes('analytics.tiktok.com')) {
      customScore += 0.5
    }

    // Various TikTok URL patterns
    if (request.url.includes('/api/v') && request.url.includes('/pixel')) {
      customScore += 0.3
    } else if (request.url.includes('/api/v') && request.url.includes('/track')) {
      customScore += 0.3
    } else if (request.url.includes('/i18n/pixel')) {
      customScore += 0.3
    } else if (request.url.includes('/collect')) {
      customScore += 0.2
    }

    // Pixel code presence (more flexible checking)
    if (request.query.pixel_code || request.query.pixelCode || request.query.sdkid) {
      customScore += 0.1
    }

    // Event parameter presence
    if (request.query.event) {
      customScore += 0.1
    }

    // TikTok-specific parameters
    if (request.query.partner === 'tiktok' || request.query.lib || request.query.version) {
      customScore += 0.05
    }

    // Events API (server-side) gets higher confidence
    if (request.url.includes('business-api.tiktok.com')) {
      customScore += 0.3
    }

    return Math.min(1.0, customScore)
  }

  /**
   * Parse TikTok parameters with hybrid approach (nested + flattened)
   */
  protected async parseParameters(request: RequestData): Promise<Record<string, any>> {
    const parameters: Record<string, any> = {}
    
    // Parse URL parameters
    for (const [key, value] of Object.entries(request.query)) {
      const parser = this.config.parameters.parsers?.[key]
      parameters[key] = parser ? parser(String(value)) : value
    }
    
    // Parse POST body with hybrid approach
    if (request.method === 'POST' && request.body) {
      const bodyData = this.parsePostBody(request.body)
      
      // Keep the full nested structure
      Object.assign(parameters, bodyData)
      
      // ALSO create flattened versions for key fields (for UI compatibility)
      if (bodyData.context?.pixel?.code) {
        parameters['pixel_code'] = bodyData.context.pixel.code
        parameters['context.pixel.code'] = bodyData.context.pixel.code
      }
      
      if (bodyData.context?.ad) {
        parameters['context.ad.ad_id'] = bodyData.context.ad.ad_id
        parameters['context.ad.creative_id'] = bodyData.context.ad.creative_id
        parameters['context.ad.callback'] = bodyData.context.ad.callback
      }
      
      if (bodyData.context?.page) {
        parameters['context.page.url'] = bodyData.context.page.url
        parameters['context.page.referrer'] = bodyData.context.page.referrer
      }
      
      if (bodyData.context?.user) {
        parameters['context.user.user_id'] = bodyData.context.user.user_id
        parameters['context.user.external_id'] = bodyData.context.user.external_id
      }
      
      // Ensure event is accessible at top level
      if (bodyData.event) {
        parameters.event = bodyData.event
      }
      if (bodyData.properties?.event) {
        parameters.event = parameters.event || bodyData.properties.event
      }
      
      // Handle auto_collected_properties
      if (bodyData.auto_collected_properties) {
        parameters.auto_collected_properties = bodyData.auto_collected_properties
        // Also extract page_trigger as potential event
        if (bodyData.auto_collected_properties.page_trigger) {
          parameters.event = parameters.event || bodyData.auto_collected_properties.page_trigger
        }
      }
      
      // Handle action field
      if (bodyData.action) {
        parameters.action = bodyData.action
      }
    }
    
    return parameters
  }

  /**
   * Extract TikTok account ID (Pixel ID)
   */
  protected async extractAccountId(_request: RequestData, parameters: Record<string, any>): Promise<string | null> {
    // Follow Omnibug's column mapping approach: "context.pixel.code"
    return parameters.context?.pixel?.code || 
           parameters['context.pixel.code'] ||
           parameters.pixel_code ||
           parameters.sdkid ||
           null;
  }

  /**
   * Extract TikTok event type (check multiple locations)
   */
  protected async extractEventType(request: RequestData, parameters: Record<string, any>): Promise<string | null> {
    // Primary: Check for explicit event parameter
    if (parameters.event) {
      return parameters.event
    }
    
    // For Metadata events, use page_trigger as the actual event
    if (parameters.action === 'Metadata' && parameters.auto_collected_properties?.page_trigger) {
      return parameters.auto_collected_properties.page_trigger
    }
    
    // Check other locations for event name
    const eventName = parameters.auto_collected_properties?.page_trigger ||
                     parameters.action ||
                     parameters.context?.event ||
                     parameters.properties?.event ||
                     parameters.data?.event ||
                     null
    
    if (eventName) {
      return eventName
    }
    
    // Check URL for event parameter
    const urlMatch = request.url.match(/[?&]event=([^&]+)/i)
    if (urlMatch) {
      return decodeURIComponent(urlMatch[1])
    }
    
    // Fallback for tracking type
    if (parameters.type === 'track') {
      return 'Track'
    }
    
    if (parameters.type === 'page') {
      return 'PageView'
    }
    
    // Check if it's an SDK load
    if (request.url.includes('/i18n/pixel/events.js')) {
      return 'SDK Load'
    }
    
    if (request.url.includes('/i18n/pixel/static')) {
      return 'Pixel Init'
    }
    
    return 'Unknown'
  }

  /**
   * Enrich TikTok event with additional context
   */
  protected async enrichEvent(event: TrackingEvent, request: RequestData): Promise<void> {
    const params = event.parameters
    
    // Add TikTok-specific metadata
    event.rawData = {
      ...event.rawData,
      tiktok_pixel: {
        pixel_code: params.pixel_code,
        advertiser_id: params.advertiser_id,
        version: params.version || params.lib,
        is_server_side: request.url.includes('business-api.tiktok.com'),
        has_enhanced_matching: !!(params.email || params.phone_number || params.external_id),
        test_mode: !!params.test_event_code
      }
    }
    
    // E-commerce data
    if (params.value || params.order_id) {
      event.rawData!.business_data = {
        value: params.value,
        currency: params.currency || 'USD',
        content_id: params.content_id,
        content_type: params.content_type,
        content_name: params.content_name,
        content_category: params.content_category,
        quantity: params.quantity,
        price: params.price,
        order_id: params.order_id,
        shop_id: params.shop_id
      }
    }
    
    // Parse properties object
    if (params.properties && typeof params.properties === 'object') {
      event.rawData!.event_properties = params.properties
    }
    
    // Context data
    if (params.context && typeof params.context === 'object') {
      event.rawData!.context = params.context
    }
    
    // Enhanced matching info (without exposing PII)
    if (params.email || params.phone_number || params.external_id) {
      event.rawData!.enhanced_matching = {
        has_email: !!params.email,
        has_phone: !!params.phone_number,
        has_external_id: !!params.external_id,
        matching_fields: [
          params.email && 'email',
          params.phone_number && 'phone',
          params.external_id && 'external_id'
        ].filter(Boolean).length
      }
    }
    
    // Privacy compliance
    if (params.limited_data_use) {
      event.rawData!.privacy = {
        limited_data_use: params.limited_data_use,
        ccpa_compliant: true
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
      // Try JSON format (Events API)
      const jsonData = JSON.parse(body)
      
      // Events API format
      if (jsonData.pixel_code || jsonData.event) {
        return jsonData
      }
      
      // Batch events format
      if (jsonData.batch && Array.isArray(jsonData.batch)) {
        return jsonData.batch[0] || {} // Take first event
      }
      
      return jsonData
      
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
   * Get TikTok-specific parameter groups (matches Omnibug structure)
   */
  public getParameterGroups(parameters: Record<string, any>): Array<{id: string, name: string, parameters: Array<{key: string, value: any, displayName: string}>}> {
    const eventGroup = {
      id: 'event',
      name: 'Event',
      parameters: [] as Array<{key: string, value: any, displayName: string}>
    }
    
    const contextGroup = {
      id: 'context', 
      name: 'Context',
      parameters: [] as Array<{key: string, value: any, displayName: string}>
    }
    
    // Group parameters according to Omnibug structure
    Object.entries(parameters).forEach(([key, value]) => {
      let displayName = key
      
      // Event group parameters (matches Omnibug's event group)
      if (['event', 'sdkid', 'analytics_uniq_id', 'timestamp'].includes(key)) {
        if (key === 'event') displayName = 'Event'
        else if (key === 'sdkid') displayName = 'SDK ID'  
        else if (key === 'analytics_uniq_id') displayName = 'Analytics Unique ID'
        else if (key === 'timestamp') displayName = 'Timestamp'
        
        eventGroup.parameters.push({ key, value, displayName })
      }
      // Context group parameters (nested context structure)
      else if (key.startsWith('context.') || key === 'context') {
        displayName = this.getContextDisplayName(key)
        contextGroup.parameters.push({ key, value, displayName })
      }
    })
    
    return [eventGroup, contextGroup].filter(g => g.parameters.length > 0)
  }
  
  /**
   * Get display name for context parameters (matches Omnibug naming)
   */
  private getContextDisplayName(key: string): string {
    const contextMapping: Record<string, string> = {
      'context.ad.ad_id': 'Ad ID',
      'context.ad.callback': 'Ad Callback',
      'context.ad.convert_id': 'Ad Conversion ID',
      'context.ad.creative_id': 'Ad Creative ID',
      'context.ad.idc': 'Ad IDC',
      'context.ad.log_extra': 'Ad Log Extra',
      'context.ad.req_id': 'Ad Request ID',
      'context.library.name': 'Library Name',
      'context.library.version': 'Library Version', 
      'context.page.referrer': 'Page Referrer',
      'context.page.url': 'Page URL',
      'context.pixel.code': 'Pixel Code',
      'context.user.device_id': 'Device ID',
      'context.user.user_id': 'User ID'
    }
    
    return contextMapping[key] || key
  }

  /**
   * Categorize TikTok events
   */
  private categorizeEvent(eventType: string): string {
    const categories: Record<string, string> = {
      'PageView': 'awareness',
      'ViewContent': 'awareness',
      'ClickButton': 'engagement',
      'Search': 'consideration',
      'AddToCart': 'consideration',
      'AddToWishlist': 'consideration',
      'InitiateCheckout': 'conversion',
      'AddPaymentInfo': 'conversion',
      'Purchase': 'conversion',
      'CompletePayment': 'conversion',
      'CompleteRegistration': 'conversion',
      'Contact': 'conversion',
      'Download': 'conversion',
      'Subscribe': 'conversion',
      'SubmitForm': 'conversion',
      'PlaceAnOrder': 'conversion'
    }
    
    return categories[eventType] || 'other'
  }

  /**
   * Group TikTok Pixel parameters for display (matches Omnibug structure)
   */
  groupParameters(parameters: Record<string, any>): ParameterGroup[] {
    const eventGroup: ParameterGroup = {
      id: 'event',
      name: 'Event',
      icon: 'event',
      parameters: [],
      description: 'Event tracking data',
      priority: 1
    }
    
    const contextGroup: ParameterGroup = {
      id: 'context',
      name: 'Context', 
      icon: 'context',
      parameters: [],
      description: 'Context information',
      priority: 2
    }
    
    const technicalGroup: ParameterGroup = {
      id: 'technical',
      name: 'Technical',
      icon: 'technical',
      parameters: [],
      description: 'Technical parameters',
      priority: 3
    }
    
    // Group TikTok parameters according to Omnibug structure
    Object.entries(parameters).forEach(([key, value]) => {
      // Skip undefined/null values
      if (value === undefined || value === null) return
      
      let displayName = this.getParameterDisplayName(key)
      let group: ParameterGroup | null = null
      
      // Event group parameters
      if (['event', 'sdkid', 'analytics_uniq_id', 'timestamp', 'event_id', 'type', 'action', 'message_id'].includes(key)) {
        group = eventGroup
      }
      // Context group parameters (nested context structure)
      else if (key.startsWith('context.') || key === 'context') {
        // Skip the raw context object if we have flattened versions
        if (key === 'context' && typeof value === 'object') {
          return
        }
        displayName = this.getTikTokContextDisplayName(key)
        group = contextGroup
      }
      // Common tracking parameters
      else if (['pixel_code', 'url', 'referrer', 'user_agent', 'version', 'partner'].includes(key)) {
        group = contextGroup
      }
      // Auto-collected properties special handling
      else if (key === 'auto_collected_properties' && typeof value === 'object') {
        // Extract page_trigger to event group
        if (value.page_trigger) {
          eventGroup.parameters.push({ 
            key: 'page_trigger', 
            displayName: 'Page Trigger', 
            value: value.page_trigger 
          })
        }
        // Add content_data to context group if present
        if (value.content_data) {
          contextGroup.parameters.push({ 
            key: 'content_data', 
            displayName: 'Content Data', 
            value: value.content_data 
          })
        }
        return
      }
      // Skip large complex objects that would clutter the display
      else if (['_inspection', 'signal_diagnostic_labels', 'properties'].includes(key) && typeof value === 'object') {
        // Add to technical but only if they have meaningful content
        if (Object.keys(value).length > 0) {
          group = technicalGroup
        } else {
          return
        }
      }
      // Everything else goes to technical
      else {
        group = technicalGroup
      }
      
      if (group) {
        group.parameters.push({
          key,
          displayName,
          value,
          description: this.getParameterDescription(key),
          format: this.getParameterFormat(key)
        })
      }
    })
    
    return [eventGroup, contextGroup, technicalGroup].filter(g => g.parameters.length > 0)
  }

  /**
   * Get display name for TikTok context parameters
   */
  private getTikTokContextDisplayName(key: string): string {
    const contextMapping: Record<string, string> = {
      'context.ad.ad_id': 'Ad ID',
      'context.ad.callback': 'Ad Callback', 
      'context.ad.convert_id': 'Ad Conversion ID',
      'context.ad.creative_id': 'Ad Creative ID',
      'context.ad.idc': 'Ad IDC',
      'context.ad.log_extra': 'Ad Log Extra',
      'context.ad.req_id': 'Ad Request ID',
      'context.library.name': 'Library Name',
      'context.library.version': 'Library Version',
      'context.page.referrer': 'Page Referrer',
      'context.page.url': 'Page URL', 
      'context.pixel.code': 'Pixel Code',
      'context.user.device_id': 'Device ID',
      'context.user.user_id': 'User ID'
    }
    
    return contextMapping[key] || key
  }

  /**
   * Get display name for a parameter
   */
  getParameterDisplayName(key: string): string {
    const displayNames: Record<string, string> = {
      'event': 'Event',
      'sdkid': 'SDK ID',
      'analytics_uniq_id': 'Analytics Unique ID',
      'timestamp': 'Timestamp',
      'event_id': 'Event ID',
      'type': 'Type',
      'action': 'Action',
      'message_id': 'Message ID',
      'pixel_code': 'Pixel Code',
      'url': 'Page URL',
      'referrer': 'Referrer',
      'user_agent': 'User Agent',
      'version': 'Version',
      'partner': 'Partner',
      'page_trigger': 'Page Trigger',
      'content_data': 'Content Data'
    }
    
    return displayNames[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  /**
   * Get description for a parameter
   */
  getParameterDescription(key: string): string | undefined {
    const descriptions: Record<string, string> = {
      'pixel_code': 'TikTok Pixel ID for this account',
      'event': 'The type of event being tracked',
      'sdkid': 'SDK identifier',
      'analytics_uniq_id': 'Unique analytics session identifier',
      'timestamp': 'Event timestamp',
      'event_id': 'Unique event identifier',
      'page_trigger': 'The trigger that caused this event'
    }
    return descriptions[key]
  }

  /**
   * Get format hint for parameter display
   */
  getParameterFormat(key: string): GroupedParameter['format'] | undefined {
    if (['timestamp'].includes(key)) return 'timestamp'
    return undefined
  }
}