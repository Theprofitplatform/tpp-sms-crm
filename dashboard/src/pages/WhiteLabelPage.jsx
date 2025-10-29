import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { brandingAPI } from '@/services/api'
import { useAPIRequest } from '@/hooks/useAPIRequest'
import { VALIDATION_PATTERNS, FILE_LIMITS } from '@/constants'

import {
  Palette,
  Upload,
  Eye,
  Save,
  RotateCcw,
  Paintbrush,
  Type,
  Image as ImageIcon,
  Layers,
  Loader2,
  AlertCircle,
  X
} from 'lucide-react'

// SECURITY: Sanitize CSS to prevent XSS
const sanitizeCSS = (css) => {
  if (!css) return ''
  
  // Remove dangerous CSS patterns
  const dangerous = [
    /javascript:/gi,
    /expression\s*\(/gi,
    /import\s*\[/gi,
    /@import/gi,
    /behavior\s*:/gi,
    /-moz-binding/gi,
    /vbscript:/gi,
    /data:text\/html/gi
  ]

  let sanitized = css
  dangerous.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '')
  })

  return sanitized
}

export default function WhiteLabelPage() {
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [hasChanges, setHasChanges] = useState(false)
  const [branding, setBranding] = useState({
    companyName: 'SEO Expert',
    logo: null,
    favicon: null,
    primaryColor: '#3b82f6',
    secondaryColor: '#8b5cf6',
    accentColor: '#10b981',
    textColor: '#1f2937',
    backgroundColor: '#ffffff',
    sidebarColor: '#f9fafb',
    fontFamily: 'Inter',
    customCSS: '',
    emailFooter: '',
    reportHeader: '',
    reportFooter: ''
  })
  
  const [preview, setPreview] = useState(false)
  const [errors, setErrors] = useState({})

  // Refs for cleanup
  const fileReadersRef = useRef([])
  const abortControllerRef = useRef(null)

  const { execute: saveBranding, loading: saving } = useAPIRequest()
  const { execute: uploadImage, loading: uploading } = useAPIRequest()

  // Load branding settings
  useEffect(() => {
    const loadSettings = async () => {
      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      abortControllerRef.current = new AbortController()

      try {
        const response = await fetch('/api/branding', {
          signal: abortControllerRef.current.signal
        })

        if (response.ok) {
          const data = await response.json()
          setBranding(data)
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error loading branding:', err)
        }
      } finally {
        setLoading(false)
      }
    }

    loadSettings()

    // Cleanup
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Cleanup FileReaders on unmount
  useEffect(() => {
    return () => {
      // Abort all active FileReaders
      fileReadersRef.current.forEach(reader => {
        if (reader && reader.readyState === 1) {
          reader.abort()
        }
      })
      fileReadersRef.current = []
    }
  }, [])

  const validateColor = useCallback((color) => {
    return VALIDATION_PATTERNS.HEX_COLOR.test(color)
  }, [])

  const handleInputChange = useCallback((field, value) => {
    // Validate hex colors
    if (field.includes('Color') && !validateColor(value)) {
      setErrors(prev => ({ ...prev, [field]: 'Invalid hex color format' }))
      return
    }

    // Clear error for this field
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[field]
      return newErrors
    })

    // SECURITY: Sanitize CSS input
    if (field === 'customCSS') {
      value = sanitizeCSS(value)
    }

    setBranding(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }, [validateColor])

  const handleFileUpload = useCallback((field, event) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file size
    const maxSize = field === 'logo' || field === 'favicon' ? FILE_LIMITS.MAX_IMAGE_SIZE : FILE_LIMITS.MAX_SIZE
    if (file.size > maxSize) {
      toast({
        title: 'File Too Large',
        description: `File must be smaller than ${maxSize / (1024 * 1024)}MB`,
        variant: 'destructive'
      })
      return
    }

    // Validate file type
    if (!FILE_LIMITS.ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload an image file (JPEG, PNG, GIF, WebP, or SVG)',
        variant: 'destructive'
      })
      return
    }

    const reader = new FileReader()
    
    // Track FileReader for cleanup
    fileReadersRef.current.push(reader)

    reader.onloadend = () => {
      setBranding(prev => ({ ...prev, [field]: reader.result }))
      setHasChanges(true)
      
      // Remove from tracking array
      fileReadersRef.current = fileReadersRef.current.filter(r => r !== reader)
    }

    reader.onerror = () => {
      toast({
        title: 'Upload Failed',
        description: 'Failed to read file',
        variant: 'destructive'
      })
      
      // Remove from tracking array
      fileReadersRef.current = fileReadersRef.current.filter(r => r !== reader)
    }

    reader.readAsDataURL(file)
  }, [toast])

  const handleSave = useCallback(async () => {
    // Validate all colors
    const colorFields = ['primaryColor', 'secondaryColor', 'accentColor', 'textColor', 'backgroundColor', 'sidebarColor']
    const colorErrors = {}
    
    colorFields.forEach(field => {
      if (!validateColor(branding[field])) {
        colorErrors[field] = 'Invalid hex color format'
      }
    })

    if (Object.keys(colorErrors).length > 0) {
      setErrors(colorErrors)
      toast({
        title: 'Validation Error',
        description: 'Please fix the color format errors',
        variant: 'destructive'
      })
      return
    }

    await saveBranding(
      () => brandingAPI.updateSettings(branding),
      {
        showSuccessToast: true,
        successMessage: 'Branding settings saved successfully',
        onSuccess: () => {
          setHasChanges(false)
        }
      }
    )
  }, [branding, saveBranding, validateColor, toast])

  const handleReset = useCallback(() => {
    setBranding({
      companyName: 'SEO Expert',
      logo: null,
      favicon: null,
      primaryColor: '#3b82f6',
      secondaryColor: '#8b5cf6',
      accentColor: '#10b981',
      textColor: '#1f2937',
      backgroundColor: '#ffffff',
      sidebarColor: '#f9fafb',
      fontFamily: 'Inter',
      customCSS: '',
      emailFooter: '',
      reportHeader: '',
      reportFooter: ''
    })
    setHasChanges(false)
    setErrors({})
    toast({
      title: 'Reset to Defaults',
      description: 'All branding settings have been reset.'
    })
  }, [toast])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading branding settings...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Palette className="h-8 w-8" />
            White Label Branding
          </h1>
          <p className="text-muted-foreground">
            Customize the look and feel of your platform
          </p>
        </div>

        {hasChanges && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset} disabled={saving}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Unsaved changes alert */}
      {hasChanges && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You have unsaved changes. Don't forget to save before leaving.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="custom">Custom CSS</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Basic company branding details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  value={branding.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  placeholder="Your Company Name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="font-family">Font Family</Label>
                <select
                  id="font-family"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  value={branding.fontFamily}
                  onChange={(e) => handleInputChange('fontFamily', e.target.value)}
                >
                  <option value="Inter">Inter</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Open Sans">Open Sans</option>
                  <option value="Lato">Lato</option>
                  <option value="Poppins">Poppins</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Colors */}
        <TabsContent value="colors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Color Scheme</CardTitle>
              <CardDescription>Customize your brand colors</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { field: 'primaryColor', label: 'Primary Color' },
                { field: 'secondaryColor', label: 'Secondary Color' },
                { field: 'accentColor', label: 'Accent Color' },
                { field: 'textColor', label: 'Text Color' },
                { field: 'backgroundColor', label: 'Background Color' },
                { field: 'sidebarColor', label: 'Sidebar Color' }
              ].map(({ field, label }) => (
                <div key={field} className="space-y-2">
                  <Label htmlFor={field}>{label}</Label>
                  <div className="flex gap-2">
                    <Input
                      id={field}
                      type="color"
                      value={branding[field]}
                      onChange={(e) => handleInputChange(field, e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      value={branding[field]}
                      onChange={(e) => handleInputChange(field, e.target.value)}
                      placeholder="#000000"
                      pattern="^#[0-9A-Fa-f]{6}$"
                      aria-invalid={!!errors[field]}
                    />
                  </div>
                  {errors[field] && (
                    <p className="text-sm text-red-500">{errors[field]}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assets */}
        <TabsContent value="assets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Brand Assets</CardTitle>
              <CardDescription>Upload your logo and favicon</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Company Logo</Label>
                <div className="flex items-center gap-4">
                  {branding.logo && (
                    <img src={branding.logo} alt="Logo" className="h-16 w-16 object-contain border rounded" />
                  )}
                  <div>
                    <input
                      type="file"
                      id="logo-upload"
                      accept="image/*"
                      onChange={(e) => handleFileUpload('logo', e)}
                      className="hidden"
                    />
                    <Button asChild variant="outline">
                      <label htmlFor="logo-upload" className="cursor-pointer">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Logo
                      </label>
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Favicon</Label>
                <div className="flex items-center gap-4">
                  {branding.favicon && (
                    <img src={branding.favicon} alt="Favicon" className="h-8 w-8 object-contain border rounded" />
                  )}
                  <div>
                    <input
                      type="file"
                      id="favicon-upload"
                      accept="image/*"
                      onChange={(e) => handleFileUpload('favicon', e)}
                      className="hidden"
                    />
                    <Button asChild variant="outline">
                      <label htmlFor="favicon-upload" className="cursor-pointer">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Favicon
                      </label>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom CSS */}
        <TabsContent value="custom" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Custom CSS</CardTitle>
              <CardDescription>Add custom styling (sanitized for security)</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Custom CSS is automatically sanitized to prevent security vulnerabilities.
                  Dangerous patterns like javascript:, expression(), and @import are blocked.
                </AlertDescription>
              </Alert>
              
              <textarea
                className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                placeholder=".custom-class { color: #333; }"
                value={branding.customCSS}
                onChange={(e) => handleInputChange('customCSS', e.target.value)}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
