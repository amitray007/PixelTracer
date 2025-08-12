import { BaseProvider, ProviderConfig } from '../base/base-provider'
import { TrackingEvent, RequestData } from '@pixeltracer/shared'
import { ParameterGroup, GroupedParameter, ParameterGroupingProvider } from '../base/parameter-group'

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
export class FacebookPixelProvider extends BaseProvider implements ParameterGroupingProvider {
  constructor() {
    const config: ProviderConfig = {
      id: 'facebook-pixel',
      name: 'Facebook Pixel',
      version: '1.0.0',
      description: 'Facebook Pixel and Meta Pixel tracking events',
      website: 'https://developers.facebook.com/docs/facebook-pixel',
      icon: 'https://static.xx.fbcdn.net/rsrc.php/v3/yC/r/DOal-BW_U3N.png',
      category: 'advertising',
      
      patterns: {
        urlPatterns: [
          // Main Facebook Pixel endpoints
          /^https:\/\/www\.facebook\.com\/tr/,
          /^https:\/\/connect\.facebook\.net\/.*\/fbevents\.js/,
          /^https:\/\/connect\.facebook\.net\/signals\/config/,
          
          // Meta Pixel (new branding)
          /^https:\/\/connect\.facebook\.net\/.*\/fbpixel\.js/,
          
          // Conversions API (server-side)
          /^https:\/\/graph\.facebook\.com\/v\d+\.\d+\/.*\/events/,
          
          // Facebook Analytics
          /^https:\/\/www\.facebook\.com\/analytics/,
          
          // Facebook SDK events
          /^https:\/\/graph\.facebook\.com\/.*\/activities/,
          
          // Legacy endpoints
          'https://www.facebook.com/impression.php*',
          'https://facebook.com/tr*'
        ],
        
        domains: [
          'www.facebook.com',
          'facebook.com',
          'connect.facebook.net',
          'graph.facebook.com'
        ],
        
        paths: [
          '/tr*',
          '/fbevents.js*',
          '/fbpixel.js*',
          '/signals/config*',
          '/analytics*',
          '/impression.php*',
          '/*/events*',
          '/*/activities*'
        ],
        
        queryPatterns: {
          // Pixel ID
          'id': /^\d+$/,
          
          // Event names (standard events)
          'ev': /^(PageView|ViewContent|Search|AddToCart|AddToWishlist|InitiateCheckout|AddPaymentInfo|Purchase|Lead|CompleteRegistration|Contact|CustomizeProduct|Donate|FindLocation|Schedule|StartTrial|SubmitApplication|Subscribe|AdClick|AdImpression|Custom)$/,
          
          // Custom data
          'cd': /.*/,
          
          // User data for enhanced matching
          'ud': /.*/,
          
          // Event source
          'es': /^(website|app|chat|email|system_generated|business_messaging|offline_conversions_api)$/,
          
          // Data processing options (for CCPA compliance)
          'dpo': /^\d+$/,
          
          // Test event code
          'test_event_code': /.*/
        },
        
        methods: ['GET', 'POST']
      },
      
      parameters: {
        required: ['id'], // Pixel ID is always required
        
        optional: [
          // Core parameters
          'ev', // Event name
          'cd', // Custom data
          'ud', // User data
          
          // Event metadata
          'es', // Event source
          'sw', // Screen width
          'sh', // Screen height
          'v', // Version
          'r', // Referrer
          'a', // User agent
          'rl', // Rendering location
          
          // Business data
          'value', // Purchase value
          'currency', // Currency code
          'content_ids', // Product IDs
          'content_type', // Content type
          'content_category', // Content category
          'content_name', // Content name
          'num_items', // Number of items
          
          // Enhanced matching (hashed)
          'em', // Email
          'ph', // Phone
          'fn', // First name  
          'ln', // Last name
          'db', // Date of birth
          'ge', // Gender
          'ct', // City
          'st', // State
          'zp', // Zip code
          'country', // Country
          
          // Advanced matching
          'external_id', // External ID
          'client_ip_address', // Client IP
          'client_user_agent', // User agent
          'fbc', // Facebook click ID
          'fbp', // Facebook browser ID
          
          // Privacy & compliance
          'dpo', // Data processing options
          'dpoco', // Data processing options country
          'dpost', // Data processing options state
          'noscript', // No script version
          'test_event_code', // Test event code
          
          // Server-side API
          'event_time', // Event timestamp
          'event_source_url', // Source URL
          'opt_out', // Opt out flag
          'event_id' // Deduplication ID
        ],
        
        aliases: {
          'pixel_id': ['id', 'pixelId', 'pixel_id'],
          'event_name': ['ev', 'event', 'event_name'],
          'custom_data': ['cd', 'custom_data', 'customData'],
          'user_data': ['ud', 'user_data', 'userData'],
          'purchase_value': ['value', 'purchase_value', 'revenue'],
          'order_id': ['order_id', 'transaction_id', 'external_id']
        },
        
        parsers: {
          'id': (value: string) => parseInt(value, 10),
          'value': (value: string) => parseFloat(value),
          'num_items': (value: string) => parseInt(value, 10),
          'sw': (value: string) => parseInt(value, 10),
          'sh': (value: string) => parseInt(value, 10),
          
          // Parse custom data JSON
          'cd': (value: string) => {
            try {
              return JSON.parse(decodeURIComponent(value))
            } catch {
              return { raw: value }
            }
          },
          
          // Parse user data JSON  
          'ud': (value: string) => {
            try {
              return JSON.parse(decodeURIComponent(value))
            } catch {
              return { raw: value }
            }
          }
        },
        
        validators: {
          'id': (value: any) => typeof value === 'number' && value > 0,
          'ev': (value: any) => typeof value === 'string' && value.length > 0,
          'value': (value: any) => typeof value === 'number' && value >= 0,
          'currency': (value: any) => typeof value === 'string' && /^[A-Z]{3}$/.test(value),
          'em': (value: any) => typeof value === 'string' && value.includes('@')
        }
      }
    }
    
    super(config)
  }

