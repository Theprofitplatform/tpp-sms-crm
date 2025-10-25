/**
 * White-Label Configuration Service
 *
 * Manages branding customization for emails, portal, and reports
 * Supports full agency rebranding with colors, logos, and custom CSS
 */

import db from '../database/index.js';

export class WhiteLabelService {
  constructor() {
    this.config = null;
    this.defaultConfig = {
      companyName: 'SEO Expert',
      primaryColor: '#667eea',
      secondaryColor: '#764ba2',
      accentColor: '#10b981',
      emailFromName: 'SEO Expert',
      emailFromEmail: process.env.FROM_EMAIL || 'hello@example.com',
      emailReplyTo: process.env.REPLY_TO_EMAIL || 'hello@example.com',
      emailFooterText: 'You received this email because you requested an SEO audit.',
      portalTitle: 'SEO Dashboard',
      portalWelcomeText: 'Welcome to your SEO performance dashboard'
    };
  }

  /**
   * Load active configuration
   */
  loadActiveConfig() {
    const activeConfig = db.whiteLabelOps.getActiveConfig();

    if (activeConfig) {
      this.config = this.convertDbConfig(activeConfig);
      console.log('✅ White-label configuration loaded:', this.config.company_name);
    } else {
      this.config = null;
      console.log('ℹ️  No active white-label configuration, using defaults');
    }

    return this.config;
  }

  /**
   * Get current configuration (active or default)
   */
  getConfig() {
    if (!this.config) {
      this.loadActiveConfig();
    }

    return this.config || this.defaultConfig;
  }

  /**
   * Convert database config to camelCase
   */
  convertDbConfig(dbConfig) {
    return {
      id: dbConfig.id,
      configName: dbConfig.config_name,
      isActive: dbConfig.is_active === 1,
      companyName: dbConfig.company_name,
      companyLogoUrl: dbConfig.company_logo_url,
      companyWebsite: dbConfig.company_website,
      primaryColor: dbConfig.primary_color,
      secondaryColor: dbConfig.secondary_color,
      accentColor: dbConfig.accent_color,
      emailFromName: dbConfig.email_from_name,
      emailFromEmail: dbConfig.email_from_email,
      emailReplyTo: dbConfig.email_reply_to,
      emailHeaderLogo: dbConfig.email_header_logo,
      emailFooterText: dbConfig.email_footer_text,
      dashboardUrl: dbConfig.dashboard_url,
      supportEmail: dbConfig.support_email,
      supportPhone: dbConfig.support_phone,
      socialFacebook: dbConfig.social_facebook,
      socialTwitter: dbConfig.social_twitter,
      socialLinkedin: dbConfig.social_linkedin,
      portalTitle: dbConfig.portal_title,
      portalWelcomeText: dbConfig.portal_welcome_text,
      privacyPolicyUrl: dbConfig.privacy_policy_url,
      termsOfServiceUrl: dbConfig.terms_of_service_url,
      customCss: dbConfig.custom_css,
      customMetadata: dbConfig.custom_metadata,
      createdAt: dbConfig.created_at,
      updatedAt: dbConfig.updated_at
    };
  }

