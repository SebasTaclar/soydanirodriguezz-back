import '../config/config';
import { sign, verify } from 'jsonwebtoken';
import { AuthenticationError } from './exceptions';

const SECRET_KEY = process.env.JWT_SECRET;

// Validar que JWT_SECRET esté configurado
if (!SECRET_KEY) {
  console.error('CRITICAL: JWT_SECRET environment variable is not configured');
  process.exit(1); // Terminar la aplicación si no hay JWT_SECRET
}

export function generateToken(user: {
  id: number;
  role: string;
  name: string;
  email: string;
  membershipPaid: boolean;
}): string {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    membershipPaid: user.membershipPaid,
  };

  const token = sign(payload, SECRET_KEY, { expiresIn: '1h' });
  return token;
}

export function verifyToken(token: string): {
  id: string;
  email: string;
  name: string;
  role: string;
  membershipPaid: boolean;
} {
  try {
    if (!token) {
      throw new AuthenticationError('Token is required');
    }

    if (!SECRET_KEY) {
      throw new AuthenticationError('JWT secret is not configured');
    }

    const decoded = verify(token, SECRET_KEY) as {
      id: string;
      email: string;
      name: string;
      role: string;
      membershipPaid: boolean;
    };

    return decoded;
  } catch (error) {
    if (error instanceof Error) {
      // Log más específico del error
      console.error('JWT verification failed:', error.message);

      if (error.name === 'TokenExpiredError') {
        throw new AuthenticationError('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new AuthenticationError('Invalid token format');
      } else if (error.name === 'NotBeforeError') {
        throw new AuthenticationError('Token not active yet');
      }
    }

    throw new AuthenticationError('Unauthorized');
  }
}
