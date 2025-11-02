/**
 * PIXEL TECHNICAL SEO AUTO-FIX ENGINE
 *
 * Automatically fixes technical SEO issues detected by pixel:
 * - Missing viewport meta tag
 * - Other technical HTML/meta issues
 *
 * Phase: 4B - AutoFix Integration
 * Date: November 2, 2025
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', '..', '..', 'data', 'seo-automation.db');

export class PixelTechnicalFixerEngine {
  constructor() {
    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');
    this.name = 'pixel-technical-fixer';
    this.version = '1.0.0';
  }

  /**
   * Check if this engine can fix the given issue
   */
  canFix(issue) {
    const fixableTypes = [
      'MISSING_VIEWPORT'
    ];

    return fixableTypes.includes(issue.issue_type);
  }

  /**
   * Generate a fix for the issue
   */
  async generateFix(issue) {
    const fixGenerators = {
      'MISSING_VIEWPORT': () => this.addViewportMeta(issue)
    };

    const generator = fixGenerators[issue.issue_type];
    if (!generator) {
      throw new Error(`No fix generator for issue type: ${issue.issue_type}`);
    }

    return await generator();
  }

  /**
   * Add viewport meta tag
   */
  async addViewportMeta(issue) {
    const code = `<meta name="viewport" content="width=device-width, initial-scale=1.0">`;

    const recommendations = [
      'This meta tag enables responsive design on mobile devices',
      'Place it in the <head> section of your HTML',
      'This is critical for mobile-friendly pages',
      'Google requires this for mobile-first indexing'
    ];

    return {
      code,
      confidence: 1.0,
      estimatedTime: 2,
      requiresReview: false,
      metadata: {
        recommendations,
        placement: 'head',
        impact: 'high'
      }
    };
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

export default new PixelTechnicalFixerEngine();
