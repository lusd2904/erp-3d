import { Injectable } from '@nestjs/common';
import {
  BillStatusName,
  ErrorCodes,
  BatchResult,
  BillView,
  compileExpr,
} from '@erp3d/shared';
import { DbService, ident } from '../../db/db.service';
import { nextId } from '../../db/snowflake';
import { BizError } from '../../common/biz-error';
import { currentUser, SYSTEM_USER, type AuthUser } from '../../common/request-context';
import { PermService } from '../../core/perm.service';
import { OpLogService } from '../../core/oplog.service';
import { WsGateway } from '../../core/ws/ws.gateway';
import { LinkService } from './link.service';
import { WritebackService } from './writeback.service';
import { BillSaveService } from './bill-save.service';
import { ConvertService } from './convert.service';
import { BillQueryService } from './bill-query.service';
import { BillEngineRegistry } from '../bill-engine.registry';
import { BillStore } from '../store/bill-store';
import type { Row, OpParams, BillHookContext, BillEventDef, WorkflowBillOperations } from '../engine.types';
import type { RowTransition } from '@erp3d/shared';
import { nowStr } from '../meta/meta-util';

/**
 * 单据通用操作服务：负责状态机流转调度、前置校验、事务控制、工作流联动、自定义事件与行级状态机。
 */
@Injectable()
export class BillOpService implements WorkflowBillOperations {
  constructor(
    private readonly db: DbService,
    private readonly registry: BillEngineRegistry,
    private readonly store: BillStore,
    private readonly perm: PermService,
    private readonly oplog: OpLogService,
    private readonly ws: WsGateway,
    private readonly link: LinkService,
    private readonly writeback: WritebackService,
    private readonly saveSvc: BillSaveService,
    private readonly convert: ConvertService,
    private readonly query: BillQueryService,
  ) {}

  /**
   * 保存或暂存单据并返回最新详情视图。
   */
  async save(
    form: string,
    id: number | null,
    body: { header?: Row; entries?: Row[]; version?: number },
    mode: 'draft' | 'save' = 'save',
  ): Promise<BillView> {
    let billId = 0;
    await this.db.tx(async () => {
      billId = await this.saveSvc.save(form, id, body, mode);
      const meta = this.registry.get(form).meta;
      if (mode === 'save' && meta.options?.autoSubmitAfterSave) {
        const h = await this.store.mustHeader(form, billId);
        if (h.status === 'CREATED' || h.status === 'REAUDIT') {
          await this.execInTx(form, billId, 'submit', {});
        }
      }
    });
    return this.query.view(form, billId);
  }

  /**
   * 执行单项操作。
   */
  async execOp(
    form: string,
    id: number,
    op: string,
    params: OpParams = {},
    opts: { internal?: boolean } = {},
  ): Promise<BillView> {
    await this.db.tx(async () => {
      await this.execInTx(form, id, op, params, opts);
      this.db.afterCommit(() => {
        this.ws.broadcast('bill.changed', { form, id, op });
      });
    });

    if (op === 'delete') {
      return {
        form,
        header: { id },
        entries: [],
        allowedOps: [],
        lockedFields: { header: '*', entry: '*' },
      };
    }
    return this.query.view(form, id);
  }

  /**
   * 批量执行操作。
   */
  async batch(form: string, op: string, ids: number[], params: OpParams = {}): Promise<BatchResult> {
    const results: { id: number; ok: boolean; code?: string; msg?: string }[] = [];
    for (const id of ids) {
      try {
        await this.db.tx(async () => {
          await this.execInTx(form, id, op, params);
          this.db.afterCommit(() => {
            this.ws.broadcast('bill.changed', { form, id, op });
          });
        });
        results.push({ id, ok: true });
      } catch (e: any) {
        if (e instanceof BizError) {
          results.push({ id, ok: false, code: e.code, msg: e.message });
        } else {
          results.push({ id, ok: false, code: ErrorCodes.SYS_INTERNAL, msg: e?.message ?? '系统内部错误' });
        }
      }
    }
    return { results };
  }

  /** 审批通过：复用 L2 的审批动作事务。 */
  async auditByWorkflow(form: string, id: number, user: AuthUser): Promise<void> {
    await this.execByWorkflow(form, id, 'audit', user);
  }

