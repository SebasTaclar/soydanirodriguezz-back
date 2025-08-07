import { Context, HttpRequest } from '@azure/functions';
import { ApiResponse } from './ApiResponse';

export const withApiResponse = <T extends unknown[]>(
  handler: (context: Context, req: HttpRequest, ...args: T) => Promise<unknown>
) => {
  return async (context: Context, req: HttpRequest, ...args: T): Promise<void> => {
    const result = await handler(context, req, ...args);

    // Si el resultado es una ApiResponse, extraer status y body
    if (result && typeof result === 'object' && 'statusCode' in result) {
      const apiResponse = result as ApiResponse;
      context.res = {
        status: apiResponse.statusCode,
        body: apiResponse,
        headers: {
          'Content-Type': 'application/json',
        },
      };
    } else {
      // Si es un objeto con status y body, usarlo directamente
      context.res = result;
    }
  };
};
