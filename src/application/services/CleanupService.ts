import { PrismaClient } from '@prisma/client';
import { MercadoPagoService } from '../../infrastructure/services/MercadoPagoService';
import { WompiService } from '../../infrastructure/services/WompiService';
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
  paymentProvider: string | null; // MERCADOPAGO, WOMPI, etc.
  wompiTransactionId: string | null; // ID de transacción de Wompi
  createdAt: Date;
  updatedAt: Date;
}

export class CleanupService {
  private prisma: PrismaClient;
  private mercadoPagoService: MercadoPagoService;
  private wompiService: WompiService;
  private logger: Logger;

  constructor(prisma: PrismaClient, mercadoPagoService: MercadoPagoService, logger: Logger) {
    this.prisma = prisma;
    this.mercadoPagoService = mercadoPagoService;
    this.wompiService = new WompiService();
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
        select: {
          id: true,
          mercadopagoPaymentId: true,
          preferenceId: true,
          externalReference: true,
          wallpaperNumbers: true,
          status: true,
          paymentProvider: true,
          wompiTransactionId: true,
          createdAt: true,
          updatedAt: true,
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

          // Agregar un pequeño delay para no sobrecargar las APIs
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
        paymentProvider: purchase.paymentProvider,
        mercadopagoPaymentId: purchase.mercadopagoPaymentId,
        wompiTransactionId: purchase.wompiTransactionId,
        externalReference: purchase.externalReference,
      });

      // Determinar el proveedor de pago
      const provider = purchase.paymentProvider || 'MERCADOPAGO'; // Default para compras legacy

