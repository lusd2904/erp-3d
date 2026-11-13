import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { reqCtx } from './request-context';

@Injectable()
export class TraceMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const headerTrace = req.headers['x-trace-id'];
    const traceId = (typeof headerTrace === 'string' && headerTrace) ? headerTrace : crypto.randomUUID();
    const forwarded = req.headers['x-forwarded-for'];
    const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.ip) || '';
    reqCtx.run({ traceId, ip }, () => next());
  }
}
