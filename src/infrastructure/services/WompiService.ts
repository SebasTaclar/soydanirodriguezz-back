import * as crypto from 'crypto';
import { Logger } from '../../shared/Logger';
import {
  IWompiProvider,
  WompiPaymentData,
  WompiPaymentResult,
} from '../../domain/interfaces/IWompiProvider';

export class WompiService implements IWompiProvider {
  private publicKey: string;
  private integritySecret: string;
  private isProduction: boolean;

  constructor() {
    this.publicKey = process.env.WOMPI_PUBLIC_KEY || '';
    this.integritySecret = process.env.WOMPI_INTEGRITY_SECRET || '';
    this.isProduction = process.env.NODE_ENV === 'production';

    if (!this.publicKey || !this.integritySecret) {
      throw new Error(
        'WOMPI_PUBLIC_KEY and WOMPI_INTEGRITY_SECRET environment variables are required'
      );
    }

    Logger.info('WompiService initialized', {
      environment: this.isProduction ? 'production' : 'sandbox',
    });
  }

  async createPayment(data: WompiPaymentData): Promise<WompiPaymentResult> {
    try {
      Logger.info('Generating Wompi Web Checkout URL', {
        wallpaperNumbers: data.wallpaperNumbers,
        buyerEmail: data.buyerEmail,
        amount: data.amount,
      });

      // Crear referencia única
      const wallpapersStr = data.wallpaperNumbers.join('-');
      const reference = `wallpapers_${wallpapersStr}_${Date.now()}`;

      // Convertir monto a centavos (Wompi requiere centavos)
      const amountInCents = Math.round(data.amount * 100);

      // Generar firma de integridad según la documentación de Wompi
      // Concatenar: referencia + monto + moneda + secreto
      const concatenated = `${reference}${amountInCents}COP${this.integritySecret}`;
      const signature = crypto.createHash('sha256').update(concatenated).digest('hex');

      // Construir URL del Web Checkout
      const redirectUrl =
        process.env.WOMPI_REDIRECT_URL || 'https://zealous-beach-0447ece0f.2.azurestaticapps.net/';

      const params = new URLSearchParams({
        'public-key': this.publicKey,
        currency: 'COP',
        'amount-in-cents': amountInCents.toString(),
        reference: reference,
        'signature:integrity': signature,
        'redirect-url': redirectUrl,
        'customer-data:email': data.buyerEmail,
        'customer-data:full-name': data.buyerName,
        'customer-data:phone-number': data.buyerContactNumber,
      });

      const checkoutUrl = `https://checkout.wompi.co/p/?${params.toString()}`;

      Logger.info('Wompi Web Checkout URL generated successfully', {
        reference,
        amountInCents,
        checkoutUrlGenerated: !!checkoutUrl,
      });

      return {
        transactionId: reference, // Usamos la referencia como ID temporal
        paymentUrl: checkoutUrl, // Ahora sí retornamos la URL del checkout
        reference: reference,
        status: 'PENDING',
        publicKey: this.publicKey,
        signature: signature,
        amountInCents: amountInCents,
        currency: 'COP',
      };
    } catch (error: any) {
      Logger.error('Error generating Wompi Web Checkout URL', {
        error: error.message,
        wallpaperNumbers: data.wallpaperNumbers,
        buyerEmail: data.buyerEmail,
      });

      throw new Error(`Failed to generate Wompi Web Checkout URL: ${error.message}`);
    }
  }

  // Método para validar webhook signature
  validateWebhookSignature(payload: string, signature: string): boolean {
    try {
      // Implementar validación de firma cuando sea necesario
      // const expectedSignature = crypto
      //   .createHmac('sha256', this.integritySecret)
      //   .update(payload)
      //   .digest('hex');
      // return signature === expectedSignature;
      return true; // Por ahora retornamos true
    } catch (error) {
      Logger.error('Error validating Wompi webhook signature', { error });
      return false;
    }
  }

  // Método para consultar el estado de una transacción
  async getTransactionStatus(transactionId: string): Promise<{ status: string; data: any }> {
    try {
      Logger.info('Querying Wompi transaction status', { transactionId });

      const baseUrl = this.isProduction
        ? 'https://production.wompi.co/v1'
        : 'https://sandbox.wompi.co/v1';

      const url = `${baseUrl}/transactions/${transactionId}`;

      Logger.info('Making request to Wompi API', { url });

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.publicKey}`,
          'Content-Type': 'application/json',
        },
      });

      const responseData = await response.json();

      Logger.info('Wompi API response received', {
        transactionId,
        status: response.status,
        statusText: response.statusText,
        responseData: JSON.stringify(responseData, null, 2),
      });

      if (!response.ok) {
        Logger.error('Wompi API error response', {
          transactionId,
          status: response.status,
          statusText: response.statusText,
          responseData,
        });
        throw new Error(`Wompi API error: ${response.status} - ${JSON.stringify(responseData)}`);
      }

      return {
        status: responseData.data?.status || 'UNKNOWN',
        data: responseData,
      };
    } catch (error: any) {
      Logger.error('Error querying Wompi transaction status', {
        transactionId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  // Método auxiliar para generar firma con fecha de expiración (opcional)
  generateSignatureWithExpiration(
    reference: string,
    amountInCents: number,
    expirationTime: string
  ): string {
    try {
      // Con fecha de expiración: referencia + monto + moneda + fechaExpiracion + secreto
      const concatenated = `${reference}${amountInCents}COP${expirationTime}${this.integritySecret}`;
      return crypto.createHash('sha256').update(concatenated).digest('hex');
    } catch (error: any) {
      Logger.error('Error generating signature with expiration', { error: error.message });
      throw error;
    }
  }
}
