/**
 * Input Validation and Sanitization Utilities
 *
 * Provides security-focused validation for user inputs,
 * especially for preventing command injection and path traversal.
 */

/**
 * Validate client ID to prevent command injection
 * Only allows alphanumeric characters, hyphens, and underscores
 *
 * @param {string} clientId - Client ID to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export function isValidClientId(clientId) {
  if (!clientId || typeof clientId !== 'string') {
    return false;
  }

  // Only allow alphanumeric, hyphens, underscores (safe for shell commands)
  const clientIdPattern = /^[a-zA-Z0-9_-]+$/;

  // Max length check (prevent DOS via extremely long IDs)
  if (clientId.length > 100) {
    return false;
  }

  return clientIdPattern.test(clientId);
}

/**
 * Sanitize client ID for use in shell commands
 * Throws error if invalid to prevent injection
 *
 * @param {string} clientId - Client ID to sanitize
 * @returns {string} - Sanitized client ID
 * @throws {Error} - If client ID is invalid
 */
export function sanitizeClientId(clientId) {
  if (!isValidClientId(clientId)) {
    throw new Error(`Invalid client ID: ${clientId}. Only alphanumeric, hyphens, and underscores allowed.`);
  }
  return clientId;
}

/**
 * Validate and sanitize file path to prevent path traversal
 *
 * @param {string} filePath - File path to validate
 * @param {string} allowedDir - Base directory that files must be within
 * @returns {string} - Sanitized absolute path
 * @throws {Error} - If path is invalid or attempts traversal
 */
export function sanitizeFilePath(filePath, allowedDir) {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('Invalid file path');
  }

  // Remove any path traversal attempts
  if (filePath.includes('..') || filePath.includes('~')) {
    throw new Error('Path traversal not allowed');
  }

  // Import path module (dynamic to avoid top-level await issues)
  const path = await import('path');

  // Resolve to absolute path
  const resolvedPath = path.resolve(allowedDir, filePath);

  // Ensure the resolved path is within the allowed directory
  if (!resolvedPath.startsWith(path.resolve(allowedDir))) {
    throw new Error('Path must be within allowed directory');
  }

  return resolvedPath;
}

/**
 * Validate job ID format
 *
 * @param {string} jobId - Job ID to validate
 * @returns {boolean} - True if valid
 */
export function isValidJobId(jobId) {
  if (!jobId || typeof jobId !== 'string') {
    return false;
  }

  // Format: job-{number} or similar safe patterns
  const jobIdPattern = /^[a-zA-Z0-9_-]+$/;

  return jobIdPattern.test(jobId) && jobId.length <= 100;
}

/**
 * Validate email address
 *
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid email format
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailPattern.test(email) && email.length <= 320;
}

/**
 * Validate URL
 *
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid URL
 */
export function isValidUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Sanitize string for safe storage/display
 * Prevents XSS by escaping HTML
 *
 * @param {string} str - String to sanitize
 * @returns {string} - Sanitized string
 */
export function sanitizeHtml(str) {
  if (!str || typeof str !== 'string') {
    return '';
  }

  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate and sanitize shell command arguments
 * Use this for any user input passed to exec/spawn
 *
 * @param {string} arg - Argument to sanitize
 * @param {string[]} allowedValues - Optional allowlist of permitted values
 * @returns {string} - Sanitized argument
 * @throws {Error} - If argument contains dangerous characters
 */
export function sanitizeShellArg(arg, allowedValues = null) {
  if (!arg || typeof arg !== 'string') {
    throw new Error('Invalid shell argument');
  }

  // If allowlist provided, must match one of the allowed values
  if (allowedValues && !allowedValues.includes(arg)) {
    throw new Error(`Argument must be one of: ${allowedValues.join(', ')}`);
  }

  // Dangerous characters that could lead to command injection
  const dangerousChars = /[;&|`$()<>\\!'"]/;

  if (dangerousChars.test(arg)) {
    throw new Error('Argument contains dangerous characters');
  }

  return arg;
}

/**
 * Build safe command with validated arguments
 * Recommended way to construct shell commands
 *
 * @param {string} command - Base command (must be from safe list)
 * @param {string[]} args - Arguments to pass
 * @returns {string} - Safe command string
 */
export function buildSafeCommand(command, args = []) {
  const safeCommands = ['node', 'npm', 'git'];

  if (!safeCommands.includes(command)) {
    throw new Error(`Command "${command}" not in safe list`);
  }

  // Validate all arguments
  const sanitizedArgs = args.map(arg => {
    // For node commands, validate file paths and IDs
    if (command === 'node' && arg.endsWith('.js')) {
      // Validate script path
      if (arg.includes('..') || arg.startsWith('/')) {
        throw new Error('Invalid script path');
      }
      return arg;
    }

    // Otherwise, sanitize as shell argument
    return sanitizeShellArg(arg);
  });

  return `${command} ${sanitizedArgs.join(' ')}`;
}

export default {
  isValidClientId,
  sanitizeClientId,
  sanitizeFilePath,
  isValidJobId,
  isValidEmail,
  isValidUrl,
  sanitizeHtml,
  sanitizeShellArg,
  buildSafeCommand
};
