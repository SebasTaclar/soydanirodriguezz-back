import { HttpRequest } from '@azure/functions';
import { Logger } from './Logger';

export class AuthLogger {
  /**
   * Logs a login attempt with detailed information for auditing
   */
  static logLoginAttempt(log: Logger, req: HttpRequest): void {
    log.logInfo('🔐 Login attempt', {
      email: req.body?.email || 'No email provided',
      userAgent: req.headers?.['user-agent'] || 'Unknown',
      clientIP: req.headers?.['x-forwarded-for'] || req.headers?.['x-client-ip'] || 'Unknown',
    });
  }

  /**
   * Logs a successful login
   */
  static logLoginSuccess(log: Logger, req: HttpRequest): void {
    log.logInfo('✅ Login successful', {
      email: req.body?.email,
    });
  }

  /**
   * Logs a failed login attempt
   */
  static logLoginFailure(log: Logger, req: HttpRequest, error?: string): void {
    log.logWarning('❌ Login failed', {
      email: req.body?.email || 'No email provided',
      userAgent: req.headers?.['user-agent'] || 'Unknown',
      clientIP: req.headers?.['x-forwarded-for'] || req.headers?.['x-client-ip'] || 'Unknown',
      error: error || 'Unknown error',
    });
  }

  /**
   * Logs token validation attempts
   */
  static logTokenValidation(log: Logger, req: HttpRequest, success: boolean): void {
    const message = success ? '🔓 Token validation successful' : '🔒 Token validation failed';
    const logMethod = success ? log.logInfo : log.logWarning;

    logMethod(message, {
      userAgent: req.headers?.['user-agent'] || 'Unknown',
      clientIP: req.headers?.['x-forwarded-for'] || req.headers?.['x-client-ip'] || 'Unknown',
      hasAuthHeader: !!req.headers?.authorization,
    });
  }

  /**
   * Logs logout attempts
   */
  static logLogout(log: Logger, req: HttpRequest): void {
    log.logInfo('🚪 Logout request', {
      userAgent: req.headers?.['user-agent'] || 'Unknown',
      clientIP: req.headers?.['x-forwarded-for'] || req.headers?.['x-client-ip'] || 'Unknown',
    });
  }
}
