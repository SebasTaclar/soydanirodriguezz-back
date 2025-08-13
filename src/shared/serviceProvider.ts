import { Logger } from './Logger';
import { AuthService } from '../application/services/AuthService';
import { HealthService } from '../application/services/HealthService';
import { PurchaseService } from '../application/services/PurchaseService';
import { CleanupService } from '../application/services/CleanupService';
import { MercadoPagoService } from '../infrastructure/services/MercadoPagoService';
import { EmailService } from '../infrastructure/services/EmailService';
import { UserPrismaAdapter } from '../infrastructure/DbAdapters/UserPrismaAdapter';
import { IUserDataSource } from '../domain/interfaces/IUserDataSource';
import { getPrismaClient } from '../config/PrismaClient';

/**
 * Service Provider para inyección de dependencias
 * Centraliza la creación de servicios y manejo de dependencias
 */
export class ServiceProvider {
  private static prismaClient = getPrismaClient();

  /**
   * Crea una instancia de UserDataSource (actualmente PrismaAdapter)
   */
  static getUserDataSource(): IUserDataSource {
    return new UserPrismaAdapter();
  }

  /**
   * Crea una instancia de AuthService con sus dependencias inyectadas
   */
  static getAuthService(logger: Logger): AuthService {
    const userDataSource = this.getUserDataSource();
    return new AuthService(logger, userDataSource);
  }

  /**
   * Crea una instancia de HealthService con sus dependencias inyectadas
   */
  static getHealthService(logger: Logger): HealthService {
    return new HealthService(logger);
  }

  /**
   * Crea una instancia de PurchaseService con sus dependencias inyectadas
   */
  static getPurchaseService(): PurchaseService {
    return new PurchaseService(this.prismaClient);
  }

  /**
   * Crea una instancia de CleanupService con sus dependencias inyectadas
   */
  static getCleanupService(logger: Logger): CleanupService {
    const mercadoPagoService = this.getMercadoPagoService();
    return new CleanupService(this.prismaClient, mercadoPagoService, logger);
  }

  /**
   * Crea una instancia de EmailService con sus dependencias inyectadas
   */
  static getEmailService(logger: Logger): EmailService {
    return new EmailService(logger);
  }

  /**
   * Crea una instancia de MercadoPagoService
   */
  static getMercadoPagoService(): MercadoPagoService {
    return new MercadoPagoService();
  }
}

// Export directo de las funciones más usadas para mayor conveniencia
export const getAuthService = (logger: Logger): AuthService => {
  return ServiceProvider.getAuthService(logger);
};

export const getHealthService = (logger: Logger): HealthService => {
  return ServiceProvider.getHealthService(logger);
};

export const getPurchaseService = (): PurchaseService => {
  return ServiceProvider.getPurchaseService();
};

export const getCleanupService = (logger: Logger): CleanupService => {
  return ServiceProvider.getCleanupService(logger);
};

export const getEmailService = (logger: Logger): EmailService => {
  return ServiceProvider.getEmailService(logger);
};

export const getMercadoPagoService = (): MercadoPagoService => {
  return ServiceProvider.getMercadoPagoService();
};

export const getUserDataSource = (): IUserDataSource => {
  return ServiceProvider.getUserDataSource();
};
