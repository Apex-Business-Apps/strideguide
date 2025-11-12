/**
 * Centralized authentication error handler
 * Maps Supabase AuthError to user-friendly messages
 */

import { logger } from "./ProductionLogger";

export interface AuthErrorResult {
  message: string;
  shouldLogDetails: boolean;
}

/**
 * Translate Supabase auth errors into user-friendly messages
 * Priority: Specific message patterns → Status codes → Fallback
 */
export function handleAuthError(
  error: Error & { status?: number; name?: string },
  correlationId: string,
  context: "signin" | "signup" | "reset"
): AuthErrorResult {
  // Log error details for debugging
  logger.error(`${context} error`, {
    correlationId,
    status: error.status,
    errorName: error.name,
    errorMessage: error.message,
  });

  // 1. Check specific error messages first (most reliable)
  if (error.message?.includes("Email not confirmed")) {
    return {
      message:
        "Please verify your email address before signing in. Check your inbox for a confirmation link.",
      shouldLogDetails: false,
    };
  }

  if (error.message?.includes("Invalid login credentials")) {
    return {
      message: "Email or password is incorrect.",
      shouldLogDetails: false,
    };
  }

  if (
    error.message?.includes("User already registered") ||
    error.message?.includes("already been registered")
  ) {
    return {
      message:
        "An account with this email already exists. Please sign in instead.",
      shouldLogDetails: false,
    };
  }

  if (error.message?.includes("Password should be at least")) {
    return {
      message:
        "Password must be at least 8 characters with uppercase, lowercase, number, and special character.",
      shouldLogDetails: false,
    };
  }

  if (
    error.message?.includes("request this once every") ||
    error.message?.includes("rate limit")
  ) {
    return {
      message:
        "Too many attempts. Please wait 60 seconds before trying again.",
      shouldLogDetails: false,
    };
  }

  // 2. Check for network/CORS errors
  if (
    error.message?.includes("Failed to fetch") ||
    error.name === "TypeError"
  ) {
    logger.error("CORS/Network failure detected", {
      correlationId,
      hint: "Check Supabase Auth URL configuration in dashboard",
    });
    return {
      message:
        "Network error. If on mobile data: 1) Toggle airplane mode on/off, 2) Restart browser, or 3) Use diagnostics below.",
      shouldLogDetails: true,
    };
  }

  if (error.message?.includes("timeout")) {
    return {
      message: "Request timed out. Please check your connection and try again.",
      shouldLogDetails: false,
    };
  }

  // 3. Check status codes (less specific, after message checks)
  if (error.status === 429) {
    return {
      message:
        "Too many attempts. Please wait a minute before trying again.",
      shouldLogDetails: false,
    };
  }

  if (error.status === 422) {
    return {
      message: "Invalid email or password format.",
      shouldLogDetails: false,
    };
  }

  if (error.status === 504) {
    return {
      message: "Service temporarily unavailable. Try again in a moment.",
      shouldLogDetails: false,
    };
  }

  // 4. Generic status codes (LAST - only if no specific message matched)
  if (error.status === 400 || error.status === 401 || error.status === 403) {
    return {
      message: "Authentication failed. Please check your credentials.",
      shouldLogDetails: false,
    };
  }

  // 5. Fallback with correlation ID for support
  logger.error(`Unexpected ${context} error`, { correlationId, error });
  return {
    message: `Authentication failed. Reference: ${correlationId.slice(0, 8)}`,
    shouldLogDetails: true,
  };
}
