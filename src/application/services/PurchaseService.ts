import { PrismaClient } from '@prisma/client';
import {
  MercadoPagoService,
  CreatePaymentData,
  PaymentCreationResult,
} from '../../infrastructure/services/MercadoPagoService';
import { Logger } from '../../shared/Logger';

export interface CreatePurchaseRequest {
  wallpaperNumbers: number[]; // Array de números de wallpapers
  buyerEmail: string;
  buyerName: string;
  buyerIdentificationNumber: string;
  amount: number; // Cantidad total en COP que viene desde el frontend
}

export interface CreatePurchaseResponse {
  purchaseId: string;
  paymentUrl: string;
  preferenceId: string;
  externalReference: string;
  wallpaperNumbers: number[]; // Array de números de wallpapers
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
        wallpaperNumbers: request.wallpaperNumbers,
        buyerEmail: request.buyerEmail,
      });

      // Validar que haya al menos un wallpaper
      if (!request.wallpaperNumbers || request.wallpaperNumbers.length === 0) {
        throw new Error('At least one wallpaper number is required');
      }

      // Validar que los números de wallpaper sean válidos
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
        wallpaperNumbers: request.wallpaperNumbers,
        buyerEmail: request.buyerEmail,
        buyerName: request.buyerName,
        buyerIdentificationNumber: request.buyerIdentificationNumber,
        amount: request.amount,
      };

      const paymentResult: PaymentCreationResult =
        await this.mercadoPagoService.createPayment(paymentData);

      // Guardar la compra en la base de datos con wallpapers como JSON string
      const purchase = await this.prisma.purchase.create({
        data: {
          wallpaperNumbers: JSON.stringify(request.wallpaperNumbers), // Guardar como JSON string
          buyerEmail: request.buyerEmail,
          buyerName: request.buyerName,
          buyerIdentificationNumber: request.buyerIdentificationNumber,
          preferenceId: paymentResult.preferenceId,
          externalReference: paymentResult.externalReference,
          status: 'PENDING',
          amount: request.amount, // Cantidad total que viene desde el frontend
          currency: 'COP',
        },
      });

      Logger.info('Purchase created successfully', {
        purchaseId: purchase.id,
        preferenceId: paymentResult.preferenceId,
        wallpaperNumbers: request.wallpaperNumbers,
      });

      return {
        purchaseId: purchase.id.toString(),
        paymentUrl: paymentResult.paymentUrl,
        preferenceId: paymentResult.preferenceId,
        externalReference: paymentResult.externalReference,
        wallpaperNumbers: request.wallpaperNumbers,
        amount: request.amount,
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
        externalReference: paymentData?.externalReference,
      });

      // Primero buscar por mercadopagoPaymentId si ya está guardado
      let purchase = await this.prisma.purchase.findFirst({
        where: {
          mercadopagoPaymentId: mercadopagoPaymentId,
        },
      });

      // Si no se encuentra por paymentId, buscar por externalReference
      if (!purchase && paymentData?.externalReference) {
        Logger.info('Purchase not found by paymentId, searching by externalReference', {
          externalReference: paymentData.externalReference,
        });

        purchase = await this.prisma.purchase.findFirst({
          where: {
            externalReference: paymentData.externalReference,
          },
        });
      }

      if (!purchase) {
        Logger.warn('Purchase not found for payment', {
          mercadopagoPaymentId,
          externalReference: paymentData?.externalReference,
        });
        return;
      }

      // Actualizar el purchase con toda la información del pago
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
        oldStatus: purchase.status,
        newStatus: status,
        mercadopagoPaymentId,
      });
    } catch (error) {
      Logger.error('Error updating payment status', error);
      throw error;
    }
  }

  async getPurchasesByEmail(email: string): Promise<any[]> {
    try {
      Logger.info('Getting purchases by email', { email });

      const purchases = await this.prisma.purchase.findMany({
        where: {
          buyerEmail: email,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      // Formatear la respuesta para incluir wallpaperNumbers como array
      const formattedPurchases = purchases.map((purchase) => ({
        id: purchase.id,
        wallpaperNumbers: JSON.parse(purchase.wallpaperNumbers), // Parsear JSON a array
        buyerEmail: purchase.buyerEmail,
        buyerName: purchase.buyerName,
        status: purchase.status,
        amount: purchase.amount,
        currency: purchase.currency,
        createdAt: purchase.createdAt,
        updatedAt: purchase.updatedAt,
      }));

      Logger.info('Purchases retrieved successfully', {
        email,
        count: formattedPurchases.length,
      });

      return formattedPurchases;
    } catch (error) {
      Logger.error('Error getting purchases by email', error);
      throw error;
    }
  }

  async getAllPurchases(): Promise<any[]> {
    try {
      Logger.info('Getting all purchases');

      const purchases = await this.prisma.purchase.findMany({
        orderBy: {
          updatedAt: 'desc',
        },
      });

      // Formatear la respuesta para incluir wallpaperNumbers como array
      const formattedPurchases = purchases.map((purchase) => ({
        id: purchase.id,
        wallpaperNumbers: JSON.parse(purchase.wallpaperNumbers), // Parsear JSON a array
        buyerEmail: purchase.buyerEmail,
        buyerName: purchase.buyerName,
        status: purchase.status,
        amount: purchase.amount,
        currency: purchase.currency,
        createdAt: purchase.createdAt,
        updatedAt: purchase.updatedAt,
      }));

      Logger.info('All purchases retrieved successfully', {
        count: formattedPurchases.length,
      });

      return formattedPurchases;
    } catch (error) {
      Logger.error('Error getting all purchases', error);
      throw error;
    }
  }
}