      if (provider === 'WOMPI') {
        await this.processWompiPurchase(purchase);
      } else if (provider === 'MERCADOPAGO') {
        await this.processMercadoPagoPurchase(purchase);
      } else {
        this.logger.logWarning('Unknown payment provider', {
          purchaseId: purchase.id,
          provider: provider,
        });
      }
    } catch (error) {
      this.logger.logError('Error processing pending purchase', {
        purchaseId: purchase.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private async processWompiPurchase(purchase: PendingPurchase): Promise<void> {
    try {
      this.logger.logInfo('Processing Wompi purchase', {
        purchaseId: purchase.id,
        wompiTransactionId: purchase.wompiTransactionId,
        minutesElapsed: Math.floor((Date.now() - purchase.createdAt.getTime()) / (1000 * 60)),
      });

      let shouldUpdate = false;
      let newStatus = 'PENDING';

      // Definir timeouts para Wompi
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000); // 30 minutos

      // Caso 1: Pago abandonado (sin transacción después de 30 minutos)
      if (!purchase.wompiTransactionId && purchase.createdAt < thirtyMinutesAgo) {
        this.logger.logInfo('Wompi purchase abandoned - no transaction after 30 minutes', {
          purchaseId: purchase.id,
          createdAt: purchase.createdAt,
        });

        shouldUpdate = true;
        newStatus = 'CANCELLED';
      }
      // Caso 2: Tiene transacción - siempre verificar en Wompi primero
      else if (purchase.wompiTransactionId) {
        const isRealTransactionId = this.isRealWompiTransactionId(purchase.wompiTransactionId);

        if (isRealTransactionId) {
          // Si tiene ID real, siempre consultar Wompi primero
          this.logger.logInfo('Checking Wompi API for real transaction status', {
            purchaseId: purchase.id,
            wompiTransactionId: purchase.wompiTransactionId,
          });

          try {
            const wompiResponse = await this.wompiService.getTransactionStatus(
              purchase.wompiTransactionId
            );

            this.logger.logInfo('Wompi API response received', {
              purchaseId: purchase.id,
              wompiTransactionId: purchase.wompiTransactionId,
              wompiStatus: wompiResponse.status,
              responseData: JSON.stringify(wompiResponse.data, null, 2),
            });

            newStatus = this.mapWompiStatus(wompiResponse.status);
            shouldUpdate = true;

            this.logger.logInfo('Wompi status mapped', {
              purchaseId: purchase.id,
              wompiStatus: wompiResponse.status,
              mappedStatus: newStatus,
            });
          } catch (error) {
            this.logger.logWarning('Could not get status from Wompi API, checking timeout policy', {
              purchaseId: purchase.id,
              wompiTransactionId: purchase.wompiTransactionId,
              error: error instanceof Error ? error.message : 'Unknown error',
            });

            // Si no se puede consultar Wompi, aplicar política de timeout
            const hoursElapsed = (Date.now() - purchase.createdAt.getTime()) / (1000 * 60 * 60);

            if (hoursElapsed >= 24) {
              this.logger.logInfo(
                'Wompi purchase timeout - 24 hours elapsed without confirmation',
                {
                  purchaseId: purchase.id,
                  createdAt: purchase.createdAt,
                  hoursElapsed: Math.floor(hoursElapsed),
                }
              );

              shouldUpdate = true;
              newStatus = 'CANCELLED';
            } else {
              this.logger.logInfo(
                'Wompi API failed but within timeout window, keeping as pending',
                {
                  purchaseId: purchase.id,
                  hoursElapsed: Math.floor(hoursElapsed * 100) / 100, // 2 decimales
                  hoursRemaining: Math.ceil(24 - hoursElapsed),
                }
              );
            }
          }
        } else {
          // Si solo tiene referencia, aplicar política de timeout por tiempo
          this.logger.logInfo('Wompi transaction ID is a reference, checking timeout policy', {
            purchaseId: purchase.id,
            wompiTransactionId: purchase.wompiTransactionId,
          });

          // Calcular horas transcurridas desde la creación
          const hoursElapsed = (Date.now() - purchase.createdAt.getTime()) / (1000 * 60 * 60);

          if (hoursElapsed >= 6) {
            this.logger.logInfo('Wompi reference timeout - 6 hours without real transaction ID', {
              purchaseId: purchase.id,
              createdAt: purchase.createdAt,
              hoursElapsed: Math.floor(hoursElapsed),
            });

            shouldUpdate = true;
            newStatus = 'CANCELLED';
          } else {
            this.logger.logInfo('Wompi reference within timeout window, keeping as pending', {
              purchaseId: purchase.id,
              hoursElapsed: Math.floor(hoursElapsed * 100) / 100, // 2 decimales
              hoursRemaining: Math.ceil(6 - hoursElapsed),
            });
          }
        }
      }

      // Actualizar el estado si es necesario
      if (shouldUpdate && newStatus !== purchase.status) {
        await this.prisma.purchase.update({
          where: { id: purchase.id },
          data: {
            status: newStatus,
            updatedAt: new Date(),
          },
        });

        this.logger.logInfo('Wompi purchase status updated', {
          purchaseId: purchase.id,
          oldStatus: purchase.status,
          newStatus: newStatus,
        });

        // Log de wallpapers liberados si el pago fue cancelado
        if (newStatus === 'CANCELLED') {
          const wallpaperNumbers = JSON.parse(purchase.wallpaperNumbers);
          this.logger.logInfo('Wallpapers released due to Wompi payment abandonment/timeout', {
            purchaseId: purchase.id,
            wallpaperNumbers: wallpaperNumbers,
            newStatus: newStatus,
          });
        }
      }
    } catch (error) {
      this.logger.logError('Error processing Wompi purchase', {
        purchaseId: purchase.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private async processMercadoPagoPurchase(purchase: PendingPurchase): Promise<void> {
    try {
      this.logger.logInfo('Processing MercadoPago purchase', {
        purchaseId: purchase.id,
        mercadopagoPaymentId: purchase.mercadopagoPaymentId,
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
        this.logger.logInfo('MercadoPago purchase expired - no payment found after 30 minutes', {
          purchaseId: purchase.id,
          createdAt: purchase.createdAt,
        });

        shouldUpdate = true;
        newStatus = 'CANCELLED';
      }

      // Actualizar el estado si es necesario
      if (shouldUpdate && paymentStatus) {
        newStatus = this.mapMercadoPagoStatus(paymentStatus.status);

        this.logger.logInfo('Updating MercadoPago purchase status', {
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
          this.logger.logInfo('Wallpapers released due to MercadoPago payment failure', {
            purchaseId: purchase.id,
            wallpaperNumbers: wallpaperNumbers,
            newStatus: newStatus,
          });
        }
      }
    } catch (error) {
      this.logger.logError('Error processing MercadoPago purchase', {
        purchaseId: purchase.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
      this.logger.logError('Error searching payments by reference', {
        externalReference,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private mapMercadoPagoStatus(mpStatus: string): string {
    // Mapeo de estados de MercadoPago a nuestros estados internos
    switch (mpStatus) {
      case 'approved':
        return 'COMPLETED';
      case 'rejected':
      case 'cancelled':
        return 'REJECTED';
      case 'refunded':
      case 'charged_back':
        return 'CANCELLED';
      case 'pending':
      case 'in_process':
      case 'in_mediation':
      case 'authorized':
      default:
        return 'PENDING';
    }
  }

  // Mapeo de estados de Wompi
  private mapWompiStatus(wompiStatus: string): string {
    switch (wompiStatus.toUpperCase()) {
      case 'APPROVED':
        return 'COMPLETED';
      case 'DECLINED':
      case 'ERROR':
        return 'REJECTED';
      case 'VOIDED':
        return 'CANCELLED';
      case 'PENDING':
      default:
        return 'PENDING';
    }
  }

  // Verificar si un wompiTransactionId es un ID real de transacción o solo una referencia
  private isRealWompiTransactionId(wompiTransactionId: string): boolean {
    // Los IDs reales de Wompi tienen un formato como: "11779666-1756257523-64296"
    // Las referencias tienen formato como: "wallpapers_18_1756257513564" o "test_rqU11B"

    if (!wompiTransactionId) return false;

    // Si empieza con "wallpapers_" o "test_", es una referencia
    if (wompiTransactionId.startsWith('wallpapers_') || wompiTransactionId.startsWith('test_')) {
      return false;
    }

    // Los IDs reales de Wompi suelen tener el formato de números separados por guiones
    // Ejemplo: "11779666-1756257523-64296"
    const realIdPattern = /^\d+-\d+-\d+$/;
    return realIdPattern.test(wompiTransactionId);
  }

  async getCleanupStatistics(): Promise<{
    pendingCount: number;
    totalProcessed: number;
    recentlyProcessed: number;
  }> {
    try {
      this.logger.logInfo('Getting cleanup statistics');

      const pendingCount = await this.prisma.purchase.count({
        where: { status: 'PENDING' },
      });

      const totalProcessed = await this.prisma.purchase.count({
        where: {
          status: {
            in: ['COMPLETED', 'REJECTED', 'CANCELLED'],
          },
        },
      });

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentlyProcessed = await this.prisma.purchase.count({
        where: {
          status: {
            in: ['COMPLETED', 'REJECTED', 'CANCELLED'],
          },
          updatedAt: {
            gte: oneDayAgo,
          },
        },
      });

      this.logger.logInfo('Cleanup statistics retrieved', {
        pendingCount,
        totalProcessed,
        recentlyProcessed,
      });

      return {
        pendingCount,
        totalProcessed,
        recentlyProcessed,
      };
    } catch (error) {
      this.logger.logError('Error getting cleanup statistics', error);
      throw error;
    }
  }
}
