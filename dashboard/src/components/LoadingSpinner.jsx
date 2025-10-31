/**
 * Loading Spinner Component
 * 
 * Versatile loading indicator with different sizes and styles
 */

import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function LoadingSpinner({ 
  size = 'default', 
  className,
  text,
  fullScreen = false 
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    default: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  }

  const spinner = (
    <div className={cn('flex items-center gap-2', className)}>
      <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
      {text && <span className="text-muted-foreground">{text}</span>}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
        {spinner}
      </div>
    )
  }

  return spinner
}

/**
 * Loading Overlay - For loading on top of existing content
 */
export function LoadingOverlay({ text = 'Loading...' }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg z-10">
      <LoadingSpinner text={text} size="lg" />
    </div>
  )
}

/**
 * Inline Loading - Small inline spinner
 */
export function InlineLoading({ text = 'Loading' }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>{text}...</span>
    </div>
  )
}
