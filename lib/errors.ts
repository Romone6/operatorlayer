export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export type ErrorSeverity = "low" | "medium" | "high" | "critical";

export function statusCodeToSeverity(statusCode: number): ErrorSeverity {
  if (statusCode >= 500) return "critical";
  if (statusCode >= 429) return "high";
  if (statusCode >= 400) return "medium";
  return "low";
}

export function isRecoverableError(statusCode: number) {
  return statusCode < 500;
}

export function asAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(500, "internal_error", error.message);
  }

  return new AppError(500, "internal_error", "Unexpected error");
}
