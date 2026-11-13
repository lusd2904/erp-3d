// @ts-ignore - 待后续实现
import { authHandlers } from './auth';
// @ts-ignore - 待后续实现
import { homeHandlers } from './home';
// @ts-ignore - 待后续实现
import { billHandlers } from './bill';

export const handlers = [
  ...((authHandlers as any[]) || []),
  ...((homeHandlers as any[]) || []),
  ...((billHandlers as any[]) || []),
];