  /** 审批驳回：复用 L2 的审批动作事务。 */
  async rejectByWorkflow(form: string, id: number, user: AuthUser): Promise<void> {
    await this.execByWorkflow(form, id, 'reject', user);
  }

  private async execByWorkflow(
    form: string,
    id: number,
    op: 'audit' | 'reject',
    user: AuthUser,
  ): Promise<void> {
    if (!this.db.inTx) {
      throw new BizError(ErrorCodes.SYS_INTERNAL, '审批结果回调必须在审批动作事务内执行');
    }
    await this.execInTx(form, id, op, {}, { internal: true, user });
  }

  /**
   * 事务内执行操作，由调用方提供当前事务。
   */
  async execInTx(
    form: string,
    id: number,
    op: string,
    params: OpParams = {},
    opts: { internal?: boolean; user?: AuthUser } = {},
  ): Promise<void> {
    const user = opts.user ?? currentUser() ?? SYSTEM_USER;
    const reg = this.registry.get(form);
    const meta = reg.meta;
    const h = await this.store.mustHeader(form, id, { forUpdate: true });

    if (params.version !== undefined && params.version !== null && Number(params.version) !== Number(h.version)) {
      throw new BizError(ErrorCodes.BIZ_VERSION_CONFLICT, '单据已被他人修改，请刷新后重试');
    }

    // 1. 自定义业务事件
    const ev = this.registry.findEvent(form, op);
    if (ev) {
      await this.runEvent(form, h, ev, params, opts);
      return;
    }

    // 2. 行级业务状态
    const sm = reg.sm;
    const isRowOp = op === 'exec_to' || (sm.rowStatus?.transitions.some((t) => t.op === op) ?? false);
    if (isRowOp) {
      await this.runRow(form, h, op, params, opts);
      return;
    }

    // 3. 标准单据操作
    const def = sm.ops[op];
    if (!def) {
      throw new BizError(ErrorCodes.BIZ_STATE_NOT_ALLOWED, '不支持的操作');
    }
    if (op === 'reject' && !opts.internal) {
      throw new BizError(ErrorCodes.BIZ_STATE_NOT_ALLOWED, '不支持的操作');
    }

    if (!opts.internal) {
      await this.perm.assert(user, form, def.perm, meta.name);
    }

    if (op === 'cancel' && h.status === 'AUDITED') {
      throw new BizError(ErrorCodes.BIZ_STATE_NOT_ALLOWED, '已审核的单据须先反审核才能作废');
    }

    if (def.from !== '*') {
      if (!def.from.includes(h.status)) {
        const statusName = BillStatusName[h.status as keyof typeof BillStatusName] ?? h.status;
        throw new BizError(
          ErrorCodes.BIZ_STATE_NOT_ALLOWED,
          `${meta.name}「${h.bill_no}」当前状态为${statusName}，不能${def.name}`,
        );
      }
    }

    if (def.requireClose && h.close_status !== def.requireClose) {
      throw new BizError(
        ErrorCodes.BIZ_STATE_NOT_ALLOWED,
        h.close_status === 'B' ? '单据已关闭，禁止操作' : '单据未关闭，禁止操作',
      );
    }
    if (def.requireCancel && h.cancel_status !== def.requireCancel) {
      throw new BizError(
        ErrorCodes.BIZ_STATE_NOT_ALLOWED,
        h.cancel_status === 'B' ? '单据已作废，禁止操作' : '单据未作废，禁止操作',
      );
    }
    if (def.requireForbid && h.forbid_status !== def.requireForbid) {
      throw new BizError(
        ErrorCodes.BIZ_STATE_NOT_ALLOWED,
        h.forbid_status === 'B' ? '单据已禁用，禁止操作' : '单据未禁用，禁止操作',
      );
    }

    if (def.condition) {
      const ok = compileExpr(def.condition).evalBool(h);
      if (!ok) {
        throw new BizError(ErrorCodes.BIZ_STATE_NOT_ALLOWED, def.conditionMsg ?? '不满足操作前置条件');
      }
    }

    const entries = await this.store.entries(form, id);
    const ctx: BillHookContext = {
      form,
      billId: id,
      header: h,
      entries,
      user,
      db: this.db,
      op,
      entryIds: params.entryIds,
      extra: params,
    };

    await reg.hooks.beforeOp?.(op, ctx);
    if (op === 'submit') await reg.hooks.beforeSubmit?.(ctx);
    else if (op === 'audit') await reg.hooks.beforeAudit?.(ctx);
    else if (op === 'unaudit') await reg.hooks.beforeUnaudit?.(ctx);
    else if (op === 'cancel') await reg.hooks.beforeCancel?.(ctx);
    else if (op === 'uncancel') await reg.hooks.beforeUncancel?.(ctx);
    else if (op === 'close' || op === 'unclose') await reg.hooks.beforeClose?.(ctx);
    else if (op === 'delete') await reg.hooks.beforeDelete?.(ctx);

    const now = nowStr();

    if (op === 'submit') {
      const reqErrors = this.saveSvc.validateRequired(meta, h, entries);
      if (reqErrors.length > 0) {
        throw new BizError(ErrorCodes.BIZ_REQUIRED, '必录项未填写', { errors: reqErrors });
      }
      await this.db.exec(
        `UPDATE ${ident(meta.table)} SET status = 'AUDITING', modifier_id = ?, modified_at = ?, version = version + 1 WHERE id = ?`,
        [user.id, now, id],
      );
      const bridge = this.registry.workflowBridge();
      const r = bridge ? await bridge.onSubmit(ctx, this) : 'none';
      if (r === 'none' && meta.options?.autoAuditAfterSubmit) {
        await this.execInTx(form, id, 'audit', {}, { internal: true });
      }
    } else if (op === 'unsubmit') {
      await this.db.exec(
        `UPDATE ${ident(meta.table)} SET status = 'REAUDIT', modifier_id = ?, modified_at = ?, version = version + 1 WHERE id = ?`,
        [user.id, now, id],
      );
      const bridge = this.registry.workflowBridge();
      await bridge?.onUnsubmit?.(ctx);
    } else if (op === 'audit') {
      if (meta.options?.sod?.auditorNotCreator && Number(h.creator_id) === user.id && !opts.internal) {
        throw new BizError(ErrorCodes.BIZ_SOD_VIOLATION, '审核人不能是制单人');
      }
      await this.db.exec(
        `UPDATE ${ident(meta.table)} SET status = 'AUDITED', auditor_id = ?, audited_at = ?, modifier_id = ?, modified_at = ?, version = version + 1 WHERE id = ?`,
        [user.id, now, user.id, now, id],
      );
      await this.writeback.apply(form, id, 'audit');

      const autoConverts = this.registry.convertsFrom(form).filter((c) => c.autoPushOnAudit);
      if (autoConverts.length > 0) {
        const allEntries = await this.store.entries(form, id);
        const entryReqs = allEntries.map((e) => ({ entryId: Number(e.id) }));
        for (const rule of autoConverts) {
          try {
            await this.convert.push(rule.code, { entries: entryReqs, save: true });
          } catch (e: any) {
            if (e?.code !== ErrorCodes.BIZ_CONVERT_NONE && e?.code !== ErrorCodes.BIZ_SRC_NOT_AVAILABLE) {
              throw e;
            }
          }
        }
      }
    } else if (op === 'reject') {
      await this.db.exec(
        `UPDATE ${ident(meta.table)} SET status = 'REAUDIT', modifier_id = ?, modified_at = ?, version = version + 1 WHERE id = ?`,
        [user.id, now, id],
      );
    } else if (op === 'unaudit') {
      const down = await this.link.validDownstream(form, id);
      if (down.length > 0) {
        throw new BizError(
          ErrorCodes.BIZ_HAS_DOWNSTREAM,
          `存在下游单据：${down.map((d) => d.billNo).join('、')}，不能反审核`,
        );
      }
      // [集成修正] 先查行状态（更具体的提示），再查业务事件
      if (sm.rowStatus) {
        const field = sm.rowStatus.field;
        const initial = sm.rowStatus.initial;
        if (entries.some((e) => e[field] && e[field] !== initial)) {
          throw new BizError(ErrorCodes.BIZ_ROW_STATE, '分录已执行，请先反执行');
        }
      }
      const evStateRow = await this.db.one<{ cnt: number }>(
        `SELECT COUNT(*) AS cnt FROM sys_bill_event_state WHERE form = ? AND bill_id = ?`,
        [form, id],
      );
      if (Number(evStateRow?.cnt ?? 0) > 0) {
        throw new BizError(ErrorCodes.BIZ_STATE_NOT_ALLOWED, '请先撤销已执行的业务事件');
      }
      if (meta.options?.sod?.unauditBySameAuditor && h.auditor_id && Number(h.auditor_id) !== user.id) {
        throw new BizError(ErrorCodes.BIZ_SOD_VIOLATION, '反审核人必须与原审核人一致');
      }
      await this.db.exec(
        `UPDATE ${ident(meta.table)} SET status = 'REAUDIT', auditor_id = NULL, audited_at = NULL, modifier_id = ?, modified_at = ?, version = version + 1 WHERE id = ?`,
        [user.id, now, id],
      );
      await this.writeback.reverse(form, id, 'audit');
    } else if (op === 'close') {
      await this.db.exec(
        `UPDATE ${ident(meta.table)} SET close_status = 'B', closer_id = ?, closed_at = ?, modifier_id = ?, modified_at = ?, version = version + 1 WHERE id = ?`,
        [user.id, now, user.id, now, id],
      );
    } else if (op === 'unclose') {
      await this.db.exec(
        `UPDATE ${ident(meta.table)} SET close_status = 'A', closer_id = NULL, closed_at = NULL, modifier_id = ?, modified_at = ?, version = version + 1 WHERE id = ?`,
        [user.id, now, id],
      );
    } else if (op === 'cancel') {
      await this.db.exec(
        `UPDATE ${ident(meta.table)} SET cancel_status = 'B', cancel_prev_status = ?, canceller_id = ?, cancelled_at = ?, modifier_id = ?, modified_at = ?, version = version + 1 WHERE id = ?`,
        [h.status, user.id, now, user.id, now, id],
      );
      await this.writeback.reverse(form, id, 'save');
    } else if (op === 'uncancel') {
      const restoreStatus = h.cancel_prev_status ?? h.status;
      await this.db.exec(
        `UPDATE ${ident(meta.table)} SET cancel_status = 'A', status = ?, cancel_prev_status = NULL, canceller_id = NULL, cancelled_at = NULL, modifier_id = ?, modified_at = ?, version = version + 1 WHERE id = ?`,
        [restoreStatus, user.id, now, id],
      );
      if (restoreStatus === 'CREATED' || restoreStatus === 'REAUDIT') {
        await this.writeback.apply(form, id, 'save');
      }
    } else if (op === 'delete') {
      if (meta.options?.sod?.deleteByCreatorOnly && h.creator_id && Number(h.creator_id) !== user.id) {
        throw new BizError(ErrorCodes.BIZ_SOD_VIOLATION, '只有制单人可以删除本单据');
      }
      const down = await this.link.validDownstream(form, id);
      if (down.length > 0) {
        throw new BizError(ErrorCodes.BIZ_HAS_DOWNSTREAM, `存在下游单据：${down.map((d) => d.billNo).join('、')}，不能删除`);
      }
      if (h.cancel_status === 'A') {
        await this.writeback.reverse(form, id, 'save');
      }
      await this.link.removeForTarget(form, id);
      await this.db.exec('DELETE FROM sys_bill_event_state WHERE form = ? AND bill_id = ?', [form, id]);
      await this.store.deleteBill(form, id);
    } else if (op === 'forbid') {
      await this.db.exec(
        `UPDATE ${ident(meta.table)} SET forbid_status = 'B', modifier_id = ?, modified_at = ?, version = version + 1 WHERE id = ?`,
        [user.id, now, id],
      );
    } else if (op === 'unforbid') {
      await this.db.exec(
        `UPDATE ${ident(meta.table)} SET forbid_status = 'A', modifier_id = ?, modified_at = ?, version = version + 1 WHERE id = ?`,
        [user.id, now, id],
      );
    }

    if (op !== 'delete') {
      ctx.header = await this.store.mustHeader(form, id);
      if (op === 'submit') await reg.hooks.afterSubmit?.(ctx);
      else if (op === 'audit') await reg.hooks.afterAudit?.(ctx);
      else if (op === 'unaudit') await reg.hooks.afterUnaudit?.(ctx);
      else if (op === 'cancel') await reg.hooks.afterCancel?.(ctx);
      else if (op === 'uncancel') await reg.hooks.afterUncancel?.(ctx);
      else if (op === 'close' || op === 'unclose') await reg.hooks.afterClose?.(ctx);
      await reg.hooks.afterOp?.(op, ctx);
    } else {
      await reg.hooks.afterDelete?.(ctx);
      await reg.hooks.afterOp?.(op, ctx);
    }

    await this.oplog.log({
      objectCode: form,
      subsystem: meta.subsystem,
      op: def.name,
      billId: id,
      billNo: h.bill_no,
    });
  }

