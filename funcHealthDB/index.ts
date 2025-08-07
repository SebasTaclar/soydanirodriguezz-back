import { Context, HttpRequest } from '@azure/functions';
import { Logger } from '../src/shared/Logger';
import { withApiHandler } from '../src/shared/apiHandler';
import { ApiResponseBuilder } from '../src/shared/ApiResponse';
import { getHealthService } from '../src/shared/serviceProvider';

const funcHealthDB = async (_context: Context, req: HttpRequest, log: Logger): Promise<unknown> => {
  const healthService = getHealthService(log);
  const healthResult = await healthService.checkDatabaseHealth();

  if (healthResult.status === 'healthy')
    return ApiResponseBuilder.success(healthResult, 'Database is healthy');
  else return ApiResponseBuilder.error('Database is unhealthy', 503);
};

export default withApiHandler(funcHealthDB);
