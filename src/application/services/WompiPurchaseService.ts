import { PrismaClient } from '@prisma/client';
import { WompiService } from '../../infrastructure/services/WompiService';
import { Logger } from '../../shared/Logger';

export interface CreateWompiPurchaseRequest {
  wallpaperNumbers: number[];
  buyerEmail: string;
  buyerName: string;
  buyerIdentificationNumber: string;
  buyerContactNumber: string;
  amount: number;
}

export interface CreateWompiPurchaseResponse {
  purchaseId: string;
  reference: string;
  publicKey: string;
  signature: string;
  amountInCents: number;
  wallpaperNumbers: number[];
  currency: string;
  redirectUrl?: string;
}

export class WompiPurchaseService {
  private prisma: PrismaClient;
  private wompiService: WompiService;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.wompiService = new WompiService();
  }

  async createPurchase(request: CreateWompiPurchaseRequest): Promise<CreateWompiPurchaseResponse> {
    try {
      Logger.info('Creating Wompi purchase', {
        wallpaperNumbers: request.wallpaperNumbers,
        buyerEmail: request.buyerEmail,
      });

      // Validaciones
      this.validatePurchaseRequest(request);

      // Crear el pago en Wompi (generar parámetros para el frontend)
      const wompiPayment = await this.wompiService.createPayment({
        wallpaperNumbers: request.wallpaperNumbers,
        buyerEmail: request.buyerEmail,
        buyerName: request.buyerName,
        buyerIdentificationNumber: request.buyerIdentificationNumber,
        buyerContactNumber: request.buyerContactNumber,
        amount: request.amount,
      });

      // Guardar la compra en la base de datos
      const purchase = await this.prisma.purchase.create({
        data: {
          wallpaperNumbers: JSON.stringify(request.wallpaperNumbers),
          buyerEmail: request.buyerEmail,
          buyerName: request.buyerName,
          buyerIdentificationNumber: request.buyerIdentificationNumber,
          buyerContactNumber: request.buyerContactNumber,
          preferenceId: wompiPayment.reference, // Usar referencia como preferenceId
          externalReference: wompiPayment.reference,
          status: 'PENDING',
          amount: request.amount,
          currency: 'COP',
          // Campos específicos para Wompi
          paymentProvider: 'WOMPI',
          wompiTransactionId: wompiPayment.reference, // Por ahora usar referencia, se actualizará con webhook
        },
      });

      Logger.info('Wompi purchase created successfully', {
        purchaseId: purchase.id,
        reference: wompiPayment.reference,
        wallpaperNumbers: request.wallpaperNumbers,
      });

      return {
        purchaseId: purchase.id.toString(),
        reference: wompiPayment.reference,
        publicKey: wompiPayment.publicKey,
        signature: wompiPayment.signature,
        amountInCents: wompiPayment.amountInCents,
        wallpaperNumbers: request.wallpaperNumbers,
        currency: wompiPayment.currency,
      };
    } catch (error: any) {
      Logger.error('Error creating Wompi purchase', {
        error: error.message,
        wallpaperNumbers: request.wallpaperNumbers,
        buyerEmail: request.buyerEmail,
      });
      throw error;
    }
  }

  async updatePurchaseStatus(transactionId: string): Promise<void> {
    try {
      Logger.info('Updating Wompi purchase status', { transactionId });

      // TODO: Implementar cuando sea necesario consultar estado desde Wompi API
      // Por ahora, el estado se actualiza solo via webhook

      Logger.info('Wompi purchase status update skipped - webhook only', {
        transactionId,
      });
    } catch (error: any) {
      Logger.error('Error updating Wompi purchase status', {
        transactionId,
        error: error.message,
      });
      throw error;
    }
  }

  async updatePurchaseStatusByReference(reference: string, status: string): Promise<void> {
    try {
      Logger.info('Updating Wompi purchase status by reference', { reference, status });

      // Actualizar el estado en la base de datos usando la referencia externa
      await this.prisma.purchase.updateMany({
        where: {
          externalReference: reference,
        },
        data: {
          status: status,
          updatedAt: new Date(),
        },
      });

      Logger.info('Wompi purchase status updated by reference', {
        reference,
        newStatus: status,
      });
    } catch (error: any) {
      Logger.error('Error updating Wompi purchase status by reference', {
        reference,
        status,
        error: error.message,
      });
      throw error;
    }
  }

  private validatePurchaseRequest(request: CreateWompiPurchaseRequest): void {
    // Validar wallpapers
    if (!request.wallpaperNumbers || request.wallpaperNumbers.length === 0) {
      throw new Error('At least one wallpaper number is required');
    }

    for (const wallpaperNumber of request.wallpaperNumbers) {
      if (wallpaperNumber <= 0 || wallpaperNumber > 1000) {
        throw new Error(`Wallpaper number ${wallpaperNumber} must be between 1 and 1000`);
      }
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(request.buyerEmail)) {
      throw new Error('Invalid email format');
    }

    // Validar nombre
    if (!request.buyerName || request.buyerName.trim().length < 2) {
      throw new Error('Buyer name must be at least 2 characters long');
    }

    // Validar número de identificación
    if (!request.buyerIdentificationNumber || request.buyerIdentificationNumber.length < 6) {
      throw new Error('Identification number must be at least 6 characters long');
    }

    // Validar número de contacto
    if (!request.buyerContactNumber || request.buyerContactNumber.length < 10) {
      throw new Error('Contact number must be at least 10 characters long');
    }

    // Validar monto
    if (!request.amount || request.amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    // Validar monto mínimo (Wompi requiere mínimo $1,000 COP)
    if (request.amount < 1000) {
      throw new Error('Amount must be at least 1000 COP');
    }
  }
}
