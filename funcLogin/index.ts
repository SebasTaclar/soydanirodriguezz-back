import { Context, HttpRequest } from '@azure/functions';
import { Logger } from '../src/shared/Logger';
import { withApiHandler } from '../src/shared/apiHandler';
import { ApiResponseBuilder } from '../src/shared/ApiResponse';
import { getAuthService } from '../src/shared/serviceProvider';

const funcLogin = async (_context: Context, req: HttpRequest, log: Logger): Promise<unknown> => {
  const authService = getAuthService(log);
  const token = await authService.login(req.body);
  return ApiResponseBuilder.success({ token }, 'Login successful');
};

export default withApiHandler(funcLogin);
