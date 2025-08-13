import { Context, HttpRequest } from '@azure/functions';
import { Logger } from '../src/shared/Logger';
import { withApiHandler } from '../src/shared/apiHandler';
import { ApiResponseBuilder } from '../src/shared/ApiResponse';
import {
  getPurchaseService,
  getMercadoPagoService,
  getEmailService,
} from '../src/shared/serviceProvider';

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

    try {
      // Consultar el estado real del pago en Mercado Pago
      const mercadoPagoService = getMercadoPagoService();
      const paymentDetails = await mercadoPagoService.getPaymentStatus(paymentId);

      // Mapear estado de MP a nuestro sistema
      const statusMapping = {
        approved: 'APPROVED',
        rejected: 'REJECTED',
        pending: 'PENDING',
        cancelled: 'CANCELLED',
        refunded: 'REFUNDED',
      };

      const mappedStatus = statusMapping[paymentDetails.status] || 'PENDING';

      // Actualizar el estado de la compra usando el external reference
      const purchaseService = getPurchaseService();
      await purchaseService.updatePaymentStatus(paymentId, mappedStatus, paymentDetails);

      log.logInfo('Payment status updated successfully', {
        paymentId,
        status: mappedStatus,
        externalReference: paymentDetails.externalReference,
      });

      // Enviar email de confirmación para cualquier estado de pago
      try {
        const emailService = getEmailService(log);
        const paymentWebhookData = {
          id: paymentDetails.id.toString(),
          status: paymentDetails.status,
          externalReference: paymentDetails.externalReference,
          transactionAmount: paymentDetails.transactionAmount,
          paymentMethodId: paymentDetails.paymentMethodId,
          dateApproved: paymentDetails.dateApproved,
          dateCreated: paymentDetails.dateCreated,
        };

        await emailService.sendPaymentNotificationFromWebhook(paymentWebhookData, mappedStatus);
      } catch (emailError) {
        log.logError('Error sending payment notification email', emailError);
        // No fallar el webhook por un error de email
      }

      return ApiResponseBuilder.success({
        message: 'Webhook processed successfully',
        paymentId,
        status: mappedStatus,
        externalReference: paymentDetails.externalReference,
      });
    } catch (error) {
      log.logError('Error processing payment webhook', error);

      // Aún así devolver 200 para evitar que MP reintente infinitamente
      return ApiResponseBuilder.success({
        message: 'Webhook received but processing failed',
        paymentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  } else {
    log.logInfo('Webhook notification type not handled', { type });
    return ApiResponseBuilder.success({
      message: 'Webhook received but type not handled',
      type,
    });
  }
};

export default withApiHandler(funcWebhookMercadoPago);
