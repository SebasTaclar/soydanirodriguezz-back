import { Context, HttpRequest } from '@azure/functions';
import { Logger } from './Logger';

export interface HandlerWithLogger {
  (context: Context, req: HttpRequest, logger: Logger): Promise<unknown>;
}

/**
 * Middleware que inyecta automáticamente una instancia de Logger
 * como tercer parámetro del handler y registra detalles de la request
 */
export const withLogger = (handler: HandlerWithLogger) => {
  return async (context: Context, req: HttpRequest): Promise<unknown> => {
    const logger = new Logger(context);

    // Obtener el nombre de la función desde el context
    const functionName = context.invocationId
      ? `Function-${context.invocationId.slice(0, 8)}`
      : 'Azure Function';

    // Log de entrada con detalles de la request
    logger.logInfo(`🚀 [${functionName}] Function invoked`, {
      method: req.method,
      url: req.url,
      query: req.query,
      headers: sanitizeHeaders(req.headers),
      body: sanitizeBody(req.body),
      bodySize: req.body ? JSON.stringify(req.body).length : 0,
      timestamp: new Date().toISOString(),
    });

    const startTime = Date.now();

    try {
      const result = await handler(context, req, logger);

      // Log de éxito
      const duration = Date.now() - startTime;
      logger.logInfo(`✅ [${functionName}] Function completed successfully`, {
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      // Log de error (el errorMiddleware también lo manejará)
      const duration = Date.now() - startTime;
      logger.logError(`❌ [${functionName}] Function failed`, {
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });

      throw error; // Re-throw para que el errorMiddleware lo maneje
    }
  };
};

/**
 * Sanitiza headers sensibles para logging seguro
 */
const sanitizeHeaders = (headers: unknown): unknown => {
  if (!headers || typeof headers !== 'object' || headers === null) return {};

  const sanitized = { ...(headers as Record<string, unknown>) };
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];

  for (const header of sensitiveHeaders) {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  }

  return sanitized;
};

/**
 * Sanitiza información sensible del body para logging seguro
 */
const sanitizeBody = (body: unknown): unknown => {
  if (!body || typeof body !== 'object' || body === null) return body;

  const sanitized = { ...(body as Record<string, unknown>) };
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth', 'credentials'];

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
};
