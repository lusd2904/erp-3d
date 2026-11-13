import { ConvertRuleConfig, WritebackRuleConfig } from '@erp3d/shared';

/**
 * 采购申请单下推采购订单转换规则。
 */
export const RULE_PUR_REQ_TO_ORDER: ConvertRuleConfig = {
  code: 'scm_pur_req-scm_pur_order',
  name: '采购申请单下推采购订单',
  srcForm: 'scm_pur_req',
  tgtForm: 'scm_pur_order',
  srcQtyField: 'approve_qty',
  srcLinkField: 'link_qty',
  header: [
    { tgt: 'supplier_id', src: 'entry.sugg_supplier_id' },
    { tgt: 'purchaser_id', src: 'head.applicant_id' },
  ],
  entry: [
    { tgt: 'deliver_date', src: 'entry.arrive_date' },
  ],
  groupBy: ['head.id', 'entry.sugg_supplier_id'],
};

/**
 * 采购订单保存反写申请单关联占用数量。
 */
export const WB_PUR_REQ_LINK_QTY: WritebackRuleConfig = {
  code: 'wb_pur_req_link_qty',
  name: '采购订单保存反写申请关联数量',
  srcForm: 'scm_pur_req',
  tgtForm: 'scm_pur_order',
  convertRule: 'scm_pur_req-scm_pur_order',
  srcField: 'link_qty',
  onEvent: 'save',
  mode: 'add',
  overCtrl: 'FORBID',
  overExpr: 'approve_qty',
  overMsg: '关联数量超过批准数量',
};

/**
 * 采购订单审核反写申请单已订数量，并支持整单自动业务关闭。
 */
export const WB_PUR_REQ_ORDER_QTY: WritebackRuleConfig = {
  code: 'wb_pur_req_order_qty',
  name: '采购订单审核反写申请订单数量',
  srcForm: 'scm_pur_req',
  tgtForm: 'scm_pur_order',
  convertRule: 'scm_pur_req-scm_pur_order',
  srcField: 'order_qty',
  onEvent: 'audit',
  mode: 'add',
  overCtrl: 'FORBID',
  overExpr: 'approve_qty',
  closeExpr: 'order_qty >= approve_qty',
  closeScope: 'ALL',
};

/**
 * 采购订单审核扣减申请单剩余数量。
 */
export const WB_PUR_REQ_REMAIN_QTY: WritebackRuleConfig = {
  code: 'wb_pur_req_remain_qty',
  name: '采购订单审核扣减申请剩余数量',
  srcForm: 'scm_pur_req',
  tgtForm: 'scm_pur_order',
  convertRule: 'scm_pur_req-scm_pur_order',
  srcField: 'remain_qty',
  onEvent: 'audit',
  mode: 'sub',
  overCtrl: 'ALLOW',
};
