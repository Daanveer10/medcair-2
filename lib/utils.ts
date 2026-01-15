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

/**
 * Handles errors and returns a user-friendly response
 * Logs errors to console (prepared for future Sentry integration)
 */
export function handleError(error: unknown): ApiResponse {
  // Log error for debugging (and future Sentry integration)
  console.error("Error occurred:", error);

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
    const supabaseError = error as { message: string; code?: string };
    return {
      success: false,
      error: {
        message: supabaseError.message || "Database operation failed",
        code: supabaseError.code || "DATABASE_ERROR",
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
 */
export function validateData<T>(
  schema: { parse: (data: unknown) => T },
  data: unknown
): { success: true; data: T } | { success: false; error: ApiResponse["error"] } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
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
    return {
      success: false,
      error: {
        message: "Validation failed",
        code: "VALIDATION_ERROR",
      },
    };
  }
}
