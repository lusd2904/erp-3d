import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { ErrorCodes } from '@erp3d/shared';
import { DbService } from '../../db/db.service';
import { nextId } from '../../db/snowflake';
import { BizError } from '../../common/biz-error';
import { ParamService } from '../param.service';

@Injectable()
export class UserService {
  constructor(
    private db: DbService,
    private paramService: ParamService,
  ) {}

  async list(q: { keyword?: string; page?: string; size?: string; deptId?: string }) {
    const page = Math.max(Number(q.page) || 1, 1);
    const size = Math.min(Math.max(Number(q.size) || 50, 1), 500);
    const where: string[] = [];
    const params: unknown[] = [];

    if (q.keyword) {
      where.push('(u.account LIKE ? OR u.name LIKE ?)');
      params.push(`%${q.keyword}%`, `%${q.keyword}%`);
    }
    if (q.deptId) {
      where.push('u.dept_id = ?');
      params.push(Number(q.deptId));
    }

    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await this.db.q(
      `SELECT u.id, u.account, u.name, u.employee_id AS employeeId, u.org_id AS orgId, u.dept_id AS deptId,
              u.status, u.must_change_pwd AS mustChangePwd, u.fail_count AS failCount, u.last_login_at AS lastLoginAt,
              u.last_login_ip AS lastLoginIp, u.user_type AS userType, u.created_at AS createdAt, u.updated_at AS updatedAt,
              d.name AS deptName, o.name AS orgName
       FROM sys_user u
       LEFT JOIN sys_dept d ON d.id = u.dept_id
       LEFT JOIN sys_org o ON o.id = u.org_id
       ${w} ORDER BY u.id DESC LIMIT ${size} OFFSET ${(page - 1) * size}`,
      params,
    );
    const [{ total }] = await this.db.q(`SELECT COUNT(*) AS total FROM sys_user u ${w}`, params);

    return { rows, total: Number(total), page, size };
  }

  async get(id: number) {
    const u = await this.db.one<any>(
      `SELECT id, account, name, employee_id AS employeeId, org_id AS orgId, dept_id AS deptId, status,
              must_change_pwd AS mustChangePwd, user_type AS userType, last_login_at AS lastLoginAt,
              last_login_ip AS lastLoginIp, created_at AS createdAt, updated_at AS updatedAt
       FROM sys_user WHERE id = ?`,
      [id],
    );
    if (!u) throw new BizError(ErrorCodes.SYS_NOT_FOUND, '用户不存在');

    const roles = await this.db.q(
      `SELECT r.id, r.code, r.name FROM sys_user_role ur JOIN sys_role r ON r.id = ur.role_id WHERE ur.user_id = ?`,
      [id],
    );
    return { ...u, roles };
  }

  async create(body: any) {
    if (!body?.account || !body?.name || !body?.password) {
      throw new BizError(ErrorCodes.SYS_VALIDATION, '账号、姓名和初始密码为必填项');
    }

    const exist = await this.db.one('SELECT id FROM sys_user WHERE account = ?', [body.account.trim()]);
    if (exist) throw new BizError(ErrorCodes.BIZ_DUPLICATE, '账号已存在');

    const minLen = await this.paramService.getInt('security', 'pwd.minLen', 8);
    const maxLen = await this.paramService.getInt('security', 'pwd.maxLen', 20);
    if (body.password.length < minLen || body.password.length > maxLen) {
      throw new BizError(ErrorCodes.AUTH_WEAK_PASSWORD, `密码长度必须在 ${minLen}-${maxLen} 位之间`);
    }
    if (!/[A-Za-z]/.test(body.password) || !/\d/.test(body.password) || !/[^A-Za-z0-9]/.test(body.password)) {
      throw new BizError(ErrorCodes.AUTH_WEAK_PASSWORD, '密码必须同时包含字母、数字和特殊字符');
    }

    const id = nextId();
    const hash = bcrypt.hashSync(body.password, 10);
    const orgId = body.orgId ? Number(body.orgId) : 1;

    await this.db.tx(async () => {
      await this.db.exec(
        `INSERT INTO sys_user (id, account, name, employee_id, org_id, dept_id, status, pwd_hash, must_change_pwd, fail_count, user_type)
         VALUES (?, ?, ?, ?, ?, ?, 'ENABLED', ?, 1, 0, ?)`,
        [
          id,
          body.account.trim(),
          body.name.trim(),
          body.employeeId ? Number(body.employeeId) : null,
          orgId,
          body.deptId ? Number(body.deptId) : null,
          hash,
          body.userType || 'INTERNAL',
        ],
      );

      if (Array.isArray(body.roleIds) && body.roleIds.length > 0) {
        for (const roleId of body.roleIds) {
          await this.db.exec(
            `INSERT INTO sys_user_role (id, user_id, role_id, org_id) VALUES (?, ?, ?, ?)`,
            [nextId(), id, Number(roleId), orgId],
          );
        }
      }
    });

    return { id };
  }

