/** SM-01 通用单据状态（头表 status 列） */
export const BillStatus = {
  DRAFT: 'DRAFT', // 暂存
  CREATED: 'CREATED', // 创建
  AUDITING: 'AUDITING', // 审核中
  AUDITED: 'AUDITED', // 已审核
  REAUDIT: 'REAUDIT', // 重新审核
} as const;
export type BillStatusCode = (typeof BillStatus)[keyof typeof BillStatus];

export const BillStatusName: Record<BillStatusCode, string> = {
  DRAFT: '暂存',
  CREATED: '创建',
  AUDITING: '审核中',
  AUDITED: '已审核',
  REAUDIT: '重新审核',
};

/** 关闭维度（头 close_status；行 biz_close）A=正常 B=已关闭 */
export const CloseStatus = { OPEN: 'A', CLOSED: 'B' } as const;
/** 作废维度（cancel_status）A=未作废 B=已作废 */
export const CancelStatus = { NORMAL: 'A', CANCELLED: 'B' } as const;
/** 禁用维度（基础资料 forbid_status）A=启用 B=禁用 */
export const ForbidStatus = { ENABLED: 'A', FORBIDDEN: 'B' } as const;

/** 通用操作代码（接口 /bills/{form}/{id}/ops/{op}） */
export const BillOps = {
  SAVE: 'save',
  SUBMIT: 'submit',
  UNSUBMIT: 'unsubmit', // 撤销
  AUDIT: 'audit',
  UNAUDIT: 'unaudit',
  CLOSE: 'close',
  UNCLOSE: 'unclose',
  CANCEL: 'cancel', // 作废
  UNCANCEL: 'uncancel', // 反作废
  DELETE: 'delete',
  FORBID: 'forbid',
  UNFORBID: 'unforbid',
  REJECT: 'reject', // 审批驳回到发起人（L2 内部调用，不对外开放）
} as const;
export type BillOpCode = (typeof BillOps)[keyof typeof BillOps] | string;

/** 权限项（sys_perm_item.code） */
export const PermItems = {
  VIEW: 'view',
  NEW: 'new',
  EDIT: 'edit',
  DELETE: 'delete',
  SUBMIT: 'submit',
  AUDIT: 'audit',
  UNAUDIT: 'unaudit',
  CLOSE: 'close',
  CANCEL: 'cancel',
  FORBID: 'forbid',
  IMPORT: 'import',
  EXPORT: 'export',
  PRINT: 'print',
  ATTACHMENT: 'attachment',
  PUSH: 'push',
  EXECUTE: 'execute', // 行执行 / 反执行（业务状态）
  ADMIN: 'admin', // 平台管理类对象的维护权
} as const;
export type PermItemCode = (typeof PermItems)[keyof typeof PermItems] | string;
