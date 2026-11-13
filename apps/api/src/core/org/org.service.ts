import { Injectable } from '@nestjs/common';
import { ErrorCodes } from '@erp3d/shared';
import { DbService } from '../../db/db.service';
import { nextId } from '../../db/snowflake';
import { BizError } from '../../common/biz-error';

@Injectable()
export class OrgService {
  constructor(private db: DbService) {}

  // ================= 组织 =================
  async listOrgs(q: { keyword?: string; page?: string; size?: string }) {
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
      `SELECT id, code, name, form, functions, parent_id AS parentId, forbid, created_at AS createdAt, updated_at AS updatedAt
       FROM sys_org ${w} ORDER BY id ASC LIMIT ${size} OFFSET ${(page - 1) * size}`,
      params,
    );
    const [{ total }] = await this.db.q(`SELECT COUNT(*) AS total FROM sys_org ${w}`, params);
    return { rows, total: Number(total), page, size };
  }

  async getOrg(id: number) {
    const row = await this.db.one(`SELECT * FROM sys_org WHERE id = ?`, [id]);
    if (!row) throw new BizError(ErrorCodes.SYS_NOT_FOUND, '组织不存在');
    return row;
  }

  async createOrg(body: any) {
    if (!body?.code || !body?.name) throw new BizError(ErrorCodes.SYS_VALIDATION, '组织编码与名称必填');
    const id = nextId();
    await this.db.exec(
      `INSERT INTO sys_org (id, code, name, form, functions, parent_id, forbid) VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [id, body.code.trim(), body.name.trim(), body.form || 'FACTORY', body.functions || null, body.parentId || null],
    );
    return { id };
  }

  async updateOrg(id: number, body: any) {
    const updates: string[] = [];
    const params: unknown[] = [];
    if (body.name !== undefined) { updates.push('name = ?'); params.push(body.name); }
    if (body.form !== undefined) { updates.push('form = ?'); params.push(body.form); }
    if (body.functions !== undefined) { updates.push('functions = ?'); params.push(body.functions); }
    if (body.parentId !== undefined) { updates.push('parent_id = ?'); params.push(body.parentId || null); }
    if (updates.length) {
      params.push(id);
      await this.db.exec(`UPDATE sys_org SET ${updates.join(', ')} WHERE id = ?`, params);
    }
    return { ok: true };
  }

  async deleteOrg(id: number) {
    await this.db.exec(`DELETE FROM sys_org WHERE id = ?`, [id]);
    return { ok: true };
  }

  async setOrgForbid(id: number, forbid: number) {
    await this.db.exec(`UPDATE sys_org SET forbid = ? WHERE id = ?`, [forbid, id]);
    return { ok: true };
  }

  // ================= 部门 =================
  async listDepts(q: { orgId?: string; keyword?: string }) {
    const where: string[] = [];
    const params: unknown[] = [];
    if (q.orgId) {
      where.push('d.org_id = ?');
      params.push(Number(q.orgId));
    }
    if (q.keyword) {
      where.push('(d.code LIKE ? OR d.name LIKE ?)');
      params.push(`%${q.keyword}%`, `%${q.keyword}%`);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await this.db.q(
      `SELECT d.id, d.org_id AS orgId, d.code, d.name, d.parent_id AS parentId, d.leader_emp_id AS leaderEmpId,
              d.path, d.forbid, d.created_at AS createdAt, d.updated_at AS updatedAt,
              e.name AS leaderName
       FROM sys_dept d
       LEFT JOIN sys_employee e ON e.id = d.leader_emp_id
       ${w} ORDER BY d.path ASC, d.id ASC`,
      params,
    );
    return rows;
  }

  async getDept(id: number) {
    const row = await this.db.one(`SELECT * FROM sys_dept WHERE id = ?`, [id]);
    if (!row) throw new BizError(ErrorCodes.SYS_NOT_FOUND, '部门不存在');
    return row;
  }

  async createDept(body: any) {
    if (!body?.code || !body?.name) throw new BizError(ErrorCodes.SYS_VALIDATION, '部门编码与名称必填');
    const id = nextId();
    const orgId = body.orgId ? Number(body.orgId) : 1;
    let path = `/${id}/`;

    if (body.parentId) {
      const parent = await this.db.one<{ path: string }>('SELECT path FROM sys_dept WHERE id = ?', [Number(body.parentId)]);
      if (parent?.path) {
        path = `${parent.path}${id}/`;
      }
    }

    await this.db.exec(
      `INSERT INTO sys_dept (id, org_id, code, name, parent_id, leader_emp_id, path, forbid)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      [id, orgId, body.code.trim(), body.name.trim(), body.parentId || null, body.leaderEmpId || null, path],
    );
    return { id, path };
  }

  async updateDept(id: number, body: any) {
    const current = await this.getDept(id);
    const updates: string[] = [];
    const params: unknown[] = [];

    if (body.name !== undefined) { updates.push('name = ?'); params.push(body.name); }
    if (body.leaderEmpId !== undefined) { updates.push('leader_emp_id = ?'); params.push(body.leaderEmpId || null); }

    if (body.parentId !== undefined && Number(body.parentId || 0) !== Number(current.parent_id || 0)) {
      const newParentId = body.parentId ? Number(body.parentId) : null;
      let newPath = `/${id}/`;
      if (newParentId) {
        const parent = await this.db.one<{ path: string }>('SELECT path FROM sys_dept WHERE id = ?', [newParentId]);
        if (parent?.path) newPath = `${parent.path}${id}/`;
      }

      const oldPath = current.path || `/${id}/`;
      updates.push('parent_id = ?'); params.push(newParentId);
      updates.push('path = ?'); params.push(newPath);

      // 级联更新子部门 path
      await this.db.tx(async () => {
        params.push(id);
        await this.db.exec(`UPDATE sys_dept SET ${updates.join(', ')} WHERE id = ?`, params);
        await this.db.exec(
          `UPDATE sys_dept SET path = CONCAT(?, SUBSTRING(path, ?)) WHERE path LIKE ? AND id <> ?`,
          [newPath, oldPath.length + 1, `${oldPath}%`, id],
        );
      });
      return { ok: true };
    }

    if (updates.length) {
      params.push(id);
      await this.db.exec(`UPDATE sys_dept SET ${updates.join(', ')} WHERE id = ?`, params);
    }
    return { ok: true };
  }

  async deleteDept(id: number) {
    const child = await this.db.one('SELECT id FROM sys_dept WHERE parent_id = ? LIMIT 1', [id]);
    if (child) throw new BizError(ErrorCodes.SYS_VALIDATION, '存在子部门，不允许直接删除');
    await this.db.exec(`DELETE FROM sys_dept WHERE id = ?`, [id]);
    return { ok: true };
  }

  async setDeptForbid(id: number, forbid: number) {
    await this.db.exec(`UPDATE sys_dept SET forbid = ? WHERE id = ?`, [forbid, id]);
    return { ok: true };
  }

  // ================= 岗位 =================
  async listPositions(q: { deptId?: string; keyword?: string; page?: string; size?: string }) {
    const page = Math.max(Number(q.page) || 1, 1);
    const size = Math.min(Math.max(Number(q.size) || 50, 1), 500);
    const where: string[] = [];
    const params: unknown[] = [];

    if (q.deptId) { where.push('p.dept_id = ?'); params.push(Number(q.deptId)); }
    if (q.keyword) { where.push('(p.code LIKE ? OR p.name LIKE ?)'); params.push(`%${q.keyword}%`, `%${q.keyword}%`); }

    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await this.db.q(
      `SELECT p.id, p.dept_id AS deptId, p.code, p.name, p.parent_position_id AS parentPositionId, p.forbid, p.created_at AS createdAt,
              d.name AS deptName
       FROM sys_position p
       LEFT JOIN sys_dept d ON d.id = p.dept_id
       ${w} ORDER BY p.id ASC LIMIT ${size} OFFSET ${(page - 1) * size}`,
      params,
    );
    const [{ total }] = await this.db.q(`SELECT COUNT(*) AS total FROM sys_position p ${w}`, params);
    return { rows, total: Number(total), page, size };
  }

  async getPosition(id: number) {
    const row = await this.db.one(`SELECT * FROM sys_position WHERE id = ?`, [id]);
    if (!row) throw new BizError(ErrorCodes.SYS_NOT_FOUND, '岗位不存在');
    return row;
  }

  async createPosition(body: any) {
    if (!body?.code || !body?.name || !body?.deptId) {
      throw new BizError(ErrorCodes.SYS_VALIDATION, '岗位编码、名称及所属部门必填');
    }
    const id = nextId();
    await this.db.exec(
      `INSERT INTO sys_position (id, dept_id, code, name, parent_position_id, forbid) VALUES (?, ?, ?, ?, ?, 0)`,
      [id, Number(body.deptId), body.code.trim(), body.name.trim(), body.parentPositionId ? Number(body.parentPositionId) : null],
    );
    return { id };
  }

  async updatePosition(id: number, body: any) {
    const updates: string[] = [];
    const params: unknown[] = [];
    if (body.name !== undefined) { updates.push('name = ?'); params.push(body.name); }
    if (body.deptId !== undefined) { updates.push('dept_id = ?'); params.push(body.deptId); }
    if (body.parentPositionId !== undefined) { updates.push('parent_position_id = ?'); params.push(body.parentPositionId || null); }
    if (updates.length) {
      params.push(id);
      await this.db.exec(`UPDATE sys_position SET ${updates.join(', ')} WHERE id = ?`, params);
    }
    return { ok: true };
  }

  async deletePosition(id: number) {
    await this.db.exec(`DELETE FROM sys_position WHERE id = ?`, [id]);
    return { ok: true };
  }

  async setPositionForbid(id: number, forbid: number) {
    await this.db.exec(`UPDATE sys_position SET forbid = ? WHERE id = ?`, [forbid, id]);
    return { ok: true };
  }

  // ================= 员工 =================
  async listEmployees(q: { deptId?: string; keyword?: string; page?: string; size?: string }) {
    const page = Math.max(Number(q.page) || 1, 1);
    const size = Math.min(Math.max(Number(q.size) || 50, 1), 500);
    const where: string[] = [];
    const params: unknown[] = [];

    if (q.deptId) { where.push('e.dept_id = ?'); params.push(Number(q.deptId)); }
    if (q.keyword) {
      where.push('(e.code LIKE ? OR e.name LIKE ? OR e.mobile LIKE ?)');
      params.push(`%${q.keyword}%`, `%${q.keyword}%`, `%${q.keyword}%`);
    }

    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await this.db.q(
      `SELECT e.id, e.org_id AS orgId, e.code, e.name, e.mobile, e.email, e.card_no AS cardNo, e.dept_id AS deptId,
              e.forbid, e.created_at AS createdAt, e.updated_at AS updatedAt,
              d.name AS deptName
       FROM sys_employee e
       LEFT JOIN sys_dept d ON d.id = e.dept_id
       ${w} ORDER BY e.id DESC LIMIT ${size} OFFSET ${(page - 1) * size}`,
      params,
    );
    const [{ total }] = await this.db.q(`SELECT COUNT(*) AS total FROM sys_employee e ${w}`, params);
    return { rows, total: Number(total), page, size };
  }

  async getEmployee(id: number) {
    const emp = await this.db.one<any>(`SELECT * FROM sys_employee WHERE id = ?`, [id]);
    if (!emp) throw new BizError(ErrorCodes.SYS_NOT_FOUND, '员工不存在');
    const positions = await this.db.q(
      `SELECT ep.id, ep.position_id AS positionId, ep.is_main AS isMain, ep.start_date AS startDate, ep.end_date AS endDate,
              p.name AS positionName
       FROM sys_emp_position ep
       JOIN sys_position p ON p.id = ep.position_id
       WHERE ep.employee_id = ?`,
      [id],
    );
    return { ...emp, positions };
  }

  async createEmployee(body: any) {
    if (!body?.code || !body?.name) throw new BizError(ErrorCodes.SYS_VALIDATION, '员工工号与姓名必填');
    const exist = await this.db.one('SELECT id FROM sys_employee WHERE code = ?', [body.code.trim()]);
    if (exist) throw new BizError(ErrorCodes.BIZ_DUPLICATE, '员工工号已存在');

    const id = nextId();
    await this.db.exec(
      `INSERT INTO sys_employee (id, org_id, code, name, mobile, email, card_no, dept_id, forbid)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        id,
        body.orgId ? Number(body.orgId) : 1,
        body.code.trim(),
        body.name.trim(),
        body.mobile || null,
        body.email || null,
        body.cardNo || null,
        body.deptId ? Number(body.deptId) : null,
      ],
    );
    return { id };
  }

  async updateEmployee(id: number, body: any) {
    const updates: string[] = [];
    const params: unknown[] = [];
    if (body.name !== undefined) { updates.push('name = ?'); params.push(body.name); }
    if (body.mobile !== undefined) { updates.push('mobile = ?'); params.push(body.mobile); }
    if (body.email !== undefined) { updates.push('email = ?'); params.push(body.email); }
    if (body.cardNo !== undefined) { updates.push('card_no = ?'); params.push(body.cardNo); }
    if (body.deptId !== undefined) { updates.push('dept_id = ?'); params.push(body.deptId || null); }
    if (updates.length) {
      params.push(id);
      await this.db.exec(`UPDATE sys_employee SET ${updates.join(', ')} WHERE id = ?`, params);
    }
    return { ok: true };
  }

  async deleteEmployee(id: number) {
    await this.db.tx(async () => {
      await this.db.exec(`DELETE FROM sys_emp_position WHERE employee_id = ?`, [id]);
      await this.db.exec(`DELETE FROM sys_employee WHERE id = ?`, [id]);
    });
    return { ok: true };
  }

  async setEmployeeForbid(id: number, forbid: number) {
    await this.db.exec(`UPDATE sys_employee SET forbid = ? WHERE id = ?`, [forbid, id]);
    return { ok: true };
  }
}
