import { useState, useEffect, useCallback } from 'react'
import { Bell, Check, X, ExternalLink, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'

/**
 * NotificationsBell - Phase 4B Component
 *
 * Real-time notifications from Phase 4B notification system:
 * - Pixel issue detected
 * - Issue resolved
 * - Pixel down alerts
 * - AutoFix available
 *
 * Features:
 * - Unread count badge
 * - Dropdown panel
 * - Click to navigate
 * - Mark as read
 */
export default function NotificationsBell() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/notifications?limit=10')
      const data = await response.json()

      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST'
      })

      // Update local state
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, status: 'read' } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }, [])

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await fetch('/api/notifications/mark-all-read', {
        method: 'POST'
      })

      setNotifications(prev => prev.map(n => ({ ...n, status: 'read' })))
      setUnreadCount(0)

      toast({
        title: 'All marked as read',
        description: 'All notifications have been marked as read'
      })
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }, [toast])

  // Handle notification click
  const handleNotificationClick = useCallback((notification) => {
    // Mark as read
    if (notification.status === 'unread') {
      markAsRead(notification.id)
    }

    // Navigate to link if available
    if (notification.link) {
      navigate(notification.link)
      setOpen(false)
    }
  }, [markAsRead, navigate])

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Refresh when dropdown opens
  useEffect(() => {
    if (open) {
      fetchNotifications()
    }
  }, [open, fetchNotifications])

  // Get notification icon and color based on type
  const getNotificationStyle = (notification) => {
    const { type, category } = notification

    if (type === 'pixel_issue' || category === 'issue') {
      return {
        color: 'text-red-500',
        bg: 'bg-red-50',
        borderColor: 'border-l-red-500'
      }
    }

    if (type === 'pixel_resolved' || type === 'issue_resolved') {
      return {
        color: 'text-green-500',
        bg: 'bg-green-50',
        borderColor: 'border-l-green-500'
      }
    }

    if (type === 'pixel_down') {
      return {
        color: 'text-orange-500',
        bg: 'bg-orange-50',
        borderColor: 'border-l-orange-500'
      }
    }

    return {
      color: 'text-blue-500',
      bg: 'bg-blue-50',
      borderColor: 'border-l-blue-500'
    }
  }

  // Format time ago
  const timeAgo = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now - date) / 1000)

    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-96">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-auto p-1 text-xs"
            >
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No notifications</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            {notifications.map((notification) => {
              const style = getNotificationStyle(notification)
              const isUnread = notification.status === 'unread'

              return (
                <DropdownMenuItem
                  key={notification.id}
                  className={`
                    flex flex-col items-start gap-2 p-4 cursor-pointer
                    border-l-4 ${style.borderColor}
                    ${isUnread ? 'bg-accent' : ''}
                    hover:bg-accent/50
                  `}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start justify-between w-full gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={`font-medium text-sm ${isUnread ? 'font-bold' : ''}`}>
                          {notification.title}
                        </h4>
                        {isUnread && (
                          <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-muted-foreground">
                          {timeAgo(notification.createdAt)}
                        </span>
                        {notification.link && (
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    {isUnread && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          markAsRead(notification.id)
                        }}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </DropdownMenuItem>
              )
            })}
          </ScrollArea>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="text-center justify-center cursor-pointer"
          onClick={() => {
            navigate('/notifications')
            setOpen(false)
          }}
        >
          View all notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
