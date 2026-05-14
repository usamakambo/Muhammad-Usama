import type { ErrorRequestHandler } from 'express';
import { AppError, isAppError } from '../errors.js';

export const errorMiddleware: ErrorRequestHandler = (error, _req, res, next) => {
  void next;
  const appError = isAppError(error) ? error : toAppError(error);

  res.status(appError.statusCode).json({
    error: {
      code: appError.code,
      message: appError.message,
      details: appError.details,
    },
  });
};

const toAppError = (error: unknown): AppError => {
  if (isJsonParseError(error)) {
    return new AppError('VALIDATION_ERROR', 'Request body contains invalid JSON', 400);
  }

  console.error(error);
  return new AppError('INTERNAL_ERROR', 'Unexpected server error', 500);
};

const isJsonParseError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { status?: unknown; type?: unknown };
  return candidate.status === 400 && candidate.type === 'entity.parse.failed';
};
