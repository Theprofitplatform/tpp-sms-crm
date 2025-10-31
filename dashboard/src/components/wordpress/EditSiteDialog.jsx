import { useState, useEffect } from 'react'
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
import { useToast } from '@/hooks/use-toast'
import { wordpressAPI } from '@/services/api'
import { Loader2 } from 'lucide-react'

export default function EditSiteDialog({ open, onOpenChange, site, onSiteUpdated }) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    username: '',
    password: ''
  })

  useEffect(() => {
    if (site && open) {
      setFormData({
        name: site.name || '',
        url: site.url || '',
        username: '',
        password: ''
      })
    }
  }, [site, open])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name && !formData.url && !formData.username && !formData.password) {
      toast({
        title: 'Error',
        description: 'Please provide at least one field to update',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)

    try {
      // Only send fields that were provided
      const updateData = {}
      if (formData.name) updateData.name = formData.name
      if (formData.url) updateData.url = formData.url
      if (formData.username) updateData.username = formData.username
      if (formData.password) updateData.password = formData.password

      await wordpressAPI.updateSite(site.id, updateData)
      
      toast({
        title: 'Success',
        description: 'Site updated successfully'
      })

      setFormData({
        name: '',
        url: '',
        username: '',
        password: ''
      })

      onSiteUpdated?.()
      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update site',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit WordPress Site</DialogTitle>
          <DialogDescription>
            Update site details and credentials. Leave fields blank to keep existing values.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Site Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={site?.name || "e.g., My WordPress Site"}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-url">WordPress URL</Label>
              <Input
                id="edit-url"
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder={site?.url || "https://example.com"}
              />
              <p className="text-xs text-muted-foreground">
                Full URL to your WordPress site
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-username">WordPress Username</Label>
              <Input
                id="edit-username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Leave blank to keep existing"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-password">Application Password</Label>
              <Input
                id="edit-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Leave blank to keep existing"
              />
              <p className="text-xs text-muted-foreground">
                WordPress Application Password (not your login password)
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
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Site
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
