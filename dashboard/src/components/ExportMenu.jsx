import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Download, FileText, FileSpreadsheet, FileImage } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function ExportMenu({ data, filename = 'dashboard-export', onExport }) {
  const { toast } = useToast()

  const handleExport = async (format) => {
    toast({
      title: "Exporting...",
      description: `Generating ${format.toUpperCase()} file`
    })

    try {
      if (onExport) {
        await onExport(format, data)
      } else {
        // Default export implementations
        switch (format) {
          case 'csv':
            exportToCSV(data, filename)
            break
          case 'json':
            exportToJSON(data, filename)
            break
          case 'png':
            toast({
              title: "Feature Coming Soon",
              description: "PNG export will be available soon"
            })
            return
          default:
            break
        }
      }

      toast({
        title: "Export Complete",
        description: `${format.toUpperCase()} file downloaded successfully`,
        variant: "success"
      })
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const exportToCSV = (data, filename) => {
    let csv = ''
    
    // Simple CSV export
    if (Array.isArray(data)) {
      // Array of objects
      const headers = Object.keys(data[0] || {})
      csv = headers.join(',') + '\n'
      
      data.forEach(row => {
        csv += headers.map(header => {
          const value = row[header]
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value
        }).join(',') + '\n'
      })
    } else if (typeof data === 'object') {
      // Single object
      csv = 'Key,Value\n'
      Object.entries(data).forEach(([key, value]) => {
        csv += `${key},${value}\n`
      })
    }

    downloadFile(csv, `${filename}.csv`, 'text/csv')
  }

  const exportToJSON = (data, filename) => {
    const json = JSON.stringify(data, null, 2)
    downloadFile(json, `${filename}.json`, 'application/json')
  }

  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Export Format</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleExport('csv')}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          CSV Spreadsheet
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('json')}>
          <FileText className="h-4 w-4 mr-2" />
          JSON Data
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('png')}>
          <FileImage className="h-4 w-4 mr-2" />
          PNG Image
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
