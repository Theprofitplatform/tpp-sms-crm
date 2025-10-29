import { useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'

import { FILE_LIMITS, VALIDATION_PATTERNS } from '@/constants'

import {
  Upload,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  Download,
  FileText,
  Sparkles,
  Loader2,
  XCircle
} from 'lucide-react'

export default function PositionTrackingPage() {
  const { toast } = useToast()
  const [file, setFile] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const abortController = useRef(null)

  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }, [])

  const handleChange = useCallback((e) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }, [])

  const handleFile = useCallback(async (uploadedFile) => {
    if (!uploadedFile.name.endsWith('.csv')) {
      toast({
        title: "Invalid File",
        description: "Please upload a CSV file",
        variant: "destructive"
      })
      return
    }

    if (uploadedFile.size > FILE_LIMITS.MAX_CSV_SIZE) {
      toast({
        title: "File Too Large",
        description: `Maximum file size is ${FILE_LIMITS.MAX_CSV_SIZE / 1024 / 1024}MB`,
        variant: "destructive"
      })
      return
    }

    setFile(uploadedFile)
    setLoading(true)

    abortController.current = new AbortController()
    const formData = new FormData()
    formData.append('csv', uploadedFile)

    try {
      const response = await fetch('/api/position-tracking/analyze', {
        method: 'POST',
        body: formData,
        signal: abortController.current.signal
      })

      const data = await response.json()

      if (data.success) {
        setAnalysis(data.analysis)
        toast({
          title: "Analysis Complete",
          description: `Analyzed ${data.analysis.stats.totalKeywords} keywords`,
        })
      } else {
        throw new Error(data.error || 'Analysis failed')
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Analysis failed:', error)
        toast({
          title: "Analysis Failed",
          description: error.message,
          variant: "destructive"
        })
      }
    } finally {
      setLoading(false)
      abortController.current = null
    }
  }, [toast])

  const handleReset = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort()
    }
    setFile(null)
    setAnalysis(null)
    setLoading(false)
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Target className="h-8 w-8 text-primary" />
          Position Tracking
        </h1>
        <p className="text-muted-foreground">
          Upload and analyze keyword position tracking data
        </p>
      </div>

      {/* Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle>Upload CSV File</CardTitle>
          <CardDescription>
            Upload a CSV file exported from your position tracking tool
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-muted'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {loading ? (
              <div className="space-y-4">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">Analyzing CSV file...</p>
                <Button variant="outline" onClick={handleReset}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            ) : file ? (
              <div className="space-y-4">
                <FileText className="h-12 w-12 mx-auto text-green-600" />
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
                <Button variant="outline" onClick={handleReset}>
                  Upload Different File
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-lg font-medium">Drag and drop your CSV file here</p>
                  <p className="text-sm text-muted-foreground">or</p>
                </div>
                <label htmlFor="file-upload">
                  <Button asChild>
                    <span>Select File</span>
                  </Button>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleChange}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysis && (
        <>
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Keywords</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analysis.stats.totalKeywords}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  Improved
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{analysis.stats.improved}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  Declined
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{analysis.stats.declined}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Unchanged</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600">{analysis.stats.unchanged}</div>
              </CardContent>
            </Card>
          </div>

          {/* Keywords Table */}
          <Card>
            <CardHeader>
              <CardTitle>Keyword Analysis</CardTitle>
              <CardDescription>Detailed position tracking results</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Keyword</TableHead>
                    <TableHead>Current Position</TableHead>
                    <TableHead>Previous Position</TableHead>
                    <TableHead>Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysis.keywords?.slice(0, 20).map((kw, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{kw.keyword}</TableCell>
                      <TableCell>{kw.currentPosition}</TableCell>
                      <TableCell>{kw.previousPosition}</TableCell>
                      <TableCell>
                        {kw.change > 0 ? (
                          <Badge variant="default" className="bg-green-600">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            +{kw.change}
                          </Badge>
                        ) : kw.change < 0 ? (
                          <Badge variant="destructive">
                            <TrendingDown className="h-3 w-3 mr-1" />
                            {kw.change}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">-</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
