import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // PixelTracer specific variants
        success:
          "border-transparent bg-pixel-success text-white hover:bg-pixel-success/80",
        warning:
          "border-transparent bg-pixel-warning text-white hover:bg-pixel-warning/80",
        error:
          "border-transparent bg-pixel-error text-white hover:bg-pixel-error/80",
        info:
          "border-transparent bg-pixel-info text-white hover:bg-pixel-info/80",
        // Provider variants
        google:
          "border-transparent bg-provider-google text-white hover:bg-provider-google/80",
        facebook:
          "border-transparent bg-provider-facebook text-white hover:bg-provider-facebook/80",
        tiktok:
          "border-transparent bg-provider-tiktok text-white hover:bg-provider-tiktok/80",
        linkedin:
          "border-transparent bg-provider-linkedin text-white hover:bg-provider-linkedin/80",
        twitter:
          "border-transparent bg-provider-twitter text-white hover:bg-provider-twitter/80",
        // Confidence variants
        "confidence-low":
          "border-transparent bg-confidence-low text-white hover:bg-confidence-low/80",
        "confidence-medium":
          "border-transparent bg-confidence-medium text-white hover:bg-confidence-medium/80",
        "confidence-high":
          "border-transparent bg-confidence-high text-white hover:bg-confidence-high/80",
        "confidence-perfect":
          "border-transparent bg-confidence-perfect text-white hover:bg-confidence-perfect/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }