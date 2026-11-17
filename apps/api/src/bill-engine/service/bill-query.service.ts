import { Injectable } from '@nestjs/common';
import { BillView, compileExpr, ErrorCodes } from '@erp3d/shared';
import { DbService, ident } from '../../db/db.service';
import { PermService } from '../../core/perm.service';
import { BizError } from '../../common/biz-error';
import { AuthUser, currentUser, SYSTEM_USER } from '../../common/request-context';
import { BillEngineRegistry } from '../bill-engine.registry';
import { BillStore } from '../store/bill-store';
import { Row } from '../engine.types';
import { computeLockedFields, entryColumns, headerColumns } from '../meta/meta-util';
import { BASEDATA_ONLY_OPS, INTERNAL_OPS } from '../state/std-state-machine';

/**
 * 单据查询服务：列表、详情视图、元数据、可用操作及锁定字段计算
 */
@Injectable()
export class BillQueryService {
  constructor(
    private readonly db: DbService,
    private readonly registry: BillEngineRegistry,
    private readonly store: BillStore,
    private readonly perm: PermService,
  ) {}

  /**
   * 获取单据元数据定义及配置视图
   */
  async meta(form: string): Promise<any> {
    const reg = this.registry.get(form);
    const user = currentUser() ?? SYSTEM_USER;
    await this.perm.assert(user, form, 'view', reg.meta.name);

    const fp = await this.perm.fieldPerms(user, form);

    const ops = Object.entries(reg.sm.ops)
      .filter(([code]) => {
        if (INTERNAL_OPS.has(code)) return false;
        if (reg.meta.kind === 'bill' && BASEDATA_ONLY_OPS.has(code)) return false;
        return true;
      })
      .map(([code, def]) => ({
        code,
        name: def.name,
        perm: def.perm,
      }));

    const converts = this.registry.convertsFrom(form).map((c) => ({
      code: c.code,
      name: c.name,
      tgtForm: c.tgtForm,
      tgtName: this.registry.has(c.tgtForm) ? this.registry.get(c.tgtForm).meta.name : c.tgtForm,
    }));

    const events = reg.events.map((e) => ({
      code: e.code,
      name: e.name,
      level: e.level,
      undo: e.undo,
    }));

    return {
      meta: reg.meta,
      stateMachine: {
        code: reg.sm.code,
        name: reg.sm.name,
        ops,
        rowStatus: reg.sm.rowStatus,
      },
      converts,
      events,
      fieldPerms: {
        hidden: Array.from(fp.hidden),
        readonly: Array.from(fp.readonly),
      },
    };
  }

  /**
   * 分页查询单据列表
   */
  async list(
    form: string,
    q: {
      page?: number;
      size?: number;
      sort?: string;
      filter?: string;
      keyword?: string;
      withEntry?: string | boolean;
    },
  ): Promise<{ rows: Row[]; total: number; page: number; size: number }> {
    const reg = this.registry.get(form);
    const user = currentUser() ?? SYSTEM_USER;
    await this.perm.assert(user, form, 'view', reg.meta.name);

    const page = Math.max(Number(q.page) || 1, 1);
    const size = Math.min(Math.max(Number(q.size) || 50, 1), 500);
    const withEntry = q.withEntry === '1' || q.withEntry === 'true' || q.withEntry === true;

    const headerCols = new Set(headerColumns(reg.meta));
    const entryCols = new Set(reg.meta.entry ? entryColumns(reg.meta.entry) : []);

    const whereParts: string[] = [];
    const params: unknown[] = [];

    // 解析过滤条件
    if (q.filter) {
      let filterObj: { logic?: 'and' | 'or'; conditions?: Array<{ field: string; op: string; value: any }> };
      try {
        filterObj = typeof q.filter === 'string' ? JSON.parse(q.filter) : q.filter;
      } catch {
        throw new BizError(ErrorCodes.SYS_VALIDATION, 'filter 条件 JSON 格式非法');
      }

      if (filterObj?.conditions && Array.isArray(filterObj.conditions) && filterObj.conditions.length > 0) {
        const condSqls: string[] = [];
        for (const cond of filterObj.conditions) {
          const field = cond.field;
          let colExpr: string;

          if (field.startsWith('entry.')) {
            const entryField = field.slice(6);
            if (!withEntry || !reg.meta.entry || !entryCols.has(entryField)) {
              throw new BizError(ErrorCodes.SYS_VALIDATION, `非法分录过滤字段: ${field}`);
            }
            colExpr = `e.${ident(entryField)}`;
          } else {
            if (!headerCols.has(field)) {
              throw new BizError(ErrorCodes.SYS_VALIDATION, `非法表头过滤字段: ${field}`);
            }
            colExpr = `h.${ident(field)}`;
          }

          const op = String(cond.op).toLowerCase();
          switch (op) {
            case 'eq':
              condSqls.push(`${colExpr} = ?`);
              params.push(cond.value);
              break;
            case 'ne':
              condSqls.push(`${colExpr} <> ?`);
              params.push(cond.value);
              break;
            case 'gt':
              condSqls.push(`${colExpr} > ?`);
              params.push(cond.value);
              break;
            case 'ge':
              condSqls.push(`${colExpr} >= ?`);
              params.push(cond.value);
              break;
            case 'lt':
              condSqls.push(`${colExpr} < ?`);
              params.push(cond.value);
              break;
            case 'le':
              condSqls.push(`${colExpr} <= ?`);
              params.push(cond.value);
              break;
            case 'like':
              condSqls.push(`${colExpr} LIKE ?`);
              params.push(`%${cond.value}%`);
              break;
            case 'in':
              if (Array.isArray(cond.value) && cond.value.length > 0) {
                condSqls.push(`${colExpr} IN (${cond.value.map(() => '?').join(', ')})`);
                params.push(...cond.value);
              } else {
                condSqls.push('1 = 0');
              }
              break;
            case 'nin':
              if (Array.isArray(cond.value) && cond.value.length > 0) {
                condSqls.push(`${colExpr} NOT IN (${cond.value.map(() => '?').join(', ')})`);
                params.push(...cond.value);
              } else {
                condSqls.push('1 = 1');
              }
              break;
            case 'isnull':
              condSqls.push(`${colExpr} IS NULL`);
              break;
            case 'notnull':
              condSqls.push(`${colExpr} IS NOT NULL`);
              break;
            case 'between':
              if (Array.isArray(cond.value) && cond.value.length >= 2) {
                condSqls.push(`${colExpr} BETWEEN ? AND ?`);
                params.push(cond.value[0], cond.value[1]);
              }
              break;
            default:
              throw new BizError(ErrorCodes.SYS_VALIDATION, `不支持的过滤操作符: ${cond.op}`);
          }
        }

        if (condSqls.length > 0) {
          const logicOp = filterObj.logic?.toLowerCase() === 'or' ? ' OR ' : ' AND ';
          whereParts.push(`(${condSqls.join(logicOp)})`);
        }
      }
    }

    // 关键词过滤
    if (q.keyword) {
      whereParts.push('h.bill_no LIKE ?');
      params.push(`%${q.keyword}%`);
    }

    // 数据权限隔离
    const scope = await this.perm.dataScope(user, form, 'h');
    if (scope) {
      whereParts.push(`(${scope.sql})`);
      params.push(...scope.params);
    }

    // 排序处理
    const orderParts: string[] = [];
    if (q.sort) {
      const items = String(q.sort).split(',');
      for (const item of items) {
        const [field, dir] = item.trim().split(':');
        if (!field) continue;
        const direction = dir?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

        if (field.startsWith('entry.')) {
          const entryField = field.slice(6);
          if (!withEntry || !reg.meta.entry || !entryCols.has(entryField)) {
            throw new BizError(ErrorCodes.SYS_VALIDATION, `非法分录排序字段: ${field}`);
          }
          orderParts.push(`e.${ident(entryField)} ${direction}`);
        } else {
          if (!headerCols.has(field)) {
            throw new BizError(ErrorCodes.SYS_VALIDATION, `非法表头排序字段: ${field}`);
          }
          orderParts.push(`h.${ident(field)} ${direction}`);
        }
      }
    }
    if (orderParts.length === 0) {
      orderParts.push('h.id DESC');
      if (withEntry && reg.meta.entry) {
        orderParts.push('e.line_no ASC', 'e.id ASC');
      }
    }

    let fromClause = `FROM ${ident(reg.meta.table)} h`;
    let selectClause = 'h.*';

    if (withEntry && reg.meta.entry) {
      fromClause += ` LEFT JOIN ${ident(reg.meta.entry.table)} e ON e.bill_id = h.id`;
      const entrySelects = Array.from(entryCols).map((col) => `e.${ident(col)} AS \`entry.${col}\``);
      if (entrySelects.length > 0) {
        selectClause += ', ' + entrySelects.join(', ');
      }
    }

    const whereClause = whereParts.length > 0 ? ` WHERE ${whereParts.join(' AND ')}` : '';
    const orderClause = ` ORDER BY ${orderParts.join(', ')}`;

    // 总数统计
    const countSql = `SELECT COUNT(*) AS total ${fromClause}${whereClause}`;
    const countRes = await this.db.q<{ total: number | string }>(countSql, params);
    const total = Number(countRes[0]?.total ?? 0);

    // 分页查询
    const offset = (page - 1) * size;
    const dataSql = `SELECT ${selectClause} ${fromClause}${whereClause}${orderClause} LIMIT ? OFFSET ?`;
    const rows = await this.db.q<Row>(dataSql, [...params, size, offset]);

    // 剔除受控隐藏字段
    const fp = await this.perm.fieldPerms(user, form);
    if (fp.hidden.size > 0) {
      for (const row of rows) {
        for (const k of fp.hidden) {
          if (k.startsWith('header.')) {
            delete row[k.slice(7)];
          } else if (k.startsWith('entry.')) {
            delete row[k];
          }
        }
      }
    }

    return { rows, total, page, size };
  }

