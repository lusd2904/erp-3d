import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { nextId } from '../db/snowflake';

/** 系统参数：组织级覆盖全局级。读多写少，进程内缓存 30 秒。 */
@Injectable()
export class ParamService {
  private cache = new Map<string, { v: string | null; at: number }>();
  constructor(private db: DbService) {}

  async getRaw(module: string, key: string, orgId = 0): Promise<string | null> {
    const ck = `${orgId}|${module}|${key}`;
    const hit = this.cache.get(ck);
    if (hit && Date.now() - hit.at < 30000) return hit.v;
    const rows = await this.db.q<{ scope: string; param_value: string }>(
      `SELECT scope, param_value FROM sys_param WHERE module = ? AND param_key = ? AND ((scope = 'ORG' AND org_id = ?) OR scope = 'GLOBAL') ORDER BY scope = 'ORG' DESC LIMIT 1`,
      [module, key, orgId],
    );
    const v = rows[0]?.param_value ?? null;
    this.cache.set(ck, { v, at: Date.now() });
    return v;
  }

  async getInt(module: string, key: string, def: number, orgId = 0): Promise<number> {
    const v = await this.getRaw(module, key, orgId);
    const n = v === null ? NaN : Number(v);
    return Number.isFinite(n) ? n : def;
  }

  async getBool(module: string, key: string, def: boolean, orgId = 0): Promise<boolean> {
    const v = await this.getRaw(module, key, orgId);
    return v === null ? def : v === 'true' || v === '1';
  }

  async getStr(module: string, key: string, def: string, orgId = 0): Promise<string> {
    return (await this.getRaw(module, key, orgId)) ?? def;
  }

  async list(module?: string) {
    return this.db.q(
      `SELECT id, scope, org_id AS orgId, module, param_key AS \`key\`, param_value AS value, value_type AS type, name, remark FROM sys_param ${module ? 'WHERE module = ?' : ''} ORDER BY module, param_key`,
      module ? [module] : [],
    );
  }

  async set(module: string, key: string, value: string, scope: 'GLOBAL' | 'ORG' = 'GLOBAL', orgId = 0) {
    await this.db.exec(
      `INSERT INTO sys_param (id, scope, org_id, module, param_key, param_value) VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE param_value = VALUES(param_value)`,
      [nextId(), scope, scope === 'GLOBAL' ? 0 : orgId, module, key, value],
    );
    this.cache.clear();
  }

  clearCache() {
    this.cache.clear();
  }
}
