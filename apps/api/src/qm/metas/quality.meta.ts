import type { BillMeta, FieldMeta } from '@erp3d/shared';

const decisionFields: FieldMeta[] = [
  { key: 'decision', name: '使用决策', type: 'enum', required: true, enum: [
    { value: 'ACCEPT', label: '接收' }, { value: 'CONCESSION', label: '让步接收' },
    { value: 'RETURN', label: '判退' }, { value: 'NG', label: '不良' }, { value: 'REWORK', label: '返修' },
    { value: 'REPAIR', label: '返工' }, { value: 'SCRAP', label: '报废' }, { value: 'SORT', label: '挑选全检' },
    { value: 'HOLD', label: '保留' }, { value: 'WORK_SCRAP', label: '工废' }, { value: 'MATERIAL_SCRAP', label: '料废' },
  ] },
  { key: 'qty', name: '决策数量', type: 'qty', required: true },
  { key: 'base_qty', name: '基本单位数量', type: 'qty', required: true },
  { key: 'defect_handle', name: '不良处理', type: 'bool', default: false },
  { key: 'saleable', name: '不良可销售', type: 'bool', default: false },
  { key: 'judge_return', name: '判退', type: 'bool', default: false },
  { key: 'remark', name: '备注', type: 'string', length: 256 },
];

export const QM_INSPECT_META: BillMeta = {
  form: 'qm_inspect',
  name: '检验单',
  subsystem: 'qm',
  kind: 'bill',
  table: 'qm_inspect',
  numbering: { prefix: 'JYD', dateFormat: 'YYYYMMDD', seqLength: 5 },
  options: { forbidUnauditWithDownstream: true },
  header: [
    { key: 'biz_type', name: '检验业务类型', type: 'enum', required: true, enum: [
      { value: 'IQC_PUR', label: '来料' }, { value: 'IQC_SUB', label: '委外来料' }, { value: 'PRODUCT', label: '产品' },
      { value: 'IPQC_END', label: '自制工序' }, { value: 'FIRST', label: '首检' }, { value: 'OQC_SHIP', label: '发货' },
      { value: 'RETURN', label: '退货' }, { value: 'STOCK', label: '库存' },
    ] },
    { key: 'src_org_id', name: '来源组织', type: 'ref', ref: 'sys_org' },
    { key: 'qc_org_id', name: '质检组织', type: 'ref', ref: 'sys_org' },
    { key: 'qc_dept_id', name: '质检部门', type: 'ref', ref: 'sys_dept' },
    { key: 'inspector_id', name: '质检员', type: 'ref', ref: 'sys_employee' },
    { key: 'convert_bill_id', name: '库存状态转换单', type: 'bigint', readonly: true },
  ],
  entry: {
    key: 'entry', name: '检验分录', table: 'qm_inspect_entry', rowStatusField: 'qc_status',
    fields: [
      { key: 'inspect_qty', name: '检验数量', type: 'qty', required: true },
      { key: 'ok_qty', name: '接收数量', type: 'qty', readonly: true },
      { key: 'ng_qty', name: '不合格数量', type: 'qty', readonly: true },
      { key: 'concession_qty', name: '让步接收数量', type: 'qty', readonly: true },
      { key: 'reject_judge_qty', name: '判退数量', type: 'qty', readonly: true },
      { key: 'scheme_id', name: '质检方案', type: 'ref', ref: 'qm_inspect_scheme' },
      { key: 'warehouse_id', name: '仓库', type: 'ref', ref: 'md_warehouse' },
      { key: 'location_id', name: '仓位', type: 'ref', ref: 'md_location' },
      { key: 'stock_status_id', name: '当前库存状态', type: 'ref', ref: 'scm_stock_status' },
      { key: 'supplier_id', name: '供应商', type: 'ref', ref: 'md_supplier' },
      { key: 'customer_id', name: '客户', type: 'ref', ref: 'md_customer' },
      { key: 'inspect_times', name: '检验次数', type: 'int', default: 1 },
      { key: 'first_inspect_flag', name: '首检标记', type: 'bool', default: false },
      { key: 'result', name: '检验结果', type: 'enum', enum: [
        { value: 'PASS', label: '合格' }, { value: 'FAIL', label: '不合格' }, { value: 'HOLD', label: '保留' },
      ] },
    ],
    children: [
      { key: 'decisions', name: '使用决策', table: 'qm_inspect_decision', fields: decisionFields },
      { key: 'samples', name: '抽样记录', table: 'qm_inspect_sample', fields: [
        { key: 'plan_id', name: '抽样方案', type: 'ref', ref: 'qm_sampling_plan' },
        { key: 'level', name: '检验水平', type: 'string', length: 8 },
        { key: 'strictness', name: '严格度', type: 'enum', enum: [
          { value: 'NORMAL', label: '正常' }, { value: 'TIGHTENED', label: '加严' }, { value: 'REDUCED', label: '放宽' },
        ] },
        { key: 'aql', name: 'AQL', type: 'decimal' },
        { key: 'sample_qty', name: '样本量', type: 'qty' },
        { key: 'ac', name: '允收数 Ac', type: 'int' },
        { key: 're', name: '拒收数 Re', type: 'int' },
        { key: 'sample_ng_qty', name: '样本不合格数', type: 'qty' },
      ] },
      { key: 'defects', name: '缺陷记录', table: 'qm_inspect_defect', fields: [
        { key: 'defect_type_id', name: '缺陷类型', type: 'ref', ref: 'qm_defect_type', required: true },
        { key: 'qty', name: '缺陷数量', type: 'qty', required: true },
        { key: 'reason_id', name: '缺陷原因', type: 'ref', ref: 'qm_defect_reason' },
        { key: 'grade', name: '缺陷等级', type: 'string', length: 20 },
        { key: 'consequence', name: '缺陷后果', type: 'string', length: 256 },
      ] },
    ],
  },
};

