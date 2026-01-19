/**
 * PositionCard - Visual card showing position details with P&L and risk levels
 *
 * Features:
 * - Visual P&L indicator with color coding
 * - Stop-loss and take-profit progress bars
 * - Current price vs entry price comparison
 * - Quick close button
 */

import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  TrendingUp,
  TrendingDown,
  Target,
  Shield,
  X,
  ChevronRight
} from 'lucide-react'
import { formatCurrency, formatPercent } from '@/utils/formatters'

/**
 * Calculate P&L percentage
 */
function calculatePnlPercent(entryPrice, currentPrice, side) {
  if (!entryPrice || !currentPrice) return 0
  const change = side === 'LONG'
    ? (currentPrice - entryPrice) / entryPrice
    : (entryPrice - currentPrice) / entryPrice
  return change * 100
}

/**
 * Calculate stop-loss progress (0-100, where 100 = at stop loss)
 */
function calculateStopProgress(entryPrice, currentPrice, stopLoss, side) {
  if (!stopLoss || !entryPrice) return 0

  if (side === 'LONG') {
    // For LONG: progress increases as price moves toward stop-loss (down)
    const totalRange = entryPrice - stopLoss
    const currentDistance = entryPrice - currentPrice
    if (totalRange <= 0) return 0
    return Math.max(0, Math.min(100, (currentDistance / totalRange) * 100))
  } else {
    // For SHORT: progress increases as price moves toward stop-loss (up)
    const totalRange = stopLoss - entryPrice
    const currentDistance = currentPrice - entryPrice
    if (totalRange <= 0) return 0
    return Math.max(0, Math.min(100, (currentDistance / totalRange) * 100))
  }
}

/**
 * Calculate take-profit progress (0-100, where 100 = at take profit)
 */
function calculateTakeProfitProgress(entryPrice, currentPrice, takeProfit, side) {
  if (!takeProfit || !entryPrice) return 0

  if (side === 'LONG') {
    // For LONG: progress increases as price moves toward take-profit (up)
    const totalRange = takeProfit - entryPrice
    const currentGain = currentPrice - entryPrice
    if (totalRange <= 0) return 0
    return Math.max(0, Math.min(100, (currentGain / totalRange) * 100))
  } else {
    // For SHORT: progress increases as price moves toward take-profit (down)
    const totalRange = entryPrice - takeProfit
    const currentGain = entryPrice - currentPrice
    if (totalRange <= 0) return 0
    return Math.max(0, Math.min(100, (currentGain / totalRange) * 100))
  }
}

export function PositionCard({
  position,
  onClose,
  compact = false,
  className
}) {
  const {
    symbol,
    market = 'US',
    side,
    quantity,
    average_entry_price: entryPrice,
    current_price: currentPrice,
    stop_loss: stopLoss,
    take_profit: takeProfit,
    unrealized_pnl: unrealizedPnl
  } = position

  const pnlPercent = calculatePnlPercent(entryPrice, currentPrice, side)
  const isProfit = pnlPercent >= 0
  const stopProgress = calculateStopProgress(entryPrice, currentPrice, stopLoss, side)
  const tpProgress = calculateTakeProfitProgress(entryPrice, currentPrice, takeProfit, side)

  // Calculate dollar P&L
  const dollarPnl = unrealizedPnl ?? (side === 'LONG'
    ? (currentPrice - entryPrice) * quantity
    : (entryPrice - currentPrice) * quantity)

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors",
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center justify-center w-8 h-8 rounded-full",
            isProfit ? "bg-green-500/10" : "bg-red-500/10"
          )}>
            {isProfit
              ? <TrendingUp className="h-4 w-4 text-green-500" />
              : <TrendingDown className="h-4 w-4 text-red-500" />
            }
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{symbol}</span>
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded",
                side === 'LONG' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
              )}>
                {side}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {quantity} @ {formatCurrency(entryPrice)}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className={cn(
            "font-semibold",
            isProfit ? "text-green-500" : "text-red-500"
          )}>
            {isProfit ? '+' : ''}{formatPercent(pnlPercent)}
          </div>
          <div className={cn(
            "text-sm",
            isProfit ? "text-green-500/70" : "text-red-500/70"
          )}>
            {isProfit ? '+' : ''}{formatCurrency(dollarPnl)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* Header with P&L indicator */}
      <div className={cn(
        "h-1",
        isProfit ? "bg-green-500" : "bg-red-500"
      )} />

      <CardContent className="p-4 space-y-4">
        {/* Symbol and Side */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full",
              isProfit ? "bg-green-500/10" : "bg-red-500/10"
            )}>
              {isProfit
                ? <TrendingUp className="h-5 w-5 text-green-500" />
                : <TrendingDown className="h-5 w-5 text-red-500" />
              }
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">{symbol}</h3>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium",
                  side === 'LONG' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                )}>
                  {side}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{market}</p>
            </div>
          </div>

          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onClose(position)}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Price Info */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-muted-foreground">Entry</p>
            <p className="font-semibold">{formatCurrency(entryPrice)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Current</p>
            <p className={cn(
              "font-semibold",
              isProfit ? "text-green-500" : "text-red-500"
            )}>
              {formatCurrency(currentPrice)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Qty</p>
            <p className="font-semibold">{quantity}</p>
          </div>
        </div>

        {/* P&L Display */}
        <div className={cn(
          "p-3 rounded-lg text-center",
          isProfit ? "bg-green-500/10" : "bg-red-500/10"
        )}>
          <div className={cn(
            "text-2xl font-bold",
            isProfit ? "text-green-500" : "text-red-500"
          )}>
            {isProfit ? '+' : ''}{formatCurrency(dollarPnl)}
          </div>
          <div className={cn(
            "text-sm",
            isProfit ? "text-green-500/70" : "text-red-500/70"
          )}>
            {isProfit ? '+' : ''}{formatPercent(pnlPercent)}
          </div>
        </div>

        {/* Stop Loss / Take Profit Progress */}
        {(stopLoss || takeProfit) && (
          <div className="space-y-3">
            {stopLoss && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-red-500">
                    <Shield className="h-3 w-3" />
                    <span>Stop Loss</span>
                  </div>
                  <span className="text-muted-foreground">{formatCurrency(stopLoss)}</span>
                </div>
                <Progress
                  value={stopProgress}
                  className="h-1.5 bg-red-500/20"
                  indicatorClassName="bg-red-500"
                />
              </div>
            )}

            {takeProfit && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-green-500">
                    <Target className="h-3 w-3" />
                    <span>Take Profit</span>
                  </div>
                  <span className="text-muted-foreground">{formatCurrency(takeProfit)}</span>
                </div>
                <Progress
                  value={tpProgress}
                  className="h-1.5 bg-green-500/20"
                  indicatorClassName="bg-green-500"
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default PositionCard
