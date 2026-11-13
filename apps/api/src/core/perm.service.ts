import { Injectable } from '@nestjs/common';
import { ErrorCodes } from '@erp3d/shared';
import { DbService, ident } from '../db/db.service';
import { AuthUser } from '../common/request-context';
import { BizError } from '../common/biz-error';

export interface FieldPerms {
  hidden: Set<string>; // 'header.x' / 'entry.x'
  readonly: Set<string>;
}

interface Cond {
  field: string;
  op: 'eq' | 'ne' | 'in' | 'nin' | 'gt' | 'ge' | 'lt' | 'le' | 'like' | 'isnull' | 'notnull';
  value?: unknown;
  var?: '$userId' | '$employeeId' | '$orgId' | '$deptId' | '$deptAndChildren' | '$subordinateUsers';
}
interface Filter {
  logic?: 'and' | 'or';
  conditions: Cond[];
}

/**
 * RBAC：功能权限（对象×权限项，禁止 > 允许 > 无权，多角色取并集）、字段权限、数据权限（数据规则 + 岗位体系规则）。
 * 超级管理员角色（is_super）跳过全部校验。
 */
@Injectable()
export class PermService {
  constructor(private db: DbService) {}

  async loadAuthUser(userId: number): Promise<AuthUser | null> {
    const u = await this.db.one<any>(`SELECT id, account, name, org_id, dept_id, employee_id, status FROM sys_user WHERE id = ?`, [userId]);
    if (!u) return null;
    const roles = await this.db.q<{ id: number; is_super: number }>(
      `SELECT r.id, r.is_super FROM sys_user_role ur JOIN sys_role r ON r.id = ur.role_id AND r.forbid = 0 WHERE ur.user_id = ? AND ur.org_id = ?`,
      [userId, u.org_id],
    );
    return {
      id: Number(u.id), account: u.account, name: u.name, orgId: Number(u.org_id), deptId: u.dept_id ? Number(u.dept_id) : null,
      employeeId: u.employee_id ? Number(u.employee_id) : null, isSuper: roles.some((r) => !!r.is_super), roleIds: roles.map((r) => Number(r.id)),
      ...(u.status !== 'ENABLED' ? { disabled: true } : {}),
    } as AuthUser;
  }

  async check(user: AuthUser, objectCode: string, permCode: string): Promise<boolean> {
    if (user.isSuper) return true;
    if (!user.roleIds.length) return false;
    const rows = await this.db.q<{ perm_code: string; effect: string }>(
      `SELECT perm_code, effect FROM sys_role_perm WHERE role_id IN (${user.roleIds.map(() => '?').join(',')}) AND object_code = ? AND perm_code IN (?, 'view')`,
      [...user.roleIds, objectCode, permCode],
    );
    // “查看”是其他权限的前提
    const has = (code: string) => {
      const rs = rows.filter((r) => r.perm_code === code);
      if (rs.some((r) => r.effect === 'D')) return false;
      return rs.some((r) => r.effect === 'A');
    };
    return has('view') && has(permCode);
  }

  async assert(user: AuthUser, objectCode: string, permCode: string, what?: string) {
    if (!(await this.check(user, objectCode, permCode))) {
      const item = await this.db.one<{ name: string }>(`SELECT name FROM sys_perm_item WHERE code = ?`, [permCode]);
      throw new BizError(ErrorCodes.PERM_DENIED, `没有「${what ?? objectCode}」的「${item?.name ?? permCode}」权限`);
    }
  }

  /** 字段权限：字段只要被任一角色配置过就是“受控字段”，受控字段需用户某个角色明确允许才能看/改 */
  async fieldPerms(user: AuthUser, objectCode: string): Promise<FieldPerms> {
    const res: FieldPerms = { hidden: new Set(), readonly: new Set() };
    if (user.isSuper) return res;
    const all = await this.db.q<{ role_id: number; field_key: string; can_view: number; can_edit: number }>(
      `SELECT role_id, field_key, can_view, can_edit FROM sys_field_perm WHERE object_code = ?`,
      [objectCode],
    );
    if (!all.length) return res;
    const byField = new Map<string, typeof all>();
    for (const r of all) {
      const k = r.field_key.includes('.') ? r.field_key : `header.${r.field_key}`;
      if (!byField.has(k)) byField.set(k, []);
      byField.get(k)!.push(r);
    }
    const mine = new Set(user.roleIds);
    for (const [k, rs] of byField) {
      const my = rs.filter((r) => mine.has(Number(r.role_id)));
      const view = my.some((r) => r.can_view);
      const edit = my.some((r) => r.can_view && r.can_edit);
      if (!view) res.hidden.add(k);
      if (!edit) res.readonly.add(k);
    }
    return res;
  }

