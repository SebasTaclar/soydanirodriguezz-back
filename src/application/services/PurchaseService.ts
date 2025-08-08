import { PrismaClient } from '@prisma/client';
import {
  MercadoPagoService,
  CreatePaymentData,
  PaymentCreationResult,
} from '../../infrastructure/services/MercadoPagoService';
import { Logger } from '../../shared/Logger';

export interface CreatePurchaseRequest {
  wallpaperNumber: number;
  buyerEmail: string;
  buyerName: string;
  buyerIdentificationNumber: string;
  amount: number; // Cantidad en COP que viene desde el frontend
}

export interface CreatePurchaseResponse {
  purchaseId: string;
  paymentUrl: string;
  preferenceId: string;
  externalReference: string;
  wallpaperNumber: number;
  amount: number;
  currency: string;
}

export class PurchaseService {
  private prisma: PrismaClient;
  private mercadoPagoService: MercadoPagoService;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.mercadoPagoService = new MercadoPagoService();
  }

  async createPurchase(request: CreatePurchaseRequest): Promise<CreatePurchaseResponse> {
    try {
      Logger.info('Creating purchase', {
        wallpaperNumber: request.wallpaperNumber,
        buyerEmail: request.buyerEmail,
      });

      // Validar que el número de wallpaper sea válido
      if (request.wallpaperNumber <= 0 || request.wallpaperNumber > 1000) {
        throw new Error('Wallpaper number must be between 1 and 1000');
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

      // Validar número de identificación (CC Colombia)
      if (!request.buyerIdentificationNumber || request.buyerIdentificationNumber.length < 6) {
        throw new Error('Identification number must be at least 6 characters long');
      }

      // Validar que la cantidad sea válida
      if (!request.amount || request.amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Crear el pago en Mercado Pago
      const paymentData: CreatePaymentData = {
        wallpaperNumber: request.wallpaperNumber,
        buyerEmail: request.buyerEmail,
        buyerName: request.buyerName,
        buyerIdentificationNumber: request.buyerIdentificationNumber,
        amount: request.amount,
      };

      const paymentResult: PaymentCreationResult =
        await this.mercadoPagoService.createPayment(paymentData);

      // Guardar la compra en la base de datos
      const purchase = await this.prisma.purchase.create({
        data: {
          wallpaperNumber: request.wallpaperNumber,
          buyerEmail: request.buyerEmail,
          buyerName: request.buyerName,
          buyerIdentificationNumber: request.buyerIdentificationNumber,
          preferenceId: paymentResult.preferenceId,
          externalReference: paymentResult.externalReference,
          status: 'PENDING',
          amount: request.amount, // Cantidad que viene desde el frontend
          currency: 'COP',
        },
      });

      Logger.info('Purchase created successfully', {
        purchaseId: purchase.id,
        preferenceId: paymentResult.preferenceId,
        wallpaperNumber: request.wallpaperNumber,
      });

      return {
        purchaseId: purchase.id.toString(),
        paymentUrl: paymentResult.paymentUrl,
        preferenceId: paymentResult.preferenceId,
        externalReference: paymentResult.externalReference,
        wallpaperNumber: request.wallpaperNumber,
        amount: 2000,
        currency: 'COP',
      };
    } catch (error) {
      Logger.error('Error creating purchase', error);
      throw error;
    }
  }

  async updatePaymentStatus(
    mercadopagoPaymentId: string,
    status: string,
    paymentData?: any
  ): Promise<void> {
    try {
      Logger.info('Updating payment status', {
        mercadopagoPaymentId,
        status,
      });

      const purchase = await this.prisma.purchase.findFirst({
        where: {
          mercadopagoPaymentId: mercadopagoPaymentId,
        },
      });

      if (!purchase) {
        Logger.warn('Purchase not found for payment ID', { mercadopagoPaymentId });
        return;
      }

      await this.prisma.purchase.update({
        where: {
          id: purchase.id,
        },
        data: {
          status: status,
          mercadopagoPaymentId: mercadopagoPaymentId,
          updatedAt: new Date(),
        },
      });

      Logger.info('Payment status updated successfully', {
        purchaseId: purchase.id,
        status,
      });
    } catch (error) {
      Logger.error('Error updating payment status', error);
      throw error;
    }
  }

  async getPurchasesByEmail(email: string): Promise<any[]> {
    try {
      const purchases = await this.prisma.purchase.findMany({
        where: {
          buyerEmail: email,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return purchases;
    } catch (error) {
      Logger.error('Error getting purchases by email', error);
      throw error;
    }
  }
}
