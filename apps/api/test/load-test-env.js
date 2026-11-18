/**
 * e2e 凭据只从环境变量或本地 apps/api/test/test.env 读取（test.env 不进 git，模板见 test.env.example）。
 * 已存在的环境变量优先；DB_PASSWORD 缺失时直接报错，JWT 密钥缺失时每次运行随机生成。
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

module.exports = function loadTestEnv() {
  const file = path.resolve(__dirname, 'test.env');
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!m) continue;
      let v = m[2];
      if (/^(['"]).*\1$/.test(v)) v = v.slice(1, -1);
      if (process.env[m[1]] === undefined || process.env[m[1]] === '') process.env[m[1]] = v;
    }
  }
  if (!process.env.DB_PASSWORD) {
    throw new Error('缺少 DB_PASSWORD：请复制 apps/api/test/test.env.example 为 test.env 并填写，或设置环境变量');
  }
  if (!process.env.JWT_SECRET) process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
  if (!process.env.JWT_REFRESH_SECRET) process.env.JWT_REFRESH_SECRET = crypto.randomBytes(32).toString('hex');
};
