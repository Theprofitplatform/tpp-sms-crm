import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Palette,
  Upload,
  Eye,
  Save,
  RotateCcw,
  Paintbrush,
  Type,
  Image as ImageIcon,
  Layers
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'

export function WhiteLabelPage() {
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

  useEffect(() => {
    fetchBrandingSettings()
  }, [])

  const fetchBrandingSettings = async () => {
    setLoading(false)
    // In real implementation, fetch from backend
    // For now, using default values above
  }

  const handleInputChange = (field, value) => {
    setBranding({ ...branding, [field]: value })
    setHasChanges(true)
  }

  const handleFileUpload = (field, event) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setBranding({ ...branding, [field]: reader.result })
        setHasChanges(true)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = () => {
    // In real implementation, save to backend
    toast({
      title: "Branding Saved",
      description: "Your white-label settings have been updated successfully.",
    })
    setHasChanges(false)
  }

  const handleReset = () => {
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
    toast({
      title: "Reset to Defaults",
      description: "All branding settings have been reset.",
      variant: "destructive"
    })
  }

  const fontOptions = [
    { value: 'Inter', label: 'Inter (Modern Sans-serif)' },
    { value: 'Roboto', label: 'Roboto (Google Sans-serif)' },
    { value: 'Open Sans', label: 'Open Sans (Clean & Professional)' },
    { value: 'Lato', label: 'Lato (Corporate)' },
    { value: 'Poppins', label: 'Poppins (Modern)' },
    { value: 'Montserrat', label: 'Montserrat (Elegant)' },
    { value: 'Source Sans Pro', label: 'Source Sans Pro (Technical)' },
    { value: 'Georgia', label: 'Georgia (Serif)' }
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">White-Label Branding</h1>
            <p className="text-muted-foreground">Loading settings...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">White-Label Branding</h1>
          <p className="text-muted-foreground">
            Customize the appearance and branding of your dashboard
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setPreview(!preview)}
          >
            <Eye className="h-4 w-4 mr-2" />
            {preview ? 'Edit' : 'Preview'}
          </Button>
          {hasChanges && (
            <>
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      {hasChanges && (
        <Card className="border-yellow-500 bg-yellow-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-yellow-900">
              <Palette className="h-5 w-5" />
              <p className="font-medium">You have unsaved changes</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="branding" className="space-y-4">
        <TabsList>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="typography">Typography</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="custom">Custom Code</TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>
                Set your company name and basic branding information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={branding.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  placeholder="Your Company Name"
                />
                <p className="text-xs text-muted-foreground">
                  This will appear in the header, emails, and reports
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="logo">Company Logo</Label>
                  <div className="flex items-center gap-4">
                    {branding.logo && (
                      <div className="w-32 h-32 border rounded-lg flex items-center justify-center bg-muted overflow-hidden">
                        <img src={branding.logo} alt="Logo" className="max-w-full max-h-full" />
                      </div>
                    )}
                    <div className="flex-1">
                      <Button variant="outline" className="w-full" asChild>
                        <label htmlFor="logo-upload" className="cursor-pointer">
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Logo
                        </label>
                      </Button>
                      <input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload('logo', e)}
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Recommended: 200x200px PNG with transparent background
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="favicon">Favicon</Label>
                  <div className="flex items-center gap-4">
                    {branding.favicon && (
                      <div className="w-16 h-16 border rounded-lg flex items-center justify-center bg-muted overflow-hidden">
                        <img src={branding.favicon} alt="Favicon" className="max-w-full max-h-full" />
                      </div>
                    )}
                    <div className="flex-1">
                      <Button variant="outline" className="w-full" asChild>
                        <label htmlFor="favicon-upload" className="cursor-pointer">
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Favicon
                        </label>
                      </Button>
                      <input
                        id="favicon-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload('favicon', e)}
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        32x32px or 64x64px PNG/ICO
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="colors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Color Scheme</CardTitle>
              <CardDescription>
                Customize the color palette of your dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={branding.primaryColor}
                      onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                      className="w-20 h-10 cursor-pointer"
                    />
                    <Input
                      value={branding.primaryColor}
                      onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                      placeholder="#3b82f6"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Main buttons, links, and highlights
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={branding.secondaryColor}
                      onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                      className="w-20 h-10 cursor-pointer"
                    />
                    <Input
                      value={branding.secondaryColor}
                      onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                      placeholder="#8b5cf6"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Secondary actions and accents
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accentColor">Accent Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="accentColor"
                      type="color"
                      value={branding.accentColor}
                      onChange={(e) => handleInputChange('accentColor', e.target.value)}
                      className="w-20 h-10 cursor-pointer"
                    />
                    <Input
                      value={branding.accentColor}
                      onChange={(e) => handleInputChange('accentColor', e.target.value)}
                      placeholder="#10b981"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Success states and call-outs
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="textColor">Text Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="textColor"
                      type="color"
                      value={branding.textColor}
                      onChange={(e) => handleInputChange('textColor', e.target.value)}
                      className="w-20 h-10 cursor-pointer"
                    />
                    <Input
                      value={branding.textColor}
                      onChange={(e) => handleInputChange('textColor', e.target.value)}
                      placeholder="#1f2937"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Primary text color
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="backgroundColor">Background Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="backgroundColor"
                      type="color"
                      value={branding.backgroundColor}
                      onChange={(e) => handleInputChange('backgroundColor', e.target.value)}
                      className="w-20 h-10 cursor-pointer"
                    />
                    <Input
                      value={branding.backgroundColor}
                      onChange={(e) => handleInputChange('backgroundColor', e.target.value)}
                      placeholder="#ffffff"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Main background color
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sidebarColor">Sidebar Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="sidebarColor"
                      type="color"
                      value={branding.sidebarColor}
                      onChange={(e) => handleInputChange('sidebarColor', e.target.value)}
                      className="w-20 h-10 cursor-pointer"
                    />
                    <Input
                      value={branding.sidebarColor}
                      onChange={(e) => handleInputChange('sidebarColor', e.target.value)}
                      placeholder="#f9fafb"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Sidebar background color
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 border rounded-lg bg-muted/50">
                <h4 className="font-semibold mb-3">Color Preview</h4>
                <div className="flex gap-2">
                  <div
                    className="w-16 h-16 rounded-lg border"
                    style={{ backgroundColor: branding.primaryColor }}
                    title="Primary"
                  />
                  <div
                    className="w-16 h-16 rounded-lg border"
                    style={{ backgroundColor: branding.secondaryColor }}
                    title="Secondary"
                  />
                  <div
                    className="w-16 h-16 rounded-lg border"
                    style={{ backgroundColor: branding.accentColor }}
                    title="Accent"
                  />
                  <div
                    className="w-16 h-16 rounded-lg border"
                    style={{ backgroundColor: branding.textColor }}
                    title="Text"
                  />
                  <div
                    className="w-16 h-16 rounded-lg border"
                    style={{ backgroundColor: branding.backgroundColor }}
                    title="Background"
                  />
                  <div
                    className="w-16 h-16 rounded-lg border"
                    style={{ backgroundColor: branding.sidebarColor }}
                    title="Sidebar"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="typography" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Typography</CardTitle>
              <CardDescription>
                Choose fonts and text styles for your dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fontFamily">Font Family</Label>
                <select
                  id="fontFamily"
                  value={branding.fontFamily}
                  onChange={(e) => handleInputChange('fontFamily', e.target.value)}
                  className="w-full h-10 px-3 border rounded-md bg-background"
                >
                  {fontOptions.map(font => (
                    <option key={font.value} value={font.value}>
                      {font.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  This font will be used throughout the dashboard
                </p>
              </div>

              <div className="p-6 border rounded-lg bg-muted/50" style={{ fontFamily: branding.fontFamily }}>
                <h2 className="text-2xl font-bold mb-2">Preview Heading</h2>
                <p className="text-base mb-2">
                  This is how regular paragraph text will appear in the dashboard using your selected font family.
                </p>
                <p className="text-sm text-muted-foreground">
                  Small text and descriptions will look like this.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email & Report Templates</CardTitle>
              <CardDescription>
                Customize headers and footers for emails and reports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emailFooter">Email Footer HTML</Label>
                <textarea
                  id="emailFooter"
                  value={branding.emailFooter}
                  onChange={(e) => handleInputChange('emailFooter', e.target.value)}
                  className="w-full min-h-[150px] p-3 border rounded-md font-mono text-sm"
                  placeholder="<footer>&#10;  <p>&copy; 2024 Your Company. All rights reserved.</p>&#10;</footer>"
                />
                <p className="text-xs text-muted-foreground">
                  This HTML will be added to the bottom of all emails
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reportHeader">Report Header HTML</Label>
                <textarea
                  id="reportHeader"
                  value={branding.reportHeader}
                  onChange={(e) => handleInputChange('reportHeader', e.target.value)}
                  className="w-full min-h-[150px] p-3 border rounded-md font-mono text-sm"
                  placeholder="<header>&#10;  <h1>SEO Performance Report</h1>&#10;</header>"
                />
                <p className="text-xs text-muted-foreground">
                  Appears at the top of generated reports
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reportFooter">Report Footer HTML</Label>
                <textarea
                  id="reportFooter"
                  value={branding.reportFooter}
                  onChange={(e) => handleInputChange('reportFooter', e.target.value)}
                  className="w-full min-h-[150px] p-3 border rounded-md font-mono text-sm"
                  placeholder="<footer>&#10;  <p>Report generated by Your Company</p>&#10;</footer>"
                />
                <p className="text-xs text-muted-foreground">
                  Appears at the bottom of generated reports
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Custom CSS</CardTitle>
              <CardDescription>
                Add custom CSS to further customize the dashboard appearance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customCSS">Custom CSS Code</Label>
                <textarea
                  id="customCSS"
                  value={branding.customCSS}
                  onChange={(e) => handleInputChange('customCSS', e.target.value)}
                  className="w-full min-h-[300px] p-3 border rounded-md font-mono text-sm"
                  placeholder="/* Add your custom CSS here */&#10;.sidebar {&#10;  background-color: #1a1a1a;&#10;}&#10;&#10;.button-primary {&#10;  border-radius: 8px;&#10;}"
                />
                <p className="text-xs text-muted-foreground">
                  Advanced customization using CSS. Changes will be applied globally.
                </p>
              </div>

              <Card className="border-yellow-500 bg-yellow-50">
                <CardContent className="py-4">
                  <div className="flex gap-2 text-yellow-900 text-sm">
                    <Layers className="h-5 w-5 flex-shrink-0" />
                    <div>
                      <p className="font-medium mb-1">Advanced Feature</p>
                      <p>Be careful when adding custom CSS. Invalid CSS may break the dashboard appearance. Always test changes before saving.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
