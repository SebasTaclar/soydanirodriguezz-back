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
      Logger.info('Generating Wompi payment parameters', {
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

      Logger.info('Wompi payment parameters generated successfully', {
        reference,
        amountInCents,
        signatureGenerated: !!signature,
      });

      return {
        transactionId: reference, // Usamos la referencia como ID temporal
        paymentUrl: '', // No necesario para Widget/Checkout Web
        reference: reference,
        status: 'PENDING',
        publicKey: this.publicKey,
        signature: signature,
        amountInCents: amountInCents,
        currency: 'COP',
      };
    } catch (error: any) {
      Logger.error('Error generating Wompi payment parameters', {
        error: error.message,
        wallpaperNumbers: data.wallpaperNumbers,
        buyerEmail: data.buyerEmail,
      });

      throw new Error(`Failed to generate Wompi payment parameters: ${error.message}`);
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