  /**
   * 执行自定义业务事件或撤销事件。
   */
  async runEvent(
    form: string,
    h: Row,
    ev: { def: BillEventDef; undo: boolean },
    params: OpParams = {},
    opts: { internal?: boolean } = {},
  ): Promise<void> {
    const user = currentUser() ?? SYSTEM_USER;
    const reg = this.registry.get(form);
    const meta = reg.meta;
    const def = ev.def;

    if (!opts.internal) {
      await this.perm.assert(user, form, def.perm ?? 'execute', meta.name);
    }

    const fromStatus = def.fromStatus ?? ['AUDITED'];
    if (!fromStatus.includes(h.status) || h.cancel_status !== 'A') {
      const evName = ev.undo ? def.undo?.name ?? `撤销${def.name}` : def.name;
      throw new BizError(ErrorCodes.BIZ_STATE_NOT_ALLOWED, `当前状态不能执行「${evName}」`);
    }

    let targetEntryIds: number[] = [];

    if (def.level === 'entry') {
      const allEntries = await this.store.entries(form, h.id);
      const allEntryMap = new Map(allEntries.map((e) => [Number(e.id), e]));

      let candidateEntries: Row[];
      if (params.entryIds && params.entryIds.length > 0) {
        for (const eid of params.entryIds) {
          if (!allEntryMap.has(Number(eid))) {
            throw new BizError(ErrorCodes.SYS_VALIDATION, '分录不属于本单据');
          }
        }
        candidateEntries = params.entryIds.map((eid) => allEntryMap.get(Number(eid))!);
        if (def.rowFilter) {
          for (const ce of candidateEntries) {
            const ok = compileExpr(def.rowFilter).evalBool({ ...ce, entry: ce, head: h });
            if (!ok) {
              throw new BizError(ErrorCodes.BIZ_ROW_STATE, `第${ce.line_no}行不满足执行条件`);
            }
          }
        }
      } else {
        candidateEntries = allEntries;
        if (def.rowFilter) {
          candidateEntries = candidateEntries.filter((ce) =>
            compileExpr(def.rowFilter!).evalBool({ ...ce, entry: ce, head: h }),
          );
        }
      }

      const executedRows = await this.db.q<{ entry_id: number }>(
        'SELECT entry_id FROM sys_bill_event_state WHERE form = ? AND bill_id = ? AND event = ?',
        [form, h.id, def.code],
      );
      const executedSet = new Set(executedRows.map((r) => Number(r.entry_id)));

      let targets: Row[];
      if (!ev.undo) {
        if (params.entryIds && params.entryIds.length > 0) {
          for (const ce of candidateEntries) {
            if (executedSet.has(Number(ce.id))) {
              throw new BizError(ErrorCodes.BIZ_ROW_STATE, `第${ce.line_no}行已经${def.name}`);
            }
          }
        }
        targets = candidateEntries.filter((ce) => !executedSet.has(Number(ce.id)));
      } else {
        if (params.entryIds && params.entryIds.length > 0) {
          for (const ce of candidateEntries) {
            if (!executedSet.has(Number(ce.id))) {
              throw new BizError(ErrorCodes.BIZ_ROW_STATE, `第${ce.line_no}行尚未${def.name}`);
            }
          }
        }
        targets = candidateEntries.filter((ce) => executedSet.has(Number(ce.id)));
      }

      if (targets.length === 0) {
        throw new BizError(ErrorCodes.BIZ_ROW_STATE, '没有可处理的分录');
      }
      targetEntryIds = targets.map((t) => Number(t.id));
    } else {
      const stateRow = await this.db.one(
        'SELECT 1 FROM sys_bill_event_state WHERE form = ? AND bill_id = ? AND entry_id = 0 AND event = ?',
        [form, h.id, def.code],
      );
      if (!ev.undo) {
        if (stateRow) throw new BizError(ErrorCodes.BIZ_STATE_NOT_ALLOWED, `已经${def.name}`);
      } else {
        if (!stateRow) throw new BizError(ErrorCodes.BIZ_STATE_NOT_ALLOWED, `尚未${def.name}`);
      }
      const allEntries = await this.store.entries(form, h.id);
      targetEntryIds = allEntries.map((e) => Number(e.id));
    }

    const currentOp = ev.undo ? def.undo?.code ?? `undo_${def.code}` : def.code;
    const ctx: BillHookContext = {
      form,
      billId: h.id,
      header: h,
      entries: await this.store.entries(form, h.id),
      user,
      db: this.db,
      op: currentOp,
      entryIds: targetEntryIds,
      extra: params,
    };

    await reg.hooks.beforeOp?.(currentOp, ctx);

    if (!ev.undo) {
      if (def.handler) await def.handler(ctx);
      await this.writeback.apply(form, h.id, def.code, {
        entryIds: def.level === 'entry' ? targetEntryIds : undefined,
      });

      if (def.level === 'entry') {
        for (const eid of targetEntryIds) {
          await this.db.exec(
            'INSERT INTO sys_bill_event_state (id, form, bill_id, entry_id, event, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW(3))',
            [nextId(), form, h.id, eid, def.code, user.id],
          );
        }
      } else {
        await this.db.exec(
          'INSERT INTO sys_bill_event_state (id, form, bill_id, entry_id, event, user_id, created_at) VALUES (?, ?, ?, 0, ?, ?, NOW(3))',
          [nextId(), form, h.id, def.code, user.id],
        );
      }
    } else {
      if (def.undoHandler) await def.undoHandler(ctx);
      await this.writeback.reverse(form, h.id, def.code, {
        entryIds: def.level === 'entry' ? targetEntryIds : undefined,
      });

      if (def.level === 'entry') {
        await this.db.exec(
          `DELETE FROM sys_bill_event_state WHERE form = ? AND bill_id = ? AND event = ? AND entry_id IN (${targetEntryIds.map(() => '?').join(',')})`,
          [form, h.id, def.code, ...targetEntryIds],
        );
      } else {
        await this.db.exec(
          'DELETE FROM sys_bill_event_state WHERE form = ? AND bill_id = ? AND event = ? AND entry_id = 0',
          [form, h.id, def.code],
        );
      }
    }

    await this.db.exec(
      `UPDATE ${ident(meta.table)} SET modifier_id = ?, modified_at = ?, version = version + 1 WHERE id = ?`,
      [user.id, nowStr(), h.id],
    );

    ctx.header = await this.store.mustHeader(form, h.id);
    await reg.hooks.afterOp?.(currentOp, ctx);

    const opName = ev.undo ? def.undo?.name ?? `撤销${def.name}` : def.name;
    await this.oplog.log({
      objectCode: form,
      subsystem: meta.subsystem,
      op: opName,
      billId: h.id,
      billNo: h.bill_no,
    });
  }

