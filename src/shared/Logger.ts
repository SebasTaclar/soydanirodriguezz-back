import { Logger as AzureLogger } from '@azure/functions';
import { inspect } from 'util';
import { LogModel } from '../domain/entities/LogModel';

export class Logger implements LogModel {
  private info: (message: string, ...optionalParams: unknown[]) => void;
  private warn: (message: string, ...optionalParams: unknown[]) => void;
  private error: (message: string, ...optionalParams: unknown[]) => void;
  private verbose: (message: string, ...optionalParams: unknown[]) => void;
  private trace: (message: string, ...optionalParams: unknown[]) => void;

  constructor(logger: AzureLogger) {
    this.info = logger.info;
    this.warn = logger.info;
    this.error = logger.info;
    this.verbose = logger.info;

    // If logger is an Azure logger (context.log) we use verbose().
    // Otherwise, if logger is a Console object we use info().
    this.trace = this.verbose || this.info;
  }

  public logError = (message: string, params?: unknown): void => {
    try {
      this.error(`[ERROR] ${message}`, params ? inspect(params, { compact: true, depth: 5 }) : '');
    } catch (err) {
      this.warn(err);
    }
  };

  public logWarning = (message: string, params?: unknown): void => {
    try {
      this.warn(`[WARN] ${message}`, params ? inspect(params, { compact: true, depth: 5 }) : '');
    } catch (err) {
      this.warn(err);
    }
  };

  public logInfo = (message: string, params?: unknown): void => {
    try {
      this.info(`[INFO] ${message}`, params ? inspect(params, { compact: true, depth: 5 }) : '');
    } catch (err) {
      this.warn(err);
    }
  };

  public logVerbose = (message: string, params?: unknown): void => {
    try {
      this.trace(
        `[VERBOSE] ${message}`,
        params ? inspect(params, { compact: true, depth: 5 }) : ''
      );
    } catch (err) {
      this.warn(err);
    }
  };
}
