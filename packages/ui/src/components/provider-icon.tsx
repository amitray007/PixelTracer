/**
 * Provider Icon Component
 * Shows provider-specific icons using local asset files from Omnibug
 */

import * as React from "react"
import { Activity } from 'lucide-react'
import { Tooltip } from "./ui/tooltip"
import { cn } from "../utils"

interface ProviderIconProps {
  provider: string
  className?: string
  showTooltip?: boolean
  size?: 'sm' | 'md' | 'lg'
  iconUrl?: string
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6"
}

// Get Chrome extension URL for local assets
const getIconUrl = (filename: string): string => {
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
    return chrome.runtime.getURL(`assets/provider-icons/${filename}`)
  }
  // Fallback for development/non-extension environments
  return `/assets/provider-icons/${filename}`
}

// Provider icon filenames from Omnibug
const providerIconFiles: Record<string, string> = {
  'google-ads': 'GOOGLEADS16x16.png',
  'google-analytics': 'GOOGLEANALYTICS16x16.png', 
  'google-tag-manager': 'GOOGLETAGMANAGER16x16.png',
  'facebook-pixel': 'FACEBOOK16x16.png',
  'facebook': 'FACEBOOK16x16.png',
  'meta': 'FACEBOOK16x16.png',
  'tiktok-pixel': 'TIKTOK16x16.png',
  'tiktok': 'TIKTOK16x16.png',
}

const providerNames: Record<string, string> = {
  'google-ads': 'Google Ads',
  'google-analytics': 'Google Analytics',
  'google-tag-manager': 'Google Tag Manager',
  'facebook-pixel': 'Facebook Pixel',
  'meta': 'Meta',
  'tiktok-pixel': 'TikTok Pixel',
}

const ProviderIcon: React.FC<ProviderIconProps> = ({ 
  provider, 
  className,
  showTooltip = true,
  size = 'md',
  iconUrl
}) => {
  const normalizedProvider = provider.toLowerCase().replace(/[\s_]/g, '-')
  const displayName = providerNames[normalizedProvider] || provider
  
  // Prioritize local assets over external iconUrl
  const localIconFile = providerIconFiles[normalizedProvider]
  const localIconUrl = localIconFile ? getIconUrl(localIconFile) : null
  const imageUrl = localIconUrl || iconUrl
  
  const icon = imageUrl ? (
    <img 
      src={imageUrl}
      alt={displayName}
      className={cn(sizeClasses[size], "object-contain", className)}
      onError={(e) => {
        e.currentTarget.style.display = 'none'
        e.currentTarget.nextElementSibling?.classList.remove('hidden')
      }}
    />
  ) : (
    <Activity className={cn(sizeClasses[size], className)} />
  )
  
  const iconWithFallback = imageUrl ? (
    <span className="inline-flex items-center justify-center">
      {icon}
      <Activity className={cn(sizeClasses[size], "hidden", className)} />
    </span>
  ) : icon

  if (showTooltip) {
    return (
      <Tooltip content={displayName}>
        {iconWithFallback}
      </Tooltip>
    )
  }

  return iconWithFallback
}

export { ProviderIcon }