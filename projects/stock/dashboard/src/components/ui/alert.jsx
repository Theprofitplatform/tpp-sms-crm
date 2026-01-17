import * as React from "react"
import { cva } from "class-variance-authority"
import { AlertCircle, CheckCircle, AlertTriangle, Info, X } from "lucide-react"
import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          "border-destructive/50 text-destructive bg-destructive/10 [&>svg]:text-destructive",
        success:
          "border-success/50 text-success bg-success/10 [&>svg]:text-success",
        warning:
          "border-warning/50 text-warning bg-warning/10 [&>svg]:text-warning",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef(({ className, variant, onClose, ...props }, ref) => {
  const icons = {
    default: Info,
    destructive: AlertCircle,
    success: CheckCircle,
    warning: AlertTriangle,
  }
  const IconComponent = icons[variant] || icons.default

  return (
    <div
      ref={ref}
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      <IconComponent className="h-4 w-4" />
      {props.children}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute right-2 top-2 rounded-md p-1 opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
})
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
