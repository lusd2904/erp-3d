import { Injectable, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { DbService } from '../../db/db.service';
import { nextId } from '../../db/snowflake';
import { MysqlLockService } from '../../common/mysql-lock.service';
import { config } from '../../config/config';

export interface OutboxRow {
  id: number;
  event_type: string;
  object_code: string | null;
  bill_id: number | null;
  payload: any;
  retry: number;
}

/**
 * 事务事件发件箱服务：保证业务数据与事件派发原子写入，并通过分布式互斥锁安全分发执行。
 */
@Injectable()
export class OutboxService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly handlers = new Map<string, (row: OutboxRow) => Promise<void>>();
  private timer: NodeJS.Timeout | null = null;
  private pendingKick = false;

  constructor(
    private readonly db: DbService,
    private readonly lock: MysqlLockService,
  ) {}

  /**
   * 注册事件处理器。
   */
  registerHandler(eventType: string, fn: (row: OutboxRow) => Promise<void>): void {
    this.handlers.set(eventType, fn);
  }

  /**
   * 将事件写入发件箱（在调用方当前事务内执行）。
   */
  async enqueue(
    eventType: string,
    p: { objectCode?: string; billId?: number; payload?: unknown } = {},
  ): Promise<number> {
    const id = nextId();
    const payloadJson = p.payload !== undefined ? JSON.stringify(p.payload) : null;
    await this.db.exec(
      "INSERT INTO sys_event_outbox (id, event_type, object_code, bill_id, payload_json, status) VALUES (?, ?, ?, ?, ?, 'NEW')",
      [id, eventType, p.objectCode ?? null, p.billId ?? null, payloadJson],
    );
    this.db.afterCommit(() => this.kick());
    return id;
  }

  /**
   * 防抖触发调度。
   */
  kick(): void {
    if (this.pendingKick) return;
    this.pendingKick = true;
    setImmediate(async () => {
      this.pendingKick = false;
      try {
        await this.dispatch();
      } catch {
        // 调度异常吞掉，等待下次重试或定时扫表
      }
    });
  }

  /**
   * 抓取并分发待处理事件。
   */
  async dispatch(limit = 100): Promise<number> {
    const lockRes = await this.lock.tryRun('outbox', async () => {
      const rows = await this.db.q<any>(
        "SELECT * FROM sys_event_outbox WHERE status = 'NEW' ORDER BY id LIMIT ?",
        [limit],
      );
      let handledCount = 0;

      for (const r of rows) {
        const handler = this.handlers.get(r.event_type);
        if (!handler) continue;

        let payload: any = null;
        if (r.payload_json) {
          try {
            payload = typeof r.payload_json === 'string' ? JSON.parse(r.payload_json) : r.payload_json;
          } catch {
            payload = r.payload_json;
          }
        }

        const outboxRow: OutboxRow = {
          id: Number(r.id),
          event_type: r.event_type,
          object_code: r.object_code ?? null,
          bill_id: r.bill_id ? Number(r.bill_id) : null,
          payload,
          retry: Number(r.retry ?? 0),
        };

        try {
          await handler(outboxRow);
          await this.db.exec(
            "UPDATE sys_event_outbox SET status = 'DONE', done_at = NOW(3), err = NULL WHERE id = ?",
            [r.id],
          );
          handledCount++;
        } catch (e: any) {
          const nextRetry = Number(r.retry ?? 0) + 1;
          const errMsg = String(e?.message ?? e).slice(0, 1000);
          const nextStatus = nextRetry >= 5 ? 'FAILED' : 'NEW';
          await this.db.exec(
            'UPDATE sys_event_outbox SET status = ?, retry = ?, err = ? WHERE id = ?',
            [nextStatus, nextRetry, errMsg, r.id],
          );
          handledCount++;
        }
      }
      return handledCount;
    });

    return lockRes.ran ? lockRes.result : 0;
  }

  onApplicationBootstrap(): void {
    if (config.enableJobs) {
      this.timer = setInterval(() => this.kick(), 5000);
      this.timer.unref();
    }
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
