import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, loginAdminReady } from '../http';
import { BillEngineRegistry } from '../../src/bill-engine/bill-engine.registry';
import type { RegisterBillOptions } from '../../src/bill-engine/engine.types';
import { DbService } from '../../src/db/db.service';

export interface Ctx {
  app: INestApplication;
  server: any;
  access: string;
  registry: BillEngineRegistry;
  db: DbService;
}

export async function setup(bills: RegisterBillOptions[] = []): Promise<Ctx> {
  const app = await createTestApp();
  const server = app.getHttpServer();
  const { access } = await loginAdminReady(server);
  const registry = app.get(BillEngineRegistry);
  const db = app.get(DbService);
  for (const b of bills) registry.registerBill(b);
  for (const b of bills) {
    await registry.ensureTables(b.meta.form);
    await registry.syncToDb(b.meta.form);
  }
  return { app, server, access, registry, db };
}

/** 调接口，返回统一响应体 { code, msg, data, errors } */
export async function api(c: Ctx, method: 'get' | 'post' | 'put', path: string, body?: unknown) {
  let r = request(c.server)[method]('/api/v1' + path).set('Authorization', `Bearer ${c.access}`);
  if (body !== undefined) r = r.send(body as any);
  const res = await r;
  return res.body as { code: string; msg: string; data: any; errors?: any[] };
}

/** 断言成功并返回 data */
export async function ok(c: Ctx, method: 'get' | 'post' | 'put', path: string, body?: unknown) {
  const r = await api(c, method, path, body);
  if (r.code !== 'OK') throw new Error(`${method.toUpperCase()} ${path} 失败：${r.code} ${r.msg} ${JSON.stringify(r.errors ?? '')}`);
  return r.data;
}

/** 新建并保存、提交、审核，返回 BillView */
export async function createAudited(c: Ctx, form: string, header: any, entries: any[]) {
  const v = await ok(c, 'post', `/bills/${form}`, { header, entries });
  const id = v.header.id;
  await ok(c, 'post', `/bills/${form}/${id}/ops/submit`);
  return ok(c, 'post', `/bills/${form}/${id}/ops/audit`);
}

export const num = (v: unknown) => Number(v);
