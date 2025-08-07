import { Logger } from '../../shared/Logger';
import { getPrismaClient } from '../../config/PrismaClient';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  database: {
    connected: boolean;
    responseTime?: number;
    error?: string;
  };
  timestamp: string;
}

export class HealthService {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async checkDatabaseHealth(): Promise<HealthCheckResult> {
    this.logger.logInfo('🏥 Starting database health check');

    const timestamp = new Date().toISOString();
    const startTime = Date.now();

    try {
      const prisma = getPrismaClient();

      // Simple query to test connection
      await prisma.$queryRaw`SELECT 1`;

      const responseTime = Date.now() - startTime;

      this.logger.logInfo('✅ Database health check passed', {
        responseTime: `${responseTime}ms`,
      });

      return {
        status: 'healthy',
        database: {
          connected: true,
          responseTime,
        },
        timestamp,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown database error';

      this.logger.logError('❌ Database health check failed', {
        error: errorMessage,
        responseTime: `${responseTime}ms`,
      });

      return {
        status: 'unhealthy',
        database: {
          connected: false,
          responseTime,
          error: errorMessage,
        },
        timestamp,
      };
    }
  }
}
