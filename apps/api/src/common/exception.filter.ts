import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { ErrorCodes, httpStatusOf } from '@erp3d/shared';
import { BizError } from './biz-error';
import { currentTraceId } from './request-context';
import { ExprError } from '@erp3d/shared';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private log = new Logger('Error');
  catch(e: any, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    const traceId = currentTraceId();
    let code: string = ErrorCodes.SYS_INTERNAL;
    let msg = '系统错误，请联系管理员';
    let errors: unknown;
    let data: unknown = null;
    let status: number;
    if (e instanceof BizError) {
      code = e.code;
      msg = e.message;
      errors = e.extra.errors;
      data = e.extra.data ?? null;
      status = httpStatusOf(code);
    } else if (e instanceof ExprError) {
      code = ErrorCodes.SYS_VALIDATION;
      msg = `表达式错误：${e.message}`;
      status = 400;
    } else if (e instanceof HttpException) {
      status = e.getStatus();
      const r: any = e.getResponse();
      code = status === 404 ? ErrorCodes.SYS_NOT_FOUND : status === 401 ? ErrorCodes.AUTH_REQUIRED : status === 403 ? ErrorCodes.PERM_DENIED : ErrorCodes.SYS_VALIDATION;
      msg = Array.isArray(r?.message) ? r.message.join('; ') : r?.message || e.message;
    } else if (e?.code === 'ER_DUP_ENTRY') {
      code = ErrorCodes.BIZ_DUPLICATE;
      msg = '数据重复：' + String(e.sqlMessage || e.message).replace(/for key.*/, '').trim();
      status = 400;
    } else {
      status = 500;
      this.log.error(`[${traceId}] ${e?.stack || e}`);
    }
    res.status(status).json({ code, msg, data, traceId, ...(errors ? { errors } : {}) });
  }
}
