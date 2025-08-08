import { Context, HttpRequest } from '@azure/functions';
import { Logger } from './Logger';
import { ApiResponseBuilder } from './ApiResponse';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
} from './exceptions';

export const withErrorHandler = <T extends unknown[]>(
  handler: (context: Context, req: HttpRequest, ...args: T) => Promise<unknown>
) => {
  return async (context: Context, req: HttpRequest, ...args: T): Promise<unknown> => {
    try {
      return await handler(context, req, ...args);
    } catch (error) {
      const logger = new Logger(context);
      logger.logError('Unhandled error in function', error as Error);
      return handleError(error, context);
    }
  };
};

const handleError = (error: unknown, context: Context) => {
  const logger = new Logger(context);

  // Logging detallado para debugging
  logger.logError('Error details', {
    errorType: error?.constructor?.name,
    isValidationError: error instanceof ValidationError,
    isAuthenticationError: error instanceof AuthenticationError,
    isAuthorizationError: error instanceof AuthorizationError,
    isNotFoundError: error instanceof NotFoundError,
    isConflictError: error instanceof ConflictError,
    isAppError: error instanceof AppError,
    message: error instanceof Error ? error.message : String(error),
  });

  if (error instanceof ValidationError) {
    return ApiResponseBuilder.error(error.message, 400);
  }

  if (error instanceof AuthenticationError) {
    return ApiResponseBuilder.error(error.message, 401);
  }

  if (error instanceof AuthorizationError) {
    return ApiResponseBuilder.error(error.message, 403);
  }

  if (error instanceof NotFoundError) {
    return ApiResponseBuilder.error(error.message, 404);
  }

  if (error instanceof ConflictError) {
    return ApiResponseBuilder.error(error.message, 409);
  }

  if (error instanceof AppError) {
    return ApiResponseBuilder.error(error.message, error.statusCode);
  }

  // Error no controlado
  logger.logError('Unhandled error type', error);
  return ApiResponseBuilder.error('An unexpected error occurred', 500);
};
