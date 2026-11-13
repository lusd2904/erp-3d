import { CallHandler, ExecutionContext, Injectable, NestInterceptor, StreamableFile } from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { currentTraceId } from './request-context';

export const RAW_RESPONSE = Symbol('raw');

/** 统一返回体 { code:'OK', msg:'', data, traceId } */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        const res = ctx.switchToHttp().getResponse();
        if (res.headersSent) return data; // [人工修正 反重力] 幂等回放已写出响应
        if (data instanceof StreamableFile || (data && (data as any)[RAW_RESPONSE])) return data;
        // [人工修正 反重力] 约定成功 HTTP=200；Nest 对 POST 默认 201
        if (res.statusCode === 201) res.status(200);
        return { code: 'OK', msg: '', data: data === undefined ? null : data, traceId: currentTraceId() };
      }),
    );
  }
}
