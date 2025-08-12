import { ParameterGrouper, ParameterDefinition, ParameterGroup, COMMON_GROUPS } from '../base/parameter-groups'

export class GoogleAdsParameterGrouper extends ParameterGrouper {
  protected groups: { [key: string]: ParameterGroup } = {
    event: COMMON_GROUPS.event,
    conversion: {
      id: 'conversion',
      name: 'Conversion Data',
      description: 'Conversion tracking information',
      priority: 2
    },
    user: COMMON_GROUPS.user,
    product: COMMON_GROUPS.product,
    context: COMMON_GROUPS.context,
    enhanced: COMMON_GROUPS.enhanced,
    technical: COMMON_GROUPS.technical
  }
  
  protected parameterDefinitions: ParameterDefinition[] = [
    // Event Data
    { key: 'en', displayName: 'Event Name', group: 'event', description: 'The name of the event being tracked' },
    { key: 'event_name', displayName: 'Event Name', group: 'event' },
    { key: 'event', displayName: 'Event Type', group: 'event' },
    { key: 'ea', displayName: 'Event Action', group: 'event' },
    { key: 'ec', displayName: 'Event Category', group: 'event' },
    { key: 'el', displayName: 'Event Label', group: 'event' },
    
    // Conversion Data
    { key: 'conversion_id', displayName: 'Conversion ID', group: 'conversion', description: 'Google Ads conversion tracking ID' },
    { key: 'id', displayName: 'Conversion ID', group: 'conversion' },
    { key: 'label', displayName: 'Conversion Label', group: 'conversion', description: 'Label for this conversion action' },
    { key: 'conversion_label', displayName: 'Conversion Label', group: 'conversion' },
    { key: 'value', displayName: 'Conversion Value', group: 'conversion', format: 'currency', description: 'Monetary value of the conversion' },
    { key: 'currency_code', displayName: 'Currency', group: 'conversion', description: 'Currency code for the conversion value' },
    { key: 'transaction_id', displayName: 'Transaction ID', group: 'conversion', description: 'Unique transaction identifier' },
    { key: 'tid', displayName: 'Tracking ID', group: 'conversion' },
    { key: 'aw_remarketing', displayName: 'Remarketing', group: 'conversion' },
    { key: 'aw_remarketing_only', displayName: 'Remarketing Only', group: 'conversion' },
    
    // User Properties
    { key: 'cid', displayName: 'Client ID', group: 'user', description: 'Google Analytics client ID' },
    { key: 'uid', displayName: 'User ID', group: 'user' },
    { key: 'sid', displayName: 'Session ID', group: 'user' },
    { key: 'uip', displayName: 'User IP', group: 'user' },
    { key: 'ua', displayName: 'User Agent', group: 'user' },
    { key: 'ul', displayName: 'User Language', group: 'user' },
    
    // Product Information
    { key: 'items', displayName: 'Items', group: 'product', type: 'array' },
    { key: 'pr*', displayName: 'Product', group: 'product' },
    { key: 'item_id', displayName: 'Item ID', group: 'product' },
    { key: 'item_name', displayName: 'Item Name', group: 'product' },
    { key: 'item_category', displayName: 'Item Category', group: 'product' },
    { key: 'item_brand', displayName: 'Item Brand', group: 'product' },
    { key: 'quantity', displayName: 'Quantity', group: 'product', type: 'number' },
    { key: 'price', displayName: 'Price', group: 'product', format: 'currency' },
    
    // Context & Page Data
    { key: 'dl', displayName: 'Document Location', group: 'context', format: 'url', description: 'Page URL' },
    { key: 'dr', displayName: 'Document Referrer', group: 'context', format: 'url' },
    { key: 'dt', displayName: 'Document Title', group: 'context', description: 'Page title' },
    { key: 'dh', displayName: 'Document Host', group: 'context' },
    { key: 'dp', displayName: 'Document Path', group: 'context' },
    { key: 'sr', displayName: 'Screen Resolution', group: 'context' },
    { key: 'vp', displayName: 'Viewport Size', group: 'context' },
    { key: 'de', displayName: 'Document Encoding', group: 'context' },
    { key: 'sd', displayName: 'Screen Color Depth', group: 'context' },
    
    // Enhanced Conversions
    { key: 'em', displayName: 'Email (Hashed)', group: 'enhanced', format: 'email', description: 'SHA256 hashed email address' },
    { key: 'phone', displayName: 'Phone (Hashed)', group: 'enhanced', format: 'phone', description: 'SHA256 hashed phone number' },
    { key: 'fn', displayName: 'First Name (Hashed)', group: 'enhanced' },
    { key: 'ln', displayName: 'Last Name (Hashed)', group: 'enhanced' },
    { key: 'address', displayName: 'Address (Hashed)', group: 'enhanced' },
    { key: 'city', displayName: 'City (Hashed)', group: 'enhanced' },
    { key: 'region', displayName: 'Region (Hashed)', group: 'enhanced' },
    { key: 'country', displayName: 'Country', group: 'enhanced' },
    { key: 'postal_code', displayName: 'Postal Code (Hashed)', group: 'enhanced' },
    
    // Technical Details
    { key: 'v', displayName: 'Protocol Version', group: 'technical' },
    { key: 'gtm', displayName: 'GTM Container ID', group: 'technical' },
    { key: 'gtm_version', displayName: 'GTM Version', group: 'technical' },
    { key: 'fmt', displayName: 'Format', group: 'technical' },
    { key: 'random', displayName: 'Cache Buster', group: 'technical' },
    { key: 'guid', displayName: 'GUID', group: 'technical' },
    { key: 'script', displayName: 'Script Version', group: 'technical' },
    { key: 'data', displayName: 'Data Payload', group: 'technical', type: 'object' },
    { key: 'url', displayName: 'Tracking URL', group: 'technical', format: 'url' },
    { key: 'ref_url', displayName: 'Referrer URL', group: 'technical', format: 'url' },
    { key: 'is_vtc', displayName: 'View-Through Conversion', group: 'technical', type: 'boolean' },
    { key: 'gcs', displayName: 'Google Consent State', group: 'technical' },
    { key: 'gcd', displayName: 'Google Consent Mode', group: 'technical' },
    { key: 'dma', displayName: 'DMA Compliance', group: 'technical' },
    { key: 'dma_cps', displayName: 'DMA CPS', group: 'technical' }
  ]
}