export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
  timestamp: string;
  statusCode: number;
}

export class ApiResponseBuilder {
  static success<T>(data: T, message: string = 'Operation completed successfully'): ApiResponse<T> {
    return {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
      statusCode: 200,
    };
  }

  static error(
    message: string = 'An error occurred',
    statusCode: number = 500,
    errors?: string[]
  ): ApiResponse<null> {
    return {
      success: false,
      message,
      data: null,
      errors,
      timestamp: new Date().toISOString(),
      statusCode,
    };
  }

  static validationError(errors: string[]): ApiResponse<null> {
    return {
      success: false,
      message: 'Validation failed',
      data: null,
      errors,
      timestamp: new Date().toISOString(),
      statusCode: 400,
    };
  }

  static unauthorized(message: string = 'Unauthorized access'): ApiResponse<null> {
    return {
      success: false,
      message,
      data: null,
      timestamp: new Date().toISOString(),
      statusCode: 401,
    };
  }

  static forbidden(message: string = 'Access forbidden'): ApiResponse<null> {
    return {
      success: false,
      message,
      data: null,
      timestamp: new Date().toISOString(),
      statusCode: 403,
    };
  }

  static notFound(message: string = 'Resource not found'): ApiResponse<null> {
    return {
      success: false,
      message,
      data: null,
      timestamp: new Date().toISOString(),
      statusCode: 404,
    };
  }

  static conflict(message: string = 'Resource conflict'): ApiResponse<null> {
    return {
      success: false,
      message,
      data: null,
      timestamp: new Date().toISOString(),
      statusCode: 409,
    };
  }

  static badRequest(message: string = 'Bad request'): ApiResponse<null> {
    return {
      success: false,
      message,
      data: null,
      timestamp: new Date().toISOString(),
      statusCode: 400,
    };
  }

  static methodNotAllowed(message: string = 'Method not allowed'): ApiResponse<null> {
    return {
      success: false,
      message,
      data: null,
      timestamp: new Date().toISOString(),
      statusCode: 405,
    };
  }

  static internalServerError(message: string = 'Internal server error'): ApiResponse<null> {
    return {
      success: false,
      message,
      data: null,
      timestamp: new Date().toISOString(),
      statusCode: 500,
    };
  }
}

// Alias para facilitar el uso directo
export const ApiResponse = ApiResponseBuilder;