  /**
   * 执行行级业务状态流转或“执行至/反执行至”。
   */
  async runRow(
    form: string,
    h: Row,
    op: string,
    params: OpParams = {},
    opts: { internal?: boolean } = {},
  ): Promise<void> {
    const user = currentUser() ?? SYSTEM_USER;
    const reg = this.registry.get(form);
    const meta = reg.meta;
    const sm = reg.sm;

    if (!sm.rowStatus) {
      throw new BizError(ErrorCodes.BIZ_STATE_NOT_ALLOWED, '未配置行状态机');
    }
    if (h.status !== 'AUDITED' || h.cancel_status !== 'A' || h.close_status !== 'A') {
      throw new BizError(ErrorCodes.BIZ_STATE_NOT_ALLOWED, '单据未处于已审核正常状态，不允许执行行操作');
    }

    const rs = sm.rowStatus;
    const candidateIds =
      params.entryIds && params.entryIds.length > 0
        ? params.entryIds.map(Number)
        : (await this.store.entries(form, h.id)).map((e) => Number(e.id));

    if (candidateIds.length === 0) {
      throw new BizError(ErrorCodes.BIZ_ROW_STATE, '没有可处理的分录');
    }

    const lockedRows = await this.store.entriesByIds(form, candidateIds, { forUpdate: true });
    for (const r of lockedRows) {
      if (Number(r.bill_id) !== Number(h.id)) {
        throw new BizError(ErrorCodes.SYS_VALIDATION, '分录不属于本单据');
      }
    }

    const target = params.target as string;
    if (op === 'exec_to' && (!target || !rs.states.some((s) => s.code === target))) {
      throw new BizError(ErrorCodes.SYS_VALIDATION, '目标行状态无效');
    }

    // 逐行求取流转路径并执行
    for (const row of lockedRows) {
      const cur = (row[rs.field] as string) ?? rs.initial;
      let path: RowTransition[] = [];

      if (op === 'exec_to') {
        if (cur === target) continue;
        const curIdx = rs.states.findIndex((s) => s.code === cur);
        const tgtIdx = rs.states.findIndex((s) => s.code === target);
        const dir: 'forward' | 'backward' = tgtIdx > curIdx ? 'forward' : 'backward';

        // BFS 搜索流转路径
        const queue: [string, RowTransition[]][] = [[cur, []]];
        const visited = new Set<string>([cur]);
        let foundPath: RowTransition[] | null = null;

        while (queue.length > 0) {
          const [currSt, curPath] = queue.shift()!;
          if (currSt === target) {
            foundPath = curPath;
            break;
          }
          for (const t of rs.transitions) {
            if (t.direction === dir && t.from.includes(currSt) && !visited.has(t.to)) {
              if (t.to !== target && t.jumpable === false) continue;
              visited.add(t.to);
              queue.push([t.to, [...curPath, t]]);
            }
          }
        }

        if (!foundPath || foundPath.length === 0) {
          const curName = rs.states.find((s) => s.code === cur)?.name ?? cur;
          const tgtName = rs.states.find((s) => s.code === target)?.name ?? target;
          throw new BizError(
            ErrorCodes.BIZ_ROW_STATE,
            `第${row.line_no}行不能从「${curName}」${dir === 'forward' ? '执行' : '反执行'}到「${tgtName}」`,
          );
        }
        path = foundPath;
      } else {
        const t = rs.transitions.find((tr) => tr.op === op && tr.from.includes(cur));
        if (!t) {
          const curName = rs.states.find((s) => s.code === cur)?.name ?? cur;
          const opDef = rs.transitions.find((tr) => tr.op === op);
          const opName = opDef?.name ?? op;
          throw new BizError(ErrorCodes.BIZ_ROW_STATE, `第${row.line_no}行当前状态「${curName}」不能${opName}`);
        }
        path = [t];
      }

      const ctx: BillHookContext = {
        form,
        billId: h.id,
        header: h,
        entries: lockedRows,
        user,
        db: this.db,
        op,
        entryIds: [Number(row.id)],
        extra: params,
      };

      for (const step of path) {
        if (!opts.internal) {
          await this.perm.assert(user, form, step.perm ?? 'execute', meta.name);
        }
        if (step.hook && reg.hooks.rowGuards?.[step.hook]) {
          await reg.hooks.rowGuards[step.hook](row, ctx);
        }
        if (step.event) {
          const eventMatch = this.registry.findEvent(form, step.event);
          if (eventMatch) {
            await this.runEvent(form, h, eventMatch, { entryIds: [Number(row.id)] }, { ...opts, internal: true });
          }
        }
        await this.db.exec(
          `UPDATE ${ident(meta.entry!.table)} SET ${ident(rs.field)} = ? WHERE id = ?`,
          [step.to, row.id],
        );
        row[rs.field] = step.to;
      }
    }

    await this.db.exec(
      `UPDATE ${ident(meta.table)} SET modifier_id = ?, modified_at = ?, version = version + 1 WHERE id = ?`,
      [user.id, nowStr(), h.id],
    );

    const fullCtx: BillHookContext = {
      form,
      billId: h.id,
      header: await this.store.mustHeader(form, h.id),
      entries: lockedRows,
      user,
      db: this.db,
      op,
      entryIds: candidateIds,
      extra: params,
    };
    await reg.hooks.afterOp?.(op, fullCtx);

    let opTitle = op;
    if (op === 'exec_to') {
      const tgtName = rs.states.find((s) => s.code === target)?.name ?? target;
      opTitle = `执行至${tgtName}`;
    } else {
      const tDef = rs.transitions.find((t) => t.op === op);
      if (tDef) opTitle = tDef.name;
    }

    await this.oplog.log({
      objectCode: form,
      subsystem: meta.subsystem,
      op: opTitle,
      billId: h.id,
      billNo: h.bill_no,
    });
  }
}
