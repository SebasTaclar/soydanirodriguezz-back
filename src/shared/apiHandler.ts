import { withErrorHandler } from './errorMiddleware';
import { withApiResponse } from './apiResponseMiddleware';
import { withLogger, HandlerWithLogger } from './loggerMiddleware';
import { withAuth, withoutAuth, HandlerWithAuth } from './authMiddleware';

/**
 * Middleware compuesto que combina el manejo de errores, formateo de respuestas
 * e inyección de logger automática (SIN autenticación)
 * Uso: export default withApiHandler((context, req, logger) => { ... });
 */
export const withApiHandler = (handler: HandlerWithLogger) => {
  // Aplicamos los middlewares en orden: logger -> errores -> respuesta
  return withApiResponse(withErrorHandler(withLogger(withoutAuth(handler))));
};

/**
 * Middleware compuesto que incluye autenticación JWT además del manejo de errores,
 * formateo de respuestas e inyección de logger automática
 * Uso: export default withAuthenticatedApiHandler((context, req, logger, user) => { ... });
 */
export const withAuthenticatedApiHandler = (handler: HandlerWithAuth) => {
  // Aplicamos los middlewares en orden: logger -> errores -> respuesta -> auth
  return withApiResponse(withErrorHandler(withLogger(withAuth(handler))));
};
