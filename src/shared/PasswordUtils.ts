import * as bcrypt from 'bcrypt';
import { ValidationError } from './exceptions';

/**
 * Utilidades para manejo de contraseñas
 */
export class PasswordUtils {
  private static readonly SALT_ROUNDS = 10;

  /**
   * Hashea una contraseña usando bcrypt
   * @param password - La contraseña en texto plano
   * @returns La contraseña hasheada
   */
  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Compara una contraseña en texto plano con una hasheada
   * @param password - La contraseña en texto plano
   * @param hashedPassword - La contraseña hasheada
   * @returns true si coinciden, false si no
   */
  static async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  /**
   * Valida que una contraseña cumpla con los requisitos mínimos
   * @param password - La contraseña a validar
   * @throws ValidationError si la contraseña no es válida
   */
  static validatePassword(password: string): void {
    if (!password || password.trim().length === 0) {
      throw new ValidationError('Password is required');
    }

    if (password.length < 6) {
      throw new ValidationError('Password must be at least 6 characters long');
    }

    if (password.length > 128) {
      throw new ValidationError('Password cannot exceed 128 characters');
    }
  }
}
