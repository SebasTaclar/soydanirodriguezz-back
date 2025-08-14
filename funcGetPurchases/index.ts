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
  // Obtener email desde query parameters (opcional)
  const email = req.query.email;

  // Si hay email, validar formato
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return ApiResponseBuilder.validationError(['Invalid email format']);
    }
  }

  // Obtener las compras usando el servicio
  const purchaseService = getPurchaseService();
  let purchases;

  if (email) {
    log.logInfo('Getting purchases for specific email', { email });
    purchases = await purchaseService.getPurchasesByEmail(email);
  } else {
    log.logInfo('Getting all purchases');
    purchases = await purchaseService.getAllPurchases();
  }

  log.logInfo('Purchases retrieved successfully', {
    email: email || 'all',
    count: purchases.length,
  });

  // Formatear la respuesta
  const formattedPurchases = purchases.map((purchase) => ({
    id: purchase.id,
    wallpaperNumbers: purchase.wallpaperNumbers, // Ya viene como array del service
    buyerEmail: purchase.buyerEmail,
    buyerName: purchase.buyerName,
    buyerContactNumber: purchase.buyerContactNumber,
    status: purchase.status,
    amount: purchase.amount,
    currency: purchase.currency,
    createdAt: purchase.createdAt,
    updatedAt: purchase.updatedAt,
  }));

  // Respuesta exitosa
  return ApiResponseBuilder.success(
    {
      email: email || null,
      count: formattedPurchases.length,
      purchases: formattedPurchases,
    },
    email ? 'Purchases retrieved successfully for email' : 'All purchases retrieved successfully'
  );
};

export default withApiHandler(funcGetPurchases);
