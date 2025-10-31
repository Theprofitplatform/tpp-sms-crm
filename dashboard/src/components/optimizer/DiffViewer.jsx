import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Copy, Check, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { getCharCountStatus, generateSERPPreview } from '@/lib/optimizer-utils'

export default function DiffViewer({ before, after, url = '' }) {
  const [copiedField, setCopiedField] = useState(null)

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const renderDiff = (beforeText, afterText) => {
    if (!beforeText && !afterText) return null
    
    const beforeWords = (beforeText || '').split(' ')
    const afterWords = (afterText || '').split(' ')
    
    return (
      <div className="space-y-2">
        {/* Before */}
        <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded border border-red-200 dark:border-red-900">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="destructive" className="text-xs">Before</Badge>
            <span className="text-xs text-muted-foreground">
              {beforeText?.length || 0} characters
            </span>
          </div>
          <p className="text-sm line-through text-red-700 dark:text-red-400">
            {beforeText || 'No content'}
          </p>
        </div>

        {/* After */}
        <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-900">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-xs bg-green-600">After</Badge>
              <span className="text-xs text-muted-foreground">
                {afterText?.length || 0} characters
              </span>
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-6 px-2"
              onClick={() => copyToClipboard(afterText, afterText)}
            >
              {copiedField === afterText ? (
                <Check className="h-3 w-3" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            {afterText || 'No content'}
          </p>
        </div>
      </div>
    )
  }

  const renderCharacterCount = (text, min, max, label) => {
    const length = text?.length || 0
    const status = getCharCountStatus(length, min, max)
    
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">{label}:</span>
        <span className={status.color}>
          {length} characters
        </span>
        {status.status === 'optimal' ? (
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        ) : status.status === 'ok' ? (
          <AlertCircle className="h-4 w-4 text-yellow-600" />
        ) : (
          <AlertCircle className="h-4 w-4 text-red-600" />
        )}
        <span className="text-xs text-muted-foreground">
          ({min}-{max} optimal)
        </span>
      </div>
    )
  }

  const beforeSerp = generateSERPPreview(before.title, url, before.meta)
  const afterSerp = generateSERPPreview(after.title, url, after.meta)

  return (
    <div className="space-y-6">
      {/* Title Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Title Tag</CardTitle>
          {renderCharacterCount(after.title, 50, 60, 'After')}
        </CardHeader>
        <CardContent>
          {renderDiff(before.title, after.title)}
        </CardContent>
      </Card>

      {/* Meta Description Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Meta Description</CardTitle>
          {renderCharacterCount(after.meta, 140, 160, 'After')}
        </CardHeader>
        <CardContent>
          {renderDiff(before.meta, after.meta)}
        </CardContent>
      </Card>

      {/* SERP Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Google Search Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Before SERP */}
          <div>
            <Badge variant="outline" className="mb-2">Before</Badge>
            <div className="p-4 bg-muted/50 rounded border">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">{beforeSerp.url}</div>
                <div className="text-blue-600 text-lg hover:underline cursor-pointer">
                  {beforeSerp.title}
                </div>
                <div className="text-sm text-muted-foreground line-clamp-2">
                  {beforeSerp.meta}
                </div>
              </div>
            </div>
          </div>

          {/* After SERP */}
          <div>
            <Badge className="mb-2 bg-green-600">After</Badge>
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-900">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">{afterSerp.url}</div>
                <div className="text-blue-600 text-lg font-medium hover:underline cursor-pointer">
                  {afterSerp.title}
                </div>
                <div className="text-sm text-muted-foreground line-clamp-2">
                  {afterSerp.meta}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Score Comparison */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Before Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-red-600">
              {before.score || 0}
              <span className="text-lg text-muted-foreground">/100</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">After Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-600">
              {after.score || 0}
              <span className="text-lg text-muted-foreground">/100</span>
            </div>
            {(after.score && before.score) && (
              <div className="mt-2 text-sm text-green-600">
                +{Math.round(((after.score - before.score) / before.score) * 100)}% improvement
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