  /**
   * 数据权限 SQL 片段（作用于表别名 alias 的单据头）。返回 null 表示不限制。
   * 多角色取并集；同一角色内数据规则与岗位规则按 combine（默认交集）。
   * 用户对该对象有“查看”权的角色中，只要有一个角色没配数据规则，就不限制。
   */
  async dataScope(user: AuthUser, objectCode: string, alias = 'h', op = 'view'): Promise<{ sql: string; params: unknown[] } | null> {
    if (user.isSuper) return null;
    if (!user.roleIds.length) return { sql: '1 = 0', params: [] };
    const inRoles = user.roleIds.map(() => '?').join(',');
    const viewRoles = await this.db.q<{ role_id: number }>(
      `SELECT DISTINCT role_id FROM sys_role_perm WHERE role_id IN (${inRoles}) AND object_code = ? AND perm_code = 'view' AND effect = 'A'`,
      [...user.roleIds, objectCode],
    );
    if (!viewRoles.length) return { sql: '1 = 0', params: [] };
    const rules = await this.db.q<any>(
      `SELECT rdr.role_id, rdr.post_rule, rdr.combine, dr.filter_json, dr.ops FROM sys_role_data_rule rdr
       LEFT JOIN sys_data_rule dr ON dr.id = rdr.data_rule_id WHERE rdr.object_code = ? AND rdr.role_id IN (${viewRoles.map(() => '?').join(',')})`,
      [objectCode, ...viewRoles.map((r) => r.role_id)],
    );
    const ruleByRole = new Map<number, any>(rules.map((r) => [Number(r.role_id), r]));
    const parts: string[] = [];
    const params: unknown[] = [];
    for (const { role_id } of viewRoles) {
      const r = ruleByRole.get(Number(role_id));
      if (!r) return null; // 该角色无数据规则 = 全部
      const sub: string[] = [];
      if (r.filter_json && (!r.ops || String(r.ops).split(',').includes(op))) {
        const f: Filter = typeof r.filter_json === 'string' ? JSON.parse(r.filter_json) : r.filter_json;
        const s = await this.filterSql(user, f, alias, params);
        if (s) sub.push(s);
      }
      if (r.post_rule) {
        const users = await this.subordinateUsers(user, r.post_rule);
        sub.push(users.length ? `${alias}.creator_id IN (${users.map(() => '?').join(',')})` : '1 = 0');
        params.push(...users);
      }
      if (!sub.length) return null;
      parts.push('(' + sub.join(r.combine === 'OR' ? ' OR ' : ' AND ') + ')');
    }
    return { sql: '(' + parts.join(' OR ') + ')', params };
  }

  private async filterSql(user: AuthUser, f: Filter, alias: string, params: unknown[]): Promise<string> {
    const conds: string[] = [];
    for (const c of f.conditions ?? []) {
      const col = `${alias}.${ident(c.field)}`;
      let v: unknown = c.value;
      if (c.var) v = await this.resolveVar(user, c.var);
      switch (c.op) {
        case 'isnull': conds.push(`${col} IS NULL`); continue;
        case 'notnull': conds.push(`${col} IS NOT NULL`); continue;
        case 'in':
        case 'nin': {
          const arr = Array.isArray(v) ? v : [v];
          if (!arr.length) { conds.push(c.op === 'in' ? '1 = 0' : '1 = 1'); continue; }
          conds.push(`${col} ${c.op === 'in' ? 'IN' : 'NOT IN'} (${arr.map(() => '?').join(',')})`);
          params.push(...arr);
          continue;
        }
      }
      const opSql = { eq: '=', ne: '<>', gt: '>', ge: '>=', lt: '<', le: '<=', like: 'LIKE' }[c.op as string];
      if (!opSql) continue;
      if (Array.isArray(v)) {
        conds.push(v.length ? `${col} IN (${v.map(() => '?').join(',')})` : '1 = 0');
        params.push(...v);
      } else {
        conds.push(`${col} ${opSql} ?`);
        params.push(v);
      }
    }
    if (!conds.length) return '';
    return '(' + conds.join(f.logic === 'or' ? ' OR ' : ' AND ') + ')';
  }

