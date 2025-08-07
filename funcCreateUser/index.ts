import { Context, HttpRequest } from '@azure/functions';
import { Logger } from '../src/shared/Logger';
import { withAuthenticatedApiHandler } from '../src/shared/apiHandler';
import { ApiResponseBuilder } from '../src/shared/ApiResponse';
import { getAuthService } from '../src/shared/serviceProvider';
import { AuthenticatedUser } from '../src/shared/authMiddleware';

const funcCreateUser = async (
  _context: Context,
  req: HttpRequest,
  log: Logger,
  user: AuthenticatedUser
): Promise<unknown> => {
  log.logInfo(`Creating user - Requested by: ${user.email} (Role: ${user.role})`);

  // Opcional: Verificar permisos basados en el rol del usuario autenticado
  // if (user.role !== 'admin') {
  //   return ApiResponseBuilder.error('Forbidden: Insufficient permissions', 403);
  // }

  const authService = getAuthService(log);
  const userInfo = await authService.createUser(req.body);
  return ApiResponseBuilder.success(userInfo, 'User created successfully');
};

export default withAuthenticatedApiHandler(funcCreateUser);
