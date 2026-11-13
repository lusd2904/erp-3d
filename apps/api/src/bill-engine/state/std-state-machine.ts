import type { StateMachineConfig } from '@erp3d/shared';

/**
 * 通用单据状态机（STD）：遵循平台开发约定 §5.2
 */
export const STD_STATE_MACHINE: StateMachineConfig = {
  code: 'STD',
  name: '通用单据状态机',
  ops: {
    submit: {
      name: '提交',
      from: ['DRAFT', 'CREATED', 'REAUDIT'],
      to: 'AUDITING',
      perm: 'submit',
      requireClose: 'A',
      requireCancel: 'A',
    },
    unsubmit: {
      name: '撤销',
      from: ['AUDITING'],
      to: 'REAUDIT',
      perm: 'submit',
      requireCancel: 'A',
    },
    audit: {
      name: '审核',
      from: ['AUDITING'],
      to: 'AUDITED',
      perm: 'audit',
      requireClose: 'A',
      requireCancel: 'A',
    },
    unaudit: {
      name: '反审核',
      from: ['AUDITED'],
      to: 'REAUDIT',
      perm: 'unaudit',
      requireClose: 'A',
      requireCancel: 'A',
    },
    close: {
      name: '关闭',
      from: ['AUDITED'],
      perm: 'close',
      requireClose: 'A',
      setClose: 'B',
    },
    unclose: {
      name: '反关闭',
      from: ['AUDITED'],
      perm: 'close',
      requireClose: 'B',
      setClose: 'A',
    },
    cancel: {
      name: '作废',
      from: ['CREATED', 'REAUDIT'],
      perm: 'cancel',
      requireCancel: 'A',
      setCancel: 'B',
    },
    uncancel: {
      name: '反作废',
      from: '*',
      perm: 'cancel',
      requireCancel: 'B',
      setCancel: 'A',
    },
    delete: {
      name: '删除',
      from: ['DRAFT', 'CREATED', 'REAUDIT'],
      perm: 'delete',
    },
    forbid: {
      name: '禁用',
      from: '*',
      perm: 'forbid',
      requireForbid: 'A',
      setForbid: 'B',
    },
    unforbid: {
      name: '反禁用',
      from: '*',
      perm: 'forbid',
      requireForbid: 'B',
      setForbid: 'A',
    },
    reject: {
      name: '审批驳回',
      from: ['AUDITING'],
      to: 'REAUDIT',
      perm: 'audit',
    },
  },
  fieldLock: {
    DRAFT: { header: '*', entry: '*' },
    CREATED: { header: '*', entry: '*' },
    REAUDIT: { header: '*', entry: '*' },
    AUDITING: { header: [], entry: [] },
    AUDITED: { header: [], entry: [] },
  },
};

/** 内部专用操作，不对外开放 */
export const INTERNAL_OPS = new Set<string>(['reject']);

/** 基础资料专用操作，普通单据 allowedOps 不包含 */
export const BASEDATA_ONLY_OPS = new Set<string>(['forbid', 'unforbid']);
