export interface LogModel {
  logError(message: string, params?: unknown): void;
  logWarning(message: string, params?: unknown): void;
  logInfo(message: string, params?: unknown): void;
  logVerbose(message: string, params?: unknown): void;
}
