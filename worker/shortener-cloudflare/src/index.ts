import { Hono } from 'hono'
import { cors } from 'hono/cors'

// Bot detection patterns
const BOT_USER_AGENTS = [
  'bot', 'crawler', 'spider', 'scraper', 'facebookexternalhit',
  'whatsapp', 'telegram', 'slackbot', 'twitterbot', 'linkedin',
];

function isBotUserAgent(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return BOT_USER_AGENTS.some((pattern) => ua.includes(pattern));
}

interface Env {
  DB: D1Database
  API_BASE_URL: string
}

const app = new Hono<{ Bindings: Env }>()

// Enable CORS for API calls
app.use('/health', cors())

// Redirect endpoint
app.get('/:token', async (c) => {
  const token = c.req.param('token')
  const userAgent = c.req.header('user-agent') || ''

  try {
    // Get link from D1 database
    const link = await c.env.DB.prepare(
      'SELECT * FROM short_links WHERE token = ? AND expires_at > datetime("now")'
    ).bind(token).first()

    if (!link) {
      return c.text('Link not found', 404)
    }

    // Detect bot
    const isHuman = !isBotUserAgent(userAgent)

    // Record click (only if first click or human)
    if (!link.clicked_at || isHuman) {
      try {
        await fetch(`${c.env.API_BASE_URL}/short/click`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            userAgent,
            isHuman,
            linkId: link.id
          }),
        })

        // Update click timestamp in D1
        if (!link.clicked_at) {
          await c.env.DB.prepare(
            'UPDATE short_links SET clicked_at = datetime("now") WHERE id = ?'
          ).bind(link.id).run()
        }
      } catch (err) {
        console.error('Failed to record click:', err)
      }
    }

    // Redirect with security headers
    return c.redirect(link.target_url, 302)
  } catch (error) {
    console.error('Redirect error:', error)
    return c.text('Internal error', 500)
  }
})

// Health check
app.get('/health', (c) => {
  return c.json({
    ok: true,
    ts: new Date().toISOString(),
    service: 'shortener-cloudflare',
  })
})

// API endpoint to create short links
app.post('/create', async (c) => {
  try {
    const { tenantId, campaignId, contactId, targetUrl, expiresAt } = await c.req.json()

    // Generate unique token
    const token = generateShortToken(tenantId, campaignId, contactId)

    // Insert into D1
    const result = await c.env.DB.prepare(
      'INSERT INTO short_links (tenant_id, campaign_id, contact_id, token, target_url, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(tenantId, campaignId, contactId, token, targetUrl, expiresAt).run()

    return c.json({
      token,
      shortUrl: `https://${c.req.host}/${token}`,
      id: result.meta.last_row_id
    })
  } catch (error) {
    console.error('Create short link error:', error)
    return c.text('Failed to create short link', 500)
  }
})

// Generate short token (same logic as original)
function generateShortToken(tenantId: string, campaignId: string, contactId: string): string {
  const input = `${tenantId}:${campaignId}:${contactId}:${Date.now()}`
  const encoder = new TextEncoder()
  const data = encoder.encode(input)

  // Simple hash using Web Crypto API
  return crypto.subtle.digest('SHA-256', data).then(hash => {
    const hashArray = Array.from(new Uint8Array(hash))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    return hashHex.substring(0, 8) // Use first 8 chars for shorter tokens
  })
}

export default app