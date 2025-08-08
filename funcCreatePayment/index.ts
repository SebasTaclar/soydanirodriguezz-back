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
  const { wallpaperNumbers, buyerEmail, buyerName, buyerIdentificationNumber, amount } = req.body;

  if (!wallpaperNumbers || !buyerEmail || !buyerName || !buyerIdentificationNumber || !amount) {
    return ApiResponseBuilder.validationError([
      'Missing required fields: wallpaperNumbers, buyerEmail, buyerName, buyerIdentificationNumber, amount',
    ]);
  }

  // Validar tipos de datos
  if (!Array.isArray(wallpaperNumbers) || wallpaperNumbers.length === 0) {
    return ApiResponseBuilder.validationError(['wallpaperNumbers must be a non-empty array']);
  }

  if (!wallpaperNumbers.every((num) => typeof num === 'number' && num > 0)) {
    return ApiResponseBuilder.validationError(['All wallpaper numbers must be positive numbers']);
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
    wallpaperNumbers: wallpaperNumbers,
    buyerEmail: buyerEmail.trim(),
    buyerName: buyerName.trim(),
    buyerIdentificationNumber: buyerIdentificationNumber.trim(),
    amount: amount,
  };

  log.logInfo('Creating purchase for wallpapers', {
    wallpaperNumbers,
    buyerEmail: buyerEmail.trim(),
  });

  // Crear la compra usando el servicio
  const purchaseService = getPurchaseService();
  const result = await purchaseService.createPurchase(createPurchaseRequest);

  log.logInfo('Purchase created successfully', {
    purchaseId: result.purchaseId,
    preferenceId: result.preferenceId,
    wallpaperNumbers: result.wallpaperNumbers,
  });

  // Respuesta exitosa
  return ApiResponseBuilder.success(
    {
      message: 'Payment created successfully',
      purchase: {
        id: result.purchaseId,
        wallpaperNumbers: result.wallpaperNumbers,
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
