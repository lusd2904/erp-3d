/**
 * 单据元数据 schema。每张单据（或基础资料）只写：元数据 + 状态机配置（可用默认 STD）+ 业务钩子。
 * 公共列由框架自动加，不要在 header/entry 里重复声明（见 HEADER_COMMON_COLUMNS / ENTRY_COMMON_COLUMNS）。
 * 详见 docs/平台开发约定.md 第 3 节。
 */
export type FieldType =
  | 'string' // VARCHAR(length, 默认 100)
  | 'text' // TEXT
  | 'int' // INT
  | 'bigint' // BIGINT（外键 id 用 ref）
  | 'decimal' // DECIMAL(23,10)
  | 'qty' // 数量 DECIMAL(23,10)
  | 'price' // 单价 DECIMAL(23,10)
  | 'amount' // 金额 DECIMAL(23,10)
  | 'rate' // 比率/百分比 DECIMAL(23,10)
  | 'date' // DATE
  | 'datetime' // DATETIME(3)
  | 'bool' // TINYINT(1)
  | 'ref' // BIGINT，引用另一个业务对象（F8），ref 必填
  | 'enum' // VARCHAR(20)，enum 必填
  | 'json'; // JSON

export interface FieldMeta {
  key: string; // 列名（snake_case），同时是接口字段名
  name: string; // 中文名
  type: FieldType;
  length?: number;
  required?: boolean; // 保存时必录（暂存不校验）
  unique?: boolean; // 表头：同组织内唯一（保存时校验）
  index?: boolean; // 建普通索引
  default?: string | number | boolean | null;
  ref?: string; // 引用对象代码，如 'md_material'、'sys_user'、'sys_dept'
  enum?: { value: string; label: string }[];
  sensitive?: boolean; // 敏感字段（单价/金额/成本），字段权限默认管控对象
  readonly?: boolean; // 系统维护字段（反写数量、审核人等）：接口写入一律忽略
  comment?: string;
}

export interface EntityMeta {
  key: string; // 'entry' 或子分录 key
  name: string;
  table: string; // 物理表名，约定 <头表>_entry
  fields: FieldMeta[];
  /** 业务状态列（行级状态机，见 StateMachineConfig.rowStatus），框架自动建列 */
  rowStatusField?: string;
  children?: EntityMeta[]; // 子分录（每个子分录行挂在一条分录下：entry_id）
}

export interface SodOptions {
  auditorNotCreator?: boolean; // 审核人 ≠ 创建人
  unauditBySameAuditor?: boolean; // 反审核人 = 审核人
  editByCreatorOnly?: boolean; // 修改人 = 创建人
  deleteByCreatorOnly?: boolean; // 删除人 = 创建人
}

export interface BillOptions {
  autoSubmitAfterSave?: boolean; // 保存后自动提交
  autoAuditAfterSubmit?: boolean; // 提交后自动审核（仅当没有挂审批流时）
  sod?: SodOptions;
  /** 有下游有效单据时禁止反审核（默认 true，SM-01） */
  forbidUnauditWithDownstream?: boolean;
  /** 是否加财务预留列（G4 总表），默认 false */
  financeReserved?: boolean;
}

export interface NumberingSeed {
  prefix: string; // 例如 'CGSQ'
  dateFormat?: 'YYYYMMDD' | 'YYMMDD' | 'YYYYMM' | 'YYMM' | '';
  seqLength?: number; // 默认 5
}

export interface BillMeta {
  form: string; // 业务对象代码 = 头表名，如 'scm_pur_req'
  name: string; // 中文名
  subsystem: string; // 子系统：scm / prd / sub / qm / sfc / eqp / md / sys …
  kind: 'bill' | 'basedata';
  table: string; // 头表名（一般 = form）
  header: FieldMeta[];
  entry?: EntityMeta; // 主分录（一期每张单据一个主分录，可带子分录）
  stateMachine?: string; // sys_state_machine.code，不填用 'STD'
  numbering?: NumberingSeed; // 编码规则种子（迁移时写入 sys_coding_rule）
  options?: BillOptions;
}

/** 头表公共列（框架自动建，技术方案 3.1） */
export const HEADER_COMMON_COLUMNS = [
  'id', 'org_id', 'bill_no', 'bill_type_id', 'bill_date', 'biz_date', 'status', 'close_status', 'cancel_status',
  'forbid_status', 'wf_instance_id', 'creator_id', 'created_at', 'modifier_id', 'modified_at', 'auditor_id',
  'audited_at', 'closer_id', 'closed_at', 'canceller_id', 'cancelled_at', 'cancel_prev_status', 'remark',
  'src_system', 'version',
] as const;

/** 行表公共列 */
export const ENTRY_COMMON_COLUMNS = [
  'id', 'bill_id', 'line_no', 'material_id', 'aux_prop_id', 'unit_id', 'qty', 'base_unit_id', 'base_qty', 'lot_no',
  'mto_no', 'src_form', 'src_bill_id', 'src_entry_id', 'src_rule', 'biz_close', 'biz_freeze', 'biz_terminate',
] as const;

/** 子分录公共列 */
export const CHILD_COMMON_COLUMNS = ['id', 'bill_id', 'entry_id', 'seq'] as const;

/** 财务预留列（options.financeReserved = true 时加到头表） */
export const FINANCE_RESERVED_COLUMNS = [
  'acct_org_id', 'currency_id', 'owner_type', 'owner_id', 'settle_org_id', 'cost_center_id', 'stock_category_id',
  'io_direction', 'ar_ap_generated', 'budget_org_id',
] as const;

/** 前端用：单据详情接口返回的结构 */
export interface BillView {
  form: string;
  header: Record<string, unknown>;
  /** 主分录行；子分录挂在行的 row[<子分录 key>] 数组上（T02，WP02 确认） */
  entries: Record<string, unknown>[];
  allowedOps: string[];
  lockedFields: { header: string[] | '*'; entry: string[] | '*' };
  lock?: { userId: number; userName?: string; lockedAt: string } | null;
  wf?: { instanceId: number; status: string; currentNodes: string[] } | null;
}