export const QM_STOCK_REQ_META: BillMeta = {
  form: 'qm_stock_req', name: '库存请检单', subsystem: 'qm', kind: 'bill', table: 'qm_stock_req',
  numbering: { prefix: 'KCQJ', dateFormat: 'YYYYMMDD', seqLength: 5 }, options: { forbidUnauditWithDownstream: true },
  header: [
    { key: 'biz_type', name: '请检类型', type: 'enum', required: true, enum: [{ value: 'STOCK', label: '库存' }, { value: 'SHIP', label: '发货' }] },
    { key: 'src_form', name: '来源单据', type: 'string', length: 50 },
    { key: 'src_bill_id', name: '来源单据编号', type: 'bigint' },
    { key: 'convert_bill_id', name: '冻结转换单', type: 'bigint', readonly: true },
  ],
  entry: { key: 'entry', name: '请检分录', table: 'qm_stock_req_entry', fields: [
    { key: 'warehouse_id', name: '仓库', type: 'ref', ref: 'md_warehouse', required: true },
    { key: 'location_id', name: '仓位', type: 'ref', ref: 'md_location' },
    { key: 'stock_status_id', name: '库存状态', type: 'ref', ref: 'scm_stock_status', required: true },
    { key: 'prod_date', name: '生产日期', type: 'date' },
    { key: 'exp_date', name: '有效期至', type: 'date' },
    { key: 'frozen', name: 'D46 冻结已完成', type: 'bool', default: false, readonly: true },
    { key: 'frozen_convert_entry_id', name: '冻结转换分录', type: 'bigint', readonly: true },
  ] },
};

export const QM_DEFECT_HANDLE_META: BillMeta = {
  form: 'qm_defect_handle', name: '不良品处理单', subsystem: 'qm', kind: 'bill', table: 'qm_defect_handle',
  numbering: { prefix: 'BLCL', dateFormat: 'YYYYMMDD', seqLength: 5 }, options: { forbidUnauditWithDownstream: true },
  header: [
    { key: 'handle_status', name: '处理状态', type: 'enum', default: 'IN_PROGRESS', readonly: true, enum: [
      { value: 'IN_PROGRESS', label: '进行中' }, { value: 'COMPLETED', label: '已完成' },
    ] },
    { key: 'auto_convert_stock', name: '审核后自动生成 D46', type: 'bool', default: false },
    { key: 'convert_bill_id', name: '库存转换单', type: 'bigint', readonly: true },
  ],
  entry: { key: 'entry', name: '不良处理分录', table: 'qm_defect_handle_entry', fields: [
    { key: 'src_inspect_entry_id', name: '来源检验分录', type: 'bigint', required: true },
    { key: 'inspect_biz_type', name: '检验业务类型', type: 'string', length: 20, required: true },
    { key: 'handle', name: '处理方式', type: 'enum', required: true, enum: [
      { value: 'ACCEPT', label: '接收' }, { value: 'CONCESSION', label: '让步接收' }, { value: 'RETURN', label: '判退' },
      { value: 'NG', label: '不良' }, { value: 'SCRAP', label: '报废' }, { value: 'REWORK', label: '返修' }, { value: 'REPAIR', label: '返工' },
    ] },
    { key: 'handle_status', name: '处理状态', type: 'enum', default: 'IN_PROGRESS', readonly: true, enum: [
      { value: 'IN_PROGRESS', label: '进行中' }, { value: 'COMPLETED', label: '已完成' },
    ] },
    { key: 'discount_amount', name: '折让金额', type: 'amount' },
  ] },
};

export const QM_BILL_METAS = [QM_INSPECT_META, QM_STOCK_REQ_META, QM_DEFECT_HANDLE_META];
