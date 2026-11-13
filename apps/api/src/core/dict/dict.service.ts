import { Injectable } from '@nestjs/common';
import { ErrorCodes } from '@erp3d/shared';
import { DbService } from '../../db/db.service';
import { nextId } from '../../db/snowflake';
import { BizError } from '../../common/biz-error';

@Injectable()
export class DictService {
  constructor(private db: DbService) {}

  async list(q: { dictType?: string; keyword?: string; page?: string; size?: string }) {
    const page = Math.max(Number(q.page) || 1, 1);
    const size = Math.min(Math.max(Number(q.size) || 50, 1), 500);
    const where: string[] = [];
    const params: unknown[] = [];

    if (q.dictType) {
      where.push('dict_type = ?');
      params.push(q.dictType);
    }
    if (q.keyword) {
      where.push('(code LIKE ? OR name LIKE ?)');
      params.push(`%${q.keyword}%`, `%${q.keyword}%`);
    }

    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await this.db.q(
      `SELECT id, dict_type AS dictType, code, name, sort, forbid FROM sys_dict ${w} ORDER BY dict_type ASC, sort ASC, id ASC LIMIT ${size} OFFSET ${(page - 1) * size}`,
      params,
    );
    const [{ total }] = await this.db.q(`SELECT COUNT(*) AS total FROM sys_dict ${w}`, params);

    return { rows, total: Number(total), page, size };
  }

  async get(id: number) {
    const row = await this.db.one(`SELECT id, dict_type AS dictType, code, name, sort, forbid FROM sys_dict WHERE id = ?`, [id]);
    if (!row) throw new BizError(ErrorCodes.SYS_NOT_FOUND, '字典项不存在');
    return row;
  }

  async create(body: { dictType: string; code: string; name: string; sort?: number }) {
    if (!body?.dictType || !body?.code || !body?.name) {
      throw new BizError(ErrorCodes.SYS_VALIDATION, '字典分类、编码和名称均为必填');
    }
    const exist = await this.db.one(`SELECT id FROM sys_dict WHERE dict_type = ? AND code = ?`, [body.dictType, body.code]);
    if (exist) throw new BizError(ErrorCodes.BIZ_DUPLICATE, '该字典类型下已存在相同编码');

    const id = nextId();
    await this.db.exec(
      `INSERT INTO sys_dict (id, dict_type, code, name, sort, forbid) VALUES (?, ?, ?, ?, ?, 0)`,
      [id, body.dictType.trim(), body.code.trim(), body.name.trim(), body.sort || 0],
    );
    return { id };
  }

  async update(id: number, body: { name?: string; sort?: number; code?: string }) {
    const updates: string[] = [];
    const params: unknown[] = [];
    if (body.name !== undefined) { updates.push('name = ?'); params.push(body.name); }
    if (body.code !== undefined) { updates.push('code = ?'); params.push(body.code); }
    if (body.sort !== undefined) { updates.push('sort = ?'); params.push(body.sort); }

    if (updates.length > 0) {
      params.push(id);
      await this.db.exec(`UPDATE sys_dict SET ${updates.join(', ')} WHERE id = ?`, params);
    }
    return { ok: true };
  }

  async delete(id: number) {
    await this.db.exec(`DELETE FROM sys_dict WHERE id = ?`, [id]);
    return { ok: true };
  }

  async setForbid(id: number, forbid: number) {
    await this.db.exec(`UPDATE sys_dict SET forbid = ? WHERE id = ?`, [forbid, id]);
    return { ok: true };
  }
}
