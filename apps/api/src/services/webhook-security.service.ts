import crypto from 'crypto';
import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType;

/**
 * Webhook Security Service
 * Handles signature verification and replay protection for incoming webhooks
 */
export class WebhookSecurityService {
  private redisClient: RedisClientType;

  constructor(redis: RedisClientType) {
    this.redisClient = redis;
  }

  /**
   * Verify webhook signature using HMAC-SHA256
   * @param payload - Raw webhook payload (string or Buffer)
   * @param signature - Signature from webhook header
   * @param secret - Webhook secret for this provider
   * @returns true if signature is valid
   */
  verifySignature(payload: string | Buffer, signature: string, secret: string): boolean {
    try {
      const payloadStr = typeof payload === 'string' ? payload : payload.toString('utf-8');

      // Compute HMAC-SHA256 signature
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(payloadStr);
      const computedSignature = hmac.digest('hex');

      // Compare signatures using timing-safe comparison
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(computedSignature)
      );
    } catch (error) {
      // If comparison fails (e.g., different lengths), return false
      return false;
    }
  }

  /**
   * Verify Twilio webhook signature
   * Twilio uses a specific signature format: Base64(HMAC-SHA1(url + params))
   * @param url - Full webhook URL
   * @param params - Request body parameters
   * @param signature - X-Twilio-Signature header
   * @param authToken - Twilio auth token
   * @returns true if signature is valid
   */
  verifyTwilioSignature(
    url: string,
    params: Record<string, string>,
    signature: string,
    authToken: string
  ): boolean {
    try {
      // Sort parameters alphabetically and concatenate
      const sortedKeys = Object.keys(params).sort();
      let data = url;

      for (const key of sortedKeys) {
        data += key + params[key];
      }

      // Compute HMAC-SHA1 signature
      const hmac = crypto.createHmac('sha1', authToken);
      hmac.update(Buffer.from(data, 'utf-8'));
      const computedSignature = hmac.digest('base64');

      // Compare signatures
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(computedSignature)
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if webhook event has already been processed (replay protection)
   * @param eventId - Unique event ID from webhook payload
   * @param maxAge - Maximum age in seconds to prevent replay (default: 300 = 5 minutes)
   * @returns true if event is new (should be processed), false if already seen
   */
  async checkReplayProtection(eventId: string, maxAge: number = 300): Promise<boolean> {
    const key = `webhook:event:${eventId}`;

    try {
      // Try to set the key with NX (only if not exists) and expiration
      const result = await this.redisClient.set(key, '1', {
        NX: true, // Only set if key doesn't exist
        EX: maxAge, // Expire after maxAge seconds
      });

      // If result is 'OK', the key was set (event is new)
      // If result is null, the key already exists (replay attempt)
      return result === 'OK';
    } catch (error) {
      // On Redis error, log but allow the webhook through
      // Better to process duplicates than lose webhooks
      console.error('Replay protection check failed:', error);
      return true;
    }
  }

  /**
   * Verify webhook timestamp to prevent replay attacks
   * @param timestamp - Timestamp from webhook (Unix timestamp in seconds)
   * @param maxAge - Maximum age in seconds (default: 300 = 5 minutes)
   * @returns true if timestamp is within acceptable range
   */
  verifyTimestamp(timestamp: number, maxAge: number = 300): boolean {
    const now = Math.floor(Date.now() / 1000);
    const age = now - timestamp;

    // Reject if timestamp is in the future or too old
    return age >= 0 && age <= maxAge;
  }

  /**
   * Complete webhook security check
   * Combines signature verification, timestamp validation, and replay protection
   * @param options - Webhook verification options
   * @returns Object with validation result and reason
   */
  async verifyWebhook(options: {
    payload: string | Buffer;
    signature: string;
    secret: string;
    eventId?: string;
    timestamp?: number;
    provider?: 'twilio' | 'generic';
    twilioUrl?: string;
    twilioParams?: Record<string, string>;
  }): Promise<{ valid: boolean; reason?: string }> {
    // 1. Verify signature
    let signatureValid = false;

    if (options.provider === 'twilio' && options.twilioUrl && options.twilioParams) {
      signatureValid = this.verifyTwilioSignature(
        options.twilioUrl,
        options.twilioParams,
        options.signature,
        options.secret
      );
    } else {
      signatureValid = this.verifySignature(options.payload, options.signature, options.secret);
    }

    if (!signatureValid) {
      return { valid: false, reason: 'Invalid signature' };
    }

    // 2. Verify timestamp if provided
    if (options.timestamp !== undefined) {
      const timestampValid = this.verifyTimestamp(options.timestamp);
      if (!timestampValid) {
        return { valid: false, reason: 'Timestamp out of acceptable range' };
      }
    }

    // 3. Check for replay if eventId provided
    if (options.eventId) {
      const isNew = await this.checkReplayProtection(options.eventId);
      if (!isNew) {
        return { valid: false, reason: 'Duplicate event (replay detected)' };
      }
    }

    return { valid: true };
  }
}

/**
 * Initialize Redis client for webhook security
 */
export async function initWebhookSecurity(): Promise<WebhookSecurityService> {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redisClient = createClient({ url: redisUrl });

    redisClient.on('error', (err) => {
      console.error('Webhook security Redis client error:', err);
    });

    await redisClient.connect();
  }

  return new WebhookSecurityService(redisClient);
}

/**
 * Cleanup Redis connection
 */
export async function closeWebhookSecurity(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
  }
}
