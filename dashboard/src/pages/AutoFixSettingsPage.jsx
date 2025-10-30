import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'
import { useToast } from '../hooks/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import {
  Settings,
  Save,
  TestTube,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Info
} from 'lucide-react'

const API_BASE = '/api'

export default function AutoFixSettingsPage({ onNavigate }) {
  const { toast } = useToast()
  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  // NAP Configuration State
  const [napConfig, setNapConfig] = useState({
    businessName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    country: '',
    phoneFormat: 'international' // international, australian, custom
  })

  const [validation, setValidation] = useState({
    businessName: { valid: true, message: '' },
    phone: { valid: true, message: '' },
    email: { valid: true, message: '' }
  })

  // Load clients
  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/dashboard`)
      const data = await response.json()
      if (data.success && data.clients) {
        const activeClients = data.clients.filter(c => c.status === 'active')
        setClients(activeClients)
        if (activeClients.length > 0) {
          setSelectedClient(activeClients[0].id)
          loadClientConfig(activeClients[0].id)
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load clients',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Load client-specific configuration
  const loadClientConfig = async (clientId) => {
    try {
      // Try to load saved config
      const response = await fetch(`${API_BASE}/autofix/config/${clientId}`)
      const data = await response.json()

      if (data.success && data.config) {
        setNapConfig(data.config)
      } else {
        // Load defaults from client info
        const client = clients.find(c => c.id === clientId)
        if (client) {
          setNapConfig({
            businessName: client.name || '',
            phone: '',
            email: '',
            address: '',
            city: '',
            state: '',
            country: 'Australia',
            phoneFormat: 'international'
          })
        }
      }
    } catch (error) {
      console.error('Failed to load config:', error)
    }
  }

  // Handle client change
  const handleClientChange = (clientId) => {
    setSelectedClient(clientId)
    loadClientConfig(clientId)
  }

  // Validate phone number
  const validatePhone = (phone) => {
    if (!phone) {
      return { valid: false, message: 'Phone number is required' }
    }

    // Check for common formats
    const formats = {
      international: /^\+\d{1,3}\s?\d+/,
      australian: /^0\d{9}$/,
      general: /[\d\s\-\+\(\)]+/
    }

    if (formats.general.test(phone)) {
      return { valid: true, message: 'Valid format' }
    }

    return { valid: false, message: 'Invalid phone format' }
  }

  // Validate email
  const validateEmail = (email) => {
    if (!email) {
      return { valid: false, message: 'Email is required' }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (emailRegex.test(email)) {
      return { valid: true, message: 'Valid email' }
    }

    return { valid: false, message: 'Invalid email format' }
  }

  // Validate business name
  const validateBusinessName = (name) => {
    if (!name || name.trim().length < 2) {
      return { valid: false, message: 'Business name is required' }
    }
    return { valid: true, message: 'Valid' }
  }

  // Handle field change with validation
  const handleFieldChange = (field, value) => {
    setNapConfig(prev => ({ ...prev, [field]: value }))

    // Validate on change
    if (field === 'phone') {
      setValidation(prev => ({ ...prev, phone: validatePhone(value) }))
    } else if (field === 'email') {
      setValidation(prev => ({ ...prev, email: validateEmail(value) }))
    } else if (field === 'businessName') {
      setValidation(prev => ({ ...prev, businessName: validateBusinessName(value) }))
    }
  }

  // Save configuration
  const handleSave = async () => {
    // Validate all fields
    const validations = {
      businessName: validateBusinessName(napConfig.businessName),
      phone: validatePhone(napConfig.phone),
      email: validateEmail(napConfig.email)
    }

    setValidation(validations)

    // Check if all valid
    if (!Object.values(validations).every(v => v.valid)) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors before saving',
        variant: 'destructive'
      })
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`${API_BASE}/autofix/config/${selectedClient}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engineId: 'nap-fixer',
          config: napConfig
        })
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Configuration saved successfully'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save configuration',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  // Test configuration
  const handleTest = async () => {
    setTesting(true)
    try {
      const response = await fetch(`${API_BASE}/autofix/config/${selectedClient}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engineId: 'nap-fixer',
          config: napConfig
        })
      })

      const data = await response.json()

      if (data.success) {
        const preview = data.preview || {}
        toast({
          title: 'Test Results',
          description: (
            <div className="space-y-2">
              <p>Configuration validated ✓</p>
              <p className="text-sm">
                Would scan: {preview.contentCount || 0} items
              </p>
              <p className="text-sm">
                Estimated issues: {preview.estimatedIssues || 0}
              </p>
            </div>
          )
        })
      }
    } catch (error) {
      toast({
        title: 'Test Failed',
        description: 'Could not test configuration',
        variant: 'destructive'
      })
    } finally {
      setTesting(false)
    }
  }

  // Phone format helper
  const getPhoneFormatExample = () => {
    switch (napConfig.phoneFormat) {
      case 'international':
        return '+61 2 1234 5678'
      case 'australian':
        return '0412 345 678'
      default:
        return 'Your custom format'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading settings...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate && onNavigate('autofix')}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Settings className="h-8 w-8" />
              Auto-Fix Configuration
            </h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Configure official business information for NAP consistency checking
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-blue-900 dark:text-blue-100">
                Why Configuration is Important
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                The NAP Fixer compares your website content against this "official" information. 
                Any variations found will be flagged as inconsistencies. Make sure these details 
                match your current, correct business information.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Client</CardTitle>
          <CardDescription>Choose which client to configure</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {clients.map(client => (
              <Button
                key={client.id}
                variant={selectedClient === client.id ? 'default' : 'outline'}
                onClick={() => handleClientChange(client.id)}
              >
                {client.name}
                {client.status === 'active' && (
                  <Badge variant="secondary" className="ml-2">Active</Badge>
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* NAP Configuration Form */}
      {selectedClient && (
        <Card>
          <CardHeader>
            <CardTitle>NAP Configuration</CardTitle>
            <CardDescription>
              Official business information for {clients.find(c => c.id === selectedClient)?.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Business Name */}
            <div className="space-y-2">
              <Label htmlFor="businessName">
                Business Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="businessName"
                value={napConfig.businessName}
                onChange={(e) => handleFieldChange('businessName', e.target.value)}
                placeholder="e.g., Instant Auto Traders"
                className={!validation.businessName.valid ? 'border-red-500' : ''}
              />
              {!validation.businessName.valid && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validation.businessName.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Official business name as it should appear everywhere
              </p>
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phone">
                Phone Number <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="phone"
                  value={napConfig.phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  placeholder={getPhoneFormatExample()}
                  className={`flex-1 ${!validation.phone.valid ? 'border-red-500' : ''}`}
                />
                <select
                  value={napConfig.phoneFormat}
                  onChange={(e) => handleFieldChange('phoneFormat', e.target.value)}
                  className="px-3 py-2 border rounded-md bg-background"
                >
                  <option value="international">International</option>
                  <option value="australian">Australian</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              {!validation.phone.valid ? (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validation.phone.message}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Format example: {getPhoneFormatExample()}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">
                Email Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={napConfig.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                placeholder="e.g., info@instantautotraders.com.au"
                className={!validation.email.valid ? 'border-red-500' : ''}
              />
              {!validation.email.valid && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validation.email.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Primary business email address
              </p>
            </div>

            {/* Location */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={napConfig.city}
                  onChange={(e) => handleFieldChange('city', e.target.value)}
                  placeholder="e.g., Sydney"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={napConfig.state}
                  onChange={(e) => handleFieldChange('state', e.target.value)}
                  placeholder="e.g., NSW"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={napConfig.country}
                onChange={(e) => handleFieldChange('country', e.target.value)}
                placeholder="e.g., Australia"
              />
            </div>

            {/* Address (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="address">
                Street Address <span className="text-muted-foreground">(Optional)</span>
              </Label>
              <Input
                id="address"
                value={napConfig.address}
                onChange={(e) => handleFieldChange('address', e.target.value)}
                placeholder="e.g., 123 Main Street"
              />
              <p className="text-xs text-muted-foreground">
                Only needed if you want to check address consistency
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={handleSave}
                disabled={saving || !Object.values(validation).every(v => v.valid)}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Configuration
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={handleTest}
                disabled={testing || saving || !Object.values(validation).every(v => v.valid)}
              >
                {testing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <TestTube className="mr-2 h-4 w-4" />
                    Test Configuration
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Preview */}
      {selectedClient && (
        <Card>
          <CardHeader>
            <CardTitle>Configuration Preview</CardTitle>
            <CardDescription>
              How the NAP Fixer will use this configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-muted p-4 rounded-lg font-mono text-sm space-y-1">
              <div className="font-semibold text-primary">Official NAP:</div>
              <div>Business: {napConfig.businessName || '(not set)'}</div>
              <div>Phone: {napConfig.phone || '(not set)'}</div>
              <div>Email: {napConfig.email || '(not set)'}</div>
              <div>Location: {[napConfig.city, napConfig.state, napConfig.country].filter(Boolean).join(', ') || '(not set)'}</div>
              {napConfig.address && <div>Address: {napConfig.address}</div>}
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                What NAP Fixer Will Do:
              </p>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>✓ Scan all posts and pages</li>
                <li>✓ Find any variations of "{napConfig.businessName || 'your business name'}"</li>
                <li>✓ Flag phone numbers that don't match "{napConfig.phone || 'your format'}"</li>
                <li>✓ Check email addresses against "{napConfig.email || 'your email'}"</li>
                <li>✓ Create proposals for each inconsistency found</li>
              </ul>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg">
              <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-2">
                Important Notes:
              </p>
              <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
                <li>⚠️ These values define what is "correct"</li>
                <li>⚠️ Ensure they match your current official information</li>
                <li>⚠️ Running detection with wrong config creates incorrect proposals</li>
                <li>⚠️ Always test before running full detection</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Common Formats Help */}
      <Card>
        <CardHeader>
          <CardTitle>Phone Format Guide</CardTitle>
          <CardDescription>Common Australian phone number formats</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium mb-2">International Format:</p>
              <ul className="space-y-1 text-muted-foreground font-mono">
                <li>+61 2 1234 5678 (Sydney landline)</li>
                <li>+61 412 345 678 (Mobile)</li>
                <li>+61 3 1234 5678 (Melbourne)</li>
              </ul>
            </div>
            <div>
              <p className="font-medium mb-2">Australian Format:</p>
              <ul className="space-y-1 text-muted-foreground font-mono">
                <li>(02) 1234 5678 (Sydney)</li>
                <li>0412 345 678 (Mobile)</li>
                <li>(03) 1234 5678 (Melbourne)</li>
              </ul>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            💡 Tip: Choose one format and use it consistently across your website
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
