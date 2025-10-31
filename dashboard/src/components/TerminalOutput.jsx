import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Copy, X, Download } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function TerminalOutput({ output = [], title = "Terminal Output", onClear }) {
  const { toast } = useToast()
  const [filter, setFilter] = useState('all') // all, errors, warnings, success

  const filteredOutput = output.filter(line => {
    if (filter === 'all') return true
    if (filter === 'errors') return line.type === 'error'
    if (filter === 'warnings') return line.type === 'warning'
    if (filter === 'success') return line.type === 'success'
    return true
  })

  const handleCopy = () => {
    const text = output.map(line => line.text).join('\n')
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copied to clipboard',
      description: 'Terminal output copied successfully'
    })
  }

  const handleDownload = () => {
    const text = output.map(line => `[${line.timestamp}] [${line.type}] ${line.text}`).join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `terminal-output-${new Date().toISOString()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast({
      title: 'Download started',
      description: 'Terminal output downloaded'
    })
  }

  const getLineColor = (type) => {
    switch (type) {
      case 'error': return 'text-red-400'
      case 'warning': return 'text-yellow-400'
      case 'success': return 'text-green-400'
      case 'info': return 'text-blue-400'
      default: return 'text-gray-300'
    }
  }

  const getLineSymbol = (type) => {
    switch (type) {
      case 'error': return '✗'
      case 'warning': return '⚠'
      case 'success': return '✓'
      case 'info': return 'ℹ'
      default: return '▸'
    }
  }

  return (
    <Card className="bg-slate-950 text-green-400 font-mono border-slate-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-green-400">{title}</CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"
              onClick={() => setFilter('all')}
            >
              All
              <Badge variant="secondary" className="ml-2">
                {output.length}
              </Badge>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="bg-slate-900 border-slate-700 text-red-400 hover:bg-slate-800"
              onClick={() => setFilter('errors')}
            >
              Errors
              <Badge variant="destructive" className="ml-2">
                {output.filter(l => l.type === 'error').length}
              </Badge>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="bg-slate-900 border-slate-700 text-yellow-400 hover:bg-slate-800"
              onClick={() => setFilter('warnings')}
            >
              Warnings
              <Badge variant="secondary" className="ml-2 bg-yellow-900">
                {output.filter(l => l.type === 'warning').length}
              </Badge>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded border border-slate-800 bg-slate-900 p-4">
          <div className="overflow-auto max-h-96 min-h-[200px] space-y-1">
            {filteredOutput.length === 0 ? (
              <div className="text-slate-500 text-sm flex items-center justify-center h-48">
                <div className="text-center">
                  <div className="text-2xl mb-2">$</div>
                  <div>No output to display</div>
                  {filter !== 'all' && (
                    <button
                      onClick={() => setFilter('all')}
                      className="mt-2 text-green-400 underline"
                    >
                      Show all output
                    </button>
                  )}
                </div>
              </div>
            ) : (
              filteredOutput.map((line, idx) => (
                <div key={idx} className={`text-sm ${getLineColor(line.type)} flex gap-2`}>
                  <span className="opacity-50 text-xs">
                    {line.timestamp || new Date().toLocaleTimeString()}
                  </span>
                  <span className="font-bold">{getLineSymbol(line.type)}</span>
                  <span className="flex-1">{line.text}</span>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"
            onClick={handleCopy}
            disabled={output.length === 0}
          >
            <Copy className="h-3 w-3 mr-2" />
            Copy
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"
            onClick={handleDownload}
            disabled={output.length === 0}
          >
            <Download className="h-3 w-3 mr-2" />
            Download
          </Button>
          {onClear && (
            <Button
              size="sm"
              variant="outline"
              className="bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"
              onClick={onClear}
              disabled={output.length === 0}
            >
              <X className="h-3 w-3 mr-2" />
              Clear
            </Button>
          )}
          <div className="flex-1" />
          <div className="text-xs text-slate-500 flex items-center">
            {output.length} lines
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
