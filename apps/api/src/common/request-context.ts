import { AsyncLocalStorage } from 'async_hooks';

export interface AuthUser {
  id: number;
  account: string;
  name: string;
  orgId: number;
  deptId: number | null;
  employeeId: number | null;
  isSuper: boolean;
  roleIds: number[];
}

export interface ReqCtx {
  traceId: string;
  ip?: string;
  user?: AuthUser;
}

export const reqCtx = new AsyncLocalStorage<ReqCtx>();
export const currentCtx = () => reqCtx.getStore();
export const currentUser = () => reqCtx.getStore()?.user;
export const currentTraceId = () => reqCtx.getStore()?.traceId ?? '';

/** 系统内部调用（定时任务、迁移、测试）用的身份 */
export const SYSTEM_USER: AuthUser = {
  id: 0, account: 'system', name: '系统', orgId: 1, deptId: null, employeeId: null, isSuper: true, roleIds: [],
};
