import * as dotenv from 'dotenv';
import * as os from 'os';
import * as path from 'path';

dotenv.config({ path: process.env.DOTENV_PATH || path.resolve(process.cwd(), '.env') });

function int(v: string | undefined, d: number) {
  const n = v === undefined || v === '' ? NaN : Number(v);
  return Number.isFinite(n) ? n : d;
}

export interface AppConfig {
  env: string;
  port: number;
  nodeName: string;
  db: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    poolMax: number;
    timezone: string;
  };
  jwt: { secret: string; refreshSecret: string; accessTtl: string; refreshTtl: string };
  filesDir: string;
  storage: {
    driver: 'local' | 's3';
    s3: {
      endpoint?: string;
      region: string;
      bucket: string;
      accessKeyId?: string;
      secretAccessKey?: string;
      forcePathStyle: boolean;
      prefix: string;
    };
  };
  enableJobs: boolean;
  workerId: number;
}

export function loadConfig(): AppConfig {
  const poolMax = int(process.env.DB_POOL_MAX, 9);
  return {
    env: process.env.NODE_ENV || 'development',
    port: int(process.env.PORT, 8080),
    nodeName: process.env.NODE_NAME || os.hostname(),
    db: {
      host: process.env.DB_HOST || '127.0.0.1',
      port: int(process.env.DB_PORT, 3307),
      user: process.env.DB_USER || 'erp3d',
      password: process.env.DB_PASSWORD || 'erp3d_dev_pwd',
      database: process.env.DB_NAME || 'erp3d',
      // 三台 × 9 = 27 ≤ 30；交接时两台在线也不超（硬上限 10，默认 9）
      poolMax: Math.max(1, Math.min(poolMax, 10)),
      timezone: process.env.DB_TIMEZONE || '+08:00',
    },
    jwt: {
      secret: process.env.JWT_SECRET || 'dev-secret-change-me-dev-secret-change-me',
      refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-change-me-dev-refresh-change-me',
      accessTtl: process.env.JWT_ACCESS_TTL || '2h',
      refreshTtl: process.env.JWT_REFRESH_TTL || '7d',
    },
    filesDir: path.resolve(process.env.FILES_DIR || './files'),
    storage: {
      driver: (process.env.ATTACH_STORAGE === 's3' ? 's3' : 'local') as 'local' | 's3',
      s3: {
        endpoint: process.env.S3_ENDPOINT || undefined,
        region: process.env.S3_REGION || 'us-east-1',
        bucket: process.env.S3_BUCKET || 'erp3d-files',
        accessKeyId: process.env.S3_ACCESS_KEY_ID || undefined,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || undefined,
        forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
        prefix: process.env.S3_PREFIX || '',
      },
    },
    enableJobs: process.env.ENABLE_JOBS === 'true',
    workerId: int(process.env.WORKER_ID, 1) & 31,
  };
}

export const config = loadConfig();
