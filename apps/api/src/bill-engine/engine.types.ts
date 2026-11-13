import type { BillMeta, StateMachineConfig, ConvertRuleConfig, WritebackRuleConfig, BillStatusCode } from '@erp3d/shared';
import type { DbService } from '../db/db.service';
import type { AuthUser } from '../common/request-context';

export type Row = Record<string, any>;

export interface BillHookContext {
  form: string;
  billId: number;
  header: Row;          // 可在 beforeSave 中修改，保存时按修改后的值写库（含 readonly 字段）
  entries: Row[];       // 主分录行，子分录在 row[childKey]
  user: AuthUser;
  db: DbService;        // 当前事务
  op?: string;          // 当前操作代码
  entryIds?: number[];  // 分录级事件 / 行操作涉及的分录
  extra?: Record<string, unknown>; // 操作请求体里的其他参数
}

export interface BillHooks {
  beforeSave?: (ctx: BillHookContext, mode: 'draft' | 'save') => Promise<void>;
  afterSave?: (ctx: BillHookContext, mode: 'draft' | 'save') => Promise<void>;
  beforeSubmit?: (ctx: BillHookContext) => Promise<void>;
  afterSubmit?: (ctx: BillHookContext) => Promise<void>;
  beforeAudit?: (ctx: BillHookContext) => Promise<void>;
  afterAudit?: (ctx: BillHookContext) => Promise<void>;
  beforeUnaudit?: (ctx: BillHookContext) => Promise<void>;
  afterUnaudit?: (ctx: BillHookContext) => Promise<void>;
  beforeCancel?: (ctx: BillHookContext) => Promise<void>;
  afterCancel?: (ctx: BillHookContext) => Promise<void>;
  beforeUncancel?: (ctx: BillHookContext) => Promise<void>;
  afterUncancel?: (ctx: BillHookContext) => Promise<void>;
  beforeClose?: (ctx: BillHookContext) => Promise<void>;
  afterClose?: (ctx: BillHookContext) => Promise<void>;
  beforeDelete?: (ctx: BillHookContext) => Promise<void>;
  afterDelete?: (ctx: BillHookContext) => Promise<void>;
  /** 所有操作（含自定义事件、行操作）通用前后钩子，在专用钩子之前/之后调用 */
  beforeOp?: (op: string, ctx: BillHookContext) => Promise<void>;
  afterOp?: (op: string, ctx: BillHookContext) => Promise<void>;
  /** 行状态流转守卫：RowTransition.hook 指向这里的 key；抛 BizError 即拦截 */
  rowGuards?: Record<string, (entry: Row, ctx: BillHookContext) => Promise<void>>;
}

/** 自定义业务事件（如质检完成 inspect_complete / 撤销 inspect_cancel） */
export interface BillEventDef {
  code: string;
  name: string;
  /** 撤销事件：执行时把本事件产生的反写按 sys_writeback_log 冲回 */
  undo?: { code: string; name: string };
  /** bill：整单一次；entry：按分录执行（请求带 entryIds，不带则全部可执行分录） */
  level: 'bill' | 'entry';
  /** 允许的单据头状态，默认 ['AUDITED'] */
  fromStatus?: BillStatusCode[];
  /** 权限项，默认 'execute' */
  perm?: string;
  /** 分录过滤表达式（变量：分录字段 + head.*），为假的分录不能执行该事件 */
  rowFilter?: string;
  /** 事件处理：在反写之前执行（同一事务），可修改本单数据；ctx.entryIds 为本次涉及分录 */
  handler?: (ctx: BillHookContext) => Promise<void>;
  /** 撤销处理：在冲回反写之前执行（同一事务） */
  undoHandler?: (ctx: BillHookContext) => Promise<void>;
}

export interface RegisterBillOptions {
  meta: BillMeta;
  stateMachine?: StateMachineConfig;   // 不提供用 STD
  hooks?: BillHooks;
  converts?: ConvertRuleConfig[];      // 以本单为源的转换规则（srcForm 必须 = meta.form）
  writebacks?: WritebackRuleConfig[];  // 由本单触发的反写规则（tgtForm 必须 = meta.form）
  events?: BillEventDef[];
}

export interface RegisteredBill {
  meta: BillMeta;
  sm: StateMachineConfig;
  hooks: BillHooks;
  converts: ConvertRuleConfig[];
  writebacks: WritebackRuleConfig[];
  events: BillEventDef[];
}

/** 审批流桥（WP03 注册）。未注册时 submit 不启动流程 */
export interface WorkflowBridge {
  onSubmit(ctx: BillHookContext): Promise<'started' | 'none'>;
  onUnsubmit?(ctx: BillHookContext): Promise<void>;
}

export interface OpParams {
  version?: number;
  entryIds?: number[];
  target?: string;     // exec_to 目标行状态
  [k: string]: unknown;
}

export interface BillDraft {
  header: Row;
  entries: Row[];
}
