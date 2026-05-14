export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'QUOTA_EXCEEDED'
  | 'PAYMENT_FAILED'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly statusCode: number,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const isAppError = (error: unknown): error is AppError => error instanceof AppError;