  /**
   * Apply branding to email template
   */
  applyBrandingToEmail(emailHtml, emailText = null) {
    const config = this.getConfig();

    let brandedHtml = emailHtml;
    let brandedText = emailText;

    // Replace brand variables in HTML
    brandedHtml = brandedHtml.replace(/\{\{companyName\}\}/g, config.companyName);
    brandedHtml = brandedHtml.replace(/\{\{primaryColor\}\}/g, config.primaryColor);
    brandedHtml = brandedHtml.replace(/\{\{secondaryColor\}\}/g, config.secondaryColor);
    brandedHtml = brandedHtml.replace(/\{\{accentColor\}\}/g, config.accentColor);
    brandedHtml = brandedHtml.replace(/\{\{companyWebsite\}\}/g, config.companyWebsite || '#');
    brandedHtml = brandedHtml.replace(/\{\{supportEmail\}\}/g, config.supportEmail || config.emailFromEmail);
    brandedHtml = brandedHtml.replace(/\{\{supportPhone\}\}/g, config.supportPhone || '');

    // Replace logo if provided
    if (config.emailHeaderLogo) {
      brandedHtml = brandedHtml.replace(
        /<img[^>]+class="logo"[^>]*>/g,
        `<img src="${config.emailHeaderLogo}" alt="${config.companyName}" class="logo" style="max-width: 200px; height: auto;">`
      );
    }

    // Replace footer text if provided
    if (config.emailFooterText) {
      brandedHtml = brandedHtml.replace(
        /<p class="footer-text">.*?<\/p>/g,
        `<p class="footer-text">${config.emailFooterText}</p>`
      );
    }

    // Apply custom CSS if provided
    if (config.customCss) {
      brandedHtml = brandedHtml.replace(
        '</head>',
        `<style>${config.customCss}</style></head>`
      );
    }

    // Replace social media links
    if (config.socialFacebook) {
      brandedHtml = brandedHtml.replace(/href="https:\/\/facebook\.com\/yourpage"/g, `href="${config.socialFacebook}"`);
    }
    if (config.socialTwitter) {
      brandedHtml = brandedHtml.replace(/href="https:\/\/twitter\.com\/yourhandle"/g, `href="${config.socialTwitter}"`);
    }
    if (config.socialLinkedin) {
      brandedHtml = brandedHtml.replace(/href="https:\/\/linkedin\.com\/company\/yourcompany"/g, `href="${config.socialLinkedin}"`);
    }

    // Replace brand variables in text version
    if (brandedText) {
      brandedText = brandedText.replace(/\{\{companyName\}\}/g, config.companyName);
      brandedText = brandedText.replace(/\{\{companyWebsite\}\}/g, config.companyWebsite || '');
      brandedText = brandedText.replace(/\{\{supportEmail\}\}/g, config.supportEmail || config.emailFromEmail);
      brandedText = brandedText.replace(/\{\{supportPhone\}\}/g, config.supportPhone || '');
    }

    return {
      html: brandedHtml,
      text: brandedText
    };
  }

  /**
   * Get email sender configuration
   */
  getEmailConfig() {
    const config = this.getConfig();

    return {
      fromName: config.emailFromName,
      fromEmail: config.emailFromEmail,
      replyTo: config.emailReplyTo || config.emailFromEmail
    };
  }

  /**
   * Get portal branding configuration
   */
  getPortalConfig() {
    const config = this.getConfig();

    return {
      title: config.portalTitle,
      welcomeText: config.portalWelcomeText,
      companyName: config.companyName,
      companyLogoUrl: config.companyLogoUrl,
      primaryColor: config.primaryColor,
      secondaryColor: config.secondaryColor,
      accentColor: config.accentColor,
      customCss: config.customCss
    };
  }

  /**
   * Get color scheme
   */
  getColors() {
    const config = this.getConfig();

    return {
      primary: config.primaryColor,
      secondary: config.secondaryColor,
      accent: config.accentColor
    };
  }

  /**
   * Get social media links
   */
  getSocialLinks() {
    const config = this.getConfig();

    const links = {};

    if (config.socialFacebook) links.facebook = config.socialFacebook;
    if (config.socialTwitter) links.twitter = config.socialTwitter;
    if (config.socialLinkedin) links.linkedin = config.socialLinkedin;

    return links;
  }

  /**
   * Get legal links
   */
  getLegalLinks() {
    const config = this.getConfig();

    return {
      privacyPolicy: config.privacyPolicyUrl,
      termsOfService: config.termsOfServiceUrl
    };
  }

  /**
   * Create default configuration
   */
  static createDefaultConfig(companyName, emailFromName, emailFromEmail) {
    return db.whiteLabelOps.createConfig({
      configName: 'default',
      isActive: true,
      companyName: companyName || 'SEO Expert',
      emailFromName: emailFromName || companyName || 'SEO Expert',
      emailFromEmail: emailFromEmail || process.env.FROM_EMAIL || 'hello@example.com',
      emailReplyTo: emailFromEmail || process.env.REPLY_TO_EMAIL || 'hello@example.com',
      primaryColor: '#667eea',
      secondaryColor: '#764ba2',
      accentColor: '#10b981',
      portalTitle: 'SEO Dashboard',
      portalWelcomeText: 'Welcome to your SEO performance dashboard'
    });
  }

  /**
   * Get configuration for API response
   */
  getPublicConfig() {
    const config = this.getConfig();

    // Return only public-facing configuration (exclude sensitive data)
    return {
      companyName: config.companyName,
      companyLogoUrl: config.companyLogoUrl,
      companyWebsite: config.companyWebsite,
      primaryColor: config.primaryColor,
      secondaryColor: config.secondaryColor,
      accentColor: config.accentColor,
      portalTitle: config.portalTitle,
      portalWelcomeText: config.portalWelcomeText,
      supportEmail: config.supportEmail,
      supportPhone: config.supportPhone,
      socialLinks: this.getSocialLinks(),
      legalLinks: this.getLegalLinks()
    };
  }
}

// Create singleton instance
export const whiteLabelService = new WhiteLabelService();

export default WhiteLabelService;
