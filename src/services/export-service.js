/**
 * Export Service
 * Handles data export in multiple formats (CSV, Excel, JSON)
 */

import XLSX from 'xlsx';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../data/seo-automation.db');

class ExportService {
  constructor() {
    this.db = new Database(dbPath);
  }

  /**
   * Export rankings data
   */
  exportRankings(clientId, format = 'json') {
    const stmt = this.db.prepare(`
      SELECT
        keyword,
        current_position,
        previous_position,
        search_volume,
        check_date,
        url
      FROM keyword_performance
      WHERE client_id = ?
      ORDER BY check_date DESC, current_position ASC
      LIMIT 1000
    `);

    const data = stmt.all(clientId);

    return this.formatData(data, format, 'rankings');
  }

  /**
   * Export analytics data
   */
  exportAnalytics(clientId, format = 'json') {
    // Get comprehensive analytics data
    const rankingStmt = this.db.prepare(`
      SELECT
        DATE(check_date) as date,
        AVG(current_position) as avg_position,
        COUNT(*) as total_keywords,
        SUM(CASE WHEN current_position <= 10 THEN 1 ELSE 0 END) as top10_count
      FROM keyword_performance
      WHERE client_id = ?
      GROUP BY DATE(check_date)
      ORDER BY date DESC
      LIMIT 90
    `);

    const data = rankingStmt.all(clientId);

    return this.formatData(data, format, 'analytics');
  }

  /**
   * Export competitor data
   */
  exportCompetitors(clientId, format = 'json') {
    const stmt = this.db.prepare(`
      SELECT
        competitor_domain,
        keyword,
        position,
        check_date
      FROM competitor_rankings
      WHERE client_id = ?
      ORDER BY check_date DESC
      LIMIT 1000
    `);

    const data = stmt.all(clientId);

    return this.formatData(data, format, 'competitors');
  }

  /**
   * Format data according to requested format
   */
  formatData(data, format, sheetName = 'Data') {
    switch (format.toLowerCase()) {
      case 'csv':
        return this.toCSV(data);

      case 'xlsx':
      case 'excel':
        return this.toExcel(data, sheetName);

      case 'json':
      default:
        return {
          data: JSON.stringify(data, null, 2),
          contentType: 'application/json',
          extension: 'json'
        };
    }
  }

  /**
   * Convert to CSV
   */
  toCSV(data) {
    if (!data || data.length === 0) {
      return {
        data: '',
        contentType: 'text/csv',
        extension: 'csv'
      };
    }

    // Get headers from first object
    const headers = Object.keys(data[0]);
    const csvRows = [];

    // Add headers
    csvRows.push(headers.join(','));

    // Add data rows
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        // Escape values containing commas or quotes
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      csvRows.push(values.join(','));
    }

    return {
      data: csvRows.join('\n'),
      contentType: 'text/csv',
      extension: 'csv'
    };
  }

  /**
   * Convert to Excel
   */
  toExcel(data, sheetName = 'Data') {
    if (!data || data.length === 0) {
      data = [{ message: 'No data available' }];
    }

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return {
      data: buffer,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      extension: 'xlsx'
    };
  }

  close() {
    this.db.close();
  }
}

export default new ExportService();
