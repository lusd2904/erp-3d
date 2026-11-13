import { ErrorCodes, RowError } from '@erp3d/shared';

/** 业务异常：throw new BizError('BIZ_xxx', '中文提示', { errors, data }) */
export class BizError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly extra: { errors?: RowError[]; data?: unknown } = {},
  ) {
    super(message);
  }
}

export const notFound = (what: string) => new BizError(ErrorCodes.SYS_NOT_FOUND, `${what}不存在`);
export const denied = (msg = '没有权限') => new BizError(ErrorCodes.PERM_DENIED, msg);
