import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ErrorCodes } from '@erp3d/shared';
import { DbService } from '../db/db.service';
import { PermService } from '../core/perm.service';
import { IS_PUBLIC, ALLOW_MUST_CHANGE, REQUIRE_PERM } from './decorators';
import { BizError } from './biz-error';
import { currentCtx } from './request-context';
import { config } from '../config/config';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    private permService: PermService,
    private db: DbService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);

    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers['authorization'];
    const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : null;

    if (!token) {
      if (isPublic) return true;
      throw new BizError(ErrorCodes.AUTH_REQUIRED, '请先登录系统');
    }

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(token, { secret: config.jwt.secret });
    } catch {
      if (isPublic) return true;
      throw new BizError(ErrorCodes.AUTH_INVALID_TOKEN, '登录凭证无效或已过期');
    }

    if (!payload || (payload.typ && payload.typ !== 'access')) {
      if (isPublic) return true;
      throw new BizError(ErrorCodes.AUTH_INVALID_TOKEN, '令牌类型错误');
    }

    const userId = Number(payload.sub);
    const user = await this.permService.loadAuthUser(userId);
    if (!user) {
      if (isPublic) return true;
      throw new BizError(ErrorCodes.AUTH_DISABLED, '用户不存在');
    }

    // 查数据库实时状态与首次登录强制改密标记
    const uRow = await this.db.one<{ status: string; must_change_pwd: number }>(
      'SELECT status, must_change_pwd FROM sys_user WHERE id = ?',
      [userId],
    );

    if (!uRow || uRow.status === 'DISABLED' || (user as any).disabled) {
      throw new BizError(ErrorCodes.AUTH_DISABLED, '账号已被停用');
    }
    if (uRow.status === 'LOCKED') {
      throw new BizError(ErrorCodes.AUTH_LOCKED, '账号已被锁定，请联系管理员');
    }

    const allowMustChange = this.reflector.getAllAndOverride<boolean>(ALLOW_MUST_CHANGE, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (uRow.must_change_pwd === 1 && !allowMustChange && !isPublic) {
      throw new BizError(ErrorCodes.AUTH_MUST_CHANGE_PWD, '首次登录必须修改密码');
    }

    req.user = user;
    const ctx = currentCtx();
    if (ctx) ctx.user = user;

    // 功能权限校验
    const permMeta = this.reflector.getAllAndOverride<{ objectCode: string; permCode: string }>(
      REQUIRE_PERM,
      [context.getHandler(), context.getClass()],
    );
    if (permMeta) {
      await this.permService.assert(user, permMeta.objectCode, permMeta.permCode);
    }

    return true;
  }
}
