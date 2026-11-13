import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { ErrorCodes } from '@erp3d/shared';
import { DbService } from '../../db/db.service';
import { nextId } from '../../db/snowflake';
import { config } from '../../config/config';
import { BizError } from '../../common/biz-error';
import { ParamService } from '../param.service';
import { OpLogService } from '../oplog.service';
import { PermService } from '../perm.service';

function parseTtlSec(ttl: string, def = 7200): number {
  const m = ttl.match(/^(\d+)([smhd])?$/i);
  if (!m) return def;
  const n = Number(m[1]);
  const unit = (m[2] || 's').toLowerCase();
  if (unit === 's') return n;
  if (unit === 'm') return n * 60;
  if (unit === 'h') return n * 3600;
  if (unit === 'd') return n * 86400;
  return def;
}


function formatLocalDateTime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

@Injectable()
export class AuthService {
  constructor(
    private db: DbService,
    private jwtService: JwtService,
    private paramService: ParamService,
    private opLogService: OpLogService,
    private permService: PermService,
  ) {}

  async login(body: { username?: string; password?: string }, ip?: string) {
    const account = body.username?.trim();
    const password = body.password;
    if (!account || !password) {
      throw new BizError(ErrorCodes.SYS_VALIDATION, '用户名与密码不能为空');
    }

    const user = await this.db.one<any>(
      `SELECT id, account, name, org_id, dept_id, employee_id, status, pwd_hash, must_change_pwd, fail_count FROM sys_user WHERE account = ?`,
      [account],
    );

    const maxFail = await this.paramService.getInt('security', 'login.maxFail', 3);

    if (!user) {
      await this.recordLoginLog(null, account, ip, 0, '用户不存在');
      throw new BizError(ErrorCodes.AUTH_BAD_CREDENTIALS, '账号或密码错误');
    }

    if (user.status === 'LOCKED') {
      await this.recordLoginLog(user.id, account, ip, 0, '账号已锁定');
      throw new BizError(ErrorCodes.AUTH_LOCKED, '账号已被锁定，请联系管理员');
    }

    if (user.status === 'DISABLED') {
      await this.recordLoginLog(user.id, account, ip, 0, '账号已停用');
      throw new BizError(ErrorCodes.AUTH_DISABLED, '账号已被停用');
    }

    const match = bcrypt.compareSync(password, user.pwd_hash);
    if (!match) {
      const nextFail = Number(user.fail_count) + 1;
      if (nextFail >= maxFail) {
        await this.db.exec(`UPDATE sys_user SET fail_count = ?, status = 'LOCKED' WHERE id = ?`, [nextFail, user.id]);
        await this.recordLoginLog(user.id, account, ip, 0, '密码错误已触发锁定');
        throw new BizError(ErrorCodes.AUTH_LOCKED, '密码错误次数达到上限，账号已被锁定');
      } else {
        await this.db.exec(`UPDATE sys_user SET fail_count = ? WHERE id = ?`, [nextFail, user.id]);
        await this.recordLoginLog(user.id, account, ip, 0, '密码错误');
        throw new BizError(ErrorCodes.AUTH_BAD_CREDENTIALS, '账号或密码错误');
      }
    }

    // 登录成功
    await this.db.exec(`UPDATE sys_user SET fail_count = 0, last_login_at = NOW(), last_login_ip = ? WHERE id = ?`, [
      ip || null,
      user.id,
    ]);
    await this.recordLoginLog(user.id, account, ip, 1, '登录成功');
    await this.opLogService.log({
      subsystem: 'sys',
      objectCode: 'sys_user',
      op: 'login',
      description: '用户登录成功',
      userId: user.id,
    });

    const tokens = await this.issueTokenPair(user.id, ip);
    const org = await this.db.one<{ name: string }>('SELECT name FROM sys_org WHERE id = ?', [user.org_id]);
    const roles = await this.db.q<{ code: string }>(
      `SELECT r.code FROM sys_user_role ur JOIN sys_role r ON r.id = ur.role_id AND r.forbid = 0 WHERE ur.user_id = ? AND ur.org_id = ?`,
      [user.id, user.org_id],
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: parseTtlSec(config.jwt.accessTtl, 7200),
      user: {
        id: Number(user.id),
        username: user.account,
        name: user.name,
        orgId: Number(user.org_id),
        orgName: org?.name ?? '',
        deptId: user.dept_id ? Number(user.dept_id) : null,
        roles: roles.map((r) => r.code),
        mustChangePwd: Boolean(user.must_change_pwd),
      },
    };
  }

