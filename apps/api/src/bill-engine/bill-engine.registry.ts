import { Injectable } from '@nestjs/common';
import { ConvertRuleConfig, ErrorCodes, validateExpr, WritebackRuleConfig } from '@erp3d/shared';
import { DbService } from '../db/db.service';
import { ensureBillTables, upsert } from '../db/ddl';
import { nextId } from '../db/snowflake';
import { BizError } from '../common/biz-error';
import { BillEventDef, RegisterBillOptions, RegisteredBill, WorkflowBridge } from './engine.types';
import { STD_STATE_MACHINE } from './state/std-state-machine';

/**
 * 单据引擎注册表：管理所有业务单据元数据、状态机、钩子、下推规则与反写规则
 */
@Injectable()
export class BillEngineRegistry {
  private readonly bills = new Map<string, RegisteredBill>();
  private readonly disabledRules = new Set<string>();
  private bridge: WorkflowBridge | null = null;

  constructor(private readonly db: DbService) {}

  /**
   * 注册业务单据
   */
  registerBill(opts: RegisterBillOptions): void {
    const meta = opts.meta;
    if (!meta || !meta.form) {
      throw new Error('注册单据失败：缺少元数据或 form 为空');
    }

    const form = meta.form;
    const sm = opts.stateMachine ?? STD_STATE_MACHINE;
    const converts = opts.converts ?? [];
    const writebacks = opts.writebacks ?? [];
    const events = opts.events ?? [];

    // 校验下推转换规则与反写规则所属单据
    for (const c of converts) {
      if (c.srcForm !== form) {
        throw new Error(`单据 ${form} 转换规则 ${c.code} 的 srcForm (${c.srcForm}) 与单据 form 不符`);
      }
    }
    for (const w of writebacks) {
      if (w.tgtForm !== form) {
        throw new Error(`单据 ${form} 反写规则 ${w.code} 的 tgtForm (${w.tgtForm}) 与单据 form 不符`);
      }
    }

    // 校验状态机条件表达式
    for (const [opCode, opDef] of Object.entries(sm.ops)) {
      if (opDef.condition) {
        const err = validateExpr(opDef.condition);
        if (err) {
          throw new Error(`单据 ${form} 规则 ${opCode} 表达式错误：${err}`);
        }
      }
    }

    // 校验下推转换规则表达式
    for (const c of converts) {
      if (c.filterExpr) {
        const err = validateExpr(c.filterExpr);
        if (err) {
          throw new Error(`单据 ${form} 规则 ${c.code} 表达式错误：${err}`);
        }
      }
      for (const item of [...(c.header ?? []), ...(c.entry ?? [])]) {
        if (item.expr) {
          const err = validateExpr(item.expr);
          if (err) {
            throw new Error(`单据 ${form} 规则 ${c.code} 表达式错误：${err}`);
          }
        }
      }
    }

    // 校验反写规则表达式
    for (const w of writebacks) {
      if (w.tgtValue) {
        const err = validateExpr(w.tgtValue);
        if (err) {
          throw new Error(`单据 ${form} 规则 ${w.code} 表达式错误：${err}`);
        }
      }
      if (w.overExpr) {
        const err = validateExpr(w.overExpr);
        if (err) {
          throw new Error(`单据 ${form} 规则 ${w.code} 表达式错误：${err}`);
        }
      }
      if (w.closeExpr) {
        const err = validateExpr(w.closeExpr);
        if (err) {
          throw new Error(`单据 ${form} 规则 ${w.code} 表达式错误：${err}`);
        }
      }
    }

    // 校验自定义事件分录过滤表达式
    for (const ev of events) {
      if (ev.rowFilter) {
        const err = validateExpr(ev.rowFilter);
        if (err) {
          throw new Error(`单据 ${form} 规则 ${ev.code} 表达式错误：${err}`);
        }
      }
    }

    const reg: RegisteredBill = {
      meta,
      sm,
      hooks: opts.hooks ?? {},
      converts,
      writebacks,
      events,
    };

    // 同 form 覆盖注册
    this.bills.set(form, reg);
  }

  has(form: string): boolean {
    return this.bills.has(form);
  }

  get(form: string): RegisteredBill {
    const reg = this.bills.get(form);
    if (!reg) {
      throw new BizError(ErrorCodes.BIZ_UNKNOWN_FORM, `未知单据：${form}`);
    }
    return reg;
  }

  forms(): string[] {
    return Array.from(this.bills.keys());
  }

  /**
   * 根据规则编码获取生效的下推转换规则
   */
  getConvert(code: string): ConvertRuleConfig {
    if (this.disabledRules.has(code)) {
      throw new BizError(ErrorCodes.BIZ_CONVERT_RULE, `转换规则 ${code} 已停用`);
    }
    for (const reg of this.bills.values()) {
      for (const c of reg.converts) {
        if (c.code === code) {
          if (c.status === 'DISABLED') {
            throw new BizError(ErrorCodes.BIZ_CONVERT_RULE, `转换规则 ${code} 已停用`);
          }
          return c;
        }
      }
    }
    throw new BizError(ErrorCodes.BIZ_CONVERT_RULE, `转换规则不存在：${code}`);
  }

  /**
   * 获取以指定单据为源单的所有有效下推规则
   */
  convertsFrom(form: string): ConvertRuleConfig[] {
    if (!this.bills.has(form)) return [];
    const reg = this.bills.get(form)!;
    return reg.converts.filter((c) => c.status !== 'DISABLED' && !this.disabledRules.has(c.code));
  }

