import { useMemo, useState, useCallback } from 'react';
import { TrackingEvent } from '@pixeltracer/shared';

export interface EventFilters {
  searchQuery?: string;
  provider?: string;
  eventType?: string;
  confidenceRange?: {
    min: number;
    max: number;
  };
  dateRange?: {
    start: number;
    end: number;
  };
  method?: string;
  showOnlyRecent?: boolean;
  recentThresholdMs?: number;
}

export interface FilterStats {
  total: number;
  filtered: number;
  providers: string[];
  eventTypes: string[];
  methods: string[];
  confidenceRange: { min: number; max: number };
  dateRange: { start: number; end: number };
}

/**
 * Advanced filtering hook for tracking events
 * Provides high-performance filtering with statistics
 */
export function useEventFilters(events: TrackingEvent[], initialFilters: EventFilters = {}) {
  const [filters, setFilters] = useState<EventFilters>(initialFilters);

  // Calculate filter statistics
  const stats: FilterStats = useMemo(() => {
    if (events.length === 0) {
      return {
        total: 0,
        filtered: 0,
        providers: [],
        eventTypes: [],
        methods: [],
        confidenceRange: { min: 0, max: 1 },
        dateRange: { start: 0, end: 0 }
      };
    }

    const providers = Array.from(new Set(events.map(e => e.provider))).sort();
    const eventTypes = Array.from(new Set(events.map(e => e.eventType).filter((type): type is string => Boolean(type)))).sort();
    const methods = Array.from(new Set(events.map(e => e.method))).sort();
    
    const confidences = events.map(e => e.confidence);
    const timestamps = events.map(e => e.timestamp);

    return {
      total: events.length,
      filtered: 0, // Will be calculated by filteredEvents
      providers,
      eventTypes,
      methods,
      confidenceRange: {
        min: Math.min(...confidences),
        max: Math.max(...confidences)
      },
      dateRange: {
        start: Math.min(...timestamps),
        end: Math.max(...timestamps)
      }
    };
  }, [events]);

  // Apply filters
  const filteredEvents = useMemo(() => {
    let filtered = events;

    // Text search across multiple fields
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(event => 
        event.url.toLowerCase().includes(query) ||
        event.providerName.toLowerCase().includes(query) ||
        event.eventType?.toLowerCase().includes(query) ||
        event.method.toLowerCase().includes(query) ||
        Object.keys(event.parameters).some(key => 
          key.toLowerCase().includes(query) ||
          String(event.parameters[key]).toLowerCase().includes(query)
        )
      );
    }

    // Provider filter
    if (filters.provider) {
      filtered = filtered.filter(event => event.provider === filters.provider);
    }

    // Event type filter
    if (filters.eventType) {
      filtered = filtered.filter(event => event.eventType === filters.eventType);
    }

    // Method filter
    if (filters.method) {
      filtered = filtered.filter(event => event.method === filters.method);
    }

    // Confidence range filter
    if (filters.confidenceRange) {
      const { min, max } = filters.confidenceRange;
      filtered = filtered.filter(event => 
        event.confidence >= min && event.confidence <= max
      );
    }

    // Date range filter
    if (filters.dateRange) {
      const { start, end } = filters.dateRange;
      filtered = filtered.filter(event => 
        event.timestamp >= start && event.timestamp <= end
      );
    }

    // Recent events filter
    if (filters.showOnlyRecent) {
      const threshold = filters.recentThresholdMs || 300000; // 5 minutes default
      const cutoff = Date.now() - threshold;
      filtered = filtered.filter(event => event.timestamp >= cutoff);
    }

    return filtered;
  }, [events, filters]);

  // Update filter functions
  const updateFilter = useCallback(<K extends keyof EventFilters>(
    key: K,
    value: EventFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateFilters = useCallback((newFilters: Partial<EventFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const clearFilter = useCallback((key: keyof EventFilters) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  }, []);

  // Convenience setters
  const setSearchQuery = useCallback((query: string) => {
    updateFilter('searchQuery', query || undefined);
  }, [updateFilter]);

  const setProvider = useCallback((provider: string) => {
    updateFilter('provider', provider || undefined);
  }, [updateFilter]);

  const setEventType = useCallback((eventType: string) => {
    updateFilter('eventType', eventType || undefined);
  }, [updateFilter]);

  const setConfidenceRange = useCallback((min: number, max: number) => {
    updateFilter('confidenceRange', { min, max });
  }, [updateFilter]);

  const setDateRange = useCallback((start: number, end: number) => {
    updateFilter('dateRange', { start, end });
  }, [updateFilter]);

  const setRecentFilter = useCallback((enabled: boolean, thresholdMs?: number) => {
    setFilters(prev => ({
      ...prev,
      showOnlyRecent: enabled || undefined,
      recentThresholdMs: thresholdMs
    }));
  }, []);

  // Get active filter count
  const activeFilterCount = useMemo(() => {
    return Object.keys(filters).filter(key => {
      const value = filters[key as keyof EventFilters];
      return value !== undefined && value !== '';
    }).length;
  }, [filters]);

  return {
    // Filtered data
    filteredEvents,
    stats: { ...stats, filtered: filteredEvents.length },
    
    // Current filters
    filters,
    activeFilterCount,
    
    // Filter setters
    updateFilter,
    updateFilters,
    clearFilters,
    clearFilter,
    setSearchQuery,
    setProvider,
    setEventType,
    setConfidenceRange,
    setDateRange,
    setRecentFilter
  };
}