/**
 * Enhanced XSS Protection Middleware
 * 
 * Provides comprehensive XSS sanitization with additional patterns
 */

import xss from 'xss';

// Custom XSS filter options
const xssOptions = {
  whiteList: {
    // Allow only safe tags if needed (empty for maximum security)
  },
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style'],
  onIgnoreTagAttr: (tag, name, value) => {
    // Block all event handlers
    if (name.startsWith('on')) {
      return '';
    }
    // Block javascript: protocol
    if (value.toLowerCase().includes('javascript:')) {
      return '';
    }
  }
};

/**
 * Enhanced XSS sanitization function
 */
export function sanitize(input) {
  if (typeof input !== 'string') {
    return input;
  }

  // First pass: Standard XSS sanitization
  let sanitized = xss(input, xssOptions);

  // Additional patterns to remove
  const dangerousPatterns = [
    /javascript:/gi,
    /on\w+\s*=/gi,  // Event handlers
    /<svg[^>]*>/gi,
    /<body[^>]*>/gi,
    /<iframe[^>]*>/gi,
    /data:text\/html/gi,
    /vbscript:/gi,
    /<embed[^>]*>/gi,
    /<object[^>]*>/gi
  ];

  dangerousPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });

  return sanitized;
}

/**
 * Middleware to sanitize all string inputs
 */
export function enhancedXssSanitize(req, res, next) {
  // Sanitize body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  // Sanitize URL parameters
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
}

/**
 * Recursively sanitize object
 */
function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sanitized = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];

      if (typeof value === 'string') {
        sanitized[key] = sanitize(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
}

export default {
  sanitize,
  enhancedXssSanitize,
  sanitizeObject
};
