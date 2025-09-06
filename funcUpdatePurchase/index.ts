import { Context, HttpRequest } from '@azure/functions';
import { Logger } from '../src/shared/Logger';
import { withApiHandler } from '../src/shared/apiHandler';
import { ApiResponseBuilder } from '../src/shared/ApiResponse';
import { getPurchaseService } from '../src/shared/serviceProvider';

interface UpdatePurchaseRequest {
  buyerEmail?: string;
  buyerName?: string;
  buyerContactNumber?: string;
}

const funcUpdatePurchase = async (
  _context: Context,
  req: HttpRequest,
  log: Logger
): Promise<unknown> => {
  log.logInfo('Processing purchase update request');

  try {
    // Validar método HTTP
    if (!['PUT', 'PATCH'].includes(req.method || '')) {
      return ApiResponseBuilder.error('Method not allowed. Use PUT or PATCH', 405);
    }

    // Obtener el ID de la compra de los parámetros de la ruta
    const purchaseId = req.params?.id;
    if (!purchaseId) {
      return ApiResponseBuilder.validationError(['Purchase ID is required in the URL path']);
    }

    // Validar body de la request
    if (!req.body) {
      return ApiResponseBuilder.validationError(['Request body is required']);
    }

    const { buyerEmail, buyerName, buyerContactNumber }: UpdatePurchaseRequest = req.body;

    // Validar que al menos un campo sea proporcionado
    if (!buyerEmail && !buyerName && !buyerContactNumber) {
      return ApiResponseBuilder.validationError([
        'At least one field must be provided: buyerEmail, buyerName, or buyerContactNumber',
      ]);
    }

    // Validaciones específicas
    const validationErrors: string[] = [];

    if (buyerEmail !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(buyerEmail)) {
        validationErrors.push('Invalid email format');
      }
    }

    if (buyerName !== undefined && buyerName.trim().length < 2) {
      validationErrors.push('Buyer name must be at least 2 characters long');
    }

    if (validationErrors.length > 0) {
      return ApiResponseBuilder.validationError(validationErrors);
    }

    log.logInfo('Updating purchase', {
      purchaseId,
      fields: Object.keys(req.body),
      hasEmail: !!buyerEmail,
      hasName: !!buyerName,
      hasContactNumber: !!buyerContactNumber,
    });

    // Preparar datos de actualización
    const updateData: UpdatePurchaseRequest = {};
    if (buyerEmail !== undefined) updateData.buyerEmail = buyerEmail;
    if (buyerName !== undefined) updateData.buyerName = buyerName;
    if (buyerContactNumber !== undefined) updateData.buyerContactNumber = buyerContactNumber;

    // Obtener el servicio de compras y ejecutar la actualización
    const purchaseService = getPurchaseService();
    const result = await purchaseService.updatePurchase(purchaseId, updateData, log);

    log.logInfo('Purchase update completed successfully', {
      purchaseId,
      updatedFields: Object.keys(updateData),
    });

    return ApiResponseBuilder.success(result, 'Purchase updated successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    log.logError('Error updating purchase', { error: errorMessage });

    // Manejar errores específicos
    if (errorMessage.includes('Purchase not found')) {
      return ApiResponseBuilder.error('Purchase not found', 404);
    }

    if (errorMessage.includes('Invalid email format')) {
      return ApiResponseBuilder.validationError(['Invalid email format']);
    }

    if (errorMessage.includes('Buyer name must be at least')) {
      return ApiResponseBuilder.validationError(['Buyer name must be at least 2 characters long']);
    }

    // Error genérico
    return ApiResponseBuilder.error('Internal server error while updating purchase', 500);
  }
};

export default withApiHandler(funcUpdatePurchase);