  /**
   * Facebook-specific confidence calculation
   */
  protected async calculateCustomConfidence(request: RequestData): Promise<number> {
    let customScore = 0

    // High confidence for standard Facebook endpoints
    if (request.url.includes('facebook.com/tr')) {
      customScore += 0.4
    }

    // Pixel ID presence
    if (request.query.id && /^\d+$/.test(request.query.id)) {
      customScore += 0.3
    }

    // Standard event names
    const standardEvents = [
      'PageView', 'ViewContent', 'Search', 'AddToCart', 'AddToWishlist',
      'InitiateCheckout', 'AddPaymentInfo', 'Purchase', 'Lead', 'CompleteRegistration'
    ]
    if (request.query.ev && standardEvents.includes(request.query.ev)) {
      customScore += 0.2
    }

    // Custom data presence indicates more sophisticated tracking
    if (request.query.cd) {
      customScore += 0.15
    }

    // Enhanced matching data
    if (request.query.em || request.query.ph || request.query.ud) {
      customScore += 0.1
    }

    // Facebook browser/click IDs
    if (request.query.fbp || request.query.fbc) {
      customScore += 0.1
    }

    // Server-side API events (higher confidence)
    if (request.url.includes('graph.facebook.com') && request.url.includes('/events')) {
      customScore += 0.2
    }

    return Math.min(1.0, customScore)
  }

  /**
   * Parse Facebook Pixel parameters
   */
  protected async parseParameters(request: RequestData): Promise<Record<string, any>> {
    const parameters: Record<string, any> = {}
    
    // Parse URL parameters
    for (const [key, value] of Object.entries(request.query)) {
      const parser = this.config.parameters.parsers?.[key]
      parameters[key] = parser ? parser(String(value)) : value
    }
    
    // Parse custom data (cd[]) parameters
    this.parseCustomData(request.query, parameters)
    
    // Parse POST body for server-side API events
    if (request.method === 'POST' && request.body) {
      const bodyData = this.parsePostBody(request.body)
      Object.assign(parameters, bodyData)
    }
    
    // Apply aliases
    this.applyParameterAliases(parameters)
    
    return parameters
  }
  
