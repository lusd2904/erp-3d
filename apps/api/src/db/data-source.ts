import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from '../config/config';
import { ALL_MIGRATIONS } from './migrations';

/**
 * TypeORM DataSource。业务代码不用实体 Repository，统一走 DbService（原生 SQL + 事务上下文），
 * 因为单据表是元数据驱动的动态表，引擎需要 SELECT ... FOR UPDATE 和增量 UPDATE。
 * 不设置任何会话外的全局参数（共享库要求不得改全局参数）。
 */
export function createDataSource(overrides: Partial<{ database: string; poolMax: number }> = {}) {
  return new DataSource({
    type: 'mysql',
    host: config.db.host,
    port: config.db.port,
    username: config.db.user,
    password: config.db.password,
    database: overrides.database ?? config.db.database,
    charset: 'utf8mb4_0900_ai_ci',
    timezone: config.db.timezone,
    poolSize: overrides.poolMax ?? config.db.poolMax,
    supportBigNumbers: true,
    bigNumberStrings: false,
    dateStrings: true,
    synchronize: false,
    migrationsRun: false,
    migrationsTableName: 'sys_migrations',
    migrations: ALL_MIGRATIONS,
    logging: ['error'],
    extra: { connectionLimit: overrides.poolMax ?? config.db.poolMax, decimalNumbers: false, waitForConnections: true },
  });
}

export const AppDataSource = createDataSource();
