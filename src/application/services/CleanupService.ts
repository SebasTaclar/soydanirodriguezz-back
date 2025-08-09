import { PrismaClient } from '@prisma/client';
import { MercadoPagoService } from '../../infrastructure/services/MercadoPagoService';
import { Logger } from '../../shared/Logger';

export interface CleanupResult {
  processedCount: number;
  updatedCount: number;
  errors: Array<{
    purchaseId: number;
    error: string;
  }>;
}

export interface PendingPurchase {
  id: number;
  mercadopagoPaymentId: string | null;
  preferenceId: string;
  externalReference: string;
  wallpaperNumbers: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export class CleanupService {
  private prisma: PrismaClient;
  private mercadoPagoService: MercadoPagoService;
  private logger: Logger;

  constructor(prisma: PrismaClient, mercadoPagoService: MercadoPagoService, logger: Logger) {
    this.prisma = prisma;
    this.mercadoPagoService = mercadoPagoService;
    this.logger = logger;
  }

  async cleanupPendingPurchases(): Promise<CleanupResult> {
    const result: CleanupResult = {
      processedCount: 0,
      updatedCount: 0,
      errors: [],
    };

    try {
      this.logger.logInfo('Starting cleanup process for pending purchases');

      // Obtener todas las compras con estado PENDING
      const pendingPurchases = await this.prisma.purchase.findMany({
        where: {
          status: 'PENDING',
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      this.logger.logInfo('Found pending purchases to process', {
        count: pendingPurchases.length,
      });

      result.processedCount = pendingPurchases.length;

      // Procesar cada compra pendiente
      for (const purchase of pendingPurchases) {
        try {
          await this.processPendingPurchase(purchase);
          result.updatedCount++;

          this.logger.logInfo('Purchase processed successfully', {
            purchaseId: purchase.id,
            externalReference: purchase.externalReference,
          });

          // Agregar un pequeño delay para no sobrecargar la API de MercadoPago
          await this.delay(500); // 500ms entre requests
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';

          this.logger.logError('Error processing purchase', {
            purchaseId: purchase.id,
            error: errorMessage,
          });

          result.errors.push({
            purchaseId: purchase.id,
            error: errorMessage,
          });
        }
      }

      this.logger.logInfo('Cleanup process completed', {
        processedCount: result.processedCount,
        updatedCount: result.updatedCount,
        errorsCount: result.errors.length,
      });

      return result;
    } catch (error) {
      this.logger.logError('Critical error during cleanup process', error);
      throw error;
    }
  }

  private async processPendingPurchase(purchase: PendingPurchase): Promise<void> {
    try {
      this.logger.logInfo('Processing pending purchase', {
        purchaseId: purchase.id,
        mercadopagoPaymentId: purchase.mercadopagoPaymentId,
        externalReference: purchase.externalReference,
      });

      let paymentStatus = null;
      let shouldUpdate = false;
      let newStatus = 'PENDING';

      // Si tenemos el ID del pago de MercadoPago, consultamos directamente
      if (purchase.mercadopagoPaymentId) {
        try {
          paymentStatus = await this.mercadoPagoService.getPaymentStatus(
            purchase.mercadopagoPaymentId
          );
          shouldUpdate = true;
        } catch (error) {
          this.logger.logWarning('Could not get payment status by payment ID', {
            purchaseId: purchase.id,
            mercadopagoPaymentId: purchase.mercadopagoPaymentId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Si no pudimos obtener el estado por payment ID, intentamos por búsqueda de preference
      if (!paymentStatus) {
        try {
          // Intentar obtener pagos por preference ID usando la API de búsqueda
          const searchResult = await this.searchPaymentsByReference(purchase.externalReference);

          if (searchResult && searchResult.length > 0) {
            // Tomar el pago más reciente
            paymentStatus = searchResult[0];
            shouldUpdate = true;

            // Si encontramos un payment ID que no teníamos, lo guardamos
            if (paymentStatus.id && !purchase.mercadopagoPaymentId) {
              await this.prisma.purchase.update({
                where: { id: purchase.id },
                data: { mercadopagoPaymentId: paymentStatus.id.toString() },
              });
            }
          }
        } catch (error) {
          this.logger.logWarning('Could not search payments by reference', {
            purchaseId: purchase.id,
            externalReference: purchase.externalReference,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Si después de 30 minutos sigue sin payment ID ni resultados, marcarlo como expirado
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      if (!paymentStatus && purchase.createdAt < thirtyMinutesAgo) {
        this.logger.logInfo('Purchase expired - no payment found after 30 minutes', {
          purchaseId: purchase.id,
          createdAt: purchase.createdAt,
        });

        shouldUpdate = true;
        newStatus = 'CANCELLED';
      }

      // Actualizar el estado si es necesario
      if (shouldUpdate && paymentStatus) {
        newStatus = this.mapMercadoPagoStatus(paymentStatus.status);

        this.logger.logInfo('Updating purchase status', {
          purchaseId: purchase.id,
          oldStatus: purchase.status,
          newStatus: newStatus,
          mercadoPagoStatus: paymentStatus.status,
        });
      }

      // Solo actualizar si el estado cambió
      if (shouldUpdate && newStatus !== purchase.status) {
        await this.prisma.purchase.update({
          where: { id: purchase.id },
          data: {
            status: newStatus,
            updatedAt: new Date(),
          },
        });

        // Log de wallpapers liberados si el pago fue rechazado o cancelado
        if (newStatus === 'REJECTED' || newStatus === 'CANCELLED') {
          const wallpaperNumbers = JSON.parse(purchase.wallpaperNumbers);
          this.logger.logInfo('Wallpapers released due to payment failure', {
            purchaseId: purchase.id,
            wallpaperNumbers: wallpaperNumbers,
            newStatus: newStatus,
          });
        }
      }
    } catch (error) {
      this.logger.logError('Error processing individual purchase', {
        purchaseId: purchase.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private async searchPaymentsByReference(externalReference: string): Promise<unknown[]> {
    try {
      // Esta es una función simplificada. En un escenario real podrías usar
      // la API de búsqueda de MercadoPago para encontrar pagos por external_reference
      this.logger.logInfo('Searching payments by external reference', { externalReference });

      // Por ahora retornamos array vacío ya que la API de búsqueda requiere configuración adicional
      // En producción deberías implementar la búsqueda real usando la API de MercadoPago
      return [];
    } catch (error) {
      this.logger.logError('Error searching payments by reference', error);
      return [];
    }
  }

  private mapMercadoPagoStatus(mercadoPagoStatus: string): string {
    // Mapear los estados de MercadoPago a nuestros estados internos
    switch (mercadoPagoStatus?.toLowerCase()) {
      case 'approved':
        return 'APPROVED';
      case 'rejected':
        return 'REJECTED';
      case 'cancelled':
      case 'canceled':
        return 'CANCELLED';
      case 'pending':
        return 'PENDING';
      case 'in_process':
        return 'PENDING';
      case 'refunded':
        return 'CANCELLED';
      default:
        this.logger.logWarning('Unknown MercadoPago status', { mercadoPagoStatus });
        return 'PENDING';
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getCleanupStatistics(): Promise<{
    totalPending: number;
    oldestPending: Date | null;
    recentlyProcessed: number;
  }> {
    try {
      const totalPending = await this.prisma.purchase.count({
        where: { status: 'PENDING' },
      });

      const oldestPending = await this.prisma.purchase.findFirst({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      });

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentlyProcessed = await this.prisma.purchase.count({
        where: {
          updatedAt: { gte: oneHourAgo },
          status: { not: 'PENDING' },
        },
      });

      return {
        totalPending,
        oldestPending: oldestPending?.createdAt || null,
        recentlyProcessed,
      };
    } catch (error) {
      this.logger.logError('Error getting cleanup statistics', error);
      throw error;
    }
  }
}
