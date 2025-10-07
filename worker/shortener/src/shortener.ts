import Fastify from 'fastify';
import { db, schema } from '@sms-crm/lib';
import { eq } from 'drizzle-orm';

const fastify = Fastify({ logger: true });

// Bot detection patterns
const BOT_USER_AGENTS = [
  'bot', 'crawler', 'spider', 'scraper', 'facebookexternalhit',
  'whatsapp', 'telegram', 'slackbot', 'twitterbot', 'linkedin',
];

function isBotUserAgent(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return BOT_USER_AGENTS.some((pattern) => ua.includes(pattern));
}

// Redirect endpoint
fastify.get('/:token', async (request, reply) => {
  const { token } = request.params as { token: string };
  const userAgent = request.headers['user-agent'] || '';
  const ip = request.ip;

  try {
    const [link] = await db
      .select()
      .from(schema.shortLinks)
      .where(eq(schema.shortLinks.token, token))
      .limit(1);

    if (!link) {
      return reply.status(404).send('Link not found');
    }

    // Check expiration
    if (link.expiresAt < new Date()) {
      return reply.status(410).send('Link expired');
    }

    // Detect bot
    const isHuman = !isBotUserAgent(userAgent);

    // Call API to record click (only if first click or human)
    if (!link.clickedAt || isHuman) {
      try {
        await fetch(`${process.env.API_BASE_URL}/short/click`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, userAgent, isHuman }),
        });
      } catch (err) {
        fastify.log.error({ err }, 'Failed to record click');
      }
    }

    // Redirect with security headers
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    reply.redirect(302, link.targetUrl);
  } catch (error) {
    fastify.log.error({ error }, 'Redirect error');
    return reply.status(500).send('Internal error');
  }
});

// Health check
fastify.get('/health', async () => {
  return {
    ok: true,
    ts: new Date().toISOString(),
    service: 'shortener',
  };
});

const PORT = parseInt(process.env.SHORTENER_PORT || '3003', 10);

fastify.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log(`Shortener service running on port ${PORT}`);
});
