import { Context, HttpRequest } from '@azure/functions';
import { Logger } from '../src/shared/Logger';
import { withApiHandler } from '../src/shared/apiHandler';
import { ApiResponseBuilder } from '../src/shared/ApiResponse';
import { WompiPurchaseService } from '../src/application/services/WompiPurchaseService';
import { WompiService } from '../src/infrastructure/services/WompiService';
import { getPrismaClient } from '../src/config/PrismaClient';

const funcWebhookWompi = async (
  _context: Context,
  req: HttpRequest,
  log: Logger
): Promise<unknown> => {
  log.logInfo('Processing Wompi webhook', {
    headers: req.headers,
    body: req.body,
  });

  try {
    // Validar que el body existe
    if (!req.body) {
      log.logWarning('Webhook received without body');
      return ApiResponseBuilder.badRequest('Missing webhook body');
    }

    // Extraer datos del webhook
    const { event, data, signature } = req.body;

    if (!event || !data) {
      log.logWarning('Invalid webhook format', { event, data });
      return ApiResponseBuilder.badRequest('Invalid webhook format');
    }

    // Validar firma del webhook (opcional por ahora)
    const wompiService = new WompiService();
    if (signature) {
      const isValidSignature = wompiService.validateWebhookSignature(
        JSON.stringify(req.body),
        signature
      );

      if (!isValidSignature) {
        log.logWarning('Invalid webhook signature', { signature });
        return ApiResponseBuilder.unauthorized('Invalid webhook signature');
      }
    }

    log.logInfo('Wompi webhook validated', {
      event,
      transactionId: data.transaction?.id,
      status: data.transaction?.status,
    });

    // Procesar diferentes tipos de eventos
    switch (event) {
      case 'transaction.updated':
        await handleTransactionUpdated(data, log);
        break;

      case 'payment_link.paid':
        await handlePaymentLinkPaid(data, log);
        break;

      case 'payment_link.expired':
        await handlePaymentLinkExpired(data, log);
        break;

      default:
        log.logInfo('Unhandled webhook event', { event });
        break;
    } // Responder exitosamente (Wompi requiere 200 OK)
    return ApiResponseBuilder.success(
      { message: 'Webhook processed successfully' },
      'Webhook processed'
    );
  } catch (error: any) {
    log.logError('Error processing Wompi webhook', {
      error: error.message,
      body: req.body,
    });

    // Aún así retornar 200 OK para evitar reintentos innecesarios
    return ApiResponseBuilder.success(
      { message: 'Webhook received but processing failed' },
      'Webhook received'
    );
  }
};

async function handleTransactionUpdated(data: any, log: Logger): Promise<void> {
  try {
    const transaction = data.transaction;

    if (!transaction || !transaction.id) {
      log.logWarning('Transaction data missing in webhook', { data });
      return;
    }

    log.logInfo('Handling transaction update', {
      transactionId: transaction.id,
      status: transaction.status,
      reference: transaction.reference,
    });

    // Actualizar el estado de la compra
    const prismaClient = getPrismaClient();
    const wompiPurchaseService = new WompiPurchaseService(prismaClient);

    await wompiPurchaseService.updatePurchaseStatus(transaction.id);

    log.logInfo('Transaction status updated successfully', {
      transactionId: transaction.id,
      newStatus: transaction.status,
    });
  } catch (error: any) {
    log.logError('Error handling transaction update', {
      error: error.message,
      transactionId: data.transaction?.id,
    });
    throw error;
  }
}

async function handlePaymentLinkPaid(data: any, log: Logger): Promise<void> {
  try {
    const paymentLink = data.payment_link;
    const transaction = data.transaction;

    if (!paymentLink || !paymentLink.id) {
      log.logWarning('Payment link data missing in webhook', { data });
      return;
    }

    log.logInfo('Handling payment link paid', {
      paymentLinkId: paymentLink.id,
      transactionId: transaction?.id,
      reference: paymentLink.reference,
    });

    // Actualizar el estado de la compra usando el ID del payment link
    const prismaClient = getPrismaClient();
    const wompiPurchaseService = new WompiPurchaseService(prismaClient);

    // Actualizar usando el ID del payment link (que guardamos como transactionId)
    await wompiPurchaseService.updatePurchaseStatusByReference(paymentLink.reference, 'COMPLETED');

    log.logInfo('Payment link paid processed successfully', {
      paymentLinkId: paymentLink.id,
      reference: paymentLink.reference,
    });
  } catch (error: any) {
    log.logError('Error handling payment link paid', {
      error: error.message,
      paymentLinkId: data.payment_link?.id,
    });
    throw error;
  }
}

async function handlePaymentLinkExpired(data: any, log: Logger): Promise<void> {
  try {
    const paymentLink = data.payment_link;

    if (!paymentLink || !paymentLink.id) {
      log.logWarning('Payment link data missing in webhook', { data });
      return;
    }

    log.logInfo('Handling payment link expired', {
      paymentLinkId: paymentLink.id,
      reference: paymentLink.reference,
    });

    // Actualizar el estado de la compra usando la referencia
    const prismaClient = getPrismaClient();
    const wompiPurchaseService = new WompiPurchaseService(prismaClient);

    await wompiPurchaseService.updatePurchaseStatusByReference(paymentLink.reference, 'CANCELLED');

    log.logInfo('Payment link expired processed successfully', {
      paymentLinkId: paymentLink.id,
      reference: paymentLink.reference,
    });
  } catch (error: any) {
    log.logError('Error handling payment link expired', {
      error: error.message,
      paymentLinkId: data.payment_link?.id,
    });
    throw error;
  }
}

export default withApiHandler(funcWebhookWompi);