  async update(id: number, body: any) {
    const updates: string[] = [];
    const params: unknown[] = [];
    if (body.name !== undefined) { updates.push('name = ?'); params.push(body.name); }
    if (body.deptId !== undefined) { updates.push('dept_id = ?'); params.push(body.deptId || null); }
    if (body.employeeId !== undefined) { updates.push('employee_id = ?'); params.push(body.employeeId || null); }
    if (body.orgId !== undefined) { updates.push('org_id = ?'); params.push(body.orgId || 1); }
    if (body.userType !== undefined) { updates.push('user_type = ?'); params.push(body.userType); }

    if (updates.length > 0) {
      params.push(id);
      await this.db.exec(`UPDATE sys_user SET ${updates.join(', ')} WHERE id = ?`, params);
    }
    return { ok: true };
  }

  async resetPwd(id: number, newPassword?: string) {
    if (!newPassword) throw new BizError(ErrorCodes.SYS_VALIDATION, '新密码不能为空');

    const minLen = await this.paramService.getInt('security', 'pwd.minLen', 8);
    const maxLen = await this.paramService.getInt('security', 'pwd.maxLen', 20);
    if (newPassword.length < minLen || newPassword.length > maxLen) {
      throw new BizError(ErrorCodes.AUTH_WEAK_PASSWORD, `密码长度必须在 ${minLen}-${maxLen} 位之间`);
    }
    if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
      throw new BizError(ErrorCodes.AUTH_WEAK_PASSWORD, '密码必须同时包含字母、数字和特殊字符');
    }

    const hash = bcrypt.hashSync(newPassword, 10);
    await this.db.exec(
      `UPDATE sys_user SET pwd_hash = ?, pwd_changed_at = NOW(), must_change_pwd = 1, fail_count = 0 WHERE id = ?`,
      [hash, id],
    );
    await this.db.exec(`UPDATE sys_user_token SET revoked = 1 WHERE user_id = ?`, [id]);
    return { ok: true };
  }

  async forbid(id: number) {
    await this.db.exec(`UPDATE sys_user SET status = 'DISABLED' WHERE id = ?`, [id]);
    await this.db.exec(`UPDATE sys_user_token SET revoked = 1 WHERE user_id = ?`, [id]);
    return { ok: true };
  }

  async unforbid(id: number) {
    await this.db.exec(`UPDATE sys_user SET status = 'ENABLED', fail_count = 0 WHERE id = ?`, [id]);
    return { ok: true };
  }

  async updateRoles(userId: number, roleIds: number[], orgId?: number) {
    const user = await this.db.one<{ org_id: number }>('SELECT org_id FROM sys_user WHERE id = ?', [userId]);
    if (!user) throw new BizError(ErrorCodes.SYS_NOT_FOUND, '用户不存在');
    const targetOrgId = orgId ? Number(orgId) : Number(user.org_id);

    await this.db.tx(async () => {
      await this.db.exec(`DELETE FROM sys_user_role WHERE user_id = ? AND org_id = ?`, [userId, targetOrgId]);
      for (const rId of roleIds) {
        await this.db.exec(
          `INSERT INTO sys_user_role (id, user_id, role_id, org_id) VALUES (?, ?, ?, ?)`,
          [nextId(), userId, Number(rId), targetOrgId],
        );
      }
    });
    return { ok: true };
  }
}