  /**
   * Parse Facebook custom data parameters (cd[])
   */
  private parseCustomData(query: Record<string, string>, parameters: Record<string, any>): void {
    const customData: Record<string, any> = {}
    
    for (const [key, value] of Object.entries(query)) {
      // Check if this is a custom data parameter
      if (key.startsWith('cd[') && key.endsWith(']')) {
        // Extract the field name from cd[fieldname]
        const fieldName = key.slice(3, -1)
        
        // Special handling for contents (product data)
        if (fieldName === 'contents') {
          try {
            // Try to parse as JSON array for product data
            const products = JSON.parse(decodeURIComponent(value))
            if (Array.isArray(products)) {
              customData.contents = products
              // Also flatten for easier display
              products.forEach((product, index) => {
                Object.entries(product).forEach(([prodKey, prodValue]) => {
                  parameters[`cd.contents.${index}.${prodKey}`] = prodValue
                })
              })
            } else {
              customData[fieldName] = products
            }
          } catch {
            // If not JSON, treat as regular value
            customData[fieldName] = value
          }
        } else {
          // Regular custom data field
          customData[fieldName] = value
        }
        
        // Store in parameters with both formats
        parameters[key] = value // Original format
      }
    }
    
    // Store parsed custom data
    if (Object.keys(customData).length > 0) {
      parameters.customData = customData
    }
  }

  /**
   * Extract Facebook account ID (Pixel ID)
   */
  protected async extractAccountId(_request: RequestData, parameters: Record<string, any>): Promise<string | null> {
    return parameters.id || parameters.pixel_id || parameters.pixelId || null;
  }

  /**
   * Extract Facebook event type
   */
  protected async extractEventType(request: RequestData, parameters: Record<string, any>): Promise<string | null> {
    // Direct event name from parameter
    if (parameters.ev) {
      return parameters.ev
    }
    
    if (parameters.event_name || parameters.event) {
      return parameters.event_name || parameters.event
    }
    
    // Determine from URL patterns
    if (request.url.includes('/tr') && !parameters.ev) {
      return 'PageView' // Default Facebook pixel event
    }
    
    if (request.url.includes('fbevents.js') || request.url.includes('fbpixel.js')) {
      return 'pixel_load'
    }
    
    if (request.url.includes('/signals/config')) {
      return 'pixel_config'
    }
    
    if (request.url.includes('graph.facebook.com') && request.url.includes('/events')) {
      return 'server_side_event'
    }
    
    return 'unknown'
  }

