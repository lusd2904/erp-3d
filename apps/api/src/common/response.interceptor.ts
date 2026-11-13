import { CallHandler, ExecutionContext, Injectable, NestInterceptor, StreamableFile } from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { currentTraceId } from './request-context';

export const RAW_RESPONSE = Symbol('raw');

/** 统一返回体 { code:'OK', msg:'', data, traceId } */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        if (data instanceof StreamableFile || (data && (data as any)[RAW_RESPONSE])) return data;
        return { code: 'OK', msg: '', data: data === undefined ? null : data, traceId: currentTraceId() };
      }),
    );
  }
}
