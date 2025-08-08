import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import { LogModel } from '../domain/entities/LogModel';
import { Logger } from './Logger';

// Interface for enhanced error information
interface EnhancedError extends Error {
  code?: string;
  meta?: unknown;
  clientVersion?: string;
  statusCode?: number;
  errorType?: string;
}

// Error context for tracking operation state
export interface ErrorContext {
  step?: string;
  operation?: string;
  entityType?: string;
  entityData?: unknown;
  creationState?: {
    clientCreated?: boolean;
    productCreated?: boolean;
    rentCreated?: boolean;
  };
}

/**
 * Centralized error handling middleware
 * Catches all errors from lower layers and provides detailed logging
 */
export function ErrorHandlerMiddleware(
  functionImplementation: (
    context: Context,
    req: HttpRequest,
    log: LogModel,
    errorContext: ErrorContext
  ) => Promise<void>
): AzureFunction {
  return async function (context: Context, req: HttpRequest, log: LogModel): Promise<void> {
    const errorContext: ErrorContext = {
      step: 'initialization',
      operation: 'unknown',
      creationState: {
        clientCreated: false,
        productCreated: false,
        rentCreated: false,
      },
    };

    try {
      // Execute the main function logic
      await functionImplementation(context, req, log, errorContext);
    } catch (error) {
      // Enhanced error logging with comprehensive information
      const enhancedError = error as EnhancedError;
      const logger = log || new Logger(context);

      logger.logError(`💥 CRITICAL ERROR in ${context.executionContext.functionName}`);
      logger.logError(`🎯 Error occurred at step: ${errorContext.step || 'unknown'}`);
      logger.logError(`🔧 Operation: ${errorContext.operation || 'unknown'}`);

      if (errorContext.entityType) {
        logger.logError(`📋 Entity type: ${errorContext.entityType}`);
      }

      // Log the basic error information
      logger.logError(`❌ Error message: ${enhancedError.message}`);
      logger.logError(`❌ Error stack: ${enhancedError.stack}`);

      // Log the full error object with all properties
      logger.logError(
        `❌ Full error object: ${JSON.stringify(enhancedError, Object.getOwnPropertyNames(enhancedError), 2)}`
      );

      // Log creation state for rollback information
      if (errorContext.creationState) {
        logger.logError(
          `📊 Creation state: ${JSON.stringify(errorContext.creationState, null, 2)}`
        );
      }

      // Log entity data if available (for debugging)
      if (errorContext.entityData) {
        logger.logError(`📝 Entity data: ${JSON.stringify(errorContext.entityData, null, 2)}`);
      }

      // Check for specific Prisma error codes and log detailed information
      if (enhancedError.code) {
        logger.logError(`❌ Error code: ${enhancedError.code}`);

        switch (enhancedError.code) {
          case 'P2002':
            logger.logError(`🔄 Unique constraint violation detected`);
            break;
          case 'P2025':
            logger.logError(`🔍 Record not found error detected`);
            break;
          case 'P2006':
            logger.logError(`✅ Validation error detected`);
            break;
          case 'P2003':
            logger.logError(`🔗 Foreign key constraint violation detected`);
            break;
          case 'P2014':
            logger.logError(`🚫 Required relation missing detected`);
            break;
          default:
            logger.logError(`🤔 Unknown Prisma error code: ${enhancedError.code}`);
        }
      }

      if (enhancedError.meta) {
        logger.logError(`❌ Error meta: ${JSON.stringify(enhancedError.meta, null, 2)}`);
      }

      if (enhancedError.clientVersion) {
        logger.logError(`❌ Prisma client version: ${enhancedError.clientVersion}`);
      }

      // Log request information for context
      if (req) {
        logger.logError(`📥 Request URL: ${req.url}`);
        logger.logError(`📥 Request method: ${req.method}`);
        if (req.body) {
          // Log request body but sanitize sensitive information
          const sanitizedBody = { ...req.body };
          if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';
          if (sanitizedBody.token) sanitizedBody.token = '[REDACTED]';
          logger.logError(`📥 Request body: ${JSON.stringify(sanitizedBody, null, 2)}`);
        }
      }

      // Determine response based on error type
      const errorResponse = determineErrorResponse(enhancedError);

      context.res = {
        status: errorResponse.statusCode,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: errorResponse.errorType,
          message: errorResponse.message,
          step: errorContext.step,
          timestamp: new Date().toISOString(),
          ...(process.env.NODE_ENV === 'development' && {
            debugInfo: {
              errorCode: enhancedError.code,
              errorMeta: enhancedError.meta,
              creationState: errorContext.creationState,
              operation: errorContext.operation,
              stack: enhancedError.stack,
            },
          }),
        }),
      };
    }
  };
}

