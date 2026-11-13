import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: process.env.DOTENV_PATH || path.resolve(process.cwd(), '.env') });

function int(v: string | undefined, d: number) {
  const n = v === undefined || v === '' ? NaN : Number(v);
  return Number.isFinite(n) ? n : d;
}

export interface AppConfig {
  env: string;
  port: number;
  db: { host: string; port: number; user: string; password: string; database: string; poolMax: number; timezone: string };
  jwt: { secret: string; refreshSecret: string; accessTtl: string; refreshTtl: string };
  filesDir: string;
  enableJobs: boolean;
  workerId: number;
}

export function loadConfig(): AppConfig {
  const poolMax = int(process.env.DB_POOL_MAX, 20);
  return {
    env: process.env.NODE_ENV || 'development',
    port: int(process.env.PORT, 3000),
    db: {
      host: process.env.DB_HOST || '127.0.0.1',
      port: int(process.env.DB_PORT, 3307),
      user: process.env.DB_USER || 'erp3d',
      password: process.env.DB_PASSWORD || 'erp3d_dev_pwd',
      database: process.env.DB_NAME || 'erp3d',
      // 共享库要求 ERP 连接 ≤30：硬上限 30，默认 20
      poolMax: Math.max(1, Math.min(poolMax, 30)),
      timezone: process.env.DB_TIMEZONE || '+08:00',
    },
    jwt: {
      secret: process.env.JWT_SECRET || 'dev-secret-change-me-dev-secret-change-me',
      refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-change-me-dev-refresh-change-me',
      accessTtl: process.env.JWT_ACCESS_TTL || '2h',
      refreshTtl: process.env.JWT_REFRESH_TTL || '7d',
    },
    filesDir: path.resolve(process.env.FILES_DIR || './files'),
    enableJobs: process.env.ENABLE_JOBS === 'true',
    workerId: int(process.env.WORKER_ID, 1) & 31,
  };
}

export const config = loadConfig();
