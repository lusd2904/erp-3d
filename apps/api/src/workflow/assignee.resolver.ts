import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

export interface UserTaskCfg {
  assigneeType: 'user' | 'role' | 'deptLeader' | 'starterLeader' | 'starter';
  assignees: string[];
  multi: 'any' | 'all' | 'ratio' | 'votes';
  ratio?: number;
  votes?: number;
  sequential?: boolean;
  final?: boolean;
  emptyPolicy: 'skip' | 'admin';
  allowTransfer: boolean;
  allowAddSign: boolean;
  allowReject: boolean;
  allowWithdraw: boolean;
  timeoutHours?: number;
  cc?: string[];
  editableFields?: string[];
}

interface Starter {
  userId: number;
  deptId: number | null;
  employeeId: number | null;
  orgId: number;
}

interface UserIdRow {
  id: number | string;
}

interface DelegateRow {
  delegateId: number | string;
  delegateeId: number | string;
}

@Injectable()
export class AssigneeResolver {
  constructor(private readonly db: DbService) {}

  async resolve(cfg: UserTaskCfg, starter: Starter): Promise<number[]> {
    switch (cfg.assigneeType) {
      case 'user': {
        const ids = [
          ...new Set(
            cfg.assignees
              .map((value) => value.trim())
              .filter((value) => /^[0-9]+$/.test(value) && /[1-9]/.test(value)),
          ),
        ];
        if (ids.length === 0) {
          return [];
        }

        const placeholders = ids.map(() => '?').join(', ');
        const rows = await this.db.q<UserIdRow>(
          `SELECT u.id
             FROM sys_user u
            WHERE u.status = 'ENABLED'
              AND u.org_id = ?
              AND u.id IN (${placeholders})
            ORDER BY FIELD(u.id, ${placeholders})`,
          [starter.orgId, ...ids, ...ids],
        );
        return this.userIds(rows);
      }

      case 'role': {
        const codes = [
          ...new Set(cfg.assignees.map((value) => value.trim()).filter(Boolean)),
        ];
        if (codes.length === 0) {
          return [];
        }

        const placeholders = codes.map(() => '?').join(', ');
        const rows = await this.db.q<UserIdRow>(
          `SELECT DISTINCT u.id
             FROM sys_user u
             JOIN sys_user_role ur ON ur.user_id = u.id
             JOIN sys_role r ON r.id = ur.role_id
            WHERE u.status = 'ENABLED'
              AND r.forbid = 0
              AND ur.org_id = ?
              AND r.code IN (${placeholders})
            ORDER BY u.id`,
          [starter.orgId, ...codes],
        );
        return this.userIds(rows);
      }

      case 'deptLeader':
        return this.departmentLeaderIds(starter.deptId, starter.orgId, false);

      case 'starterLeader': {
        if (starter.employeeId !== null) {
          const rows = await this.db.q<UserIdRow>(
            `SELECT DISTINCT u.id
               FROM sys_emp_position own_assignment
               JOIN sys_employee initiator
                 ON initiator.id = own_assignment.employee_id
                AND initiator.forbid = 0
               JOIN sys_position own_position
                 ON own_position.id = own_assignment.position_id
                AND own_position.forbid = 0
               JOIN sys_dept own_department
                 ON own_department.id = own_position.dept_id
                AND own_department.org_id = initiator.org_id
                AND own_department.forbid = 0
               JOIN sys_position parent_position
                 ON parent_position.id = own_position.parent_position_id
                AND parent_position.forbid = 0
               JOIN sys_dept parent_department
                 ON parent_department.id = parent_position.dept_id
                AND parent_department.org_id = initiator.org_id
                AND parent_department.forbid = 0
               JOIN sys_emp_position parent_assignment
                 ON parent_assignment.position_id = parent_position.id
               JOIN sys_employee leader
                 ON leader.id = parent_assignment.employee_id
                AND leader.org_id = initiator.org_id
                AND leader.forbid = 0
               JOIN sys_user u
                 ON u.employee_id = leader.id
                AND u.status = 'ENABLED'
              WHERE own_assignment.employee_id = ?
                AND initiator.org_id = ?
                AND own_assignment.is_main = 1
                AND (
                  own_assignment.start_date IS NULL
                  OR own_assignment.start_date <= CURRENT_DATE()
                )
                AND (
                  own_assignment.end_date IS NULL
                  OR own_assignment.end_date >= CURRENT_DATE()
                )
                AND (
                  parent_assignment.start_date IS NULL
                  OR parent_assignment.start_date <= CURRENT_DATE()
                )
                AND (
                  parent_assignment.end_date IS NULL
                  OR parent_assignment.end_date >= CURRENT_DATE()
                )
              ORDER BY u.id`,
            [starter.employeeId, starter.orgId],
          );
          const ids = this.userIds(rows);
          if (ids.length > 0) {
            return ids;
          }
        }

        return this.departmentLeaderIds(starter.deptId, starter.orgId, true);
      }

      case 'starter': {
        const rows = await this.db.q<UserIdRow>(
          `SELECT u.id
             FROM sys_user u
            WHERE u.id = ?
              AND u.org_id = ?
              AND u.status = 'ENABLED'`,
          [starter.userId, starter.orgId],
        );
        return this.userIds(rows);
      }
    }
  }

