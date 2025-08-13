import { EmailClient } from '@azure/communication-email';
import { Logger } from '../../shared/Logger';
import { getPurchaseService } from '../../shared/serviceProvider';
import * as https from 'https';
import * as http from 'http';

export interface EmailData {
  toEmail: string;
  toName: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  name: string;
  contentType: string;
  contentInBase64: string;
}

export interface PaymentEmailData {
  buyerEmail: string;
  buyerName: string;
  wallpaperNumbers: number[];
  amount: number;
  currency: string;
  status: string;
  paymentId: string;
  purchaseDate: Date;
}

export interface PaymentWebhookData {
  id: string;
  status: string;
  externalReference?: string;
  transactionAmount?: number;
  paymentMethodId?: string;
  dateApproved?: string;
  dateCreated?: string;
}

export class EmailService {
  private emailClient: EmailClient;
  private logger: Logger;
  private senderEmail: string;

  constructor(logger: Logger) {
    this.logger = logger;

    const connectionString = process.env.AZURE_COMMUNICATION_CONNECTION_STRING;
    const senderEmail = process.env.AZURE_COMMUNICATION_SENDER_EMAIL;

    if (!connectionString) {
      throw new Error('AZURE_COMMUNICATION_CONNECTION_STRING environment variable is required');
    }

    if (!senderEmail) {
      throw new Error('AZURE_COMMUNICATION_SENDER_EMAIL environment variable is required');
    }

    this.senderEmail = senderEmail;
    this.emailClient = new EmailClient(connectionString);
  }

