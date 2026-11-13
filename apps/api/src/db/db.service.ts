import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { DataSource, EntityManager, QueryRunner } from 'typeorm';

interface TxCtx {
  qr: QueryRunner;
  afterCommit: (() => void | Promise<void>)[];
}

const DEADLOCK_CODES = new Set(['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT']);

/**
 * 数据库访问入口。
 * - q(sql, params)：在当前事务（若有）里执行，否则用连接池。
 * - tx(fn)：开启事务（READ COMMITTED，避免间隙锁死锁）；嵌套调用自动加入外层事务；死锁自动重试 3 次。
 * - afterCommit(fn)：事务提交后执行（推 WebSocket、发外部消息），回滚则丢弃。
 */
@Injectable()
export class DbService implements OnModuleDestroy {
  private als = new AsyncLocalStorage<TxCtx>();
  constructor(public readonly ds: DataSource) {}

  async onModuleDestroy() {
    if (this.ds.isInitialized) await this.ds.destroy();
  }

  get inTx(): boolean {
    return !!this.als.getStore();
  }

  get manager(): EntityManager {
    return this.als.getStore()?.qr.manager ?? this.ds.manager;
  }

  async q<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
    const ctx = this.als.getStore();
    const res = ctx ? await ctx.qr.query(sql, params) : await this.ds.query(sql, params);
    return res as T[];
  }

  async one<T = any>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    const rows = await this.q<T>(sql, params);
    return rows[0];
  }

  async exec(sql: string, params: unknown[] = []): Promise<{ affectedRows: number; insertId: number }> {
    const r: any = await this.q(sql, params);
    return { affectedRows: r?.affectedRows ?? 0, insertId: r?.insertId ?? 0 };
  }

  afterCommit(fn: () => void | Promise<void>) {
    const ctx = this.als.getStore();
    if (!ctx) {
      void Promise.resolve().then(fn).catch(() => undefined);
      return;
    }
    ctx.afterCommit.push(fn);
  }

  async tx<T>(fn: () => Promise<T>, opts: { retries?: number } = {}): Promise<T> {
    if (this.als.getStore()) return fn();
    const retries = opts.retries ?? 3;
    for (let attempt = 0; ; attempt++) {
      const qr = this.ds.createQueryRunner();
      await qr.connect();
      const ctx: TxCtx = { qr, afterCommit: [] };
      try {
        await qr.startTransaction('READ COMMITTED');
        const result = await this.als.run(ctx, fn);
        await qr.commitTransaction();
        for (const cb of ctx.afterCommit) {
          try {
            await cb();
          } catch {
            /* 提交后回调失败不影响业务结果 */
          }
        }
        return result;
      } catch (e: any) {
        if (qr.isTransactionActive) await qr.rollbackTransaction().catch(() => undefined);
        const code = e?.code ?? e?.driverError?.code;
        if (DEADLOCK_CODES.has(code) && attempt < retries) {
          await new Promise((r) => setTimeout(r, 20 + Math.random() * 80 * (attempt + 1)));
          continue;
        }
        throw e;
      } finally {
        await qr.release();
      }
    }
  }

  /** 独立事务（不加入外层），用于编码流水号等允许断号的分配 */
  async independent<T>(fn: (q: (sql: string, p?: unknown[]) => Promise<any>) => Promise<T>): Promise<T> {
    const qr = this.ds.createQueryRunner();
    await qr.connect();
    try {
      await qr.startTransaction('READ COMMITTED');
      const r = await fn((sql, p = []) => qr.query(sql, p));
      await qr.commitTransaction();
      return r;
    } catch (e) {
      if (qr.isTransactionActive) await qr.rollbackTransaction().catch(() => undefined);
      throw e;
    } finally {
      await qr.release();
    }
  }
}

/** 标识符转义（表名、列名只允许字母数字下划线，防注入） */
export function ident(name: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new Error(`非法标识符: ${name}`);
  return '`' + name + '`';
}
