import { Context, HttpRequest } from '@azure/functions';
import { Logger } from '../src/shared/Logger';
import { withApiHandler } from '../src/shared/apiHandler';
import { ApiResponseBuilder } from '../src/shared/ApiResponse';
import { getPurchaseService } from '../src/shared/serviceProvider';

const funcGetWallpaperStatus = async (
  _context: Context,
  req: HttpRequest,
  log: Logger
): Promise<unknown> => {
  log.logInfo('Getting wallpaper availability status');

  try {
    // Obtener el estado de wallpapers usando el servicio
    const purchaseService = getPurchaseService();
    const wallpaperStatus = await purchaseService.getWallpaperStatus();

    log.logInfo('Wallpaper status retrieved successfully', {
      approvedCount: wallpaperStatus.approved.length,
      pendingCount: wallpaperStatus.pending.length,
    });

    // Respuesta exitosa optimizada
    return ApiResponseBuilder.success(
      {
        approved: wallpaperStatus.approved,
        pending: wallpaperStatus.pending,
        summary: {
          approvedCount: wallpaperStatus.approved.length,
          pendingCount: wallpaperStatus.pending.length,
          totalUnavailable: wallpaperStatus.approved.length + wallpaperStatus.pending.length,
        },
      },
      'Wallpaper status retrieved successfully'
    );
  } catch (error) {
    log.logError('Error getting wallpaper status', error);
    return ApiResponseBuilder.error('Failed to get wallpaper status', 500);
  }
};

export default withApiHandler(funcGetWallpaperStatus);
