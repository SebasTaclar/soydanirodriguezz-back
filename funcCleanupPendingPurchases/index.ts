import { AzureFunction, Context } from '@azure/functions';
import { Logger } from '../src/shared/Logger';
import { getCleanupService } from '../src/shared/serviceProvider';

const funcCleanupPendingPurchasesTimer: AzureFunction = async function (
  context: Context,
  cleanupTimer: unknown
): Promise<void> {
  const logger = new Logger(context);

  try {
    logger.logInfo('Starting scheduled cleanup of pending purchases');

    const cleanupService = getCleanupService(logger);
    const result = await cleanupService.cleanupPendingPurchases();

    logger.logInfo('Scheduled cleanup completed successfully', {
      processedCount: result.processedCount,
      updatedCount: result.updatedCount,
      errorsCount: result.errors.length,
    });

    if (result.errors.length > 0) {
      logger.logWarning('Some purchases had errors during cleanup', {
        errors: result.errors,
      });
    }

    // Información del timer para debugging
    if (
      typeof cleanupTimer === 'object' &&
      cleanupTimer !== null &&
      'isPastDue' in cleanupTimer &&
      (cleanupTimer as { isPastDue?: boolean }).isPastDue
    ) {
      logger.logWarning('Timer function is running late!');
    }
  } catch (error) {
    logger.logError('Critical error during scheduled cleanup', error);
    throw error;
  }
};

export default funcCleanupPendingPurchasesTimer;
