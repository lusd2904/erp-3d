import { Injectable } from '@nestjs/common';
import { ErrorCodes } from '@erp3d/shared';
import { DbService } from '../../db/db.service';
import { nextId } from '../../db/snowflake';
import { BizError } from '../../common/biz-error';

@Injectable()
export class RoleService {
  constructor(private db: DbService) {}

  async list(q: { keyword?: string; page?: string; size?: string }) {
    const page = Math.max(Number(q.page) || 1, 1);
    const size = Math.min(Math.max(Number(q.size) || 50, 1), 500);
    const where: string[] = [];
    const params: unknown[] = [];

    if (q.keyword) {
      where.push('(code LIKE ? OR name LIKE ?)');
      params.push(`%${q.keyword}%`, `%${q.keyword}%`);
    }

    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await this.db.q(
      `SELECT id, code, name, is_super AS isSuper, remark, forbid, created_at AS createdAt, updated_at AS updatedAt
       FROM sys_role ${w} ORDER BY id ASC LIMIT ${size} OFFSET ${(page - 1) * size}`,
      params,
    );
    const [{ total }] = await this.db.q(`SELECT COUNT(*) AS total FROM sys_role ${w}`, params);

    return { rows, total: Number(total), page, size };
  }

  async get(id: number) {
    const role = await this.db.one<any>(
      `SELECT id, code, name, is_super AS isSuper, remark, forbid, created_at AS createdAt, updated_at AS updatedAt
       FROM sys_role WHERE id = ?`,
      [id],
    );
    if (!role) throw new BizError(ErrorCodes.SYS_NOT_FOUND, '角色不存在');
    return role;
  }

  async create(body: any) {
    if (!body?.code || !body?.name) {
      throw new BizError(ErrorCodes.SYS_VALIDATION, '角色编码与名称为必填项');
    }
    const exist = await this.db.one('SELECT id FROM sys_role WHERE code = ?', [body.code.trim()]);
    if (exist) throw new BizError(ErrorCodes.BIZ_DUPLICATE, '角色编码已存在');

    const id = nextId();
    await this.db.exec(
      `INSERT INTO sys_role (id, code, name, is_super, remark, forbid) VALUES (?, ?, ?, 0, ?, 0)`,
      [id, body.code.trim(), body.name.trim(), body.remark || null],
    );
    return { id };
  }

  async update(id: number, body: any) {
    const role = await this.get(id);
    if (role.id === 1 || role.isSuper) {
      throw new BizError(ErrorCodes.SYS_VALIDATION, '系统超级管理员角色禁止修改');
    }

    const updates: string[] = [];
    const params: unknown[] = [];
    if (body.name !== undefined) { updates.push('name = ?'); params.push(body.name); }
    if (body.remark !== undefined) { updates.push('remark = ?'); params.push(body.remark); }

    if (updates.length > 0) {
      params.push(id);
      await this.db.exec(`UPDATE sys_role SET ${updates.join(', ')} WHERE id = ?`, params);
    }
    return { ok: true };
  }

  async delete(id: number) {
    const role = await this.get(id);
    if (role.id === 1 || role.isSuper) {
      throw new BizError(ErrorCodes.SYS_VALIDATION, '系统超级管理员角色禁止删除');
    }

    await this.db.tx(async () => {
      await this.db.exec(`DELETE FROM sys_role_perm WHERE role_id = ?`, [id]);
      await this.db.exec(`DELETE FROM sys_field_perm WHERE role_id = ?`, [id]);
      await this.db.exec(`DELETE FROM sys_role_data_rule WHERE role_id = ?`, [id]);
      await this.db.exec(`DELETE FROM sys_user_role WHERE role_id = ?`, [id]);
      await this.db.exec(`DELETE FROM sys_role WHERE id = ?`, [id]);
    });

    return { ok: true };
  }

  async forbid(id: number) {
    const role = await this.get(id);
    if (role.id === 1 || role.isSuper) {
      throw new BizError(ErrorCodes.SYS_VALIDATION, '系统超级管理员角色禁止停用');
    }
    await this.db.exec(`UPDATE sys_role SET forbid = 1 WHERE id = ?`, [id]);
    return { ok: true };
  }

  async unforbid(id: number) {
    await this.db.exec(`UPDATE sys_role SET forbid = 0 WHERE id = ?`, [id]);
    return { ok: true };
  }

  async getPerms(roleId: number) {
    await this.get(roleId);
    const perms = await this.db.q(
      `SELECT object_code AS objectCode, perm_code AS permCode, effect FROM sys_role_perm WHERE role_id = ?`,
      [roleId],
    );
    const fieldPerms = await this.db.q(
      `SELECT object_code AS objectCode, field_key AS fieldKey, can_view AS canView, can_edit AS canEdit
       FROM sys_field_perm WHERE role_id = ?`,
      [roleId],
    );
    const dataRules = await this.db.q(
      `SELECT object_code AS objectCode, data_rule_id AS dataRuleId, post_rule AS postRule, combine
       FROM sys_role_data_rule WHERE role_id = ?`,
      [roleId],
    );
    return { perms, fieldPerms, dataRules };
  }

  async savePerms(roleId: number, body: {
    perms?: { objectCode: string; permCode: string; effect: string }[];
    fieldPerms?: { objectCode: string; fieldKey: string; canView: boolean | number; canEdit: boolean | number }[];
    dataRules?: { objectCode: string; dataRuleId?: number; postRule?: string; combine?: string }[];
  }) {
    await this.get(roleId);
    await this.db.tx(async () => {
      if (body.perms !== undefined) {
        await this.db.exec(`DELETE FROM sys_role_perm WHERE role_id = ?`, [roleId]);
        for (const p of body.perms) {
          await this.db.exec(
            `INSERT INTO sys_role_perm (id, role_id, object_code, perm_code, effect) VALUES (?, ?, ?, ?, ?)`,
            [nextId(), roleId, p.objectCode, p.permCode, p.effect || 'A'],
          );
        }
      }

      if (body.fieldPerms !== undefined) {
        await this.db.exec(`DELETE FROM sys_field_perm WHERE role_id = ?`, [roleId]);
        for (const fp of body.fieldPerms) {
          await this.db.exec(
            `INSERT INTO sys_field_perm (id, role_id, object_code, field_key, can_view, can_edit) VALUES (?, ?, ?, ?, ?, ?)`,
            [nextId(), roleId, fp.objectCode, fp.fieldKey, fp.canView ? 1 : 0, fp.canEdit ? 1 : 0],
          );
        }
      }

      if (body.dataRules !== undefined) {
        await this.db.exec(`DELETE FROM sys_role_data_rule WHERE role_id = ?`, [roleId]);
        for (const dr of body.dataRules) {
          await this.db.exec(
            `INSERT INTO sys_role_data_rule (id, role_id, object_code, data_rule_id, post_rule, combine) VALUES (?, ?, ?, ?, ?, ?)`,
            [nextId(), roleId, dr.objectCode, dr.dataRuleId || null, dr.postRule || null, dr.combine || 'AND'],
          );
        }
      }
    });

    return { ok: true };
  }
}
