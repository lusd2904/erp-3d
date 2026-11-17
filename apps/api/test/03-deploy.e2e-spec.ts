/**
 * 部署约束：MySQL 锁、定时任务防重复、配置默认值、存储驱动（本地 + S3 兼容）。
 * S3 驱动用本机 moto_server 模拟（/workspace/.venv-moto），不连任何真实服务器；找不到 moto 时跳过该用例。
 */
import { INestApplication } from '@nestjs/common';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as net from 'net';
import { Readable } from 'stream';
import { CreateBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { createTestApp } from './http';
import { MysqlLockService } from '../src/common/mysql-lock.service';
import { JobScheduler } from '../src/common/job-scheduler.service';
import { DbService } from '../src/db/db.service';
import { loadConfig } from '../src/config/config';
import { LocalDiskDriver } from '../src/common/storage/local-disk.driver';
import { S3Driver } from '../src/common/storage/s3.driver';
import { createStorageDriver } from '../src/common/storage/storage.module';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function readAll(s: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const c of s) chunks.push(Buffer.from(c));
  return Buffer.concat(chunks).toString('utf8');
}

describe('部署约束', () => {
  let app: INestApplication;
  let lock: MysqlLockService;
  let jobs: JobScheduler;
  let db: DbService;

  beforeAll(async () => {
    app = await createTestApp();
    lock = app.get(MysqlLockService);
    jobs = app.get(JobScheduler);
    db = app.get(DbService);
  });
  afterAll(async () => {
    await app.close();
  });

  it('配置默认值：端口 8080、连接池 9（上限 10）', () => {
    const keep = { ...process.env };
    try {
      delete process.env.PORT;
      delete process.env.DB_POOL_MAX;
      process.env.DOTENV_PATH = '/nonexistent.env';
      let c = loadConfig();
      expect(c.port).toBe(8080);
      expect(c.db.poolMax).toBe(9);
      process.env.DB_POOL_MAX = '50';
      c = loadConfig();
      expect(c.db.poolMax).toBe(10);
      expect(c.storage.driver).toBe('local');
      expect(c.storage.s3.bucket).toBe('erp3d-files');
    } finally {
      process.env = keep;
    }
  });

  it('MySQL 锁：同名并发只有一个执行，释放后可再拿', async () => {
    let running = 0;
    let maxRunning = 0;
    const work = async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await sleep(300);
      running--;
      return 'done';
    };
    const [a, b] = await Promise.all([lock.tryRun('t-lock', work), lock.tryRun('t-lock', work)]);
    expect([a.ran, b.ran].filter(Boolean)).toHaveLength(1);
    expect(maxRunning).toBe(1);
    expect(await lock.isFree('t-lock')).toBe(true);
    const c = await lock.tryRun('t-lock', async () => 1);
    expect(c).toEqual({ ran: true, result: 1 });
    // 等待模式：第二个等第一个释放后执行
    let signalWaitLockAcquired!: () => void;
    let releaseWaitLock!: () => void;
    const waitLockAcquired = new Promise<void>((resolve) => {
      signalWaitLockAcquired = resolve;
    });
    const waitLockRelease = new Promise<void>((resolve) => {
      releaseWaitLock = resolve;
    });
    const pd = lock.tryRun('t-wait', async () => {
      signalWaitLockAcquired();
      await waitLockRelease;
    });
    await Promise.race([
      waitLockAcquired,
      pd.then(() => {
        throw new Error('首个任务未取得等待测试锁');
      }),
    ]);
    // 确认首个任务持锁后启动等待方；延时仅用于保留持锁窗口。
    const [d, e] = await Promise.all([
      pd,
      lock.tryRun('t-wait', async () => 2, { waitSec: 3 }),
      sleep(200).then(() => releaseWaitLock()),
    ]);
    expect(d.ran && e.ran).toBe(true);
    expect(lock.lockName('x'.repeat(100)).length).toBeLessThanOrEqual(64);
  });

  it('fn 抛错也会释放锁', async () => {
    await expect(lock.tryRun('t-err', async () => { throw new Error('boom'); })).rejects.toThrow('boom');
    expect(await lock.isFree('t-err')).toBe(true);
  });

  it('定时任务：两台同时触发只跑一次；刚跑过的跳过；失败写日志', async () => {
    let count = 0;
    await jobs.register({ handler: 'test.job', name: '测试任务', intervalSec: 60, fn: async () => { count++; await sleep(300); return 'ok'; } });
    const r = await Promise.all([jobs.runOnce('test.job'), jobs.runOnce('test.job')]);
    expect(r.sort()).toEqual(['ran', 'skipped-locked']);
    expect(count).toBe(1);
    expect(await jobs.runOnce('test.job')).toBe('skipped-recent');
    expect(await jobs.runOnce('test.job', { force: true })).toBe('ran');
    expect(count).toBe(2);
    const job = await db.one<any>(`SELECT id FROM sys_job WHERE handler = 'test.job'`);
    const logs = await db.q<any>(`SELECT status, msg FROM sys_job_log WHERE job_id = ? ORDER BY start_at`, [job.id]);
    expect(logs.map((l) => l.status)).toEqual(['OK', 'OK']);

    await jobs.register({ handler: 'test.fail', name: '失败任务', intervalSec: 60, fn: async () => { throw new Error('任务出错'); } });
    expect(await jobs.runOnce('test.fail')).toBe('ran');
    const job2 = await db.one<any>(`SELECT id FROM sys_job WHERE handler = 'test.fail'`);
    const log2 = await db.one<any>(`SELECT status, msg FROM sys_job_log WHERE job_id = ?`, [job2.id]);
    expect(log2.status).toBe('FAIL');
    expect(log2.msg).toContain('任务出错');

    await db.exec(`UPDATE sys_job SET enabled = 0 WHERE handler = 'test.fail'`);
    expect(await jobs.runOnce('test.fail', { force: true })).toBe('disabled');
  });

  it('本地磁盘驱动：读写删、拒绝路径穿越', async () => {
    const d = new LocalDiskDriver(process.env.FILES_DIR!);
    await d.put('t/a.txt', Buffer.from('你好'), 'text/plain');
    expect(await d.exists('t/a.txt')).toBe(true);
    expect(await readAll(await d.get('t/a.txt'))).toBe('你好');
    await d.delete('t/a.txt');
    expect(await d.exists('t/a.txt')).toBe(false);
    await expect(d.put('../x.txt', Buffer.from('x'))).rejects.toThrow();
  });

  it('选择 s3 但缺环境变量时报错', () => {
    const c = loadConfig();
    c.storage.driver = 's3';
    c.storage.s3.endpoint = undefined;
    expect(() => createStorageDriver(c)).toThrow(/S3_ENDPOINT/);
  });

  const motoBin = '/workspace/.venv-moto/bin/moto_server';
  (fs.existsSync(motoBin) ? it : it.skip)('S3 驱动（本机 moto 模拟 S3）：读写删', async () => {
    const port: number = await new Promise((resolve) => {
      const s = net.createServer().listen(0, '127.0.0.1', () => { const p = (s.address() as net.AddressInfo).port; s.close(() => resolve(p)); });
    });
    const proc: ChildProcess = spawn(motoBin, ['-H', '127.0.0.1', '-p', String(port)], { stdio: 'ignore' });
    try {
      const endpoint = `http://127.0.0.1:${port}`;
      for (let i = 0; i < 50; i++) {
        const ok = await new Promise<boolean>((r) => { const so = net.connect(port, '127.0.0.1', () => { so.end(); r(true); }); so.on('error', () => r(false)); });
        if (ok) break;
        await sleep(200);
      }
      const creds = { accessKeyId: 'testing', secretAccessKey: 'testing' };
      await new S3Client({ endpoint, region: 'us-east-1', forcePathStyle: true, credentials: creds }).send(new CreateBucketCommand({ Bucket: 'erp3d-files' }));
      const d = new S3Driver({ endpoint, region: 'us-east-1', bucket: 'erp3d-files', ...creds, forcePathStyle: true, prefix: 'test/' });
      await d.put('scm/2026/11/1-a.txt', Buffer.from('附件内容'), 'text/plain');
      expect(await d.exists('scm/2026/11/1-a.txt')).toBe(true);
      expect(await readAll(await d.get('scm/2026/11/1-a.txt'))).toBe('附件内容');
      await d.delete('scm/2026/11/1-a.txt');
      expect(await d.exists('scm/2026/11/1-a.txt')).toBe(false);
      await expect(d.get('nope.txt')).rejects.toMatchObject({ code: 'SYS_NOT_FOUND' });
    } finally {
      proc.kill();
    }
  }, 30000);
});
