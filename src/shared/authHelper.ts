import { verifyToken } from './jwtHelper';
import { AuthenticationError } from './exceptions';

export function validateAuthToken(authHeader: string): string {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthenticationError('Missing or invalid token format');
  }

  const token = authHeader.split(' ')[1];

  if (!token || token.trim() === '') {
    throw new AuthenticationError('Empty token');
  }

  // Verificar que el token sea válido (esto lanzará una excepción si no lo es)
  verifyToken(token);

  return token;
}
