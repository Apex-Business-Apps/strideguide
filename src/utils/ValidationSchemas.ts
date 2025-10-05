import { z } from 'zod';

/**
 * Enterprise-grade input validation schemas
 * Prevents injection attacks and ensures data integrity
 */

export const emergencyContactSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .regex(/^[a-zA-Z\s\-']+$/, "Name contains invalid characters"),
  
  phone_number: z.string()
    .trim()
    .min(10, "Phone number must be at least 10 digits")
    .max(20, "Phone number too long")
    .regex(/^[\+]?[(]?[\d\s\-\(\)\.]{10,20}$/, "Invalid phone number format"),
  
  relationship: z.string()
    .trim()
    .max(50, "Relationship must be less than 50 characters")
    .optional(),
});

export const aiChatInputSchema = z.object({
  content: z.string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(1000, "Message too long (max 1000 characters)"),
  
  context: z.object({
    location: z.string().max(100).optional(),
    environment: z.enum(['indoor', 'outdoor', 'unknown']).optional(),
    urgency: z.enum(['low', 'medium', 'high']).optional(),
  }).optional(),
});

export const learnedItemSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Item name is required")
    .max(100, "Item name too long"),
  
  description: z.string()
    .trim()
    .max(500, "Description too long")
    .optional(),
  
  confidence_threshold: z.number()
    .min(0.1)
    .max(1.0)
    .default(0.85),
});

export const userSettingsSchema = z.object({
  volume_level: z.number().min(0).max(1),
  voice_speed: z.number().min(0.5).max(2.0),
  ml_confidence_threshold: z.number().min(0.1).max(1.0),
  voice_guidance_enabled: z.boolean(),
  haptic_feedback_enabled: z.boolean(),
  emergency_auto_call: z.boolean(),
  location_tracking_enabled: z.boolean(),
  fall_detection_enabled: z.boolean(),
  battery_saver_mode: z.boolean(),
  offline_mode_preferred: z.boolean(),
  object_detection_enabled: z.boolean(),
  telemetry_enabled: z.boolean(),
  high_contrast_mode: z.boolean(),
  large_text_mode: z.boolean(),
  low_end_device_mode: z.boolean(),
  winter_mode_enabled: z.boolean(),
});

/**
 * Payment & Subscription Validation
 */
export const checkoutInputSchema = z.object({
  planId: z.string().uuid("Invalid plan ID"),
  isYearly: z.boolean(),
  successUrl: z.string().url("Invalid success URL"),
  cancelUrl: z.string().url("Invalid cancel URL"),
  idempotencyKey: z.string().optional(),
});

export const billingPortalSchema = z.object({
  returnUrl: z.string().url("Invalid return URL"),
});

/**
 * Sanitization utilities
 */
export const sanitizers = {
  /**
   * Remove potentially dangerous HTML/JS content
   */
  sanitizeText: (input: string): string => {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  },

  /**
   * Encode for URL safety
   */
  encodeForUrl: (input: string): string => {
    return encodeURIComponent(input);
  },

  /**
   * Sanitize phone number for SMS/calling
   */
  sanitizePhoneNumber: (phone: string): string => {
    return phone.replace(/[^\d\+\-\(\)\s]/g, '').trim();
  },

  /**
   * Remove sensitive data from logs
   */
  sanitizeForLogging: (data: any): any => {
    if (typeof data === 'string') {
      return data.replace(/\b[\w\.-]+@[\w\.-]+\.\w+\b/g, '[EMAIL]')
                 .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]')
                 .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CARD]');
    }
    return data;
  }
};

/**
 * Validation middleware for API endpoints
 */
export const validateInput = <T>(schema: z.ZodSchema<T>) => {
  return (data: unknown): T => {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }));
        throw new Error(`Validation failed: ${JSON.stringify(issues)}`);
      }
      throw error;
    }
  };
};