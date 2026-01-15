import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ZodError } from "zod";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// This check can be removed, it is just for tutorial purposes
export const hasEnvVars =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// ============================================================================
// ERROR HANDLING UTILITIES
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
}

export interface ErrorContext {
  action?: string;
  userId?: string;
  resource?: string;
  metadata?: Record<string, any>;
}

/**
 * Centralized error logger
 * Prepares for Sentry integration - replace console.error with Sentry.captureException
 */
function logError(error: unknown, context?: ErrorContext) {
  const errorInfo = {
    error,
    timestamp: new Date().toISOString(),
    context: context || {},
  };

  // Log to console (development)
  console.error("Error occurred:", errorInfo);

  // TODO: Integrate Sentry for production
  // if (process.env.NODE_ENV === 'production') {
  //   Sentry.captureException(error, {
  //     tags: {
  //       action: context?.action,
  //       resource: context?.resource,
  //     },
  //     extra: context?.metadata,
  //     user: context?.userId ? { id: context.userId } : undefined,
  //   });
  // }
}

/**
 * Handles errors and returns a user-friendly response
 * Logs errors to console (prepared for future Sentry integration)
 * 
 * @param error - The error to handle
 * @param context - Optional context for better error tracking
 * @returns Structured error response
 */
export function handleError(error: unknown, context?: ErrorContext): ApiResponse {
  // Log error with context
  logError(error, context);

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const firstError = error.issues[0];
    return {
      success: false,
      error: {
        message: firstError?.message || "Validation failed",
        code: "VALIDATION_ERROR",
        details: error.issues,
      },
    };
  }

  // Handle Supabase errors
  if (error && typeof error === "object" && "message" in error) {
    const supabaseError = error as { message: string; code?: string; details?: any };
    
    // Map common Supabase error codes to user-friendly messages
    let userMessage = supabaseError.message || "Database operation failed";
    if (supabaseError.code === "23505") {
      userMessage = "This record already exists.";
    } else if (supabaseError.code === "23503") {
      userMessage = "Referenced record does not exist.";
    } else if (supabaseError.code === "PGRST116") {
      userMessage = "No rows found.";
    }
    
    return {
      success: false,
      error: {
        message: userMessage,
        code: supabaseError.code || "DATABASE_ERROR",
        details: supabaseError.details,
      },
    };
  }

  // Handle generic Error objects
  if (error instanceof Error) {
    return {
      success: false,
      error: {
        message: error.message || "An unexpected error occurred",
        code: "UNKNOWN_ERROR",
      },
    };
  }

  // Fallback for unknown error types
  return {
    success: false,
    error: {
      message: "An unexpected error occurred. Please try again.",
      code: "UNKNOWN_ERROR",
    },
  };
}

/**
 * Creates a success response
 */
export function successResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
  };
}

/**
 * Validates data against a Zod schema and returns formatted error if invalid
 * 
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @param context - Optional context for error logging
 * @returns Validation result with data or error
 */
export function validateData<T>(
  schema: { parse: (data: unknown) => T },
  data: unknown,
  context?: ErrorContext
): { success: true; data: T } | { success: false; error: ApiResponse["error"] } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof ZodError) {
      logError(error, { ...context, action: "validation" });
      const firstError = error.issues[0];
      return {
        success: false,
        error: {
          message: firstError?.message || "Validation failed",
          code: "VALIDATION_ERROR",
          details: error.issues,
        },
      };
    }
    logError(error, { ...context, action: "validation" });
    return {
      success: false,
      error: {
        message: "Validation failed",
        code: "VALIDATION_ERROR",
      },
    };
  }
}

/**
 * Safe async operation wrapper
 * Catches errors and returns structured response
 * 
 * @param operation - Async function to execute
 * @param context - Optional context for error tracking
 * @returns Promise with ApiResponse
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  context?: ErrorContext
): Promise<ApiResponse<T>> {
  try {
    const data = await operation();
    return successResponse(data);
  } catch (error) {
    return handleError(error, context);
  }
}
