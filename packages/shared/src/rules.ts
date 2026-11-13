/**
 * L4 转换规则与反写规则（存 sys_convert_rule / sys_writeback_rule.config_json）。详见 docs/平台开发约定.md 第 6 节。
 */
export interface FieldMapItem {
  tgt: string; // 目标字段
  src?: string; // 直取源字段（可写 head.x / entry.x / x：先找分录再找表头）
  expr?: string; // 公式（变量 head.* entry.* avail）
  const?: string | number | boolean | null;
  /** 表头字段从多条源分录汇总时的方式，默认 first */
  agg?: 'first' | 'sum' | 'max' | 'min' | 'concat';
}

export interface ConvertRuleConfig {
  code: string; // 如 'scm_pur_req-scm_pur_order'
  name: string;
  srcForm: string;
  tgtForm: string;
  /** 源单头状态要求，默认 ['AUDITED'] */
  srcStatus?: string[];
  /** 源分录“基数”字段（可转数量 = 基数 − 已关联），如 approve_qty / base_qty */
  srcQtyField: string;
  /** 源分录已关联数量字段（保存时反写的那个），不填则不控可转数量（例如报价→订单） */
  srcLinkField?: string;
  /** 目标分录数量字段，默认 'qty'；同时写 base_qty */
  tgtQtyField?: string;
  /** 源单据类型 → 目标单据类型代码 */
  billTypeMap?: Record<string, string>;
  /** 允许的源单据类型代码（L3 简版路线控制），空 = 不限 */
  allowSrcBillTypes?: string[];
  header: FieldMapItem[];
  entry: FieldMapItem[];
  /** 合单分组字段（源变量名，如 'head.supplier_id'、'entry.owner_id'）；默认 ['head.id']（一张源单一张目标单） */
  groupBy?: string[];
  /** 源分录过滤（为真才可下推），变量 head.* entry.* avail */
  filterExpr?: string;
  filterMsg?: string;
  status?: 'DRAFT' | 'NORMAL' | 'DISABLED';
  /** L3：源单审核后自动下推并保存（一期“审核后自动下推”参数） */
  autoPushOnAudit?: boolean;
}

export type OverCtrl = 'FORBID' | 'ONCE' | 'ALLOW';

export interface WritebackRuleConfig {
  code: string;
  name: string;
  srcForm: string; // 被反写的上游单据
  tgtForm: string; // 触发反写的下游单据
  /** 只处理由该转换规则生成的关联（可选） */
  convertRule?: string;
  /** 上游分录被反写的列 */
  srcField: string;
  /** 下游分录取值：字段名或公式（变量为下游分录字段），默认 'base_qty' */
  tgtValue?: string;
  /**
   * 下游 save：保存（非暂存、未作废、存在）即生效；audit：已审核（含已关闭）才生效；
   * 其他字符串 = 下游单据注册的自定义业务事件代码（BillEventDef.code，如 'inspect_complete'），
   * 事件执行时反写、对应撤销事件（如 'inspect_cancel'）执行时按 sys_writeback_log 冲回。[人工修正 反重力] WP02 扩展
   */
  onEvent: 'save' | 'audit' | (string & {});
  /** add 累加 / sub 扣减 / overwrite 覆盖（回滚时恢复原值） */
  mode: 'add' | 'sub' | 'overwrite';
  /** 超额控制：FORBID 禁止超额 / ONCE 允许超额一次（反写前未超、反写后可超）/ ALLOW 允许 */
  overCtrl: OverCtrl;
  /** 上限公式（变量为上游分录字段，可用 head.*），默认取转换规则的 srcQtyField；如 'qty * 1.2'、'issueLimit(over_ctrl, must_qty, std_qty, scrap_rate, min_issue_qty)' */
  overExpr?: string;
  overMsg?: string;
  /** 上游行自动业务关闭条件（变量为上游分录字段），如 'order_qty >= approve_qty * 0.98' */
  closeExpr?: string;
  /** 整单关闭：ALL 全部行关闭时关闭表头 / ANY 任一行 / NONE 不处理表头（默认 NONE） */
  closeScope?: 'ALL' | 'ANY' | 'NONE';
  status?: 'DRAFT' | 'NORMAL' | 'DISABLED';
}

/** 下推请求 */
export interface PushRequest {
  rule: string;
  /** 源分录与本次数量（不填数量 = 全部可转数量） */
  entries: { entryId: number; qty?: string | number }[];
  /** true：直接保存目标单（mode=save）；默认只返回草稿 */
  save?: boolean;
  /** 目标单据类型（可选） */
  billTypeId?: number;
}
