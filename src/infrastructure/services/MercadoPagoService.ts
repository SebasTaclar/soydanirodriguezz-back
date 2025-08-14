import { MercadoPagoConfig, Preference } from 'mercadopago';
import { Logger } from '../../shared/Logger';

export interface CreatePaymentData {
  wallpaperNumbers: number[]; // Array de números de wallpapers
  buyerEmail: string;
  buyerName: string;
  buyerIdentificationNumber: string;
  buyerContactNumber: string; // Número de contacto/teléfono
  amount: number; // Cantidad total en COP que viene desde el frontend
}

export interface PaymentCreationResult {
  preferenceId: string;
  paymentUrl: string;
  externalReference: string;
}

export class MercadoPagoService {
  private client: MercadoPagoConfig;
  private preference: Preference;

  constructor() {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!accessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN environment variable is required');
    }

    this.client = new MercadoPagoConfig({
      accessToken: accessToken,
      options: {
        timeout: 16000, // 16 segundos - Ajustar según necesidades
        idempotencyKey: 'dev',
      },
    });

    this.preference = new Preference(this.client);
  }

  async createPayment(data: CreatePaymentData): Promise<PaymentCreationResult> {
    try {
      // Crear referencia externa única con todos los wallpapers
      const wallpapersStr = data.wallpaperNumbers.join('-');
      const externalReference = `wallpapers_${wallpapersStr}_${Date.now()}`;

      // Crear descripción con todos los wallpapers
      const wallpapersList = data.wallpaperNumbers.join(', ');
      const title =
        data.wallpaperNumbers.length === 1
          ? `Wallpaper Digital #${data.wallpaperNumbers[0]}`
          : `${data.wallpaperNumbers.length} Wallpapers Digitales`;
      const description = `Compra de wallpapers digitales: #${wallpapersList}`;

      const preferenceData = {
        items: [
          {
            id: `wallpapers_${wallpapersStr}`,
            title: title,
            description: description,
            quantity: 1,
            unit_price: data.amount, // Cantidad total que viene desde el frontend
            currency_id: 'COP',
          },
        ],
        payer: {
          name: data.buyerName,
          email: data.buyerEmail,
          phone: {
            number: data.buyerContactNumber,
          },
          identification: {
            type: 'CC', // Cédula de Ciudadanía (Colombia)
            number: data.buyerIdentificationNumber,
          },
        },
        back_urls: {
          success: process.env.MP_SUCCESS_URL || 'https://your-domain.com/success',
          failure: process.env.MP_FAILURE_URL || 'https://your-domain.com/failure',
          pending: process.env.MP_PENDING_URL || 'https://your-domain.com/pending',
        },
        auto_return: 'approved',
        external_reference: externalReference,
        notification_url: process.env.MP_WEBHOOK_URL,
        payment_methods: {
          excluded_payment_types: [{ id: 'credit_card' }, { id: 'debit_card' }],
          installments: 1,
        },
        shipments: {
          mode: 'not_specified',
        },
        metadata: {
          wallpaper_numbers: data.wallpaperNumbers.join(','),
          buyer_identification: data.buyerIdentificationNumber,
          buyer_email: data.buyerEmail,
          buyer_name: data.buyerName,
          buyer_contact_number: data.buyerContactNumber,
        },
      };

      Logger.info('Creating Mercado Pago preference', {
        externalReference,
        wallpaperNumbers: data.wallpaperNumbers,
        buyerEmail: data.buyerEmail,
      });

      const response = await this.preference.create({ body: preferenceData });

      if (!response.id || !response.init_point) {
        throw new Error('Invalid response from Mercado Pago API');
      }

      Logger.info('Payment preference created successfully', {
        preferenceId: response.id,
        externalReference,
      });

      return {
        preferenceId: response.id,
        paymentUrl: response.init_point,
        externalReference: externalReference,
      };
    } catch (error) {
      Logger.error('Error creating Mercado Pago payment', error);
      throw new Error(
        `Failed to create payment: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getPaymentStatus(paymentId: string): Promise<any> {
    try {
      Logger.info('Getting payment status from Mercado Pago', { paymentId });

      // Implementación real para consultar el estado del pago
      const { Payment } = await import('mercadopago');
      const payment = new Payment(this.client);

      const response = await payment.get({ id: paymentId });

      Logger.info('Payment status retrieved', {
        paymentId,
        status: response.status,
        statusDetail: response.status_detail,
        externalReference: response.external_reference,
      });

      return {
        id: response.id,
        status: response.status,
        statusDetail: response.status_detail,
        transactionAmount: response.transaction_amount,
        externalReference: response.external_reference,
        dateApproved: response.date_approved,
        dateCreated: response.date_created,
        paymentMethodId: response.payment_method_id,
      };
    } catch (error) {
      Logger.error('Error getting payment status', error);
      throw error;
    }
  }
}
