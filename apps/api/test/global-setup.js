/**
 * e2e：重置并迁移 erp3d_test。不碰 erp3d 开发库。
 */
const path = require('path');
const mysql = require('mysql2/promise');

module.exports = async () => {
  process.env.NODE_ENV = 'test';
  process.env.DB_HOST = process.env.DB_HOST || '127.0.0.1';
  process.env.DB_PORT = process.env.DB_PORT || '3307';
  process.env.DB_USER = process.env.DB_USER || 'erp3d';
  process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'erp3d_dev_pwd';
  process.env.DB_NAME = 'erp3d_test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-please-32chars-min';
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-32chars-min';
  process.env.FILES_DIR = path.resolve(__dirname, '../files-test');
  process.env.ENABLE_JOBS = 'false';
  // 阻止 config.ts 读 apps/api/.env 覆盖上面的 DB_NAME
  process.env.DOTENV_PATH = path.resolve(__dirname, 'test.env');

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  });
  await conn.query(
    "DROP DATABASE IF EXISTS erp3d_test; CREATE DATABASE erp3d_test CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;",
  );
  await conn.end();

  require('ts-node/register/transpile-only');
  require('tsconfig-paths/register');
  const { runMigrations } = require('../src/db/migrate');
  await runMigrations('erp3d_test');
};
