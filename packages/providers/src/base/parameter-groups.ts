/**
 * Parameter grouping definitions for better organization in UI
 */

export interface ParameterGroup {
  id: string
  name: string
  description?: string
  icon?: string
  priority: number
}

export interface ParameterDefinition {
  key: string
  displayName: string
  group: string
  description?: string
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array'
  format?: 'currency' | 'percentage' | 'timestamp' | 'url' | 'email' | 'phone'
}

export interface GroupedParameters {
  [groupId: string]: {
    group: ParameterGroup
    parameters: Array<{
      key: string
      displayName: string
      value: any
      description?: string
      format?: string
    }>
  }
}

// Common parameter groups used across providers
export const COMMON_GROUPS = {
  event: {
    id: 'event',
    name: 'Event Data',
    description: 'Core event tracking information',
    priority: 1
  },
  user: {
    id: 'user',
    name: 'User Properties',
    description: 'User identification and properties',
    priority: 2
  },
  product: {
    id: 'product',
    name: 'Product Information',
    description: 'E-commerce and product details',
    priority: 3
  },
  custom: {
    id: 'custom',
    name: 'Custom Data',
    description: 'Custom parameters and properties',
    priority: 4
  },
  context: {
    id: 'context',
    name: 'Context & Page Data',
    description: 'Page and context information',
    priority: 5
  },
  technical: {
    id: 'technical',
    name: 'Technical Details',
    description: 'Technical tracking parameters',
    priority: 6
  },
  enhanced: {
    id: 'enhanced',
    name: 'Enhanced Conversions',
    description: 'Enhanced conversion tracking data',
    priority: 7
  },
  debug: {
    id: 'debug',
    name: 'Debug Information',
    description: 'Debugging and diagnostic data',
    priority: 10
  }
} as const

// Base class for parameter grouping
export abstract class ParameterGrouper {
  protected abstract parameterDefinitions: ParameterDefinition[]
  protected abstract groups: { [key: string]: ParameterGroup }
  
  /**
   * Group parameters into organized categories
   */
  groupParameters(parameters: Record<string, any>): GroupedParameters {
    const grouped: GroupedParameters = {}
    
    // Initialize groups
    Object.values(this.groups).forEach(group => {
      grouped[group.id] = {
        group,
        parameters: []
      }
    })
    
    // Process each parameter
    Object.entries(parameters).forEach(([key, value]) => {
      const definition = this.findDefinition(key)
      
      if (definition) {
        // Known parameter with definition
        const groupId = definition.group
        if (grouped[groupId]) {
          grouped[groupId].parameters.push({
            key,
            displayName: definition.displayName,
            value,
            description: definition.description,
            format: definition.format
          })
        }
      } else {
        // Unknown parameter - add to technical group
        if (grouped.technical) {
          grouped.technical.parameters.push({
            key,
            displayName: this.humanizeKey(key),
            value,
            description: undefined,
            format: undefined
          })
        }
      }
    })
    
    // Remove empty groups
    Object.keys(grouped).forEach(groupId => {
      if (grouped[groupId].parameters.length === 0) {
        delete grouped[groupId]
      }
    })
    
    // Sort groups by priority
    const sortedGrouped: GroupedParameters = {}
    Object.keys(grouped)
      .sort((a, b) => grouped[a].group.priority - grouped[b].group.priority)
      .forEach(key => {
        sortedGrouped[key] = grouped[key]
      })
    
    return sortedGrouped
  }
  
  /**
   * Find parameter definition by key
   */
  protected findDefinition(key: string): ParameterDefinition | undefined {
    return this.parameterDefinitions.find(def => 
      def.key === key || 
      this.matchesPattern(key, def.key)
    )
  }
  
  /**
   * Check if a key matches a pattern (supports wildcards)
   */
  protected matchesPattern(key: string, pattern: string): boolean {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
      return regex.test(key)
    }
    return false
  }
  
  /**
   * Convert technical key to human-readable name
   */
  protected humanizeKey(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/\./g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }
}