  async refresh(refreshToken: string, ip?: string) {
    if (!refreshToken) {
      throw new BizError(ErrorCodes.SYS_VALIDATION, '刷新令牌不能为空');
    }

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, { secret: config.jwt.refreshSecret });
    } catch {
      throw new BizError(ErrorCodes.AUTH_INVALID_TOKEN, '刷新令牌无效或已过期');
    }

    if (!payload || payload.typ !== 'refresh' || !payload.jti) {
      throw new BizError(ErrorCodes.AUTH_INVALID_TOKEN, '刷新令牌格式错误');
    }

    const tokenRow = await this.db.one<any>(
      `SELECT id, user_id, revoked, expires_at FROM sys_user_token WHERE jti = ?`,
      [payload.jti],
    );
    if (!tokenRow || tokenRow.revoked === 1 || new Date(tokenRow.expires_at).getTime() <= Date.now()) {
      throw new BizError(ErrorCodes.AUTH_INVALID_TOKEN, '刷新令牌已失效或已被吊销');
    }

    const user = await this.db.one<{ status: string }>('SELECT status FROM sys_user WHERE id = ?', [tokenRow.user_id]);
    if (!user || user.status === 'DISABLED') {
      throw new BizError(ErrorCodes.AUTH_DISABLED, '账号已被停用');
    }
    if (user.status === 'LOCKED') {
      throw new BizError(ErrorCodes.AUTH_LOCKED, '账号已被锁定');
    }

    // 旋转令牌：作废旧 jti 并生成新令牌对
    await this.db.exec(`UPDATE sys_user_token SET revoked = 1 WHERE id = ?`, [tokenRow.id]);
    const tokens = await this.issueTokenPair(Number(tokenRow.user_id), ip);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: parseTtlSec(config.jwt.accessTtl, 7200),
    };
  }

  async logout(userId: number, refreshToken?: string) {
    if (refreshToken) {
      let jti: string | null = null;
      try {
        const payload: any = this.jwtService.decode(refreshToken);
        jti = payload?.jti || null;
      } catch {
        /* 忽略解析错误 */
      }
      if (jti) {
        await this.db.exec(`UPDATE sys_user_token SET revoked = 1 WHERE jti = ? AND user_id = ?`, [jti, userId]);
      }
    } else {
      await this.db.exec(`UPDATE sys_user_token SET revoked = 1 WHERE user_id = ?`, [userId]);
    }
    return { ok: true };
  }

  async changePwd(userId: number, body: { oldPassword?: string; newPassword?: string }) {
    const oldPassword = body.oldPassword;
    const newPassword = body.newPassword;
    if (!oldPassword || !newPassword) {
      throw new BizError(ErrorCodes.SYS_VALIDATION, '原密码和新密码均不能为空');
    }

    const user = await this.db.one<{ pwd_hash: string }>('SELECT pwd_hash FROM sys_user WHERE id = ?', [userId]);
    if (!user || !bcrypt.compareSync(oldPassword, user.pwd_hash)) {
      throw new BizError(ErrorCodes.AUTH_BAD_CREDENTIALS, '原密码错误');
    }

    if (newPassword === oldPassword) {
      throw new BizError(ErrorCodes.AUTH_WEAK_PASSWORD, '新密码不能与原密码相同');
    }

    const minLen = await this.paramService.getInt('security', 'pwd.minLen', 8);
    const maxLen = await this.paramService.getInt('security', 'pwd.maxLen', 20);
    this.assertPasswordPolicy(newPassword, minLen, maxLen);

    const hash = bcrypt.hashSync(newPassword, 10);
    await this.db.exec(
      `UPDATE sys_user SET pwd_hash = ?, pwd_changed_at = NOW(), must_change_pwd = 0, fail_count = 0 WHERE id = ?`,
      [hash, userId],
    );

    // 吊销已有刷新令牌
    await this.db.exec(`UPDATE sys_user_token SET revoked = 1 WHERE user_id = ?`, [userId]);
    await this.opLogService.log({
      subsystem: 'sys',
      objectCode: 'sys_user',
      op: 'change-pwd',
      description: '用户修改密码',
      userId,
    });

    return { ok: true };
  }

  async me(userId: number) {
    const user = await this.db.one<any>(
      `SELECT id, account, name, org_id, dept_id, employee_id, must_change_pwd FROM sys_user WHERE id = ?`,
      [userId],
    );
    if (!user) {
      throw new BizError(ErrorCodes.SYS_NOT_FOUND, '用户不存在');
    }

    const org = await this.db.one<{ name: string }>('SELECT name FROM sys_org WHERE id = ?', [user.org_id]);
    const roles = await this.db.q<{ code: string }>(
      `SELECT r.code FROM sys_user_role ur JOIN sys_role r ON r.id = ur.role_id AND r.forbid = 0 WHERE ur.user_id = ? AND ur.org_id = ?`,
      [user.id, user.org_id],
    );
    const report = await this.permService.permissionReport(userId);

    return {
      id: Number(user.id),
      username: user.account,
      name: user.name,
      orgId: Number(user.org_id),
      orgName: org?.name ?? '',
      deptId: user.dept_id ? Number(user.dept_id) : null,
      roles: roles.map((r) => r.code),
      mustChangePwd: Boolean(user.must_change_pwd),
      isSuper: report?.isSuper ?? false,
      perms: report?.perms ?? [],
    };
  }

  private async issueTokenPair(userId: number, ip?: string) {
    const accessToken = await this.jwtService.signAsync(
      { sub: userId, typ: 'access' },
      { secret: config.jwt.secret, expiresIn: config.jwt.accessTtl as any },
    );

    const jti = crypto.randomUUID();
    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, typ: 'refresh', jti },
      { secret: config.jwt.refreshSecret, expiresIn: config.jwt.refreshTtl as any },
    );

    const refreshSec = parseTtlSec(config.jwt.refreshTtl, 7 * 86400);
    // [人工修正 反重力] dateStrings:true，用本地时间字符串写入 DATETIME，避免 Date 被转成 UTC
    const expiresAt = formatLocalDateTime(new Date(Date.now() + refreshSec * 1000));

    await this.db.exec(
      `INSERT INTO sys_user_token (id, user_id, jti, expires_at, revoked, ip) VALUES (?, ?, ?, ?, 0, ?)`,
      [nextId(), userId, jti, expiresAt, ip || null],
    );

    return { accessToken, refreshToken };
  }

  private async recordLoginLog(userId: number | null, account: string, ip: string | undefined, success: number, reason: string) {
    await this.db.exec(
      `INSERT INTO sys_login_log (id, user_id, account, ip, success, reason) VALUES (?, ?, ?, ?, ?, ?)`,
      [nextId(), userId, account, ip || null, success, reason],
    );
  }

  private assertPasswordPolicy(pwd: string, minLen: number, maxLen: number) {
    if (pwd.length < minLen || pwd.length > maxLen) {
      throw new BizError(ErrorCodes.AUTH_WEAK_PASSWORD, `密码长度必须在 ${minLen}-${maxLen} 位之间`);
    }
    if (!/[A-Za-z]/.test(pwd) || !/\d/.test(pwd) || !/[^A-Za-z0-9]/.test(pwd)) {
      throw new BizError(ErrorCodes.AUTH_WEAK_PASSWORD, '密码必须同时包含字母、数字和特殊字符');
    }
  }
}