  /**
   * Enrich Facebook Pixel event with additional context
   */
  protected async enrichEvent(event: TrackingEvent, request: RequestData): Promise<void> {
    const params = event.parameters
    
    // Add Facebook-specific metadata
    event.rawData = {
      ...event.rawData,
      facebook_pixel: {
        pixel_id: params.id || params.pixel_id,
        event_source: params.es || 'website',
        version: params.v,
        is_server_side: request.url.includes('graph.facebook.com'),
        has_enhanced_matching: !!(params.em || params.ph || params.ud),
        test_mode: !!params.test_event_code
      }
    }
    
    // Parse and add business data
    if (params.cd && typeof params.cd === 'object') {
      event.rawData!.business_data = {
        value: params.cd.value || params.value,
        currency: params.cd.currency || params.currency || 'USD',
        content_ids: params.cd.content_ids || params.content_ids,
        content_type: params.cd.content_type || params.content_type,
        content_category: params.cd.content_category,
        num_items: params.cd.num_items || params.num_items
      }
    }
    
    // Privacy and compliance data
    if (params.dpo || params.opt_out) {
      event.rawData!.privacy = {
        data_processing_options: params.dpo ? ['LDU'] : [],
        data_processing_options_country: params.dpoco || 0,
        data_processing_options_state: params.dpost || 0,
        opt_out: !!params.opt_out
      }
    }
    
    // Enhanced matching info (without exposing actual data)
    if (params.ud && typeof params.ud === 'object') {
      event.rawData!.enhanced_matching = {
        has_email: !!(params.ud.em || params.em),
        has_phone: !!(params.ud.ph || params.ph),
        has_personal_info: !!(params.ud.fn || params.ud.ln || params.fn || params.ln),
        has_location: !!(params.ud.ct || params.ud.st || params.ct || params.st),
        matching_fields: Object.keys(params.ud || {}).length
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
      // Try JSON first (Conversions API format)
      const jsonData = JSON.parse(body)
      return this.flattenServerSideEvent(jsonData)
    } catch {
      // Fall back to URL-encoded format
      const parameters: Record<string, any> = {}
      const urlParams = new URLSearchParams(body)
      urlParams.forEach((value, key) => {
        parameters[key] = value
      })
      return parameters
    }
  }

  /**
   * Flatten server-side API event structure
   */
  private flattenServerSideEvent(data: any): Record<string, any> {
    const flattened: Record<string, any> = {}
    
    if (data.data && Array.isArray(data.data)) {
      const event = data.data[0] // Take first event
      
      flattened.event_name = event.event_name
      flattened.event_time = event.event_time
      flattened.event_source_url = event.event_source_url
      flattened.event_id = event.event_id
      
      // Custom data
      if (event.custom_data) {
        flattened.cd = event.custom_data
        Object.assign(flattened, event.custom_data)
      }
      
      // User data (enhanced matching)
      if (event.user_data) {
        flattened.ud = event.user_data
      }
    }
    
    return flattened
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
   * Categorize Facebook events
   */
  private categorizeEvent(eventType: string): string {
    const categories: Record<string, string> = {
      'PageView': 'awareness',
      'ViewContent': 'awareness',
      'Search': 'consideration',
      'AddToCart': 'consideration',
      'AddToWishlist': 'consideration',
      'InitiateCheckout': 'conversion',
      'AddPaymentInfo': 'conversion',
      'Purchase': 'conversion',
      'Lead': 'conversion',
      'CompleteRegistration': 'conversion',
      'Contact': 'conversion',
      'Subscribe': 'conversion'
    }
    
    return categories[eventType] || 'other'
  }

  /**
   * Group Facebook Pixel parameters for display
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
    
    const customDataGroup: ParameterGroup = {
      id: 'customdata',
      name: 'Custom Data',
      icon: 'custom',
      parameters: [],
      description: 'Custom data and product information',
      priority: 2
    }
    
    const userGroup: ParameterGroup = {
      id: 'user',
      name: 'User Data',
      icon: 'user',
      parameters: [],
      description: 'User identification and enhanced matching',
      priority: 3
    }
    
    const contextGroup: ParameterGroup = {
      id: 'context',
      name: 'Context',
      icon: 'context',
      parameters: [],
      description: 'Page and browser context',
      priority: 4
    }
    
    const technicalGroup: ParameterGroup = {
      id: 'technical',
      name: 'Technical',
      icon: 'technical',
      parameters: [],
      description: 'Technical parameters',
      priority: 5
    }
    
    // Group Facebook parameters
    Object.entries(parameters).forEach(([key, value]) => {
      // Skip undefined/null values
      if (value === undefined || value === null) return
      
      let displayName = this.getParameterDisplayName(key)
      let group: ParameterGroup | null = null
      
      // Event parameters
      if (['ev', 'event', 'event_name'].includes(key)) {
        displayName = 'Event Name'
        group = eventGroup
      }
      else if (['event_id', 'event_time', 'event_source_url'].includes(key)) {
        group = eventGroup
      }
      // Custom Data parameters - including cd[] parameters
      else if (key.startsWith('cd[') || key.startsWith('cd.') || key === 'customData') {
        displayName = this.getCustomDataDisplayName(key)
        group = customDataGroup
      }
      // Business/Commerce parameters
      else if (['value', 'currency', 'content_ids', 'content_type', 'content_category', 'content_name', 'num_items'].includes(key)) {
        group = customDataGroup
      }
      // User/Identity parameters
      else if (['id', 'pixel_id', 'fbp', 'fbc', 'external_id'].includes(key)) {
        group = userGroup
      }
      // Enhanced matching parameters
      else if (['em', 'ph', 'fn', 'ln', 'db', 'ge', 'ct', 'st', 'zp', 'country'].includes(key)) {
        group = userGroup
      }
      // User data object
      else if (key === 'ud' && typeof value === 'object') {
        displayName = 'User Data (Enhanced Matching)'
        group = userGroup
      }
      // Context parameters
      else if (['dl', 'url', 'dr', 'referrer', 'r', 'a', 'user_agent'].includes(key)) {
        group = contextGroup
      }
      // Technical parameters
      else if (['v', 'version', 'es', 'sw', 'sh', 'test_event_code', 'dpo', 'dpoco', 'dpost'].includes(key)) {
        group = technicalGroup
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
    
    // Return only non-empty groups
    return [eventGroup, customDataGroup, userGroup, contextGroup, technicalGroup]
      .filter(g => g.parameters.length > 0)
  }

  /**
   * Get display name for custom data parameters
   */
  private getCustomDataDisplayName(key: string): string {
    // Handle cd[contents] array specially
    if (key.startsWith('cd.contents.')) {
      // This is a flattened product item - format nicely
      const parts = key.split('.')
      if (parts.length >= 4) {
        const index = parts[2]
        const field = parts.slice(3).join('.')
        return `Product ${parseInt(index) + 1} - ${field}`
      }
    } else if (key.startsWith('cd[')) {
      // Extract field name from cd[fieldname]
      const fieldName = key.slice(3, -1)
      return fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/_/g, ' ')
    } else if (key === 'customData' && typeof key === 'object') {
      return 'All Custom Data'
    } else {
      const cleanKey = key.replace('cd.', '').replace(/_/g, ' ')
      return cleanKey.charAt(0).toUpperCase() + cleanKey.slice(1)
    }
    
    return this.getParameterDisplayName(key)
  }

  /**
   * Get display name for a parameter
   */
  getParameterDisplayName(key: string): string {
    const displayNames: Record<string, string> = {
      'ev': 'Event Name',
      'event': 'Event Name',
      'event_name': 'Event Name',
      'event_id': 'Event ID',
      'event_time': 'Event Time',
      'event_source_url': 'Event Source URL',
      'id': 'Pixel ID',
      'pixel_id': 'Pixel ID',
      'fbp': 'Facebook Browser ID',
      'fbc': 'Facebook Click ID',
      'external_id': 'External ID',
      'value': 'Purchase Value',
      'currency': 'Currency',
      'content_ids': 'Content IDs',
      'content_type': 'Content Type',
      'content_category': 'Content Category',
      'content_name': 'Content Name',
      'num_items': 'Number of Items',
      'em': 'Email (Hashed)',
      'ph': 'Phone (Hashed)',
      'fn': 'First Name (Hashed)',
      'ln': 'Last Name (Hashed)',
      'db': 'Date of Birth (Hashed)',
      'ge': 'Gender (Hashed)',
      'ct': 'City (Hashed)',
      'st': 'State (Hashed)',
      'zp': 'Zip Code (Hashed)',
      'country': 'Country (Hashed)',
      'dl': 'Page URL',
      'url': 'Page URL',
      'dr': 'Referrer',
      'referrer': 'Referrer',
      'r': 'Referrer',
      'a': 'User Agent',
      'user_agent': 'User Agent',
      'v': 'Version',
      'version': 'Version',
      'es': 'Event Source',
      'sw': 'Screen Width',
      'sh': 'Screen Height',
      'test_event_code': 'Test Event Code',
      'dpo': 'Data Processing Options',
      'dpoco': 'Data Processing Country',
      'dpost': 'Data Processing State'
    }
    
    return displayNames[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  /**
   * Get description for a parameter
   */
  getParameterDescription(key: string): string | undefined {
    const descriptions: Record<string, string> = {
      'id': 'Facebook Pixel ID for this account',
      'ev': 'The type of event being tracked',
      'value': 'Monetary value of the conversion',
      'currency': 'Currency code for the transaction',
      'fbp': 'Facebook browser ID cookie for attribution',
      'fbc': 'Facebook click ID from URL parameters',
      'em': 'Hashed email for enhanced matching',
      'test_event_code': 'Test event code for Facebook Events Manager'
    }
    return descriptions[key]
  }

  /**
   * Get format hint for parameter display
   */
  getParameterFormat(key: string): GroupedParameter['format'] | undefined {
    if (['value', 'price', 'revenue'].includes(key)) return 'currency'
    if (['event_time', 'timestamp'].includes(key)) return 'timestamp'
    return undefined
  }
}