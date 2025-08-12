/**
 * Parameter Grouping System
 * 
 * Defines how provider parameters should be grouped and displayed in the UI.
 * Each provider can define its own grouping logic while maintaining a consistent interface.
 */

export interface GroupedParameter {
  key: string
  displayName: string
  value: any
  description?: string
  format?: 'currency' | 'timestamp' | 'percentage' | 'bytes' | 'duration'
}

export interface ParameterGroup {
  id: string
  name: string
  icon?: string // Icon identifier, not React component
  parameters: GroupedParameter[]
  description?: string
  priority?: number // Display order priority
}

export type ParameterGroupIcon = 
  | 'event'      // Event/Action tracking
  | 'user'       // User/Identity data
  | 'product'    // Product/Commerce data
  | 'custom'     // Custom data
  | 'context'    // Page/Browser context
  | 'technical'  // Technical parameters
  | 'privacy'    // Privacy/Consent data
  | 'performance' // Performance metrics

/**
 * Base interface for providers to implement parameter grouping
 */
export interface ParameterGroupingProvider {
  /**
   * Group parameters into logical sections for display
   */
  groupParameters(parameters: Record<string, any>): ParameterGroup[]
  
  /**
   * Get display name for a parameter key
   */
  getParameterDisplayName(key: string): string
  
  /**
   * Get description for a parameter key
   */
  getParameterDescription?(key: string): string | undefined
  
  /**
   * Get format hint for a parameter value
   */
  getParameterFormat?(key: string): GroupedParameter['format'] | undefined
}

/**
 * Default parameter grouping implementation
 */
export class DefaultParameterGrouping implements ParameterGroupingProvider {
  groupParameters(parameters: Record<string, any>): ParameterGroup[] {
    const groups: { [key: string]: ParameterGroup } = {
      event: {
        id: 'event',
        name: 'Event Information',
        icon: 'event',
        parameters: [],
        description: 'Core event tracking data',
        priority: 1
      },
      user: {
        id: 'user',
        name: 'User & Identity',
        icon: 'user',
        parameters: [],
        description: 'User identification and properties',
        priority: 2
      },
      product: {
        id: 'product',
        name: 'Product & Commerce',
        icon: 'product',
        parameters: [],
        description: 'Product and transaction information',
        priority: 3
      },
      context: {
        id: 'context',
        name: 'Page & Context',
        icon: 'context',
        parameters: [],
        description: 'Page and browser context',
        priority: 4
      },
      technical: {
        id: 'technical',
        name: 'Technical Details',
        icon: 'technical',
        parameters: [],
        description: 'Technical tracking parameters',
        priority: 5
      }
    }
    
    // Generic grouping logic
    Object.entries(parameters).forEach(([key, value]) => {
      if (value === undefined || value === null) return
      
      let group = 'technical'
      let displayName = this.getParameterDisplayName(key)
      
      // Event parameters
      if (['en', 'ev', 'event', 'event_name', 'eventType', 'action'].includes(key)) {
        group = 'event'
      }
      // User parameters
      else if (['id', 'cid', 'uid', 'user_id', 'external_id'].includes(key)) {
        group = 'user'
      }
      // Product parameters
      else if (['value', 'price', 'revenue', 'currency', 'items', 'products'].includes(key)) {
        group = 'product'
      }
      // Context parameters
      else if (['dl', 'url', 'page_url', 'dr', 'referrer', 'dt', 'title'].includes(key)) {
        group = 'context'
      }
      
      if (groups[group]) {
        groups[group].parameters.push({
          key,
          displayName,
          value,
          description: this.getParameterDescription?.(key),
          format: this.getParameterFormat?.(key)
        })
      }
    })
    
    // Filter out empty groups and sort by priority
    return Object.values(groups)
      .filter(g => g.parameters.length > 0)
      .sort((a, b) => (a.priority || 0) - (b.priority || 0))
  }
  
  getParameterDisplayName(key: string): string {
    // Convert snake_case or camelCase to Title Case
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }
  
  getParameterDescription(key: string): string | undefined {
    const descriptions: Record<string, string> = {
      'id': 'Unique identifier for this account or pixel',
      'event': 'The type of event being tracked',
      'value': 'Monetary value associated with this event',
      'currency': 'Currency code for the transaction',
      'url': 'The URL where this event occurred',
      'referrer': 'The referring URL that led to this page'
    }
    return descriptions[key]
  }
  
  getParameterFormat(key: string): GroupedParameter['format'] | undefined {
    if (['value', 'price', 'revenue'].includes(key)) return 'currency'
    if (['timestamp', 'time', 'event_time'].includes(key)) return 'timestamp'
    if (['percentage', 'rate'].includes(key)) return 'percentage'
    if (['size', 'bytes'].includes(key)) return 'bytes'
    if (['duration', 'time_spent'].includes(key)) return 'duration'
    return undefined
  }
}