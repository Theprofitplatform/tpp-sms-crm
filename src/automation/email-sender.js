/**
 * Email Sender Service
 *
 * Sends emails using SMTP (supports Gmail, SendGrid, AWS SES, etc.)
 * Handles retries, error tracking, and delivery confirmation
 */

import nodemailer from 'nodemailer';
import { htmlToText } from 'html-to-text';

export class EmailSender {
  constructor(config = {}) {
    this.config = {
      host: config.host || process.env.SMTP_HOST || 'smtp.gmail.com',
      port: config.port || process.env.SMTP_PORT || 587,
      secure: config.secure !== undefined ? config.secure : false,
      auth: {
        user: config.user || process.env.SMTP_USER,
        pass: config.pass || process.env.SMTP_PASS
      },
      ...config
    };

    this.transporter = null;
    this.testMode = config.testMode || process.env.NODE_ENV === 'test';
  }

  /**
   * Initialize email transporter
   */
  async initialize() {
    if (this.testMode) {
      // Use Ethereal for testing (creates fake SMTP service)
      const testAccount = await nodemailer.createTestAccount();

      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });

      console.log('📧 Email sender initialized (TEST MODE)');
      console.log(`   Preview URL: https://ethereal.email/messages`);
    } else {
      this.transporter = nodemailer.createTransport(this.config);

      // Verify connection
      try {
        await this.transporter.verify();
        console.log('📧 Email sender initialized');
      } catch (error) {
        console.error('❌ Email sender initialization failed:', error.message);
        throw new Error(`SMTP connection failed: ${error.message}`);
      }
    }
  }

  /**
   * Send an email
   */
  async send(emailData) {
    if (!this.transporter) {
      await this.initialize();
    }

    const {
      to,
      toName,
      from,
      fromName,
      replyTo,
      subject,
      html,
      text,
      attachments = []
    } = emailData;

    // Generate plain text from HTML if not provided
    const textContent = text || htmlToText(html, {
      wordwrap: 80,
      ignoreImage: true,
      uppercaseHeadings: false
    });

    const mailOptions = {
      from: fromName ? `${fromName} <${from}>` : from,
      to: toName ? `${toName} <${to}>` : to,
      replyTo: replyTo || from,
      subject,
      html,
      text: textContent,
      attachments
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);

      const result = {
        success: true,
        messageId: info.messageId,
        response: info.response,
        preview: this.testMode ? nodemailer.getTestMessageUrl(info) : null
      };

      if (this.testMode) {
        console.log('📨 Test email sent:', result.preview);
      }

      return result;

    } catch (error) {
      console.error('❌ Email send error:', error);

      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  /**
   * Send batch emails
   */
  async sendBatch(emails, options = {}) {
    const { delay = 100, maxRetries = 3 } = options;
    const results = [];

    for (const email of emails) {
      let retries = 0;
      let success = false;
      let result = null;

      while (!success && retries < maxRetries) {
        result = await this.send(email);

        if (result.success) {
          success = true;
        } else {
          retries++;

          if (retries < maxRetries) {
            // Exponential backoff
            const waitTime = delay * Math.pow(2, retries);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      }

      results.push({
        email: email.to,
        ...result,
        retries
      });

      // Small delay between emails to avoid rate limiting
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return results;
  }

  /**
   * Validate email address
   */
  static isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  /**
   * Test SMTP connection
   */
  async testConnection() {
    if (!this.transporter) {
      await this.initialize();
    }

    try {
      await this.transporter.verify();
      return {
        success: true,
        message: 'SMTP connection successful'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Close transporter connection
   */
  close() {
    if (this.transporter) {
      this.transporter.close();
      this.transporter = null;
    }
  }
}

/**
 * Email Service Configurations
 */
export const EmailProviders = {
  /**
   * Gmail / Google Workspace
   * Requires app-specific password if 2FA is enabled
   */
  gmail(user, password) {
    return {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user, pass: password }
    };
  },

  /**
   * SendGrid
   * Use 'apikey' as username and your API key as password
   */
  sendgrid(apiKey) {
    return {
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: { user: 'apikey', pass: apiKey }
    };
  },

  /**
   * Amazon SES
   * Requires AWS SMTP credentials
   */
  amazonSES(username, password, region = 'us-east-1') {
    return {
      host: `email-smtp.${region}.amazonaws.com`,
      port: 587,
      secure: false,
      auth: { user: username, pass: password }
    };
  },

  /**
   * Mailgun
   */
  mailgun(username, password) {
    return {
      host: 'smtp.mailgun.org',
      port: 587,
      secure: false,
      auth: { user: username, pass: password }
    };
  },

  /**
   * Custom SMTP
   */
  custom(host, port, user, password, secure = false) {
    return {
      host,
      port,
      secure,
      auth: { user, pass: password }
    };
  }
};

export default EmailSender;
