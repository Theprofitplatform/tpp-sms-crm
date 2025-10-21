import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { logger, Logger } from '../../src/audit/logger.js';
import fs from 'fs';
import path from 'path';

describe('Logger', () => {
  // Logger creates logs in src/logs/ (relative to logger.js location)
  const testLogDir = path.join(process.cwd(), 'src', 'logs');
  const testLogFile = path.join(testLogDir, `seo-${new Date().toISOString().split('T')[0]}.log`);

  beforeEach(() => {
    // Ensure logs directory exists
    if (!fs.existsSync(testLogDir)) {
      fs.mkdirSync(testLogDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test logs if needed
    // (Optional: comment out if you want to inspect logs)
    // if (fs.existsSync(testLogFile)) {
    //   fs.unlinkSync(testLogFile);
    // }
  });

  test('should log info messages', () => {
    const message = 'Test info message';
    logger.info(message);

    // Check if log file was created
    expect(fs.existsSync(testLogFile)).toBe(true);

    // Read log file and check content
    const logContent = fs.readFileSync(testLogFile, 'utf8');
    expect(logContent).toContain('[INFO]');
    expect(logContent).toContain(message);
  });

  test('should log error messages', () => {
    const message = 'Test error message';
    logger.error(message);

    const logContent = fs.readFileSync(testLogFile, 'utf8');
    expect(logContent).toContain('[ERROR]');
    expect(logContent).toContain(message);
  });

  test('should log success messages', () => {
    const message = 'Test success message';
    logger.success(message);

    const logContent = fs.readFileSync(testLogFile, 'utf8');
    expect(logContent).toContain('[SUCCESS]');
    expect(logContent).toContain(message);
  });

  test('should log warning messages', () => {
    const message = 'Test warning message';
    logger.warn(message);

    const logContent = fs.readFileSync(testLogFile, 'utf8');
    expect(logContent).toContain('[WARN]');
    expect(logContent).toContain(message);
  });

  test('should include timestamp in logs', () => {
    logger.info('Timestamp test');

    const logContent = fs.readFileSync(testLogFile, 'utf8');
    // Check for ISO timestamp format (e.g., 2025-10-18T11:19:02.604Z)
    expect(logContent).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  test('should handle objects and arrays', () => {
    const testObj = { key: 'value', nested: { data: 123 } };
    logger.info('Object test', testObj);

    const logContent = fs.readFileSync(testLogFile, 'utf8');
    expect(logContent).toContain('Object test');
  });

  test('should create section headers', () => {
    logger.section('Test Section');

    const logContent = fs.readFileSync(testLogFile, 'utf8');
    expect(logContent).toContain('Test Section');
    expect(logContent).toContain('='.repeat(60));
  });

  test('should format section headers correctly', () => {
    logger.section('Another Section');

    const logContent = fs.readFileSync(testLogFile, 'utf8');
    // Should have equals signs on separate lines
    const lines = logContent.split('\n');
    const sectionLines = lines.filter(line => line.includes('Another Section') || line.includes('='.repeat(20)));

    expect(sectionLines.length).toBeGreaterThan(0);
  });

  test('should create logs directory if it does not exist (line 19)', () => {
    // To test line 19, we need to create a Logger instance when directory doesn't exist

    // Clean up directory - force remove even if not empty
    if (fs.existsSync(testLogDir)) {
      fs.rmSync(testLogDir, { recursive: true, force: true });
    }

    // Verify directory is gone
    expect(fs.existsSync(testLogDir)).toBe(false);

    // Create a new Logger instance - this should create the directory
    const testLogger = new Logger();

    // Verify directory was created by the Logger constructor
    expect(fs.existsSync(testLogDir)).toBe(true);
    expect(testLogger).toBeDefined();

    // Clean up - restore directory for other tests
    if (!fs.existsSync(testLogDir)) {
      fs.mkdirSync(testLogDir, { recursive: true });
    }
  });
});
