import crypto from 'crypto';

const SECRET = process.env.SHORT_LINK_SECRET || 'change-this-secret-in-production';

export function generateShortToken(
  tenantId: string,
  campaignId: string,
  contactId: string
): string {
  // Create HMAC signature to prevent guessing
  const data = `${tenantId}:${campaignId}:${contactId}:${Date.now()}`;
  const hmac = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');

  // Take first 12 characters for a short, non-guessable token
  return hmac.substring(0, 12);
}

export function verifyToken(token: string): boolean {
  // Basic validation - token should be 10-16 alphanumeric chars
  return /^[A-Za-z0-9_-]{10,16}$/.test(token);
}

export function generateMagicToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}
