import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { nextId } from '../db/snowflake';
import { currentCtx } from '../common/request-context';

@Injectable()
export class OpLogService {
  constructor(private db: DbService) {}

  /** 写上机操作日志（在当前事务内；事务回滚则日志也回滚——失败的操作不记日志） */
  async log(p: { objectCode?: string; subsystem?: string; op: string; billId?: number; billNo?: string; description?: string; userId?: number }) {
    const ctx = currentCtx();
    await this.db.exec(
      `INSERT INTO sys_op_log (id, user_id, ip, subsystem, object_code, op, bill_id, bill_no, description, trace_id) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [nextId(), p.userId ?? ctx?.user?.id ?? null, ctx?.ip ?? null, p.subsystem ?? null, p.objectCode ?? null, p.op, p.billId ?? null, p.billNo ?? null, p.description?.slice(0, 1000) ?? null, ctx?.traceId ?? null],
    );
  }

  async list(q: { objectCode?: string; billId?: number; userId?: number; from?: string; to?: string; page?: number; size?: number }) {
    const where: string[] = [];
    const ps: unknown[] = [];
    if (q.objectCode) { where.push('l.object_code = ?'); ps.push(q.objectCode); }
    if (q.billId) { where.push('l.bill_id = ?'); ps.push(q.billId); }
    if (q.userId) { where.push('l.user_id = ?'); ps.push(q.userId); }
    if (q.from) { where.push('l.at >= ?'); ps.push(q.from); }
    if (q.to) { where.push('l.at < ?'); ps.push(q.to); }
    const size = Math.min(Number(q.size) || 50, 500);
    const page = Math.max(Number(q.page) || 1, 1);
    const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const rows = await this.db.q(
      `SELECT l.id, l.at, l.ip, l.object_code AS objectCode, l.op, l.bill_id AS billId, l.bill_no AS billNo, l.description, l.user_id AS userId, u.name AS userName, l.trace_id AS traceId
       FROM sys_op_log l LEFT JOIN sys_user u ON u.id = l.user_id ${w} ORDER BY l.at DESC, l.id DESC LIMIT ${size} OFFSET ${(page - 1) * size}`,
      ps,
    );
    const [{ total }] = await this.db.q(`SELECT COUNT(*) AS total FROM sys_op_log l ${w}`, ps);
    return { rows, total: Number(total), page, size };
  }
}
