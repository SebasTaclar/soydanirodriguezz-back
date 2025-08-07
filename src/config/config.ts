import * as dotenv from 'dotenv';
dotenv.config();

export const isDebug = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';

export const env_config = {
  databaseType: process.env.DATABASE_TYPE || 'prisma',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiration: parseInt(process.env.JWT_EXPIRATION || '3600', 10),
  debug: process.env.DEBUG === 'true',
  nodeEnv: process.env.NODE_ENV || 'production',
};
