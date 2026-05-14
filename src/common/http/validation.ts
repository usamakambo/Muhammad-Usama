import { AppError } from '../errors.js';

interface StringOptions {
  maxLength?: number;
}

export const asObject = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError('VALIDATION_ERROR', 'Request body must be an object', 400);
  }

  return value as Record<string, unknown>;
};

export const requiredString = (
  body: Record<string, unknown>,
  field: string,
  options: StringOptions = {},
): string => {
  const value = body[field];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AppError('VALIDATION_ERROR', `${field} is required`, 400, { field });
  }

  return validateString(value, field, options);
};

export const optionalBoolean = (
  body: Record<string, unknown>,
  field: string,
  fallback: boolean,
): boolean => {
  const value = body[field];
  if (value === undefined) {
    return fallback;
  }
  if (typeof value !== 'boolean') {
    throw new AppError('VALIDATION_ERROR', `${field} must be a boolean`, 400, { field });
  }

  return value;
};

export const requiredQueryString = (
  value: unknown,
  field: string,
  options: StringOptions = {},
): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AppError('VALIDATION_ERROR', `${field} query parameter is required`, 400, { field });
  }

  return validateString(value, field, options);
};

export const requiredParamString = (
  value: unknown,
  field: string,
  options: StringOptions = {},
): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AppError('VALIDATION_ERROR', `${field} route parameter is required`, 400, { field });
  }

  return validateString(value, field, options);
};

export const requiredUuidParam = (value: unknown, field: string): string => {
  const uuid = requiredParamString(value, field);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid)) {
    throw new AppError('VALIDATION_ERROR', `${field} must be a valid UUID`, 400, { field });
  }

  return uuid;
};

export const optionalPositiveIntQuery = (
  value: unknown,
  field: string,
  fallback: number,
  maximum: number,
): number => {
  if (value === undefined) {
    return fallback;
  }
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AppError(
      'VALIDATION_ERROR',
      `${field} query parameter must be a positive integer`,
      400,
      {
        field,
      },
    );
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new AppError(
      'VALIDATION_ERROR',
      `${field} query parameter must be between 1 and ${maximum}`,
      400,
      {
        field,
        maximum,
      },
    );
  }

  return parsed;
};

const validateString = (value: string, field: string, options: StringOptions): string => {
  const trimmed = value.trim();
  if (options.maxLength !== undefined && trimmed.length > options.maxLength) {
    throw new AppError(
      'VALIDATION_ERROR',
      `${field} must be ${options.maxLength} characters or fewer`,
      400,
      {
        field,
        maxLength: options.maxLength,
      },
    );
  }

  return trimmed;
};