  async adminUserIds(orgId: number): Promise<number[]> {
    // PlatformCore 的超级管理员标记位于角色表，授权组织取用户角色关系表。
    // sys_user.org_id 是默认组织，不能用它代替角色的授权组织。
    const rows = await this.db.q<UserIdRow>(
      `SELECT DISTINCT u.id
         FROM sys_user u
         JOIN sys_user_role ur ON ur.user_id = u.id
         JOIN sys_role r ON r.id = ur.role_id
        WHERE u.status = 'ENABLED'
          AND ur.org_id = ?
          AND r.is_super = 1
          AND r.forbid = 0
        ORDER BY u.id`,
      [orgId],
    );
    return this.userIds(rows);
  }

  async resolveDelegate(
    ownerId: number,
    form: string,
    at: string,
    forUpdate = false,
  ): Promise<{ delegateId: number; delegateeId: number } | null> {
    // 只查询原处理人的直接代理，不继续解析代理人的委托。
    const row = await this.db.one<DelegateRow>(
      `SELECT d.id AS delegateId, d.delegatee_id AS delegateeId
         FROM wf_delegate d
         JOIN sys_user owner
           ON owner.id = d.delegator_id
          AND owner.org_id = d.org_id
         JOIN sys_user u
           ON u.id = d.delegatee_id
          AND u.org_id = d.org_id
          AND u.status = 'ENABLED'
        WHERE d.delegator_id = ?
          AND d.enabled = 1
          AND d.delegatee_id <> d.delegator_id
          AND (d.eff_from IS NULL OR d.eff_from <= ?)
          AND (d.eff_to IS NULL OR d.eff_to >= ?)
          AND (
            d.form_scope IS NULL
            OR TRIM(d.form_scope) = ''
            OR FIND_IN_SET(?, d.form_scope) > 0
          )
        ORDER BY d.eff_from DESC, d.id DESC
        LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
      [ownerId, at, at, form],
    );

    if (row === undefined) {
      return null;
    }

    return {
      delegateId: Number(row.delegateId),
      delegateeId: Number(row.delegateeId),
    };
  }

  private async departmentLeaderIds(
    deptId: number | null,
    orgId: number,
    parent: boolean,
  ): Promise<number[]> {
    if (deptId === null) {
      return [];
    }

    // PlatformCore 以 leader_emp_id 关联负责人员工，再由 employee_id 关联用户。
    // 上级部门仅取直接父部门，不递归向上查找。
    const targetColumn = parent ? 'source.parent_id' : 'source.id';
    const rows = await this.db.q<UserIdRow>(
      `SELECT DISTINCT u.id
         FROM sys_dept source
         JOIN sys_dept target
           ON target.id = ${targetColumn}
          AND target.org_id = source.org_id
          AND target.forbid = 0
         JOIN sys_employee leader
           ON leader.id = target.leader_emp_id
          AND leader.org_id = target.org_id
          AND leader.forbid = 0
         JOIN sys_user u
           ON u.employee_id = leader.id
          AND u.status = 'ENABLED'
        WHERE source.id = ?
          AND source.org_id = ?
          AND source.forbid = 0
        ORDER BY u.id`,
      [deptId, orgId],
    );
    return this.userIds(rows);
  }

  private userIds(rows: readonly UserIdRow[]): number[] {
    return [...new Set(rows.map((row) => Number(row.id)))];
  }
}
