import { Injectable, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { nextId } from '../db/snowflake';
import { config } from '../config/config';
import { MysqlLockService } from './mysql-lock.service';

export interface JobDef {
  handler: string;
  name: string;
  intervalSec: number;
  fn: () => Promise<string | void>;
}

@Injectable()
export class JobScheduler implements OnApplicationBootstrap, OnModuleDestroy {
  private jobs = new Map<string, JobDef>();
  private timers = new Map<string, NodeJS.Timeout>();
  private isBootstrapped = false;

  constructor(
    private readonly db: DbService,
    private readonly lock: MysqlLockService,
  ) {}

  /**
   * 注册后台任务：记录到内存 Map；若已 bootstrap 则立即同步 sys_job 并按需启动定时器。
   */
  register(def: JobDef) {
    this.jobs.set(def.handler, def);
    if (this.isBootstrapped) {
      void this.syncJob(def)
        .then(() => {
          if (config.enableJobs) {
            this.startTimer(def);
          }
        })
        .catch(() => undefined);
    }
  }

  async onApplicationBootstrap() {
    this.isBootstrapped = true;
    for (const def of this.jobs.values()) {
      try {
        await this.syncJob(def);
        if (config.enableJobs) {
          this.startTimer(def);
        }
      } catch {
        // 同步异常不中断服务启动
      }
    }
  }

  onModuleDestroy() {
    for (const timer of this.timers.values()) {
      clearInterval(timer);
    }
    this.timers.clear();
  }

  private async syncJob(def: JobDef) {
    const id = nextId();
    await this.db.exec(
      `INSERT INTO sys_job (id, name, interval_sec, handler, enabled)
       VALUES (?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE name = VALUES(name), interval_sec = VALUES(interval_sec)`,
      [id, def.name, def.intervalSec, def.handler],
    );
  }

  private startTimer(def: JobDef) {
    if (this.timers.has(def.handler)) {
      clearInterval(this.timers.get(def.handler)!);
    }
    const timer = setInterval(() => {
      void this.runOnce(def.handler).catch(() => undefined);
    }, def.intervalSec * 1000);
    if (typeof timer.unref === 'function') {
      timer.unref();
    }
    this.timers.set(def.handler, timer);
  }

  /**
   * 单次执行指定后台任务。
   */
  async runOnce(
    handler: string,
    opts?: { force?: boolean },
  ): Promise<'ran' | 'skipped-locked' | 'skipped-recent' | 'disabled'> {
    const lockRes = await this.lock.tryRun(`job:${handler}`, async () => {
      const jobRow = await this.db.one<{
        id: number;
        name: string;
        interval_sec: number;
        enabled: number;
        last_run_at: Date | string | null;
      }>('SELECT id, name, interval_sec, enabled, last_run_at FROM sys_job WHERE handler = ?', [handler]);

      if (!jobRow || !jobRow.enabled) {
        return 'disabled' as const;
      }

      const def = this.jobs.get(handler);
      const intervalSec = jobRow.interval_sec ?? def?.intervalSec ?? 60;

      if (!opts?.force && jobRow.last_run_at) {
        const lastRunMs = new Date(jobRow.last_run_at).getTime();
        if (Date.now() - lastRunMs < intervalSec * 1000 - 1000) {
          return 'skipped-recent' as const;
        }
      }

      await this.db.exec('UPDATE sys_job SET last_run_at = NOW(3) WHERE id = ?', [jobRow.id]);

      const logId = nextId();
      await this.db.exec(
        'INSERT INTO sys_job_log (id, job_id, start_at, status) VALUES (?, ?, NOW(3), ?)',
        [logId, jobRow.id, 'RUNNING'],
      );

      let success = false;
      let msg: string | null = null;
      try {
        if (def?.fn) {
          const res = await def.fn();
          success = true;
          msg = typeof res === 'string' ? res.slice(0, 2000) : null;
        } else {
          success = false;
          msg = '任务处理函数未在内存中注册';
        }
      } catch (err: any) {
        success = false;
        msg = String(err?.message || err || '未知错误').slice(0, 2000);
      }

      await this.db.exec(
        'UPDATE sys_job_log SET end_at = NOW(3), status = ?, msg = ? WHERE id = ?',
        [success ? 'OK' : 'FAIL', msg, logId],
      );

      return 'ran' as const;
    });

    if (!lockRes.ran) {
      return 'skipped-locked';
    }

    return lockRes.result;
  }
}
