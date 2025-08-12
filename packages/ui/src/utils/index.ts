import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility function to merge Tailwind CSS classes with proper override behavior
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get provider color class based on provider name - simplified for supported providers only
 */
export function getProviderColorClass(provider: string): string {
  const providerKey = provider.toLowerCase();
  
  switch (providerKey) {
    case 'facebook':
    case 'meta':
    case 'facebookpixel':
    case 'facebook-pixel':
      return 'provider-facebook';
    case 'tiktok':
    case 'tiktok-pixel':
      return 'provider-tiktok';
    default:
      return 'provider-badge'; // Default styling
  }
}

/**
 * Get confidence level class based on confidence score
 */
export function getConfidenceClass(confidence: number): string {
  if (confidence >= 0.95) return 'confidence-perfect';
  if (confidence >= 0.8) return 'confidence-high';
  if (confidence >= 0.6) return 'confidence-medium';
  return 'confidence-low';
}

/**
 * Get confidence level text based on confidence score
 */
export function getConfidenceText(confidence: number): string {
  if (confidence >= 0.95) return 'Perfect';
  if (confidence >= 0.8) return 'High';
  if (confidence >= 0.6) return 'Medium';
  return 'Low';
}

/**
 * Format event timestamp for display
 */
export function formatEventTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 1000) return 'Just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  
  return new Date(timestamp).toLocaleString();
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Extract domain from URL for display
 */
export function getDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * Format parameter value for display (handles objects, arrays, etc.)
 */
export function formatParameterValue(value: any): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  
  if (typeof value === 'string') {
    return value;
  }
  
  if (typeof value === 'boolean' || typeof value === 'number') {
    return String(value);
  }
  
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    if (value.length === 1) return String(value[0]);
    return `[${value.length} items]`;
  }
  
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) return '{}';
    if (keys.length === 1) return `{${keys[0]}: ${String(value[keys[0]])}}`;
    return `{${keys.length} properties}`;
  }
  
  return String(value);
}

/**
 * Check if theme should default to dark mode
 */
export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  
  return window.matchMedia('(prefers-color-scheme: dark)').matches 
    ? 'dark' 
    : 'light';
}

/**
 * Debounce function for search and filtering
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${Math.round(bytes / Math.pow(k, i) * 100) / 100} ${sizes[i]}`;
}

/**
 * Format currency amount to human readable string
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  if (amount === 0) return '$0.00';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}
