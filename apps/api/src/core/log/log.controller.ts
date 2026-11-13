import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePerm } from '../../common/decorators';
import { DbService } from '../../db/db.service';
import { OpLogService } from '../oplog.service';

@ApiTags('日志审计')
@ApiBearerAuth()
@Controller('sys/logs')
export class LogController {
  constructor(
    private opLogService: OpLogService,
    private db: DbService,
  ) {}

  @Get('ops')
  @RequirePerm('sys_op_log', 'view')
  @ApiOperation({ summary: '操作日志分页查询' })
  ops(@Query() q: { objectCode?: string; billId?: number; userId?: number; from?: string; to?: string; page?: number; size?: number }) {
    return this.opLogService.list(q);
  }

  @Get('logins')
  @RequirePerm('sys_op_log', 'view')
  @ApiOperation({ summary: '登录日志分页查询' })
  async logins(@Query() q: { account?: string; userId?: string; success?: string; from?: string; to?: string; page?: string; size?: string }) {
    const page = Math.max(Number(q.page) || 1, 1);
    const size = Math.min(Math.max(Number(q.size) || 50, 1), 500);
    const where: string[] = [];
    const params: unknown[] = [];

    if (q.account) { where.push('l.account LIKE ?'); params.push(`%${q.account}%`); }
    if (q.userId) { where.push('l.user_id = ?'); params.push(Number(q.userId)); }
    if (q.success !== undefined && q.success !== '') { where.push('l.success = ?'); params.push(Number(q.success)); }
    if (q.from) { where.push('l.at >= ?'); params.push(q.from); }
    if (q.to) { where.push('l.at < ?'); params.push(q.to); }

    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await this.db.q(
      `SELECT l.id, l.user_id AS userId, l.account, l.at, l.ip, l.device, l.success, l.reason, u.name AS userName
       FROM sys_login_log l
       LEFT JOIN sys_user u ON u.id = l.user_id
       ${w} ORDER BY l.at DESC, l.id DESC LIMIT ${size} OFFSET ${(page - 1) * size}`,
      params,
    );
    const [{ total }] = await this.db.q(`SELECT COUNT(*) AS total FROM sys_login_log l ${w}`, params);

    return { rows, total: Number(total), page, size };
  }

  @Get('apis')
  @RequirePerm('sys_op_log', 'view')
  @ApiOperation({ summary: '接口访问日志分页查询' })
  async apis(@Query() q: { path?: string; method?: string; userId?: string; success?: string; from?: string; to?: string; page?: string; size?: string }) {
    const page = Math.max(Number(q.page) || 1, 1);
    const size = Math.min(Math.max(Number(q.size) || 50, 1), 500);
    const where: string[] = [];
    const params: unknown[] = [];

    if (q.path) { where.push('l.path LIKE ?'); params.push(`%${q.path}%`); }
    if (q.method) { where.push('l.method = ?'); params.push(q.method.toUpperCase()); }
    if (q.userId) { where.push('l.user_id = ?'); params.push(Number(q.userId)); }
    if (q.success !== undefined && q.success !== '') { where.push('l.success = ?'); params.push(Number(q.success)); }
    if (q.from) { where.push('l.at >= ?'); params.push(q.from); }
    if (q.to) { where.push('l.at < ?'); params.push(q.to); }

    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await this.db.q(
      `SELECT l.id, l.req_id AS reqId, l.at, l.client_ip AS clientIp, l.user_id AS userId, l.path, l.method,
              l.cost_ms AS costMs, l.http_status AS httpStatus, l.code, l.success, u.name AS userName
       FROM sys_api_log l
       LEFT JOIN sys_user u ON u.id = l.user_id
       ${w} ORDER BY l.at DESC, l.id DESC LIMIT ${size} OFFSET ${(page - 1) * size}`,
      params,
    );
    const [{ total }] = await this.db.q(`SELECT COUNT(*) AS total FROM sys_api_log l ${w}`, params);

    return { rows, total: Number(total), page, size };
  }
}
