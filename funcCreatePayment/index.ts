import { Context, HttpRequest } from '@azure/functions';
import { Logger } from '../src/shared/Logger';
import { withApiHandler } from '../src/shared/apiHandler';
import { ApiResponseBuilder } from '../src/shared/ApiResponse';
import { getPurchaseService } from '../src/shared/serviceProvider';
import { CreatePurchaseRequest } from '../src/application/services/PurchaseService';

const funcCreatePayment = async (
  _context: Context,
  req: HttpRequest,
  log: Logger
): Promise<unknown> => {
  // Validar campos requeridos
  const { wallpaperNumber, buyerEmail, buyerName, buyerIdentificationNumber, amount } = req.body;

  if (!wallpaperNumber || !buyerEmail || !buyerName || !buyerIdentificationNumber || !amount) {
    return ApiResponseBuilder.validationError([
      'Missing required fields: wallpaperNumber, buyerEmail, buyerName, buyerIdentificationNumber, amount',
    ]);
  }

  // Validar tipos de datos
  if (typeof wallpaperNumber !== 'number' || wallpaperNumber <= 0) {
    return ApiResponseBuilder.validationError(['wallpaperNumber must be a positive number']);
  }

  if (typeof amount !== 'number' || amount <= 0) {
    return ApiResponseBuilder.validationError(['amount must be a positive number']);
  }

  if (
    typeof buyerEmail !== 'string' ||
    typeof buyerName !== 'string' ||
    typeof buyerIdentificationNumber !== 'string'
  ) {
    return ApiResponseBuilder.validationError([
      'buyerEmail, buyerName, and buyerIdentificationNumber must be strings',
    ]);
  }

  // Crear request object
  const createPurchaseRequest: CreatePurchaseRequest = {
    wallpaperNumber: wallpaperNumber,
    buyerEmail: buyerEmail.trim(),
    buyerName: buyerName.trim(),
    buyerIdentificationNumber: buyerIdentificationNumber.trim(),
    amount: amount,
  };

  log.logInfo('Creating purchase for wallpaper', {
    wallpaperNumber,
    buyerEmail: buyerEmail.trim(),
  });

  // Crear la compra usando el servicio
  const purchaseService = getPurchaseService();
  const result = await purchaseService.createPurchase(createPurchaseRequest);

  log.logInfo('Purchase created successfully', {
    purchaseId: result.purchaseId,
    preferenceId: result.preferenceId,
    wallpaperNumber: result.wallpaperNumber,
  });

  // Respuesta exitosa
  return ApiResponseBuilder.success(
    {
      message: 'Payment created successfully',
      purchase: {
        id: result.purchaseId,
        wallpaperNumber: result.wallpaperNumber,
        amount: result.amount,
        currency: result.currency,
        status: 'PENDING',
      },
      payment: {
        preferenceId: result.preferenceId,
        paymentUrl: result.paymentUrl,
        externalReference: result.externalReference,
      },
    },
    'Payment created successfully'
  );
};

export default withApiHandler(funcCreatePayment);