/**
 * Helper function to determine appropriate error response based on error type
 */
function determineErrorResponse(error: EnhancedError): {
  statusCode: number;
  errorType: string;
  message: string;
} {
  // Handle predefined status codes
  if (error.statusCode) {
    return {
      statusCode: error.statusCode,
      errorType: error.errorType || 'Custom Error',
      message: error.message,
    };
  }

  // Handle Prisma-specific errors
  if (error.code) {
    switch (error.code) {
      case 'P2002':
        return {
          statusCode: 409,
          errorType: 'Conflict',
          message: `Duplicate entry detected. ${error.message}`,
        };
      case 'P2025':
        return {
          statusCode: 404,
          errorType: 'Not Found',
          message: `Required record not found. ${error.message}`,
        };
      case 'P2006':
      case 'P2007':
        return {
          statusCode: 400,
          errorType: 'Validation Error',
          message: `Data validation failed. ${error.message}`,
        };
      case 'P2003':
        return {
          statusCode: 400,
          errorType: 'Foreign Key Constraint',
          message: `Related record constraint violation. ${error.message}`,
        };
      case 'P2014':
        return {
          statusCode: 400,
          errorType: 'Required Relation Missing',
          message: `Required related record is missing. ${error.message}`,
        };
      default:
        return {
          statusCode: 500,
          errorType: 'Database Error',
          message: `Database operation failed. ${error.message}`,
        };
    }
  }

  // Handle validation errors
  if (
    error.message.toLowerCase().includes('validation') ||
    error.message.toLowerCase().includes('required') ||
    error.message.toLowerCase().includes('invalid')
  ) {
    return {
      statusCode: 400,
      errorType: 'Validation Error',
      message: error.message,
    };
  }

  // Handle authentication/authorization errors
  if (
    error.message.toLowerCase().includes('unauthorized') ||
    error.message.toLowerCase().includes('forbidden')
  ) {
    return {
      statusCode: 401,
      errorType: 'Unauthorized',
      message: error.message,
    };
  }

  // Handle not found errors
  if (error.message.toLowerCase().includes('not found')) {
    return {
      statusCode: 404,
      errorType: 'Not Found',
      message: error.message,
    };
  }

  // Handle conflict errors
  if (
    error.message.toLowerCase().includes('already exists') ||
    error.message.toLowerCase().includes('duplicate')
  ) {
    return {
      statusCode: 409,
      errorType: 'Conflict',
      message: error.message,
    };
  }

  // Default to internal server error
  return {
    statusCode: 500,
    errorType: 'Internal Server Error',
    message: error.message || 'An unexpected error occurred',
  };
}

/**
 * Helper function to create a custom error with additional context
 */
export function createCustomError(
  message: string,
  statusCode: number = 500,
  errorType: string = 'Internal Server Error',
  code?: string
): EnhancedError {
  const error = new Error(message) as EnhancedError;
  error.statusCode = statusCode;
  error.errorType = errorType;
  if (code) error.code = code;
  return error;
}

/**
 * Helper function to update error context during function execution
 */
export function updateErrorContext(context: ErrorContext, updates: Partial<ErrorContext>): void {
  Object.assign(context, updates);
  if (updates.creationState) {
    Object.assign(context.creationState || {}, updates.creationState);
  }
}
