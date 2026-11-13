import { BillMeta } from '@erp3d/shared';

/**
 * 采购订单元数据定义样例。
 */
export const SCM_PUR_ORDER_META: BillMeta = {
  form: 'scm_pur_order',
  name: '采购订单',
  subsystem: 'scm',
  kind: 'bill',
  table: 'scm_pur_order',
  numbering: {
    prefix: 'CGDD',
    dateFormat: 'YYYYMMDD',
    seqLength: 5,
  },
  header: [
    { key: 'supplier_id', name: '供应商', type: 'ref', ref: 'md_supplier', required: true },
    { key: 'purchaser_id', name: '采购员', type: 'ref', ref: 'sys_employee' },
    { key: 'currency_id', name: '币别', type: 'ref', ref: 'md_currency' },
    { key: 'rate', name: '汇率', type: 'rate', default: 1 },
    { key: 'pricelist_id', name: '价目表', type: 'ref', ref: 'md_price_list' },
    { key: 'tax_incl', name: '含税', type: 'bool', default: true },
    { key: 'amount', name: '金额', type: 'amount', readonly: true },
    { key: 'change_flag', name: '变更标识', type: 'bool' },
    { key: 'revision', name: '版本号', type: 'int', default: 0 },
  ],
  entry: {
    key: 'entry',
    name: '物料分录',
    table: 'scm_pur_order_entry',
    fields: [
      { key: 'deliver_date', name: '交货日期', type: 'date' },
      { key: 'price', name: '单价', type: 'price' },
      { key: 'tax_price', name: '含税单价', type: 'price' },
      { key: 'discount', name: '折扣率', type: 'rate' },
      { key: 'tax_rate', name: '税率', type: 'rate' },
      { key: 'amount', name: '金额', type: 'amount' },
      { key: 'is_gift', name: '赠品', type: 'bool' },
      { key: 'mfr', name: '品牌/厂家', type: 'string', length: 100 },
      { key: 'mpn', name: '原厂型号', type: 'string', length: 100 },
      { key: 'rcv_qty', name: '收货数量', type: 'qty', readonly: true },
      { key: 'in_qty', name: '入库数量', type: 'qty', readonly: true },
      { key: 'ret_qty', name: '退货数量', type: 'qty', readonly: true },
    ],
    children: [
      {
        key: 'plan',
        name: '交货计划',
        table: 'scm_pur_order_plan',
        fields: [
          { key: 'date', name: '交期', type: 'date', required: true },
          { key: 'qty', name: '交货数量', type: 'qty', required: true },
          { key: 'delivered_qty', name: '已交数量', type: 'qty', readonly: true },
        ],
      },
    ],
  },
};
