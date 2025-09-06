import { Context, HttpRequest } from '@azure/functions';
import { Logger } from '../src/shared/Logger';
import { withApiHandler } from '../src/shared/apiHandler';
import { ApiResponseBuilder } from '../src/shared/ApiResponse';
import { getPurchaseService } from '../src/shared/serviceProvider';

interface ResendEmailRequest {
  purchaseId: string;
}

const funcResendEmail = async (
  _context: Context,
  req: HttpRequest,
  log: Logger
): Promise<unknown> => {
  log.logInfo('Processing resend email request');

  try {
    // Validar método HTTP
    if (req.method !== 'POST') {
      return ApiResponseBuilder.error('Method not allowed', 405);
    }

    // Validar body de la request
    if (!req.body) {
      return ApiResponseBuilder.validationError(['Request body is required']);
    }

    const { purchaseId }: ResendEmailRequest = req.body;

    // Validaciones de entrada
    if (!purchaseId) {
      return ApiResponseBuilder.validationError(['purchaseId is required']);
    }

    log.logInfo('Resending email for purchase', { purchaseId });

    // Obtener el servicio de compras y ejecutar el reenvío
    const purchaseService = getPurchaseService();
    const result = await purchaseService.resendEmailForPurchase(purchaseId, log);

    log.logInfo('Email resend operation completed successfully', {
      purchaseId,
      message: result.message,
    });

    return ApiResponseBuilder.success(result, 'Email resent successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    log.logError('Error in resend email operation', { error: errorMessage });

    // Manejar errores específicos
    if (errorMessage.includes('Purchase not found')) {
      return ApiResponseBuilder.error('Purchase not found', 404);
    }

    if (errorMessage.includes('Cannot resend email') && errorMessage.includes('status is:')) {
      return ApiResponseBuilder.error(errorMessage, 400);
    }

    // Error genérico
    return ApiResponseBuilder.error(
      'Internal server error while processing resend email request',
      500
    );
  }
};

export default withApiHandler(funcResendEmail);
