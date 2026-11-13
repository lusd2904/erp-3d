import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { DbService } from '../db/db.service';
import { config } from '../config/config';

@Injectable()
export class MysqlLockService {
  constructor(private readonly db: DbService) {}

  /**
   * 构造符合 MySQL GET_LOCK 规范的锁名（上限 64 字符）。
   * 超过 64 字符时截断为前 40 字符 + ':' + sha1 前 16 位。
   */
  lockName(name: string): string {
    const raw = `erp3d:${config.db.database}:${name}`;
    if (raw.length <= 64) {
      return raw;
    }
    const hash = crypto.createHash('sha1').update(raw).digest('hex').slice(0, 16);
    return `${raw.slice(0, 40)}:${hash}`;
  }

  /**
   * 尝试获取 MySQL 互斥锁并执行回调。
   * - 独立连接：通过 ds.createQueryRunner() 单独建立，不复用业务连接。
   * - 释放保证：finally 中显式 RELEASE_LOCK 并 release 连接。
   *   MySQL 会话断开或异常断线时，服务端会自动释放该连接持有的全部锁。
   * - GET_LOCK 返回 1 表示拿到锁，返回 0 或 NULL 视为失败。
   */
  async tryRun<T>(
    name: string,
    fn: () => Promise<T>,
    opts: { waitSec?: number } = {},
  ): Promise<{ ran: true; result: T } | { ran: false }> {
    const waitSec = opts.waitSec ?? 0;
    const actualLockName = this.lockName(name);
    const qr = this.db.ds.createQueryRunner();
    await qr.connect();
    let acquired = false;
    try {
      const rows: any[] = await qr.query('SELECT GET_LOCK(?, ?) AS ok', [actualLockName, waitSec]);
      const ok = rows?.[0]?.ok;
      if (Number(ok) !== 1) {
        return { ran: false };
      }
      acquired = true;
      const result = await fn();
      return { ran: true, result };
    } finally {
      if (acquired) {
        try {
          await qr.query('SELECT RELEASE_LOCK(?)', [actualLockName]);
        } catch {
          // 连接异常断开时 MySQL 自动释放锁
        }
      }
      await qr.release();
    }
  }

  /**
   * 查询指定锁是否空闲（无任何会话持有）。
   */
  async isFree(name: string): Promise<boolean> {
    const actualLockName = this.lockName(name);
    const rows = await this.db.q<{ free: number | null }>(
      'SELECT IS_FREE_LOCK(?) AS free',
      [actualLockName],
    );
    return Number(rows?.[0]?.free) === 1;
  }
}