  async sendEmail(emailData: EmailData): Promise<void> {
    try {
      this.logger.logInfo('Sending email', {
        toEmail: emailData.toEmail,
        subject: emailData.subject,
        attachmentCount: emailData.attachments?.length || 0,
      });

      const message: any = {
        senderAddress: this.senderEmail,
        content: {
          subject: emailData.subject,
          html: emailData.htmlContent,
          plainText: emailData.textContent || this.stripHtml(emailData.htmlContent),
        },
        recipients: {
          to: [
            {
              address: emailData.toEmail,
              displayName: emailData.toName,
            },
          ],
        },
      };

      // Agregar attachments si existen
      if (emailData.attachments && emailData.attachments.length > 0) {
        message.attachments = emailData.attachments.map((attachment) => ({
          name: attachment.name,
          contentType: attachment.contentType,
          contentInBase64: attachment.contentInBase64,
        }));
      }

      const poller = await this.emailClient.beginSend(message);
      const result = await poller.pollUntilDone();

      this.logger.logInfo('Email sent successfully', {
        toEmail: emailData.toEmail,
        messageId: result.id,
        status: result.status,
        attachmentCount: emailData.attachments?.length || 0,
      });
    } catch (error) {
      this.logger.logError('Error sending email', {
        toEmail: emailData.toEmail,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async sendPaymentConfirmationEmail(paymentData: PaymentEmailData): Promise<void> {
    try {
      this.logger.logInfo('Sending payment confirmation email', {
        buyerEmail: paymentData.buyerEmail,
        status: paymentData.status,
        wallpaperNumbers: paymentData.wallpaperNumbers,
      });

      // Generar attachment de wallpaper personalizado con color único
      const uniqueColor = this.generateUniqueColor(paymentData.wallpaperNumbers);
      const imageAttachment = await this.generateWallpaperAttachment(
        uniqueColor,
        paymentData.wallpaperNumbers
      );

      const emailData: EmailData = {
        toEmail: paymentData.buyerEmail,
        toName: paymentData.buyerName,
        subject: this.getEmailSubject(paymentData.status),
        htmlContent: this.generatePaymentEmailTemplate(
          paymentData,
          uniqueColor,
          imageAttachment.name
        ),
        attachments: [imageAttachment],
      };

      await this.sendEmail(emailData);

      this.logger.logInfo('Payment confirmation email sent successfully', {
        buyerEmail: paymentData.buyerEmail,
        status: paymentData.status,
      });
    } catch (error) {
      this.logger.logError('Error sending payment confirmation email', error);
      throw error;
    }
  }

  async sendPaymentNotificationFromWebhook(
    paymentWebhookData: PaymentWebhookData,
    mappedStatus: string
  ): Promise<void> {
    try {
      this.logger.logInfo('Processing payment notification from webhook', {
        paymentId: paymentWebhookData.id,
        status: mappedStatus,
        externalReference: paymentWebhookData.externalReference,
      });

      // Obtener los datos de la compra desde la base de datos
      const purchaseService = getPurchaseService();

      // Buscar la compra por payment ID o external reference
      const purchases = await purchaseService.getAllPurchases();
      const purchase = purchases.find(
        (p) =>
          p.mercadopagoPaymentId === paymentWebhookData.id ||
          (paymentWebhookData.externalReference &&
            paymentWebhookData.externalReference.includes(p.wallpaperNumbers.join('-')))
      );

      if (!purchase) {
        this.logger.logWarning('Purchase not found for payment notification email', {
          paymentId: paymentWebhookData.id,
          externalReference: paymentWebhookData.externalReference,
        });
        return;
      }

      // Preparar los datos del email
      const emailData: PaymentEmailData = {
        buyerEmail: purchase.buyerEmail,
        buyerName: purchase.buyerName,
        wallpaperNumbers: purchase.wallpaperNumbers,
        amount: purchase.amount,
        currency: purchase.currency,
        status: mappedStatus,
        paymentId: paymentWebhookData.id,
        purchaseDate: new Date(purchase.createdAt),
      };

      // Enviar el email de confirmación
      await this.sendPaymentConfirmationEmail(emailData);

      this.logger.logInfo('Payment notification email sent successfully from webhook', {
        buyerEmail: purchase.buyerEmail,
        status: mappedStatus,
        wallpaperNumbers: purchase.wallpaperNumbers,
      });
    } catch (error) {
      this.logger.logError('Error in sendPaymentNotificationFromWebhook', error);
      throw error;
    }
  }

  private getEmailSubject(status: string): string {
    switch (status.toUpperCase()) {
      case 'APPROVED':
        return '🎉 ¡Tu pago ha sido aprobado! - Wallpapers Digitales';
      case 'REJECTED':
        return '❌ Problema con tu pago - Wallpapers Digitales';
      case 'CANCELLED':
        return '⚠️ Pago cancelado - Wallpapers Digitales';
      case 'PENDING':
        return '⏳ Tu pago está siendo procesado - Wallpapers Digitales';
      default:
        return '📧 Actualización de tu compra - Wallpapers Digitales';
    }
  }

  private generatePaymentEmailTemplate(
    data: PaymentEmailData,
    uniqueColor: string,
    attachmentName: string
  ): string {
    const statusIcon = this.getStatusIcon(data.status);
    const statusMessage = this.getStatusMessage(data.status);
    const wallpapersList = data.wallpaperNumbers.map((num) => `#${num}`).join(', ');

    const formattedAmount = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: data.currency,
    }).format(data.amount);

    const formattedDate = data.purchaseDate.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirmación de Pago</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .status-approved { color: #28a745; font-weight: bold; }
            .status-rejected { color: #dc3545; font-weight: bold; }
            .status-pending { color: #ffc107; font-weight: bold; }
            .status-cancelled { color: #6c757d; font-weight: bold; }
            .wallpaper-list { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #667eea; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .highlight { background: #e7f3ff; padding: 10px; border-radius: 5px; margin: 10px 0; }
            .moto-preview { text-align: center; margin: 20px 0; padding: 20px; background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .moto-preview img { max-width: 100%; height: auto; border-radius: 8px; }
            .preview-title { color: #667eea; font-size: 18px; font-weight: bold; margin-bottom: 10px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>${statusIcon} Wallpapers Digitales</h1>
                <p>Confirmación de tu compra</p>
            </div>
            
            <div class="content">
                <h2>¡Hola ${data.buyerName}!</h2>
                
                <div class="highlight">
                    <h3 class="status-${data.status.toLowerCase()}">${statusMessage}</h3>
                </div>

                <div class="moto-preview">
                    <div class="preview-title">� Wallpaper personalizado adjunto</div>
                    <p style="color: #666; margin-bottom: 15px;">Wallpaper único generado para: ${wallpapersList}</p>
                    <div style="background: ${uniqueColor}; padding: 20px; border-radius: 10px; margin: 15px 0;">
                        <p style="color: white; text-align: center; font-weight: bold; margin: 0;">
                            📎 ${attachmentName}
                        </p>
                        <p style="color: rgba(255,255,255,0.9); text-align: center; font-size: 14px; margin: 5px 0 0 0;">
                            Tu wallpaper personalizado está adjunto a este email
                        </p>
                    </div>
                    <p style="color: #888; font-size: 12px; margin-top: 10px;">
                        *Descarga el archivo adjunto para ver tu wallpaper personalizado en alta resolución.
                    </p>
                </div>
                
                <div class="wallpaper-list">
                    <h4>📱 Detalles de tu compra:</h4>
                    <ul>
                        <li><strong>Wallpapers:</strong> ${wallpapersList}</li>
                        <li><strong>Cantidad:</strong> ${data.wallpaperNumbers.length} wallpaper${data.wallpaperNumbers.length !== 1 ? 's' : ''}</li>
                        <li><strong>Monto:</strong> ${formattedAmount}</li>
                        <li><strong>Estado:</strong> <span class="status-${data.status.toLowerCase()}">${data.status}</span></li>
                        <li><strong>ID de Pago:</strong> ${data.paymentId}</li>
                        <li><strong>Fecha:</strong> ${formattedDate}</li>
                        <li><strong>Color único:</strong> <span style="background: ${uniqueColor}; color: white; padding: 2px 8px; border-radius: 3px;">${uniqueColor}</span></li>
                    </ul>
                </div>
                
                ${this.getStatusSpecificContent(data.status)}
                
                <div class="footer">
                    <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
                    <p><strong>Wallpapers Digitales</strong> - Tu tienda de wallpapers premium</p>
                    <p style="font-size: 12px; color: #999;">
                        Este es un email automático, por favor no respondas a este mensaje.
                    </p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private getStatusIcon(status: string): string {
    switch (status.toUpperCase()) {
      case 'APPROVED':
        return '🎉';
      case 'REJECTED':
        return '❌';
      case 'CANCELLED':
        return '⚠️';
      case 'PENDING':
        return '⏳';
      default:
        return '📧';
    }
  }

  private getStatusMessage(status: string): string {
    switch (status.toUpperCase()) {
      case 'APPROVED':
        return 'Tu pago ha sido aprobado exitosamente';
      case 'REJECTED':
        return 'Tu pago no pudo ser procesado';
      case 'CANCELLED':
        return 'Tu pago ha sido cancelado';
      case 'PENDING':
        return 'Tu pago está siendo procesado';
      default:
        return 'Actualización del estado de tu pago';
    }
  }

  private getStatusSpecificContent(status: string): string {
    switch (status.toUpperCase()) {
      case 'APPROVED':
        return `
        <div style="background: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h4>🎉 ¡Felicitaciones!</h4>
            <p>Tu compra ha sido confirmada. Ya puedes descargar tus wallpapers digitales.</p>
            <p><strong>¿Qué sigue?</strong></p>
            <ul>
                <li>Revisa tu cuenta para acceder a las descargas</li>
                <li>Los wallpapers están disponibles en alta resolución</li>
                <li>Puedes descargarlos las veces que necesites</li>
            </ul>
        </div>
        `;
      case 'REJECTED':
        return `
        <div style="background: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h4>❌ Pago no procesado</h4>
            <p>Lamentablemente tu pago no pudo ser procesado. Esto puede deberse a:</p>
            <ul>
                <li>Fondos insuficientes</li>
                <li>Problemas con la tarjeta</li>
                <li>Restricciones del banco</li>
            </ul>
            <p><strong>¿Qué puedes hacer?</strong></p>
            <ul>
                <li>Verifica los datos de tu tarjeta</li>
                <li>Contacta a tu banco</li>
                <li>Intenta con otro método de pago</li>
            </ul>
        </div>
        `;
      case 'CANCELLED':
        return `
        <div style="background: #f3f3f4; color: #383d41; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h4>⚠️ Pago cancelado</h4>
            <p>Tu pago ha sido cancelado. Si no fue intencional, puedes:</p>
            <ul>
                <li>Intentar realizar la compra nuevamente</li>
                <li>Contactarnos para obtener ayuda</li>
            </ul>
        </div>
        `;
      case 'PENDING':
        return `
        <div style="background: #fff3cd; color: #856404; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h4>⏳ Procesando pago</h4>
            <p>Tu pago está siendo procesado. Te notificaremos cuando se complete.</p>
            <p>Esto puede tomar algunos minutos. Los wallpapers estarán disponibles una vez que se confirme el pago.</p>
        </div>
        `;
      default:
        return '';
    }
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private generateUniqueColor(wallpaperNumbers: number[]): string {
    // Crear un hash único basado en los números de wallpapers
    const numbersString = wallpaperNumbers.sort((a, b) => a - b).join('');
    let hash = 0;

    for (let i = 0; i < numbersString.length; i++) {
      const char = numbersString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    // Usar diferentes algoritmos para generar colores únicos y vibrantes
    const algorithm = Math.abs(hash) % 4;

    switch (algorithm) {
      case 0:
        return this.generateHSLColor(hash);
      case 1:
        return this.generateGradientColor(hash);
      case 2:
        return this.generateVibrantColor(hash);
      default:
        return this.generateCustomColor(hash);
    }
  }

  private generateHSLColor(hash: number): string {
    // Generar un color HSL vibrante y único
    const hue = Math.abs(hash) % 360;
    const saturation = 65 + (Math.abs(hash * 7) % 30); // 65-95%
    const lightness = 45 + (Math.abs(hash * 11) % 20); // 45-65%

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }

  private generateGradientColor(hash: number): string {
    // Generar un color RGB vibrante
    const r = 80 + (Math.abs(hash * 3) % 150);
    const g = 80 + (Math.abs(hash * 7) % 150);
    const b = 80 + (Math.abs(hash * 13) % 150);

    return `rgb(${r}, ${g}, ${b})`;
  }

  private generateVibrantColor(hash: number): string {
    // Paleta de colores vibrantes predefinidos con variaciones
    const baseColors = [
      [255, 59, 92], // Rosa vibrante
      [255, 159, 26], // Naranja
      [50, 215, 75], // Verde
      [0, 122, 255], // Azul
      [175, 82, 222], // Púrpura
      [255, 204, 0], // Amarillo
      [255, 45, 85], // Rojo coral
      [30, 175, 240], // Azul cielo
      [255, 105, 180], // Rosa intenso
      [138, 43, 226], // Violeta
    ];

    const colorIndex = Math.abs(hash) % baseColors.length;
    const [r, g, b] = baseColors[colorIndex];

    // Agregar variación aleatoria basada en el hash
    const variation = 30;
    const newR = Math.max(0, Math.min(255, r + ((hash % variation) - variation / 2)));
    const newG = Math.max(0, Math.min(255, g + (((hash * 3) % variation) - variation / 2)));
    const newB = Math.max(0, Math.min(255, b + (((hash * 7) % variation) - variation / 2)));

    return `rgb(${Math.round(newR)}, ${Math.round(newG)}, ${Math.round(newB)})`;
  }

  private generateCustomColor(hash: number): string {
    // Algoritmo personalizado para colores muy únicos
    const seed1 = Math.abs(hash * 17) % 1000;
    const seed2 = Math.abs(hash * 23) % 1000;
    const seed3 = Math.abs(hash * 37) % 1000;

    const r = 100 + (seed1 % 155);
    const g = 100 + (seed2 % 155);
    const b = 100 + (seed3 % 155);

    return `rgb(${r}, ${g}, ${b})`;
  }

  private async downloadImageAsBase64(url: string): Promise<string | null> {
    return new Promise((resolve) => {
      try {
        this.logger.logInfo('Downloading image from URL', { url });

        const protocol = url.startsWith('https') ? https : http;

        protocol
          .get(url, (response) => {
            if (response.statusCode !== 200) {
              this.logger.logWarning('Failed to download image', {
                url,
                statusCode: response.statusCode,
              });
              resolve(null);
              return;
            }

            const chunks: Buffer[] = [];

            response.on('data', (chunk) => {
              chunks.push(chunk);
            });

            response.on('end', () => {
              try {
                const buffer = Buffer.concat(chunks);
                const base64 = buffer.toString('base64');

                this.logger.logInfo('Image downloaded successfully', {
                  url,
                  sizeKB: Math.round(buffer.length / 1024),
                });

                resolve(base64);
              } catch (error) {
                this.logger.logError('Error processing downloaded image', { url, error });
                resolve(null);
              }
            });

            response.on('error', (error) => {
              this.logger.logError('Error downloading image', { url, error });
              resolve(null);
            });
          })
          .on('error', (error) => {
            this.logger.logError('Request error downloading image', { url, error });
            resolve(null);
          });
      } catch (error) {
        this.logger.logError('Unexpected error downloading image', { url, error });
        resolve(null);
      }
    });
  }

  private async generateWallpaperAttachment(
    backgroundColor: string,
    wallpaperNumbers: number[]
  ): Promise<EmailAttachment> {
    try {
      this.logger.logInfo('Generating wallpaper with remote image', {
        backgroundColor,
        wallpaperNumbers,
        count: wallpaperNumbers.length,
      });

      // URL de la imagen en Azure Blob Storage
      const imageUrl =
        'https://ed90mas1files.blob.core.windows.net/moto/Screenshot%202025-08-13%20131752.png';

      // Intentar descargar la imagen
      const imageBase64 = await this.downloadImageAsBase64(imageUrl);

      // Crear el elemento image solo si se descargó correctamente
      const imageElement = imageBase64
        ? `<image href="data:image/png;base64,${imageBase64}" 
               x="140" y="460" 
               width="800" height="600" 
               filter="url(#drop-shadow)"
               preserveAspectRatio="xMidYMid meet"/>`
        : '<!-- Imagen no disponible -->';

      // Crear un wallpaper con la imagen remota o sin ella
      const wallpaperSvg = `
      <svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Gradiente del color único -->
          <linearGradient id="unique-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${backgroundColor};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${this.darkenColor(backgroundColor, 20)};stop-opacity:1" />
          </linearGradient>
          
          <!-- Gradiente para el círculo central -->
          <radialGradient id="center-circle" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style="stop-color:rgba(255,255,255,0.3);stop-opacity:1" />
            <stop offset="100%" style="stop-color:rgba(255,255,255,0.1);stop-opacity:1" />
          </radialGradient>
          
          <!-- Sombra para la imagen -->
          <filter id="drop-shadow">
            <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="rgba(0,0,0,0.3)"/>
          </filter>
        </defs>
        
        <!-- Fondo con el color único -->
        <rect width="1080" height="1920" fill="url(#unique-bg)"/>
        
        <!-- Recuadro/marco decorativo principal -->
        <rect x="60" y="60" width="960" height="1800" 
              fill="none" 
              stroke="rgba(255,255,255,0.3)" 
              stroke-width="6" 
              rx="30"/>
              
        <!-- Marco interno -->
        <rect x="120" y="120" width="840" height="1680" 
              fill="none" 
              stroke="rgba(255,255,255,0.2)" 
              stroke-width="2" 
              rx="20"/>
        
        <!-- Círculo central decorativo -->
        <circle cx="540" cy="760" r="250" 
                fill="url(#center-circle)" 
                stroke="rgba(255,255,255,0.4)" 
                stroke-width="3"/>
        
        <!-- Título principal -->
        <text x="540" y="240" text-anchor="middle" 
              font-family="Arial, sans-serif" font-size="54" font-weight="bold" 
              fill="rgba(255,255,255,0.95)">
          WALLPAPER DIGITAL
        </text>
        
        <!-- Subtítulo -->
        <text x="540" y="300" text-anchor="middle" 
              font-family="Arial, sans-serif" font-size="24" 
              fill="rgba(255,255,255,0.8)">
          Colección Exclusiva
        </text>
        
        <!-- Línea decorativa superior -->
        <line x1="290" y1="340" x2="790" y2="340" 
              stroke="rgba(255,255,255,0.6)" stroke-width="3"/>
        
        <!-- Imagen de la moto (si está disponible) -->
        ${imageElement}
        
        <!-- Números de wallpapers comprados -->
        <text x="540" y="1180" text-anchor="middle" 
              font-family="Arial, sans-serif" font-size="36" font-weight="bold"
              fill="rgba(255,255,255,0.9)">
          Wallpapers Comprados:
        </text>
        
        <text x="540" y="1240" text-anchor="middle" 
              font-family="Arial, sans-serif" font-size="48" font-weight="bold"
              fill="rgba(255,255,255,1)">
          ${wallpaperNumbers.map((n) => `#${n}`).join(' • ')}
        </text>
        
        <!-- Cantidad total -->
        <text x="540" y="1320" text-anchor="middle" 
              font-family="Arial, sans-serif" font-size="32" font-weight="bold"
              fill="rgba(255,255,255,0.9)">
          ${wallpaperNumbers.length} Wallpaper${wallpaperNumbers.length !== 1 ? 's' : ''} Exclusivo${wallpaperNumbers.length !== 1 ? 's' : ''}
        </text>
        
        <!-- Línea decorativa inferior -->
        <line x1="290" y1="1380" x2="790" y2="1380" 
              stroke="rgba(255,255,255,0.6)" stroke-width="3"/>
        
        <!-- Información del color único -->
        <text x="540" y="1520" text-anchor="middle" 
              font-family="Arial, sans-serif" font-size="28" 
              fill="rgba(255,255,255,0.8)">
          Color Único Personalizado
        </text>
        
        <text x="540" y="1570" text-anchor="middle" 
              font-family="Arial, sans-serif" font-size="20" 
              fill="rgba(255,255,255,0.7)">
          ${backgroundColor}
        </text>
        
        <!-- Recuadro con el color -->
        <rect x="440" y="1600" width="200" height="60" 
              fill="${backgroundColor}" 
              stroke="rgba(255,255,255,0.5)" 
              stroke-width="2" 
              rx="10"/>
        
        <!-- Marca de agua final -->
        <text x="540" y="1750" text-anchor="middle" 
              font-family="Arial, sans-serif" font-size="18" 
              fill="rgba(255,255,255,0.5)">
          digitalWallpapers.com
        </text>
        
        <!-- Fecha/hora -->
        <text x="540" y="1800" text-anchor="middle" 
              font-family="Arial, sans-serif" font-size="14" 
              fill="rgba(255,255,255,0.4)">
          Generado: ${new Date().toLocaleDateString('es-CO')}
        </text>
      </svg>`;

      // Convertir SVG a base64 para el attachment
      const wallpaperBase64 = Buffer.from(wallpaperSvg).toString('base64');

      this.logger.logInfo('Wallpaper generated successfully', {
        wallpaperNumbers,
        hasImage: !!imageBase64,
        sizeKB: Math.round(Buffer.from(wallpaperSvg).length / 1024),
      });

      return {
        name: `wallpaper_${wallpaperNumbers.join('-')}_${Date.now()}.svg`,
        contentType: 'image/svg+xml',
        contentInBase64: wallpaperBase64,
      };
    } catch (error) {
      this.logger.logError('Error creating wallpaper attachment', error);
      throw new Error(
        `Failed to create wallpaper: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private darkenColor(color: string, percent: number): string {
    // Función para oscurecer un color por un porcentaje
    if (color.startsWith('hsl')) {
      const match = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
      if (match) {
        const [, h, s, l] = match;
        const newL = Math.max(0, parseInt(l) - percent);
        return `hsl(${h}, ${s}%, ${newL}%)`;
      }
    }

    if (color.startsWith('rgb')) {
      const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        const [, r, g, b] = match;
        const factor = (100 - percent) / 100;
        const newR = Math.round(parseInt(r) * factor);
        const newG = Math.round(parseInt(g) * factor);
        const newB = Math.round(parseInt(b) * factor);
        return `rgb(${newR}, ${newG}, ${newB})`;
      }
    }

    return color;
  }

  // Método de prueba que usa el sistema real de emails con datos mockeados
  async sendLoginTestEmail(userEmail: string, userName: string): Promise<void> {
    try {
      this.logger.logInfo('Sending login test email using payment confirmation system', {
        userEmail,
      });

      // Datos mockeados para la prueba usando el sistema real
      const mockPaymentData: PaymentEmailData = {
        buyerEmail: userEmail,
        buyerName: userName,
        wallpaperNumbers: [1, 5, 9], // Números de prueba
        amount: 15000, // $15.000 COP de prueba
        currency: 'COP',
        status: 'APPROVED', // Status de prueba
        paymentId: 'TEST_LOGIN_' + Date.now(), // ID único de prueba
        purchaseDate: new Date(),
      };

      // Usar el método real de confirmación de pago
      await this.sendPaymentConfirmationEmail(mockPaymentData);

      this.logger.logInfo('Login test email sent successfully using real payment system', {
        userEmail,
      });
    } catch (error) {
      this.logger.logError('Error sending login test email', {
        userEmail,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // No relanzamos el error para no afectar el flujo de login
    }
  }
}
