import { ParameterGrouper, ParameterDefinition, ParameterGroup, COMMON_GROUPS } from '../base/parameter-groups'

export class FacebookPixelParameterGrouper extends ParameterGrouper {
  protected groups: { [key: string]: ParameterGroup } = {
    event: COMMON_GROUPS.event,
    user: COMMON_GROUPS.user,
    product: COMMON_GROUPS.product,
    custom: COMMON_GROUPS.custom,
    context: COMMON_GROUPS.context,
    technical: COMMON_GROUPS.technical
  }
  
  protected parameterDefinitions: ParameterDefinition[] = [
    // Event Data
    { key: 'ev', displayName: 'Event Name', group: 'event', description: 'Facebook Pixel event being tracked' },
    { key: 'event', displayName: 'Event Type', group: 'event' },
    { key: 'event_name', displayName: 'Event Name', group: 'event' },
    { key: 'action_source', displayName: 'Action Source', group: 'event', description: 'Where the conversion occurred (website, app, etc.)' },
    { key: 'event_id', displayName: 'Event ID', group: 'event', description: 'Unique ID for deduplication' },
    { key: 'event_time', displayName: 'Event Time', group: 'event', format: 'timestamp' },
    
    // User Properties
    { key: 'id', displayName: 'Pixel ID', group: 'user', description: 'Facebook Pixel ID' },
    { key: 'pixel_id', displayName: 'Pixel ID', group: 'user' },
    { key: 'fbp', displayName: 'Facebook Browser ID', group: 'user', description: 'Facebook browser cookie' },
    { key: 'fbc', displayName: 'Facebook Click ID', group: 'user', description: 'Facebook click identifier' },
    { key: 'fb_login_id', displayName: 'Facebook Login ID', group: 'user' },
    { key: 'external_id', displayName: 'External ID', group: 'user', description: 'Your internal user ID' },
    { key: 'subscription_id', displayName: 'Subscription ID', group: 'user' },
    
    // User Data (Enhanced Matching)
    { key: 'em', displayName: 'Email (Hashed)', group: 'user', format: 'email', description: 'SHA256 hashed email' },
    { key: 'ph', displayName: 'Phone (Hashed)', group: 'user', format: 'phone', description: 'SHA256 hashed phone' },
    { key: 'fn', displayName: 'First Name (Hashed)', group: 'user' },
    { key: 'ln', displayName: 'Last Name (Hashed)', group: 'user' },
    { key: 'db', displayName: 'Date of Birth (Hashed)', group: 'user' },
    { key: 'ge', displayName: 'Gender (Hashed)', group: 'user' },
    { key: 'ct', displayName: 'City (Hashed)', group: 'user' },
    { key: 'st', displayName: 'State (Hashed)', group: 'user' },
    { key: 'zp', displayName: 'Zip Code (Hashed)', group: 'user' },
    { key: 'country', displayName: 'Country (Hashed)', group: 'user' },
    
    // Product/Commerce Data
    { key: 'value', displayName: 'Value', group: 'product', format: 'currency', description: 'Total value of items' },
    { key: 'currency', displayName: 'Currency', group: 'product', description: 'Currency code' },
    { key: 'content_ids', displayName: 'Content IDs', group: 'product', type: 'array', description: 'Product IDs' },
    { key: 'content_name', displayName: 'Content Name', group: 'product' },
    { key: 'content_category', displayName: 'Content Category', group: 'product' },
    { key: 'content_type', displayName: 'Content Type', group: 'product', description: 'product or product_group' },
    { key: 'contents', displayName: 'Products', group: 'product', type: 'array', description: 'Array of product objects' },
    { key: 'num_items', displayName: 'Number of Items', group: 'product', type: 'number' },
    { key: 'search_string', displayName: 'Search Query', group: 'product' },
    { key: 'status', displayName: 'Registration Status', group: 'product' },
    { key: 'predicted_ltv', displayName: 'Predicted LTV', group: 'product', format: 'currency' },
    
    // Custom Data (cd parameters)
    { key: 'cd[*]', displayName: 'Custom Parameter', group: 'custom', description: 'Custom event parameter' },
    { key: 'custom_data', displayName: 'Custom Data', group: 'custom', type: 'object' },
    { key: 'ud[*]', displayName: 'User Data', group: 'custom' },
    
    // Context & Page Data
    { key: 'dl', displayName: 'Page URL', group: 'context', format: 'url' },
    { key: 'rl', displayName: 'Referrer URL', group: 'context', format: 'url' },
    { key: 'if', displayName: 'In iFrame', group: 'context', type: 'boolean' },
    { key: 'ts', displayName: 'Timestamp', group: 'context', format: 'timestamp' },
    { key: 'sw', displayName: 'Screen Width', group: 'context', type: 'number' },
    { key: 'sh', displayName: 'Screen Height', group: 'context', type: 'number' },
    
    // Technical Details
    { key: 'v', displayName: 'Pixel Version', group: 'technical' },
    { key: 'r', displayName: 'Random/Cache Buster', group: 'technical' },
    { key: 'ec', displayName: 'Event Count', group: 'technical', type: 'number' },
    { key: 'en', displayName: 'Event Nonce', group: 'technical' },
    { key: 'it', displayName: 'Init Time', group: 'technical', format: 'timestamp' },
    { key: 'coo', displayName: 'Cookie Enabled', group: 'technical', type: 'boolean' },
    { key: 'xs', displayName: 'Cross Site', group: 'technical' },
    { key: 'eid', displayName: 'Event Instance ID', group: 'technical' },
    { key: 'cs', displayName: 'Checksum', group: 'technical' },
    { key: 'dpo', displayName: 'Data Processing Options', group: 'technical' },
    { key: 'dpoco', displayName: 'Data Processing Country', group: 'technical' },
    { key: 'dpost', displayName: 'Data Processing State', group: 'technical' },
    { key: 'ccpa_status', displayName: 'CCPA Status', group: 'technical' }
  ]
  
  protected findDefinition(key: string): ParameterDefinition | undefined {
    // Check for custom data parameters (cd[something])
    if (key.startsWith('cd[') && key.endsWith(']')) {
      const innerKey = key.slice(3, -1)
      return {
        key,
        displayName: this.humanizeKey(innerKey),
        group: 'custom',
        description: `Custom parameter: ${innerKey}`
      }
    }
    
    // Check for user data parameters (ud[something])
    if (key.startsWith('ud[') && key.endsWith(']')) {
      const innerKey = key.slice(3, -1)
      return {
        key,
        displayName: this.humanizeKey(innerKey),
        group: 'custom',
        description: `User data: ${innerKey}`
      }
    }
    
    return super.findDefinition(key)
  }
}