import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Globe, User, Key, Link as LinkIcon } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { wordpressAPI } from '@/services/api'

export default function AddSiteDialog({ open, onOpenChange, onSiteAdded }) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    url: '',
    username: '',
    password: ''
  })

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Auto-generate ID from name
    if (field === 'name' && !formData.id) {
      const generatedId = value.toLowerCase().replace(/[^a-z0-9]/g, '')
      setFormData(prev => ({ ...prev, id: generatedId }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate
    if (!formData.id || !formData.name || !formData.url || !formData.username || !formData.password) {
      toast({
        title: 'Validation Error',
        description: 'All fields are required',
        variant: 'destructive'
      })
      return
    }

    // Validate URL format
    try {
      new URL(formData.url)
    } catch {
      toast({
        title: 'Invalid URL',
        description: 'Please enter a valid URL (e.g., https://example.com)',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    
    try {
      const response = await wordpressAPI.addSite(formData)
      
      toast({
        title: 'Success',
        description: 'WordPress site added successfully'
      })
      
      // Reset form
      setFormData({
        id: '',
        name: '',
        url: '',
        username: '',
        password: ''
      })
      
      // Close dialog
      onOpenChange(false)
      
      // Notify parent
      if (onSiteAdded) {
        onSiteAdded(response.site)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add WordPress site',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Connect WordPress Site
          </DialogTitle>
          <DialogDescription>
            Add a new WordPress site to manage with the SEO automation platform.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Site Name *</Label>
              <Input
                id="name"
                placeholder="My WordPress Site"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                disabled={loading}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="id">Site ID *</Label>
              <Input
                id="id"
                placeholder="mywordpresssite"
                value={formData.id}
                onChange={(e) => handleChange('id', e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Lowercase letters and numbers only, no spaces
              </p>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="url" className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                WordPress URL *
              </Label>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com"
                value={formData.url}
                onChange={(e) => handleChange('url', e.target.value)}
                disabled={loading}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="username" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                WordPress Username *
              </Label>
              <Input
                id="username"
                placeholder="admin"
                value={formData.username}
                onChange={(e) => handleChange('username', e.target.value)}
                disabled={loading}
                autoComplete="off"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Application Password *
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                disabled={loading}
                autoComplete="new-password"
              />
              <p className="text-xs text-muted-foreground">
                Generate an application password in WordPress: Users → Profile → Application Passwords
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Globe className="h-4 w-4 mr-2" />
                  Add Site
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
