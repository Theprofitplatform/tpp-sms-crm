/**
 * WebSocket Hook for Real-Time Updates
 *
 * Connects to the ops service WebSocket and provides real-time event streaming.
 *
 * Usage:
 *   const { isConnected, lastEvent, subscribe, unsubscribe } = useWebSocket();
 *
 *   // Subscribe to specific events
 *   useEffect(() => {
 *     subscribe(['trade_executed', 'position_updated']);
 *   }, [subscribe]);
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { API_CONFIG } from '@/config/api';

const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;
const PING_INTERVAL = 25000;

export function useWebSocket(options = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const [connectionError, setConnectionError] = useState(null);

  const wsRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef(null);
  const pingInterval = useRef(null);
  const onMessageCallbacks = useRef(new Map());

  // Get WebSocket URL from API config
  const getWsUrl = useCallback(() => {
    // Convert HTTP URL to WebSocket URL
    const baseUrl = API_CONFIG.ops || 'http://localhost:5100';
    const wsUrl = baseUrl.replace(/^http/, 'ws') + '/ws';
    return wsUrl;
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const wsUrl = getWsUrl();
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttempts.current = 0;

        // Start ping interval
        pingInterval.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, PING_INTERVAL);
      };

      ws.onclose = () => {
        setIsConnected(false);
        cleanup();

        // Attempt reconnect
        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current++;
          reconnectTimeout.current = setTimeout(connect, RECONNECT_DELAY);
        } else {
          setConnectionError('Max reconnection attempts reached');
        }
      };

      ws.onerror = (error) => {
        setConnectionError('WebSocket error');
        console.error('WebSocket error:', error);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          // Update last event
          if (message.type !== 'pong' && message.type !== 'connected') {
            setLastEvent(message);
          }

          // Call registered callbacks for this event type
          if (onMessageCallbacks.current.has(message.type)) {
            onMessageCallbacks.current.get(message.type).forEach(cb => cb(message));
          }

          // Call 'all' callbacks
          if (onMessageCallbacks.current.has('all')) {
            onMessageCallbacks.current.get('all').forEach(cb => cb(message));
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      setConnectionError(error.message);
      console.error('Failed to create WebSocket:', error);
    }
  }, [getWsUrl]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (pingInterval.current) {
      clearInterval(pingInterval.current);
      pingInterval.current = null;
    }
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
  }, []);

  // Disconnect
  const disconnect = useCallback(() => {
    cleanup();
    reconnectAttempts.current = MAX_RECONNECT_ATTEMPTS; // Prevent auto-reconnect
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnected');
      wsRef.current = null;
    }
    setIsConnected(false);
  }, [cleanup]);

  // Subscribe to event types
  const subscribe = useCallback((events) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        events: Array.isArray(events) ? events : [events],
      }));
    }
  }, []);

  // Unsubscribe from event types
  const unsubscribe = useCallback((events) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        events: Array.isArray(events) ? events : [events],
      }));
    }
  }, []);

  // Register callback for specific event type
  const onMessage = useCallback((eventType, callback) => {
    if (!onMessageCallbacks.current.has(eventType)) {
      onMessageCallbacks.current.set(eventType, new Set());
    }
    onMessageCallbacks.current.get(eventType).add(callback);

    // Return unsubscribe function
    return () => {
      onMessageCallbacks.current.get(eventType)?.delete(callback);
    };
  }, []);

  // Connect on mount
  useEffect(() => {
    if (options.autoConnect !== false) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [connect, disconnect, options.autoConnect]);

  return {
    isConnected,
    lastEvent,
    connectionError,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    onMessage,
  };
}

export default useWebSocket;
