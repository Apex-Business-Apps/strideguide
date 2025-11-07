/**
 * PII Redaction Utilities
 * Redacts sensitive information from logs and error messages
 */

/**
 * PII patterns to redact
 */
const PII_PATTERNS = {
  // Email addresses
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

  // Phone numbers (various formats)
  phone: /(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g,

  // Credit card numbers (simple pattern)
  creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,

  // Social Insurance Number (SIN) - Canadian
  sin: /\b\d{3}[-\s]?\d{3}[-\s]?\d{3}\b/g,

  // Postal codes (Canadian)
  postalCode: /\b[A-Z]\d[A-Z][-\s]?\d[A-Z]\d\b/gi,

  // IP addresses
  ipAddress: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,

  // JWT tokens
  jwt: /eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g,

  // API keys (common formats)
  apiKey: /\b(sk|pk)_[a-zA-Z0-9]{24,}\b/g,

  // Stripe IDs
  stripeId: /\b(cus|sub|pi|src|tok|card|ba)_[a-zA-Z0-9]{14,}\b/g,
};

/**
 * Sensitive field names to redact from objects
 */
const SENSITIVE_FIELDS = [
  'password',
  'passwd',
  'pwd',
  'secret',
  'token',
  'apiKey',
  'api_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'privateKey',
  'private_key',
  'creditCard',
  'credit_card',
  'cvv',
  'ssn',
  'sin',
  'authorization',
  'auth',
  'sessionId',
  'session_id',
];

/**
 * Redact PII from a string
 */
export function redactPii(text: string, placeholder: string = '[REDACTED]'): string {
  if (typeof text !== 'string') return text;

  let redacted = text;

  // Apply each pattern
  Object.values(PII_PATTERNS).forEach(pattern => {
    redacted = redacted.replace(pattern, placeholder);
  });

  return redacted;
}

/**
 * Redact sensitive fields from an object (deep)
 */
export function redactObject<T>(obj: T, placeholder: string = '[REDACTED]'): T {
  if (obj === null || obj === undefined) return obj;

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => redactObject(item, placeholder)) as T;
  }

  // Handle objects
  if (typeof obj === 'object') {
    const redacted: any = {};

    for (const [key, value] of Object.entries(obj)) {
      // Check if field name is sensitive
      const isSensitiveField = SENSITIVE_FIELDS.some(field =>
        key.toLowerCase().includes(field.toLowerCase())
      );

      if (isSensitiveField) {
        redacted[key] = placeholder;
      } else if (typeof value === 'string') {
        // Redact PII from string values
        redacted[key] = redactPii(value, placeholder);
      } else if (typeof value === 'object' && value !== null) {
        // Recursively redact nested objects
        redacted[key] = redactObject(value, placeholder);
      } else {
        redacted[key] = value;
      }
    }

    return redacted as T;
  }

  // Primitive types
  return obj;
}

/**
 * Safe JSON stringify with PII redaction
 */
export function safeStringify(obj: unknown, space?: number): string {
  try {
    const redacted = redactObject(obj);
    return JSON.stringify(redacted, null, space);
  } catch (error) {
    return '[Error stringifying object]';
  }
}

/**
 * Redact email but preserve domain for debugging
 */
export function redactEmail(email: string): string {
  if (!email || typeof email !== 'string') return email;

  const emailRegex = /^([^@]+)@(.+)$/;
  const match = email.match(emailRegex);

  if (!match) return email;

  const [, localPart, domain] = match;

  // Show first 2 chars of local part
  const visibleChars = localPart.length >= 2 ? localPart.substring(0, 2) : localPart;
  return `${visibleChars}***@${domain}`;
}

/**
 * Redact phone number but preserve last 4 digits
 */
export function redactPhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return phone;

  // Remove non-digits
  const digits = phone.replace(/\D/g, '');

  if (digits.length < 4) return '***';

  const lastFour = digits.slice(-4);
  return `***-***-${lastFour}`;
}

/**
 * Create a safe logger that redacts PII
 */
export const safeLogger = {
  log: (...args: unknown[]) => {
    console.log(...args.map(arg =>
      typeof arg === 'object' ? redactObject(arg) : arg
    ));
  },

  info: (...args: unknown[]) => {
    console.info(...args.map(arg =>
      typeof arg === 'object' ? redactObject(arg) : arg
    ));
  },

  warn: (...args: unknown[]) => {
    console.warn(...args.map(arg =>
      typeof arg === 'object' ? redactObject(arg) : arg
    ));
  },

  error: (...args: unknown[]) => {
    console.error(...args.map(arg =>
      typeof arg === 'object' ? redactObject(arg) : arg
    ));
  },

  debug: (...args: unknown[]) => {
    console.debug(...args.map(arg =>
      typeof arg === 'object' ? redactObject(arg) : arg
    ));
  },
};
