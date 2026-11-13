import { BillMeta } from '@erp3d/shared';

/**
 * 采购申请单元数据定义样例。
 */
export const SCM_PUR_REQ_META: BillMeta = {
  form: 'scm_pur_req',
  name: '采购申请单',
  subsystem: 'scm',
  kind: 'bill',
  table: 'scm_pur_req',
  numbering: {
    prefix: 'CGSQ',
    dateFormat: 'YYYYMMDD',
    seqLength: 5,
  },
  options: {
    forbidUnauditWithDownstream: true,
  },
  header: [
    { key: 'apply_dept_id', name: '申请部门', type: 'ref', ref: 'sys_dept' },
    { key: 'applicant_id', name: '申请人', type: 'ref', ref: 'sys_employee' },
    { key: 'pur_org_id', name: '采购组织', type: 'ref', ref: 'sys_org' },
  ],
  entry: {
    key: 'entry',
    name: '物料分录',
    table: 'scm_pur_req_entry',
    fields: [
      { key: 'apply_qty', name: '申请数量', type: 'qty', required: true },
      { key: 'approve_qty', name: '批准数量', type: 'qty', required: true },
      { key: 'arrive_date', name: '到货日期', type: 'date' },
      { key: 'sugg_supplier_id', name: '建议供应商', type: 'ref', ref: 'md_supplier' },
      { key: 'link_qty', name: '关联数量', type: 'qty', readonly: true },
      { key: 'order_qty', name: '订单数量', type: 'qty', readonly: true },
      { key: 'remain_qty', name: '剩余数量', type: 'qty', readonly: true },
    ],
  },
};