  /**
   * 获取指定目标单据在某时机触发的有效反写规则
   */
  writebacksFor(tgtForm: string, event: string): WritebackRuleConfig[] {
    const reg = this.get(tgtForm);
    return reg.writebacks.filter(
      (w) => w.onEvent === event && w.status !== 'DISABLED' && !this.disabledRules.has(w.code),
    );
  }

  /**
   * 按编码查找反写规则
   */
  writebackByCode(code: string): WritebackRuleConfig | undefined {
    for (const reg of this.bills.values()) {
      for (const w of reg.writebacks) {
        if (w.code === code) {
          return w;
        }
      }
    }
    return undefined;
  }

  /**
   * 查找业务事件定义（支持正向事件及撤销事件）
   */
  findEvent(form: string, code: string): { def: BillEventDef; undo: boolean } | null {
    const reg = this.bills.get(form);
    if (!reg) return null;
    for (const def of reg.events) {
      if (def.code === code) {
        return { def, undo: false };
      }
      if (def.undo && def.undo.code === code) {
        return { def, undo: true };
      }
    }
    return null;
  }

  setWorkflowBridge(b: WorkflowBridge): void {
    this.bridge = b;
  }

  workflowBridge(): WorkflowBridge | null {
    return this.bridge;
  }

  /**
   * 保证单据相关物理表存在
   */
  async ensureTables(form: string): Promise<void> {
    const reg = this.get(form);
    const qr = this.db.ds.createQueryRunner();
    await qr.connect();
    try {
      await ensureBillTables(qr, reg.meta);
    } finally {
      await qr.release();
    }
  }

  /**
   * 从数据库刷新停用规则集合
   */
  async refreshRuleStatus(): Promise<void> {
    try {
      const rows = await this.db.q<{ code: string }>(
        `SELECT code FROM sys_convert_rule WHERE status = 'DISABLED' UNION SELECT code FROM sys_writeback_rule WHERE status = 'DISABLED'`,
      );
      this.disabledRules.clear();
      for (const r of rows) {
        this.disabledRules.add(r.code);
      }
    } catch {
      // 数据库表未就绪时容错
      this.disabledRules.clear();
    }
  }

  /**
   * 将单据元数据、状态机、规则及默认编码配置同步持久化至系统表
   */
  async syncToDb(form?: string): Promise<void> {
    const targetForms = form ? [form] : this.forms();
    const qr = this.db.ds.createQueryRunner();
    await qr.connect();
    try {
      for (const f of targetForms) {
        const reg = this.get(f);
        const { meta, sm, converts, writebacks } = reg;

        // 1. 同步业务对象元数据
        const permItems =
          meta.kind === 'bill'
            ? 'view,new,edit,delete,submit,audit,unaudit,close,cancel,push,execute,attachment,print,export'
            : 'view,new,edit,delete,forbid,attachment,print,export';

        await upsert(
          qr,
          'sys_biz_object',
          [
            {
              id: nextId(),
              code: f,
              name: meta.name,
              subsystem: meta.subsystem,
              kind: meta.kind,
              form_meta_json: meta,
              perm_items: permItems,
            },
          ],
          ['name', 'subsystem', 'kind', 'form_meta_json', 'perm_items'],
        );

        // 2. 同步状态机配置
        const smCode = sm.code === 'STD' ? 'STD' : sm.code;
        await upsert(
          qr,
          'sys_state_machine',
          [
            {
              id: nextId(),
              code: smCode,
              name: sm.name,
              object_code: sm.code === 'STD' ? null : f,
              version: 1,
              config_json: sm,
            },
          ],
          ['name', 'config_json'],
        );

        // 3. 同步下推转换规则
        for (const rule of converts) {
          await upsert(
            qr,
            'sys_convert_rule',
            [
              {
                id: nextId(),
                code: rule.code,
                name: rule.name,
                src_form: rule.srcForm,
                tgt_form: rule.tgtForm,
                config_json: rule,
                status: rule.status ?? 'NORMAL',
              },
            ],
            ['name', 'src_form', 'tgt_form', 'config_json'],
          );
        }

        // 4. 同步反写规则
        for (const rule of writebacks) {
          await upsert(
            qr,
            'sys_writeback_rule',
            [
              {
                id: nextId(),
                code: rule.code,
                name: rule.name,
                src_form: rule.srcForm,
                tgt_form: rule.tgtForm,
                on_event: rule.onEvent,
                config_json: rule,
                status: rule.status ?? 'NORMAL',
              },
            ],
            ['name', 'src_form', 'tgt_form', 'on_event', 'config_json'],
          );
        }

        // 5. 初始化单据默认编码规则（仅 kind === 'bill'）
        if (meta.kind === 'bill') {
          const existing = await qr.query('SELECT 1 FROM sys_coding_rule WHERE object_code = ? LIMIT 1', [f]);
          if (!existing || existing.length === 0) {
            const numbering = meta.numbering;
            const prefixVal = numbering?.prefix ?? f.toUpperCase().replace(/_/g, '');
            const segments: any[] = [{ type: 'const', value: prefixVal }];
            if (numbering?.dateFormat !== '') {
              segments.push({ type: 'date', format: numbering?.dateFormat ?? 'YYYYMMDD' });
            }
            segments.push({ type: 'seq', length: numbering?.seqLength ?? 5, reset: 'DAILY' });

            await upsert(
              qr,
              'sys_coding_rule',
              [
                {
                  id: nextId(),
                  code: f + '_default',
                  object_code: f,
                  name: meta.name + '编码',
                  segments_json: segments,
                  is_default: 1,
                },
              ],
              ['name', 'segments_json', 'is_default'],
            );
          }
        }
      }

      await this.refreshRuleStatus();
    } finally {
      await qr.release();
    }
  }
}
