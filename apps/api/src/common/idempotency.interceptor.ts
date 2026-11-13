import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable, from, of, throwError } from 'rxjs';
import { concatMap, catchError } from 'rxjs/operators';
import { ErrorCodes } from '@erp3d/shared';
import { DbService } from '../db/db.service';
import { nextId } from '../db/snowflake';
import { BizError } from './biz-error';
import { RAW_RESPONSE } from './response.interceptor';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private db: DbService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = String(req.method || '').toUpperCase();

    // 仅作用于写操作
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const idemKey = String(req.headers['idempotency-key'] || req.headers['Idempotency-Key'] || '').trim();
    if (!idemKey) {
      return next.handle();
    }

    const userId = Number(req.user?.id || 0);
    const path = String(req.originalUrl || req.url || '').slice(0, 300);

    return from(this.checkOrInsert(idemKey, userId, method, path)).pipe(
      concatMap((cached) => {
        if (cached) {
          // [人工修正 反重力] 回放已保存的完整响应体，交给 Nest 写出（不要自己 res.json，否则会二次写头）
          const res = context.switchToHttp().getResponse<Response>();
          const httpStatus = cached.http_status || 200;
          let body: any = cached.response_json;
          try {
            body = JSON.parse(cached.response_json);
          } catch {
            /* 保持原样 */
          }
          if (body && typeof body === 'object') body[RAW_RESPONSE] = true;
          if (httpStatus !== 200) res.status(httpStatus);
          return of(body);
        }

        // 首次请求：执行后续拦截器与路由处理
        return next.handle().pipe(
          concatMap(async (val) => {
            // 成功返回，将由 ResponseInterceptor 包装后的完整响应写入 DONE
            if (!(val instanceof StreamableFile) && !(val && (val as any)[RAW_RESPONSE])) {
              await this.db.exec(
                `UPDATE sys_idempotent_key SET status = 'DONE', http_status = 200, response_json = ? WHERE idem_key = ? AND user_id = ?`,
                [JSON.stringify(val), idemKey, userId],
              );
            }
            return val;
          }),
          catchError((err) => {
            // 请求失败：删除 PENDING 记录，允许后续重试
            return from(
              this.db.exec(
                `DELETE FROM sys_idempotent_key WHERE idem_key = ? AND user_id = ? AND status = 'PENDING'`,
                [idemKey, userId],
              ).catch(() => undefined),
            ).pipe(concatMap(() => throwError(() => err)));
          }),
        );
      }),
    );
  }

  private async checkOrInsert(idemKey: string, userId: number, method: string, path: string) {
    const row = await this.db.one<{ status: string; http_status: number; response_json: string }>(
      `SELECT status, http_status, response_json FROM sys_idempotent_key WHERE idem_key = ? AND user_id = ?`,
      [idemKey, userId],
    );

    if (row) {
      if (row.status === 'PENDING') {
        throw new BizError(ErrorCodes.SYS_IDEMPOTENT_IN_PROGRESS, '相同幂等键请求正在处理中，请勿重复提交');
      }
      return row;
    }

    try {
      await this.db.exec(
        `INSERT INTO sys_idempotent_key (id, idem_key, user_id, method, path, status) VALUES (?, ?, ?, ?, ?, 'PENDING')`,
        [nextId(), idemKey, userId, method, path],
      );
    } catch (e: any) {
      if (e?.code === 'ER_DUP_ENTRY') {
        throw new BizError(ErrorCodes.SYS_IDEMPOTENT_IN_PROGRESS, '相同幂等键请求正在处理中，请勿重复提交');
      }
      throw e;
    }

    return null;
  }
}
