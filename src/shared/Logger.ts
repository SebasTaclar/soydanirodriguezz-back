import { Context } from '@azure/functions';
import { inspect } from 'util';
import { LogModel } from '../domain/entities/LogModel';

export class Logger implements LogModel {
  private context: Context;

  constructor(context: Context) {
    this.context = context;
  }

  public info = (message: string, params?: unknown): void => {
    try {
      this.context.log.info(
        `[INFO] ${message}`,
        params ? inspect(params, { compact: true, depth: 5 }) : ''
      );
    } catch (err) {
      this.context.log.warn(err);
    }
  };

  public warn = (message: string, params?: unknown): void => {
    try {
      this.context.log.warn(
        `[WARN] ${message}`,
        params ? inspect(params, { compact: true, depth: 5 }) : ''
      );
    } catch (err) {
      this.context.log.warn(err);
    }
  };

  public error = (message: string, params?: unknown): void => {
    try {
      this.context.log.error(
        `[ERROR] ${message}`,
        params ? inspect(params, { compact: true, depth: 5 }) : ''
      );
    } catch (err) {
      this.context.log.warn(err);
    }
  };

  public verbose = (message: string, params?: unknown): void => {
    try {
      this.context.log.verbose(
        `[VERBOSE] ${message}`,
        params ? inspect(params, { compact: true, depth: 5 }) : ''
      );
    } catch (err) {
      this.context.log.warn(err);
    }
  };

  // Métodos heredados de LogModel
  public logError = (message: string, params?: unknown): void => {
    this.error(message, params);
  };

  public logWarning = (message: string, params?: unknown): void => {
    this.warn(message, params);
  };

  public logInfo = (message: string, params?: unknown): void => {
    this.info(message, params);
  };

  public logVerbose = (message: string, params?: unknown): void => {
    this.verbose(message, params);
  };

  // Métodos estáticos para usar sin instancia
  public static info(message: string, params?: unknown): void {
    console.log(`[INFO] ${message}`, params ? inspect(params, { compact: true, depth: 5 }) : '');
  }

  public static warn(message: string, params?: unknown): void {
    console.warn(`[WARN] ${message}`, params ? inspect(params, { compact: true, depth: 5 }) : '');
  }

  public static error(message: string, params?: unknown): void {
    console.error(`[ERROR] ${message}`, params ? inspect(params, { compact: true, depth: 5 }) : '');
  }
}
