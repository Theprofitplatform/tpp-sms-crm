import { useEffect, useState, useCallback, useRef } from 'react'
import { io } from 'socket.io-client'
import { useToast } from './use-toast'

export function useWebSocket(url = 'http://localhost:3000', options = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState(null)
  const socketRef = useRef(null)
  const { toast } = useToast()

  const { 
    autoConnect = true,
    showConnectionStatus = false,
    reconnection = true,
    reconnectionDelay = 1000,
    reconnectionAttempts = 5
  } = options

  useEffect(() => {
    if (!autoConnect) return

    // Initialize socket connection
    socketRef.current = io(url, {
      reconnection,
      reconnectionDelay,
      reconnectionAttempts,
      transports: ['websocket', 'polling']
    })

    const socket = socketRef.current

    // Connection event handlers
    socket.on('connect', () => {
      setIsConnected(true)
      if (showConnectionStatus) {
        toast({
          title: "Connected",
          description: "Real-time updates enabled",
          variant: "success"
        })
      }
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
      if (showConnectionStatus) {
        toast({
          title: "Disconnected",
          description: "Real-time updates paused",
          variant: "warning"
        })
      }
    })

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
      setIsConnected(false)
    })

    // Dashboard-specific events
    socket.on('dashboard:update', (data) => {
      setLastMessage({ type: 'dashboard:update', data, timestamp: Date.now() })
    })

    socket.on('client:update', (data) => {
      setLastMessage({ type: 'client:update', data, timestamp: Date.now() })
    })

    socket.on('audit:complete', (data) => {
      setLastMessage({ type: 'audit:complete', data, timestamp: Date.now() })
      if (showConnectionStatus) {
        toast({
          title: "Audit Complete",
          description: `${data.clientName || 'Client'} audit finished`,
          variant: "success"
        })
      }
    })

    socket.on('ranking:change', (data) => {
      setLastMessage({ type: 'ranking:change', data, timestamp: Date.now() })
      if (data.improvement && showConnectionStatus) {
        toast({
          title: "Ranking Improved! 🎉",
          description: `${data.keyword} moved to position #${data.newRank}`,
          variant: "success"
        })
      }
    })

    socket.on('issue:detected', (data) => {
      setLastMessage({ type: 'issue:detected', data, timestamp: Date.now() })
      if (showConnectionStatus) {
        toast({
          title: "New Issue Detected",
          description: data.message,
          variant: "warning"
        })
      }
    })

    // Cleanup
    return () => {
      if (socket) {
        socket.disconnect()
      }
    }
  }, [url, autoConnect, showConnectionStatus, reconnection, reconnectionDelay, reconnectionAttempts, toast])

  // Send message function
  const sendMessage = useCallback((event, data) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, data)
      return true
    }
    return false
  }, [isConnected])

  // Subscribe to specific event
  const subscribe = useCallback((event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback)
      return () => {
        socketRef.current.off(event, callback)
      }
    }
  }, [])

  // Manual connect/disconnect
  const connect = useCallback(() => {
    if (socketRef.current && !isConnected) {
      socketRef.current.connect()
    }
  }, [isConnected])

  const disconnect = useCallback(() => {
    if (socketRef.current && isConnected) {
      socketRef.current.disconnect()
    }
  }, [isConnected])

  return {
    isConnected,
    lastMessage,
    sendMessage,
    subscribe,
    connect,
    disconnect,
    socket: socketRef.current
  }
}
