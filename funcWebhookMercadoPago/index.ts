import { Context, HttpRequest } from '@azure/functions';
import { Logger } from '../src/shared/Logger';
import { withApiHandler } from '../src/shared/apiHandler';
import { ApiResponseBuilder } from '../src/shared/ApiResponse';
import { getPurchaseService } from '../src/shared/serviceProvider';

const funcWebhookMercadoPago = async (
  _context: Context,
  req: HttpRequest,
  log: Logger
): Promise<unknown> => {
  log.logInfo('Webhook MercadoPago triggered', {
    headers: req.headers,
    body: req.body,
    query: req.query,
  });

  // Mercado Pago puede enviar diferentes tipos de notificaciones
  const { type, data } = req.body || {};

  if (!type || !data) {
    log.logWarning('Invalid webhook payload - missing type or data');
    // Responder 200 para evitar que MP reintente
    return ApiResponseBuilder.success({ message: 'Webhook received but payload invalid' });
  }

  // Solo procesar notificaciones de pagos
  if (type === 'payment') {
    const paymentId = data.id;

    if (!paymentId) {
      log.logWarning('Payment notification missing payment ID');
      return ApiResponseBuilder.success({ message: 'Payment ID missing' });
    }

    log.logInfo('Processing payment notification', { paymentId });

    // Aquí normalmente consultarías la API de MP para obtener el estado actual del pago
    // Por simplicidad, asumimos que el webhook trae el estado
    // En producción deberías hacer una consulta a la API de MP para verificar el estado real

    const purchaseService = getPurchaseService();

    // Por ahora, actualizamos el status basado en el tipo de notificación
    // En una implementación real, consultarías el estado real del pago desde MP
    let status = 'PENDING';

    // Simulación del status - en producción esto vendría de la consulta a MP API
    if (req.body.action === 'payment.created') {
      status = 'PENDING';
    } else if (req.body.action === 'payment.updated') {
      // Aquí harías la consulta real al API de MP para verificar el estado
      status = 'APPROVED'; // Esto es solo para testing
    }

    await purchaseService.updatePaymentStatus(paymentId, status, req.body);

    log.logInfo('Payment status updated successfully', {
      paymentId,
      status,
    });

    return ApiResponseBuilder.success({
      message: 'Webhook processed successfully',
      paymentId,
      status,
    });
  } else {
    log.logInfo('Webhook notification type not handled', { type });
    return ApiResponseBuilder.success({
      message: 'Webhook received but type not handled',
      type,
    });
  }
};

export default withApiHandler(funcWebhookMercadoPago);
