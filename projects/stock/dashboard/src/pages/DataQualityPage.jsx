// DataQualityPage.jsx
// Displays data quality metrics and validation status for market data
// Dependencies: React, axios, lucide-react, custom UI components

import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { API } from '@/config/api'
import {
  Database,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Search,
  Activity,
  Clock
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { StatCard } from '@/components/data-display/StatCard'
import { EmptyState } from '@/components/feedback/EmptyState'
import { SkeletonStatCard, SkeletonCard } from '@/components/ui/Skeleton'
import { formatDate } from '@/utils/formatters'

export default function DataQualityPage() {
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState(null)
  const [symbols, setSymbols] = useState([])
  const [qualityResults, setQualityResults] = useState({})
  const [searchSymbol, setSearchSymbol] = useState('')
  const [selectedSymbol, setSelectedSymbol] = useState(null)
  const [symbolQuality, setSymbolQuality] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await axios.get(API.data.symbols(), { timeout: 5000 })
      setSymbols(res.data || [])
    } catch (err) {
      console.error('Error fetching symbols:', err.message)
      setError('Failed to fetch symbols from data service')
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const checkSymbolQuality = async (symbol) => {
    setSelectedSymbol(symbol)
    setChecking(true)
    setSymbolQuality(null)

    try {
      const res = await axios.get(API.data.quality(symbol), { timeout: 10000 })
      setSymbolQuality(res.data)
      setQualityResults(prev => ({ ...prev, [symbol]: res.data }))
    } catch (err) {
      console.error('Quality check failed:', err.message)
      toast.error({
        title: 'Quality Check Failed',
        description: err.response?.data?.detail || err.response?.data?.error || err.message
      })
      setSymbolQuality(null)
    }

    setChecking(false)
  }

  const getQualityBadge = (quality) => {
    if (!quality) return null
    const score = quality.score || 0
    if (score >= 0.9) {
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle className="h-3 w-3 mr-1" aria-hidden="true" />
          Good
        </Badge>
      )
    }
    if (score >= 0.7) {
      return (
        <Badge variant="warning">
          <AlertTriangle className="h-3 w-3 mr-1" aria-hidden="true" />
          Fair
        </Badge>
      )
    }
    return (
      <Badge variant="destructive">
        <XCircle className="h-3 w-3 mr-1" aria-hidden="true" />
        Poor
      </Badge>
    )
  }

  const filteredSymbols = symbols.filter(s =>
    typeof s === 'string' && s.toLowerCase().includes(searchSymbol.toLowerCase())
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Data Quality</h1>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <SkeletonStatCard key={i} />)}
        </div>
        <SkeletonCard />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Data Quality</h1>
        </div>
        <Button
          variant="outline"
          onClick={fetchData}
          disabled={loading}
          aria-label="Refresh data"
        >
          <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} aria-hidden="true" />
          Refresh
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive">
          {error}
          <Button variant="link" className="ml-2 h-auto p-0" onClick={fetchData}>
            Retry
          </Button>
        </div>
      )}

      {/* Search */}
      <div className="flex gap-4 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder="Search symbols..."
            value={searchSymbol}
            onChange={(e) => setSearchSymbol(e.target.value)}
            className="pl-9"
            aria-label="Search symbols"
          />
        </div>
        <Button
          onClick={() => searchSymbol && checkSymbolQuality(searchSymbol.toUpperCase())}
          disabled={!searchSymbol || checking}
        >
          {checking ? 'Checking...' : 'Check Quality'}
        </Button>
      </div>

      {/* Selected Symbol Quality Details */}
      {selectedSymbol && symbolQuality && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {selectedSymbol} Data Quality
                {getQualityBadge(symbolQuality)}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Quality Score</p>
                <p className="text-2xl font-bold">
                  {symbolQuality.score ? `${(symbolQuality.score * 100).toFixed(0)}%` : '--'}
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Data Points</p>
                <p className="text-2xl font-bold">{symbolQuality.data_points ?? '--'}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Gaps Detected</p>
                <p className={cn(
                  "text-2xl font-bold",
                  symbolQuality.gaps > 0 && "text-yellow-500"
                )}>
                  {symbolQuality.gaps ?? 0}
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Last Update</p>
                <p className="text-lg font-medium">
                  {symbolQuality.last_update ? formatDate(symbolQuality.last_update, { time: true }) : '--'}
                </p>
              </div>
            </div>

            {/* Quality Issues */}
            {symbolQuality.issues && symbolQuality.issues.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium mb-3">Issues Detected</h4>
                <div className="space-y-2">
                  {symbolQuality.issues.map((issue, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-yellow-500/10 rounded text-sm">
                      <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" aria-hidden="true" />
                      {issue}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Symbols Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Available Symbols
          </CardTitle>
          <CardDescription>Click a symbol to check its data quality</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSymbols.length === 0 ? (
            <EmptyState
              icon={Database}
              title="No symbols found"
              description={searchSymbol ? `No symbols matching "${searchSymbol}"` : 'No symbols available'}
            />
          ) : (
            <div className="grid gap-2 grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {filteredSymbols.slice(0, 30).map((symbol) => (
                <Button
                  key={symbol}
                  variant={selectedSymbol === symbol ? 'default' : 'outline'}
                  size="sm"
                  className="justify-between"
                  onClick={() => checkSymbolQuality(symbol)}
                  disabled={checking && selectedSymbol === symbol}
                >
                  <span>{symbol}</span>
                  {qualityResults[symbol] && (
                    <span className="ml-1">
                      {getQualityBadge(qualityResults[symbol])}
                    </span>
                  )}
                </Button>
              ))}
              {filteredSymbols.length > 30 && (
                <p className="col-span-full text-sm text-muted-foreground text-center mt-2">
                  Showing 30 of {filteredSymbols.length} symbols. Use search to find specific symbols.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
