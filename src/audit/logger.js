import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Simple logger that writes to console and file
 */
class Logger {
  constructor() {
    this.logsDir = path.join(__dirname, '../logs');
    this.logFile = path.join(this.logsDir, `seo-${this.getDateString()}.log`);

    // Ensure logs directory exists
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  getDateString() {
    const now = new Date();
    return now.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  getTimestamp() {
    return new Date().toISOString();
  }

  log(level, message, ...args) {
    const timestamp = this.getTimestamp();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    // Console output with colors
    const colors = {
      info: '\x1b[36m',    // Cyan
      warn: '\x1b[33m',    // Yellow
      error: '\x1b[31m',   // Red
      success: '\x1b[32m', // Green
      reset: '\x1b[0m'
    };

    console.log(`${colors[level] || colors.reset}${logMessage}${colors.reset}`, ...args);

    // File output
    const fileMessage = args.length > 0
      ? `${logMessage} ${JSON.stringify(args)}\n`
      : `${logMessage}\n`;

    fs.appendFileSync(this.logFile, fileMessage);
  }

  info(message, ...args) {
    this.log('info', message, ...args);
  }

  warn(message, ...args) {
    this.log('warn', message, ...args);
  }

  error(message, ...args) {
    this.log('error', message, ...args);
  }

  success(message, ...args) {
    this.log('success', message, ...args);
  }

  section(title) {
    const line = '='.repeat(60);
    this.info(`\n${line}\n${title}\n${line}`);
  }
}

export { Logger };
export const logger = new Logger();
