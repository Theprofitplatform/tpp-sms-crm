import { Badge } from '@/components/ui/badge'
import { Wifi, WifiOff, Loader2 } from 'lucide-react'

export function LiveIndicator({ isConnected, isLoading = false, showLabel = true }) {
  if (isLoading) {
    return (
      <Badge variant="outline" className="gap-1.5">
        <Loader2 className="h-3 w-3 animate-spin" />
        {showLabel && <span>Connecting...</span>}
      </Badge>
    )
  }

  return (
    <Badge 
      variant={isConnected ? "success" : "secondary"}
      className="gap-1.5"
    >
      <span className="relative flex h-2 w-2">
        {isConnected && (
          <>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </>
        )}
        {!isConnected && (
          <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-400"></span>
        )}
      </span>
      {showLabel && (
        <span>{isConnected ? 'Live' : 'Offline'}</span>
      )}
    </Badge>
  )
}
