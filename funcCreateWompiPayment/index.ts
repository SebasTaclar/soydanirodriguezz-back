import { Context, HttpRequest } from '@azure/functions';
import { Logger } from '../src/shared/Logger';
import { withApiHandler } from '../src/shared/apiHandler';
import { ApiResponseBuilder } from '../src/shared/ApiResponse';
import {
  WompiPurchaseService,
  CreateWompiPurchaseRequest,
} from '../src/application/services/WompiPurchaseService';
import { getPrismaClient } from '../src/config/PrismaClient';

const funcCreateWompiPayment = async (
  _context: Context,
  req: HttpRequest,
  log: Logger
): Promise<unknown> => {
  log.logInfo('Processing Wompi payment creation request');

  // Validar campos requeridos
  const {
    wallpaperNumbers,
    buyerEmail,
    buyerName,
    buyerIdentificationNumber,
    buyerContactNumber,
    amount,
  } = req.body;

  if (
    !wallpaperNumbers ||
    !buyerEmail ||
    !buyerName ||
    !buyerIdentificationNumber ||
    !buyerContactNumber ||
    !amount
  ) {
    return ApiResponseBuilder.validationError([
      'Missing required fields: wallpaperNumbers, buyerEmail, buyerName, buyerIdentificationNumber, buyerContactNumber, amount',
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

  if (amount < 1000) {
    return ApiResponseBuilder.validationError(['amount must be at least 1000 COP']);
  }

  if (
    typeof buyerEmail !== 'string' ||
    typeof buyerName !== 'string' ||
    typeof buyerIdentificationNumber !== 'string' ||
    typeof buyerContactNumber !== 'string'
  ) {
    return ApiResponseBuilder.validationError([
      'buyerEmail, buyerName, buyerIdentificationNumber, and buyerContactNumber must be strings',
    ]);
  }

  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(buyerEmail)) {
    return ApiResponseBuilder.validationError(['Invalid email format']);
  }

  try {
    // Crear request object
    const createPurchaseRequest: CreateWompiPurchaseRequest = {
      wallpaperNumbers: wallpaperNumbers,
      buyerEmail: buyerEmail.trim(),
      buyerName: buyerName.trim(),
      buyerIdentificationNumber: buyerIdentificationNumber.trim(),
      buyerContactNumber: buyerContactNumber.trim(),
      amount: amount,
    };

    log.logInfo('Creating Wompi purchase for wallpapers', {
      wallpaperNumbers,
      buyerEmail: buyerEmail.trim(),
      amount,
    });

    // Crear la compra usando el servicio de Wompi
    const prismaClient = getPrismaClient();
    const wompiPurchaseService = new WompiPurchaseService(prismaClient);
    const result = await wompiPurchaseService.createPurchase(createPurchaseRequest);

    log.logInfo('Wompi purchase created successfully', {
      purchaseId: result.purchaseId,
      reference: result.reference,
      wallpaperNumbers: result.wallpaperNumbers,
    });

    // Respuesta exitosa
    return ApiResponseBuilder.success(
      {
        message: 'Wompi payment created successfully',
        purchase: {
          id: result.purchaseId,
          wallpaperNumbers: result.wallpaperNumbers,
          amount: result.amountInCents / 100, // Convertir de centavos a COP
          currency: result.currency,
          status: 'PENDING',
          provider: 'WOMPI',
        },
        payment: {
          reference: result.reference,
          checkoutUrl: result.checkoutUrl, // URL del Web Checkout
          publicKey: result.publicKey,
          signature: result.signature,
          amountInCents: result.amountInCents,
          currency: result.currency,
        },
      },
      'Wompi payment created successfully'
    );
  } catch (error: any) {
    log.logError('Error creating Wompi payment', {
      error: error.message,
      wallpaperNumbers,
      buyerEmail,
    });

    if (error.message.includes('Wompi API Error')) {
      return ApiResponseBuilder.badRequest(error.message);
    }

    return ApiResponseBuilder.internalServerError('Failed to create Wompi payment');
  }
};

export default withApiHandler(funcCreateWompiPayment);
