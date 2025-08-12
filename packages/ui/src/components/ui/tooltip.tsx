/**
 * Tooltip Component
 * Based on Radix UI Tooltip
 */

import * as React from "react"
import { cn } from "../../utils"

export interface TooltipProps {
  content: string
  children: React.ReactNode
  delay?: number
  className?: string
}

const Tooltip: React.FC<TooltipProps> = ({ 
  content, 
  children, 
  delay = 1000,
  className 
}) => {
  const [isVisible, setIsVisible] = React.useState(false)
  const timeoutRef = React.useRef<NodeJS.Timeout>()

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
    }, delay)
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div
          className={cn(
            "absolute z-50 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded-md shadow-lg",
            "bottom-full left-1/2 transform -translate-x-1/2 mb-1",
            "before:content-[''] before:absolute before:top-full before:left-1/2 before:transform before:-translate-x-1/2",
            "before:border-4 before:border-transparent before:border-t-gray-900",
            "animate-in fade-in-0 zoom-in-95 duration-200",
            "dark:bg-gray-100 dark:text-gray-900 dark:before:border-t-gray-100",
            className
          )}
        >
          {content}
        </div>
      )}
    </div>
  )
}

export { Tooltip }