  /**
   * 查看单据详情
   */
  async view(form: string, id: number): Promise<BillView> {
    const reg = this.registry.get(form);
    const user = currentUser() ?? SYSTEM_USER;
    await this.perm.assert(user, form, 'view', reg.meta.name);

    // 数据权限阻断校验
    const scope = await this.perm.dataScope(user, form, 'h');
    if (scope) {
      const ok = await this.db.one(
        `SELECT 1 FROM ${ident(reg.meta.table)} h WHERE h.id = ? AND (${scope.sql})`,
        [id, ...scope.params],
      );
      if (!ok) {
        throw new BizError(ErrorCodes.PERM_DATA_SCOPE, '无权访问该单据');
      }
    }

    const header = await this.store.mustHeader(form, id);
    const entries = await this.store.entries(form, id);

    const allowedOps = await this.allowedOps(form, header, user);
    const lockedFields = await this.lockedFields(form, header, user);

    // 剔除受控隐藏字段
    const fp = await this.perm.fieldPerms(user, form);
    if (fp.hidden.size > 0) {
      for (const k of fp.hidden) {
        if (k.startsWith('header.')) {
          delete header[k.slice(7)];
        }
      }
      for (const entry of entries) {
        for (const k of fp.hidden) {
          if (k.startsWith('entry.')) {
            delete entry[k.slice(6)];
          }
        }
      }
    }

    const wf = header.wf_instance_id
      ? { instanceId: Number(header.wf_instance_id), status: '', currentNodes: [] }
      : null;

    return {
      form,
      header,
      entries,
      allowedOps,
      lockedFields,
      lock: null,
      wf,
    };
  }

  /**
   * 计算当前登录用户在当前单据状态下允许执行的操作列表
   */
  async allowedOps(form: string, header: Row, user: AuthUser): Promise<string[]> {
    const reg = this.registry.get(form);
    const ops: string[] = [];

    for (const [opCode, opDef] of Object.entries(reg.sm.ops)) {
      if (INTERNAL_OPS.has(opCode)) continue;
      if (reg.meta.kind === 'bill' && BASEDATA_ONLY_OPS.has(opCode)) continue;

      // 前置单据状态匹配
      if (opDef.from !== '*' && (!Array.isArray(opDef.from) || !opDef.from.includes(header.status))) {
        continue;
      }
      // 前置维度要求匹配
      if (opDef.requireClose && opDef.requireClose !== header.close_status) continue;
      if (opDef.requireCancel && opDef.requireCancel !== header.cancel_status) continue;
      if (opDef.requireForbid && opDef.requireForbid !== header.forbid_status) continue;

      // 前置条件表达式
      if (opDef.condition) {
        try {
          const ok = compileExpr(opDef.condition).evalBool(header);
          if (!ok) continue;
        } catch {
          continue;
        }
      }

      // 权限检查
      const hasPerm = await this.perm.check(user, form, opDef.perm);
      if (!hasPerm) continue;

      ops.push(opCode);
    }

    // 自定义业务事件
    for (const ev of reg.events) {
      const fromStatus = ev.fromStatus ?? ['AUDITED'];
      if (!fromStatus.includes(header.status) || header.cancel_status !== 'A') {
        continue;
      }
      const permCode = ev.perm ?? 'execute';
      const hasPerm = await this.perm.check(user, form, permCode);
      if (!hasPerm) continue;

      if (ev.level === 'bill') {
        const existing = await this.db.one(
          'SELECT 1 FROM sys_bill_event_state WHERE form = ? AND bill_id = ? AND entry_id = 0 AND event = ?',
          [form, header.id, ev.code],
        );
        if (!existing) {
          ops.push(ev.code);
        } else if (ev.undo) {
          ops.push(ev.undo.code);
        }
      } else if (ev.level === 'entry') {
        ops.push(ev.code);
        if (ev.undo) {
          ops.push(ev.undo.code);
        }
      }
    }

    // 行级业务状态操作
    if (
      reg.sm.rowStatus &&
      header.status === 'AUDITED' &&
      header.cancel_status === 'A' &&
      header.close_status === 'A'
    ) {
      const hasExec = await this.perm.check(user, form, 'execute');
      if (hasExec) {
        ops.push('exec_to');
        for (const t of reg.sm.rowStatus.transitions) {
          ops.push(t.op);
        }
      }
    }

    // 可编辑单据允许保存操作
    const canEdit = ['DRAFT', 'CREATED', 'REAUDIT'].includes(header.status);
    if (canEdit && header.cancel_status === 'A' && header.close_status === 'A') {
      const hasEdit = await this.perm.check(user, form, 'edit');
      if (hasEdit) {
        ops.push('save');
      }
    }

    // 允许下推操作
    if (header.status === 'AUDITED' && header.cancel_status === 'A' && header.close_status === 'A') {
      const hasPush = await this.perm.check(user, form, 'push');
      if (hasPush && this.registry.convertsFrom(form).length > 0) {
        ops.push('push');
      }
    }

    return Array.from(new Set(ops));
  }

  /**
   * 计算单据锁定字段
   */
  async lockedFields(form: string, header: Row, user: AuthUser): Promise<BillView['lockedFields']> {
    const reg = this.registry.get(form);
    const fp = await this.perm.fieldPerms(user, form);
    return computeLockedFields(reg.meta, reg.sm, header, fp);
  }
}
