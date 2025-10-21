import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

export const config = {
  wordpress: {
    url: process.env.WORDPRESS_URL || '',
    user: process.env.WORDPRESS_USER || '',
    appPassword: process.env.WORDPRESS_APP_PASSWORD || '',
    baseAuth: process.env.WORDPRESS_USER && process.env.WORDPRESS_APP_PASSWORD
      ? Buffer.from(`${process.env.WORDPRESS_USER}:${process.env.WORDPRESS_APP_PASSWORD}`).toString('base64')
      : ''
  },

  google: {
    pagespeedApiKey: process.env.GOOGLE_PAGESPEED_API_KEY || '',
    searchConsoleApiKey: process.env.GOOGLE_SEARCH_CONSOLE_API_KEY || '',
    analyticsApiKey: process.env.GOOGLE_ANALYTICS_API_KEY || '',
    geminiApiKey: process.env.GOOGLE_GEMINI_API_KEY || ''
  },

  competitor: {
    serpApiKey: process.env.SERPAPI_KEY || '',
    bingWebmasterApiKey: process.env.BING_WEBMASTER_API_KEY || '',
    valueSerpApiKey: process.env.VALUESERP_API_KEY || '',
    dataForSeo: {
      login: process.env.DATAFORSEO_LOGIN || '',
      password: process.env.DATAFORSEO_PASSWORD || ''
    }
  },

  ai: {
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    cohereApiKey: process.env.COHERE_API_KEY || ''
  },

  automation: {
    autoFixEnabled: process.env.AUTO_FIX_ENABLED === 'true',
    maxPostsPerRun: parseInt(process.env.MAX_POSTS_PER_RUN) || 100,
    minContentLength: parseInt(process.env.MIN_CONTENT_LENGTH) || 300
  },

  reporting: {
    email: process.env.REPORT_EMAIL || '',
    notionApiKey: process.env.NOTION_API_KEY || '',
    notionDatabaseId: process.env.NOTION_DATABASE_ID || ''
  },

  safety: {
    applyToPublished: process.env.APPLY_TO_PUBLISHED === 'true',
    dryRun: process.env.DRY_RUN !== 'false',
    logLevel: process.env.LOG_LEVEL || 'info'
  },

  // Notifications
  notifications: {
    discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
    email: process.env.REPORT_EMAIL || ''
  },

  validate(options = {}) {
    const errors = [];
    const warnings = [];

    // Required for all operations
    if (!this.wordpress.url) errors.push('WORDPRESS_URL is required');
    if (!this.wordpress.user) errors.push('WORDPRESS_USER is required');
    if (!this.wordpress.appPassword) errors.push('WORDPRESS_APP_PASSWORD is required');

    // Required for monitoring
    if (options.requireMonitoring) {
      if (!this.competitor.serpApiKey && !this.competitor.valueSerpApiKey) {
        errors.push('At least one competitor API key required (SERPAPI_KEY or VALUESERP_API_KEY)');
      }
    }

    // Required for AI optimization
    if (options.requireAI) {
      if (!this.ai.anthropicApiKey && !this.ai.openaiApiKey) {
        errors.push('At least one AI API key required (ANTHROPIC_API_KEY or OPENAI_API_KEY)');
      }
    }

    // Warnings for optional features
    if (!this.notifications.discordWebhookUrl) {
      warnings.push('DISCORD_WEBHOOK_URL not set - Discord notifications disabled');
    }

    if (!this.google.geminiKey && options.requireAI) {
      warnings.push('GOOGLE_GEMINI_API_KEY not set - Gemini AI unavailable');
    }

    // Log warnings
    if (warnings.length > 0) {
      console.warn('\n⚠️  Configuration warnings:');
      warnings.forEach(w => console.warn(`   - ${w}`));
      console.warn('');
    }

    // Throw errors
    if (errors.length > 0) {
      throw new Error(`❌ Configuration errors:\n${errors.map(e => `   - ${e}`).join('\n')}`);
    }

    return true;
  },

  // Validate specific feature requirements
  validateMonitoring() {
    return this.validate({ requireMonitoring: true });
  },

  validateAI() {
    return this.validate({ requireAI: true });
  }
};
