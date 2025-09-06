import { AzureFunction, Context } from '@azure/functions';
import { Logger } from '../src/shared/Logger';
import { getPurchaseService, getEmailService } from '../src/shared/serviceProvider';

const funcBackupTimer: AzureFunction = async function (
  context: Context,
  backupTimer: unknown
): Promise<void> {
  const log = new Logger(context);

  try {
    log.logInfo('Starting backup timer execution');

    // Obtener la hora actual en Colombia (UTC-5)
    const now = new Date();
    const colombiaOffset = -5 * 60; // UTC-5 en minutos
    const colombiaTime = new Date(now.getTime() + colombiaOffset * 60 * 1000);

    log.logInfo('Backup timer triggered', {
      utcTime: now.toISOString(),
      colombiaTime: colombiaTime.toISOString(),
      hour: colombiaTime.getHours(),
      minute: colombiaTime.getMinutes(),
    });

    // Generar datos de backup
    const purchaseService = getPurchaseService();
    const backupData = await purchaseService.generateBackupData(log);

    // Preparar el contenido del email
    const subject = `📊 Backup Diario - Wallpapers Digitales - ${colombiaTime.toLocaleDateString('es-CO')}`;

    const htmlContent = generateBackupEmailTemplate(backupData, colombiaTime);

    // Crear attachment con el backup JSON
    const backupJson = JSON.stringify(backupData, null, 2);
    const attachmentName = `backup-purchases-${colombiaTime.toISOString().split('T')[0]}.json`;

    // Obtener lista de emails destinatarios
    const backupEmails = process.env.BACKUP_EMAIL || 'admin@example.com';
    const emailList = backupEmails.split(',').map((email) => email.trim());

    // Enviar email a cada destinatario
    for (const email of emailList) {
      const emailData = {
        toEmail: email,
        toName: 'Administrador',
        subject: subject,
        htmlContent: htmlContent,
        attachments: [
          {
            name: attachmentName,
            contentType: 'application/json',
            contentInBase64: Buffer.from(backupJson, 'utf-8').toString('base64'),
          },
        ],
      };

      // Enviar el email
      const emailService = getEmailService(log);
      await emailService.sendEmail(emailData);

      log.logInfo(`Backup email sent to ${email}`, {
        recipient: email,
        totalPurchases: backupData.statistics.totalPurchases,
        attachmentSize: backupJson.length,
      });
    }

    log.logInfo('All backup emails sent successfully', {
      totalRecipients: emailList.length,
      recipients: emailList,
      totalPurchases: backupData.statistics.totalPurchases,
      approvedCount: backupData.statistics.approvedCount,
      totalRevenue: backupData.statistics.totalRevenue,
    });

    // Información del timer para debugging
    if (
      typeof backupTimer === 'object' &&
      backupTimer !== null &&
      'isPastDue' in backupTimer &&
      (backupTimer as { isPastDue?: boolean }).isPastDue
    ) {
      log.logWarning('Timer function is running late!');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    log.logError('Error in backup timer execution', { error: errorMessage });
    throw error;
  }
};

function generateBackupEmailTemplate(backupData: any, colombiaTime: Date): string {
  const { statistics } = backupData;

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Backup Diario - Wallpapers Digitales</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
            .container { max-width: 800px; margin: 0 auto; background: #f9f9f9; padding: 30px; border-radius: 10px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; margin: -30px -30px 30px -30px; }
            .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
            .stat-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
            .stat-number { font-size: 2em; font-weight: bold; color: #667eea; margin-bottom: 5px; }
            .stat-label { color: #666; font-size: 0.9em; text-transform: uppercase; letter-spacing: 1px; }
            .revenue { color: #28a745 !important; }
            .approved { color: #28a745 !important; }
            .completed { color: #17a2b8 !important; }
            .pending { color: #ffc107 !important; }
            .cancelled { color: #6c757d !important; }
            .rejected { color: #dc3545 !important; }
            .failed { color: #dc3545 !important; }
            .attachment-info { background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #667eea; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .date-time { background: white; padding: 10px; border-radius: 5px; margin: 10px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📊 Backup Diario</h1>
                <p>Wallpapers Digitales - Reporte Automático</p>
            </div>
            
            <div class="date-time">
                <strong>📅 Fecha:</strong> ${colombiaTime.toLocaleDateString('es-CO', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}<br>
                <strong>🕐 Hora Colombia:</strong> ${colombiaTime.toLocaleTimeString('es-CO')}
            </div>

            <h2>📈 Estadísticas Generales</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number">${statistics.totalPurchases}</div>
                    <div class="stat-label">Total Compras</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-number revenue">$${statistics.totalRevenue.toLocaleString('es-CO')}</div>
                    <div class="stat-label">Ingresos Totales</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-number">${statistics.uniqueWallpapersSold}</div>
                    <div class="stat-label">Wallpapers Únicos Vendidos</div>
                </div>
            </div>

            <h2>📊 Estado de las Compras</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number approved">${statistics.approvedCount}</div>
                    <div class="stat-label">Aprobadas</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-number completed">${statistics.completedCount}</div>
                    <div class="stat-label">Completadas</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-number pending">${statistics.pendingCount}</div>
                    <div class="stat-label">Pendientes</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-number cancelled">${statistics.cancelledCount}</div>
                    <div class="stat-label">Canceladas</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-number rejected">${statistics.rejectedCount}</div>
                    <div class="stat-label">Rechazadas</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-number failed">${statistics.failedCount}</div>
                    <div class="stat-label">Fallidas</div>
                </div>
            </div>

            <div class="attachment-info">
                <h3>📎 Archivo Adjunto</h3>
                <p>Se adjunta un archivo JSON completo con todos los datos de las compras para backup y análisis detallado.</p>
                <p><strong>Archivo:</strong> backup-purchases-${colombiaTime.toISOString().split('T')[0]}.json</p>
                <p><strong>Contiene:</strong> ${statistics.totalPurchases} registros completos de compras</p>
            </div>

            <div class="footer">
                <p>Este es un email automático generado por el sistema de backup.<br>
                Generado el ${backupData.generatedAt}</p>
            </div>
        </div>
    </body>
    </html>
  `;
}

export default funcBackupTimer;
