/**
 * 统一错误码。返回体 { code, msg, data, traceId }，成功 code = 'OK'。
 * 规则：SYS_ 系统/基础设施；AUTH_ 登录鉴权；PERM_ 权限；BIZ_ 业务校验（单据引擎和各业务模块）；WF_ 审批流。
 * 业务模块新增错误码：在自己模块里用 `BIZ_<模块>_<含义>`（例如 BIZ_PRD_MO_NOT_RELEASED），
 * 不必改本文件；通用的才加到这里。HTTP 状态码见 httpStatusOf。
 */
export const ErrorCodes = {
  OK: 'OK',
  SYS_INTERNAL: 'SYS_INTERNAL',
  SYS_VALIDATION: 'SYS_VALIDATION',
  SYS_NOT_FOUND: 'SYS_NOT_FOUND',
  SYS_IDEMPOTENT_REPLAY: 'SYS_IDEMPOTENT_REPLAY',
  SYS_IDEMPOTENT_IN_PROGRESS: 'SYS_IDEMPOTENT_IN_PROGRESS',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
  AUTH_BAD_CREDENTIALS: 'AUTH_BAD_CREDENTIALS',
  AUTH_LOCKED: 'AUTH_LOCKED',
  AUTH_DISABLED: 'AUTH_DISABLED',
  AUTH_MUST_CHANGE_PWD: 'AUTH_MUST_CHANGE_PWD',
  AUTH_WEAK_PASSWORD: 'AUTH_WEAK_PASSWORD',
  PERM_DENIED: 'PERM_DENIED',
  PERM_FIELD_READONLY: 'PERM_FIELD_READONLY',
  PERM_DATA_SCOPE: 'PERM_DATA_SCOPE',
  BIZ_BILL_NOT_FOUND: 'BIZ_BILL_NOT_FOUND',
  BIZ_UNKNOWN_FORM: 'BIZ_UNKNOWN_FORM',
  BIZ_REQUIRED: 'BIZ_REQUIRED',
  BIZ_FIELD_INVALID: 'BIZ_FIELD_INVALID',
  BIZ_DUPLICATE: 'BIZ_DUPLICATE',
  BIZ_STATE_NOT_ALLOWED: 'BIZ_STATE_NOT_ALLOWED',
  BIZ_FIELD_LOCKED: 'BIZ_FIELD_LOCKED',
  BIZ_VERSION_CONFLICT: 'BIZ_VERSION_CONFLICT',
  BIZ_BILL_LOCKED: 'BIZ_BILL_LOCKED',
  BIZ_SOD_VIOLATION: 'BIZ_SOD_VIOLATION',
  BIZ_HAS_DOWNSTREAM: 'BIZ_HAS_DOWNSTREAM',
  BIZ_OVER_LIMIT: 'BIZ_OVER_LIMIT',
  BIZ_CONVERT_NONE: 'BIZ_CONVERT_NONE',
  BIZ_CONVERT_RULE: 'BIZ_CONVERT_RULE',
  BIZ_SRC_NOT_AVAILABLE: 'BIZ_SRC_NOT_AVAILABLE',
  BIZ_ROW_STATE: 'BIZ_ROW_STATE',
  BIZ_CODING: 'BIZ_CODING',
  BIZ_WF_REQUIRED: 'BIZ_WF_REQUIRED',
  WF_DEF_INVALID: 'WF_DEF_INVALID',
  WF_NO_TEMPLATE: 'WF_NO_TEMPLATE',
  WF_TASK_NOT_FOUND: 'WF_TASK_NOT_FOUND',
  WF_TASK_NOT_YOURS: 'WF_TASK_NOT_YOURS',
  WF_TASK_DONE: 'WF_TASK_DONE',
  WF_ACTION_NOT_ALLOWED: 'WF_ACTION_NOT_ALLOWED',
  WF_WITHDRAW_NOT_ALLOWED: 'WF_WITHDRAW_NOT_ALLOWED',
  WF_NO_ASSIGNEE: 'WF_NO_ASSIGNEE',
  WF_NO_ROUTE: 'WF_NO_ROUTE',
} as const;
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes] | `BIZ_${string}`;

export function httpStatusOf(code: string): number {
  if (code === 'OK') return 200;
  if (code === 'SYS_NOT_FOUND' || code === 'BIZ_BILL_NOT_FOUND' || code === 'WF_TASK_NOT_FOUND' || code === 'BIZ_UNKNOWN_FORM') return 404;
  if (code.startsWith('AUTH_')) return code === 'AUTH_MUST_CHANGE_PWD' ? 403 : 401;
  if (code.startsWith('PERM_')) return 403;
  if (code === 'BIZ_VERSION_CONFLICT' || code === 'BIZ_BILL_LOCKED' || code === 'SYS_IDEMPOTENT_IN_PROGRESS') return 409;
  if (code === 'SYS_INTERNAL') return 500;
  return 400; // SYS_VALIDATION / BIZ_* / WF_*
}

/** 逐行错误（单据保存校验、批量操作） */
export interface RowError {
  entity?: string; // 'header' | 'entry' | 子分录 key
  row?: number; // 行号（line_no），表头为空
  field?: string;
  msg: string;
}

export interface ApiResult<T = unknown> {
  code: string;
  msg: string;
  data: T;
  traceId: string;
  errors?: RowError[];
}

export interface BatchResult {
  results: { id: number; ok: boolean; code?: string; msg?: string }[];
}
