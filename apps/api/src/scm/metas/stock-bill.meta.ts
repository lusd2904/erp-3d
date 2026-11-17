import type { BillMeta, FieldMeta } from '@erp3d/shared';
import { STD_STATE_MACHINE } from '../../bill-engine/state/std-state-machine';

const stockEntryFields: FieldMeta[] = [
  { key: 'group_no', name: '转换分组', type: 'string', length: 32 },
  { key: 'convert_type', name: '转换类型', type: 'enum', enum: [{ value: 'BEFORE', label: '转换前' }, { value: 'AFTER', label: '转换后' }] },
  { key: 'warehouse_id', name: '仓库', type: 'ref', ref: 'md_warehouse' },
  { key: 'location_id', name: '仓位', type: 'ref', ref: 'md_location' },
  { key: 'stock_status_id', name: '库存状态', type: 'ref', ref: 'md_stock_status' },
  { key: 'prod_date', name: '生产日期', type: 'date' },
  { key: 'exp_date', name: '有效期至', type: 'date' },
  { key: 'owner_type', name: '货主类型', type: 'string', length: 20 },
  { key: 'owner_id', name: '货主', type: 'bigint' },
  { key: 'keeper_type', name: '保管者类型', type: 'string', length: 20 },
  { key: 'keeper_id', name: '保管者', type: 'bigint' },
  { key: 'out_warehouse_id', name: '调出仓库', type: 'ref', ref: 'md_warehouse' },
  { key: 'out_location_id', name: '调出仓位', type: 'ref', ref: 'md_location' },
  { key: 'out_owner_id', name: '调出货主', type: 'bigint' },
  { key: 'in_warehouse_id', name: '调入仓库', type: 'ref', ref: 'md_warehouse' },
  { key: 'in_location_id', name: '调入仓位', type: 'ref', ref: 'md_location' },
  { key: 'in_owner_id', name: '调入货主', type: 'bigint' },
  { key: 'bom_id', name: 'BOM 版本', type: 'bigint' },
];

function stockBill(form: string, name: string, prefix: string, header: FieldMeta[] = [], fields = stockEntryFields): BillMeta {
  return {
    form,
    name,
    subsystem: 'scm',
    kind: 'bill',
    table: form,
    numbering: { prefix, dateFormat: 'YYYYMMDD', seqLength: 5 },
    options: { forbidUnauditWithDownstream: true },
    header,
    entry: { key: 'entry', name: '库存分录', table: `${form}_entry`, fields },
  };
}

export const SCM_INIT_STOCK_META = stockBill('scm_init_stock', '初始库存', 'QCKC');
export const SCM_OTHER_IN_META = stockBill('scm_other_in', '其他入库单', 'QTRK', [
  { key: 'reason', name: '入库原因', type: 'string', length: 100 },
]);
export const SCM_OTHER_OUT_META = stockBill('scm_other_out', '其他出库单', 'QTYK', [
  { key: 'reason', name: '出库原因', type: 'string', length: 100 },
]);
export const SCM_TRANSFER_META = stockBill('scm_transfer', '直接调拨单', 'ZJDB', [
  { key: 'transfer_type', name: '调拨类型', type: 'enum', enum: [{ value: 'DIRECT', label: '直接调拨' }] },
]);
export const SCM_STATUS_CONVERT_META = stockBill('scm_status_convert', '库存状态转换单', 'KCZH', [
  { key: 'biz_type', name: '业务类型', type: 'enum', enum: [{ value: 'STD', label: '标准转换' }, { value: 'INSPECT', label: '检验转换' }] },
]);
export const SCM_LOT_ADJUST_META = stockBill('scm_lot_adjust', '批号调整单', 'PHZT');
export const SCM_COUNT_GAIN_META = stockBill('scm_count_gain', '盘盈单', 'PYD');
export const SCM_COUNT_LOSS_META = stockBill('scm_count_loss', '盘亏单', 'PKD');

export const BC_SPLIT_META: BillMeta = {
  form: 'bc_split', name: '条码拆分单', subsystem: 'scm', kind: 'bill', table: 'bc_split',
  numbering: { prefix: 'TMS', dateFormat: 'YYYYMMDD', seqLength: 5 },
  options: { forbidUnauditWithDownstream: true },
  header: [{ key: 'parent_barcode', name: '主条码', type: 'string', length: 128, required: true }],
  entry: { key: 'entry', name: '子条码数量', table: 'bc_split_entry', fields: [
    { key: 'child_qty', name: '子码数量', type: 'qty', required: true },
    { key: 'child_base_qty', name: '子码基本数量', type: 'qty', required: true },
    { key: 'child_barcode', name: '子条码', type: 'string', length: 128, readonly: true },
  ] },
};

export const BC_MSL_RECORD_META: BillMeta = {
  form: 'bc_msl_record', name: 'MSL 开封烘烤记录', subsystem: 'scm', kind: 'bill', table: 'bc_msl_record',
  numbering: { prefix: 'MSL', dateFormat: 'YYYYMMDD', seqLength: 5 },
  options: { forbidUnauditWithDownstream: true },
  header: [],
  entry: { key: 'entry', name: 'MSL 事件', table: 'bc_msl_record_entry', fields: [
    { key: 'barcode', name: '卷盘条码', type: 'string', length: 128, required: true },
    { key: 'event', name: 'MSL 事件', type: 'enum', required: true, enum: [
      { value: 'OPEN', label: '开封' }, { value: 'BACK_TO_CABINET', label: '回干燥柜' },
      { value: 'BAKE_START', label: '烘烤开始' }, { value: 'BAKE_FINISH', label: '烘烤完成' },
    ] },
    { key: 'temp', name: '烘烤温度', type: 'decimal' },
    { key: 'hours', name: '烘烤时长', type: 'decimal' },
    { key: 'prior_state_json', name: '反审核快照', type: 'json', readonly: true },
    { key: 'convert_bill_id', name: 'D46 转换单', type: 'bigint', readonly: true },
  ] },
};

const { unaudit: _unaudit, ...noUnauditOps } = STD_STATE_MACHINE.ops;
export const NO_UNAUDIT_STATE_MACHINE = {
  ...STD_STATE_MACHINE,
  code: 'STD_NO_UNAUDIT',
  name: '库存盘盈盘亏单状态机',
  ops: noUnauditOps,
};

export const STOCK_BILL_METAS = [
  SCM_INIT_STOCK_META,
  SCM_OTHER_IN_META,
  SCM_OTHER_OUT_META,
  SCM_TRANSFER_META,
  SCM_STATUS_CONVERT_META,
  SCM_LOT_ADJUST_META,
  SCM_COUNT_GAIN_META,
  SCM_COUNT_LOSS_META,
  BC_SPLIT_META,
  BC_MSL_RECORD_META,
];
