/**
 * WebSocket Server for Real-Time Updates
 *
 * Provides real-time event streaming to connected clients (dashboard, etc.)
 *
 * Features:
 *   - Broadcasts trade executions, position updates, signals
 *   - Heartbeat/ping-pong for connection health
 *   - Client subscription management
 *   - Event throttling to prevent flooding
 *
 * Events broadcast:
 *   - trade_executed: New trade was executed
 *   - position_updated: Position changed (entry, exit, update)
 *   - signal_generated: New trading signal generated
 *   - kill_switch_changed: Kill switch status changed
 *   - service_health: Service health status update
 *   - account_updated: Account balance/equity changed
 *
 * Usage:
 *   import { WebSocketServer, broadcast } from './websocket/server.js';
 *
 *   const wsServer = new WebSocketServer(httpServer, { logger });
 *   wsServer.start();
 *
 *   // Broadcast an event to all clients
 *   broadcast('trade_executed', { symbol: 'AAPL', side: 'BUY', ... });
 */

import { WebSocketServer as WSServer } from 'ws';

// Singleton instance for broadcasting
let instance = null;

export class WebSocketBroadcaster {
  constructor(server, options = {}) {
    this.logger = options.logger || console;
    this.wss = null;
    this.clients = new Set();
    this.heartbeatInterval = null;
    this.config = {
      heartbeatMs: options.heartbeatMs || 30000,
      path: options.path || '/ws',
    };

    if (server) {
      this.initialize(server);
    }

    // Set singleton
    instance = this;
  }

  /**
   * Initialize WebSocket server
   */
  initialize(server) {
    this.wss = new WSServer({
      server,
      path: this.config.path,
    });

    this.wss.on('connection', (ws, req) => {
      this._handleConnection(ws, req);
    });

    // Start heartbeat
    this.heartbeatInterval = setInterval(() => {
      this._heartbeat();
    }, this.config.heartbeatMs);

    this.logger.info('WebSocket server initialized', {
      path: this.config.path,
      heartbeatMs: this.config.heartbeatMs,
    });
  }

  /**
   * Handle new WebSocket connection
   */
  _handleConnection(ws, req) {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // Attach metadata to socket
    ws.clientId = clientId;
    ws.isAlive = true;
    ws.subscriptions = new Set(['all']); // Default subscribe to all

    this.clients.add(ws);

    this.logger.info('WebSocket client connected', {
      clientId,
      clientIp,
      totalClients: this.clients.size,
    });

    // Send welcome message
    this._send(ws, {
      type: 'connected',
      clientId,
      timestamp: new Date().toISOString(),
      message: 'Connected to Stock Trading real-time feed',
    });

    // Handle messages from client
    ws.on('message', (data) => {
      this._handleMessage(ws, data);
    });

    // Handle pong (heartbeat response)
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Handle close
    ws.on('close', () => {
      this.clients.delete(ws);
      this.logger.info('WebSocket client disconnected', {
        clientId,
        totalClients: this.clients.size,
      });
    });

    // Handle errors
    ws.on('error', (error) => {
      this.logger.warn('WebSocket client error', {
        clientId,
        error: error.message,
      });
    });
  }

  /**
   * Handle incoming message from client
   */
  _handleMessage(ws, data) {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'subscribe':
          // Subscribe to specific event types
          if (Array.isArray(message.events)) {
            message.events.forEach(event => ws.subscriptions.add(event));
            this._send(ws, {
              type: 'subscribed',
              events: Array.from(ws.subscriptions),
            });
          }
          break;

        case 'unsubscribe':
          // Unsubscribe from event types
          if (Array.isArray(message.events)) {
            message.events.forEach(event => ws.subscriptions.delete(event));
            this._send(ws, {
              type: 'unsubscribed',
              events: message.events,
            });
          }
          break;

        case 'ping':
          // Respond to client ping
          this._send(ws, { type: 'pong', timestamp: Date.now() });
          break;

        default:
          this.logger.debug('Unknown WebSocket message type', { type: message.type });
      }
    } catch (error) {
      this.logger.warn('Failed to parse WebSocket message', { error: error.message });
    }
  }

  /**
   * Send message to a specific client
   */
  _send(ws, data) {
    if (ws.readyState === 1) { // OPEN
      try {
        ws.send(JSON.stringify(data));
      } catch (error) {
        this.logger.warn('Failed to send WebSocket message', { error: error.message });
      }
    }
  }

  /**
   * Broadcast event to all connected clients
   */
  broadcast(eventType, payload) {
    const message = {
      type: eventType,
      data: payload,
      timestamp: new Date().toISOString(),
    };

    const messageStr = JSON.stringify(message);
    let sentCount = 0;

    for (const client of this.clients) {
      // Check if client is subscribed to this event type
      if (client.subscriptions.has('all') || client.subscriptions.has(eventType)) {
        if (client.readyState === 1) { // OPEN
          try {
            client.send(messageStr);
            sentCount++;
          } catch (error) {
            this.logger.warn('Failed to broadcast to client', {
              clientId: client.clientId,
              error: error.message,
            });
          }
        }
      }
    }

    if (sentCount > 0) {
      this.logger.debug('Broadcast sent', {
        eventType,
        sentCount,
        totalClients: this.clients.size,
      });
    }
  }

  /**
   * Send heartbeat to all clients
   */
  _heartbeat() {
    for (const client of this.clients) {
      if (!client.isAlive) {
        // Client didn't respond to last ping, terminate
        this.logger.info('Terminating unresponsive client', { clientId: client.clientId });
        client.terminate();
        this.clients.delete(client);
        continue;
      }

      client.isAlive = false;
      client.ping();
    }
  }

  /**
   * Get status of WebSocket server
   */
  getStatus() {
    return {
      running: !!this.wss,
      clientCount: this.clients.size,
      clients: Array.from(this.clients).map(c => ({
        clientId: c.clientId,
        subscriptions: Array.from(c.subscriptions),
        isAlive: c.isAlive,
      })),
    };
  }

  /**
   * Close all connections and stop the server
   */
  close() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    for (const client of this.clients) {
      client.close(1000, 'Server shutting down');
    }
    this.clients.clear();

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    this.logger.info('WebSocket server closed');
  }
}

/**
 * Broadcast an event to all connected clients
 * Convenience function that uses the singleton instance
 */
export function broadcast(eventType, payload) {
  if (instance) {
    instance.broadcast(eventType, payload);
  }
}

/**
 * Get the singleton WebSocket instance
 */
export function getWebSocketServer() {
  return instance;
}

export default WebSocketBroadcaster;
