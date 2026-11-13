import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { httpStatusOf } from '@erp3d/shared';
import { DbService } from '../db/db.service';
import { nextId } from '../db/snowflake';
import { currentCtx, currentTraceId } from './request-context';
import { BizError } from './biz-error';

@Injectable()
export class ApiLogInterceptor implements NestInterceptor {
  constructor(private db: DbService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now();
    const req = context.switchToHttp().getRequest();
    const method = String(req.method || 'GET').toUpperCase();
    const path = String(req.originalUrl || req.url || '').slice(0, 300);

    return next.handle().pipe(
      tap({
        next: (val) => {
          const costMs = Date.now() - start;
          const traceId = currentTraceId() || 'unknown';
          const ctx = currentCtx();
          const userId = ctx?.user?.id ?? null;
          const clientIp = ctx?.ip || req.ip || null;
          const code = (val && typeof val === 'object' && val.code) ? String(val.code) : 'OK';

          void this.db.exec(
            `INSERT INTO sys_api_log (id, req_id, client_ip, user_id, path, method, cost_ms, http_status, code, success)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [nextId(), traceId, clientIp, userId, path, method, costMs, 200, code],
          ).catch(() => undefined);
        },
        error: (err) => {
          const costMs = Date.now() - start;
          const traceId = currentTraceId() || 'unknown';
          const ctx = currentCtx();
          const userId = ctx?.user?.id ?? null;
          const clientIp = ctx?.ip || req.ip || null;

          let code = 'SYS_INTERNAL';
          let httpStatus = 500;
          if (err instanceof BizError) {
            code = err.code;
            httpStatus = httpStatusOf(code);
          } else if (err?.status && typeof err.status === 'number') {
            httpStatus = err.status;
          }

          void this.db.exec(
            `INSERT INTO sys_api_log (id, req_id, client_ip, user_id, path, method, cost_ms, http_status, code, success)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
            [nextId(), traceId, clientIp, userId, path, method, costMs, httpStatus, code],
          ).catch(() => undefined);
        },
      }),
    );
  }
}
