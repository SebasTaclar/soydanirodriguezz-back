import { Context, HttpRequest } from '@azure/functions';
import { Logger } from '../src/shared/Logger';
import { withApiHandler } from '../src/shared/apiHandler';
import { ApiResponseBuilder } from '../src/shared/ApiResponse';
import { getPurchaseService } from '../src/shared/serviceProvider';

const funcGetPurchases = async (
  _context: Context,
  req: HttpRequest,
  log: Logger
): Promise<unknown> => {
  // Obtener email desde query parameters
  const email = req.query.email;

  if (!email) {
    return ApiResponseBuilder.validationError(['Email query parameter is required']);
  }

  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return ApiResponseBuilder.validationError(['Invalid email format']);
  }

  log.logInfo('Getting purchases for email', { email });

  // Obtener las compras usando el servicio
  const purchaseService = getPurchaseService();
  const purchases = await purchaseService.getPurchasesByEmail(email);

  log.logInfo('Purchases retrieved successfully', {
    email,
    count: purchases.length,
  });

  // Formatear la respuesta para no exponer datos internos
  const formattedPurchases = purchases.map((purchase) => ({
    id: purchase.id,
    wallpaperNumber: purchase.wallpaperNumber,
    status: purchase.status,
    amount: purchase.amount,
    currency: purchase.currency,
    createdAt: purchase.createdAt,
    updatedAt: purchase.updatedAt,
  }));

  // Respuesta exitosa
  return ApiResponseBuilder.success(
    {
      email: email,
      count: formattedPurchases.length,
      purchases: formattedPurchases,
    },
    'Purchases retrieved successfully'
  );
};

export default withApiHandler(funcGetPurchases);
