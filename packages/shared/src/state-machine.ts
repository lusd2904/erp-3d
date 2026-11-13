import type { BillStatusCode } from './status';

/**
 * L1 单据状态机配置（存 sys_state_machine.config_json）。
 * 默认配置 STD 见 apps/api/src/bill-engine/state/std-state-machine.ts；业务单据一般直接用 STD，
 * 需要业务状态（行级）时复制 STD 并加 rowStatus。
 */
export interface OpDef {
  name: string;
  /** 允许的单据状态；'*' 表示任意 */
  from: BillStatusCode[] | '*';
  /** 操作后的单据状态；不填表示不改 status */
  to?: BillStatusCode;
  /** 权限项代码（sys_perm_item） */
  perm: string;
  /** 前置：关闭维度必须是该值（A 未关闭 / B 已关闭） */
  requireClose?: 'A' | 'B';
  /** 前置：作废维度必须是该值 */
  requireCancel?: 'A' | 'B';
  /** 前置：禁用维度必须是该值（基础资料） */
  requireForbid?: 'A' | 'B';
  setClose?: 'A' | 'B';
  setCancel?: 'A' | 'B';
  setForbid?: 'A' | 'B';
  /** 是否写上机操作日志，默认 true */
  log?: boolean;
  /** 前置条件表达式（变量：单据头字段），为假时报 BIZ_STATE_NOT_ALLOWED */
  condition?: string;
  conditionMsg?: string;
}

export interface FieldLockRule {
  /** 该状态下可编辑的头字段：'*' 全部、[] 全部锁定、或字段列表 */
  header: '*' | string[];
  entry: '*' | string[];
}

export interface RowTransition {
  op: string; // 如 'release'
  name: string; // 下达
  from: string[];
  to: string;
  direction: 'forward' | 'backward'; // 执行至 / 反执行至 时按方向找路径
  perm?: string; // 默认 'execute'
  /** 业务钩子名（BillHooks.rowGuards[hook]），在状态变更前执行，可抛错拦截 */
  hook?: string;
  /** 允许“执行至/反执行至”自动经过这一步（默认 true） */
  jumpable?: boolean;
  /** 经过这一步时对该分录触发的自定义业务事件（或撤销事件）代码，见 BillEventDef。[人工修正 反重力] WP02 扩展 */
  event?: string;
}

export interface RowStatusConfig {
  entity: 'entry';
  field: string; // 行业务状态列，如 'biz_status'
  initial: string;
  states: { code: string; name: string }[]; // 按正向顺序
  transitions: RowTransition[];
}

export interface StateMachineConfig {
  code: string;
  name: string;
  ops: Record<string, OpDef>;
  /** 按单据状态的字段锁定 */
  fieldLock: Partial<Record<BillStatusCode, FieldLockRule>>;
  rowStatus?: RowStatusConfig;
}