  private async resolveVar(user: AuthUser, v: string): Promise<unknown> {
    switch (v) {
      case '$userId': return user.id;
      case '$employeeId': return user.employeeId;
      case '$orgId': return user.orgId;
      case '$deptId': return user.deptId;
      case '$deptAndChildren': {
        if (!user.deptId) return [];
        const d = await this.db.one<{ path: string }>(`SELECT path FROM sys_dept WHERE id = ?`, [user.deptId]);
        const rows = await this.db.q<{ id: number }>(`SELECT id FROM sys_dept WHERE path LIKE ?`, [`${d?.path ?? `/${user.deptId}/`}%`]);
        return rows.map((r) => Number(r.id));
      }
      case '$subordinateUsers': return this.subordinateUsers(user, 'ALL');
    }
    return null;
  }

  /** 岗位体系：SELF 本人 / DIRECT 本人+直接下属 / ALL 本人+所有下属（按岗位上下级） */
  async subordinateUsers(user: AuthUser, rule: string): Promise<number[]> {
    const result = new Set<number>([user.id]);
    if (rule === 'SELF' || !user.employeeId) return [...result];
    let positions = (await this.db.q<{ position_id: number }>(
      `SELECT position_id FROM sys_emp_position WHERE employee_id = ? AND (end_date IS NULL OR end_date >= CURDATE())`,
      [user.employeeId],
    )).map((r) => Number(r.position_id));
    const seen = new Set<number>(positions);
    for (let depth = 0; positions.length && depth < 20; depth++) {
      const children = (await this.db.q<{ id: number }>(
        `SELECT id FROM sys_position WHERE parent_position_id IN (${positions.map(() => '?').join(',')})`,
        positions,
      )).map((r) => Number(r.id)).filter((id) => !seen.has(id));
      children.forEach((id) => seen.add(id));
      if (children.length) {
        const users = await this.db.q<{ id: number }>(
          `SELECT DISTINCT u.id FROM sys_emp_position ep JOIN sys_user u ON u.employee_id = ep.employee_id
           WHERE ep.position_id IN (${children.map(() => '?').join(',')}) AND (ep.end_date IS NULL OR ep.end_date >= CURDATE())`,
          children,
        );
        users.forEach((u) => result.add(Number(u.id)));
      }
      if (rule === 'DIRECT') break;
      positions = children;
    }
    return [...result];
  }

  /** 用户最终权限报表：对象 × 权限项 → 是否有权及来源角色 */
  async permissionReport(userId: number) {
    const user = await this.loadAuthUser(userId);
    if (!user) return null;
    if (user.isSuper) return { userId, isSuper: true, perms: [], fields: [] };
    const inRoles = user.roleIds.length ? user.roleIds.map(() => '?').join(',') : 'NULL';
    const perms = await this.db.q<any>(
      `SELECT rp.object_code AS objectCode, rp.perm_code AS permCode, rp.effect, r.code AS roleCode, r.name AS roleName
       FROM sys_role_perm rp JOIN sys_role r ON r.id = rp.role_id WHERE rp.role_id IN (${inRoles}) ORDER BY rp.object_code, rp.perm_code`,
      user.roleIds,
    );
    const agg = new Map<string, { objectCode: string; permCode: string; allowed: boolean; denied: boolean; roles: string[] }>();
    for (const p of perms) {
      const k = `${p.objectCode}|${p.permCode}`;
      if (!agg.has(k)) agg.set(k, { objectCode: p.objectCode, permCode: p.permCode, allowed: false, denied: false, roles: [] });
      const a = agg.get(k)!;
      if (p.effect === 'D') a.denied = true; else a.allowed = true;
      a.roles.push(`${p.roleName}${p.effect === 'D' ? '(禁止)' : ''}`);
    }
    const fields = await this.db.q<any>(
      `SELECT fp.object_code AS objectCode, fp.field_key AS fieldKey, fp.can_view AS canView, fp.can_edit AS canEdit, r.name AS roleName
       FROM sys_field_perm fp JOIN sys_role r ON r.id = fp.role_id WHERE fp.role_id IN (${inRoles})`,
      user.roleIds,
    );
    return {
      userId,
      isSuper: false,
      perms: [...agg.values()].map((a) => ({ objectCode: a.objectCode, permCode: a.permCode, effective: a.allowed && !a.denied, roles: a.roles })),
      fields,
    };
  }
}
