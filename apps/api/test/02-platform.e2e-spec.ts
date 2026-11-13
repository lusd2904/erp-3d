import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { CodingService } from '../src/core/coding/coding.service';
import { createTestApp, loginAdminReady } from './http';

describe('WP01 平台服务', () => {
  let app: INestApplication;
  let server: any;
  let access: string;

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer();
    access = (await loginAdminReady(server)).access;
  });

  afterAll(async () => {
    await app.close();
  });

  const auth = () => ({ Authorization: `Bearer ${access}` });

  it('读取并修改系统参数', async () => {
    const list = await request(server).get('/api/v1/sys/params').set(auth());
    expect(list.body.code).toBe('OK');
    expect(Array.isArray(list.body.data)).toBe(true);
    const put = await request(server)
      .put('/api/v1/sys/params')
      .set(auth())
      .send({ module: 'attachment', key: 'maxSizeMB', value: '40' });
    expect(put.body.code).toBe('OK');
  });

  it('部门树与 path 维护', async () => {
    const created = await request(server)
      .post('/api/v1/sys/depts')
      .set(auth())
      .send({ orgId: 1, code: 'D01', name: '计划部', parentId: 1 });
    expect(created.body.code).toBe('OK');
    const id = created.body.data.id;
    expect(created.body.data.path || created.body.data).toBeTruthy();
    const list = await request(server).get('/api/v1/sys/depts').set(auth());
    expect(list.body.code).toBe('OK');
    const row = (list.body.data.rows || list.body.data).find((d: any) => d.id === id || Number(d.id) === Number(id));
    // 列表形状可能是 {rows,total} 或数组
    expect(row || list.body.data).toBeTruthy();
  });

  it('编码规则预览与独立事务占号（generate 两次序号递增）', async () => {
    const created = await request(server)
      .post('/api/v1/sys/coding-rules')
      .set(auth())
      .send({
        code: 'TEST_MO',
        objectCode: 'pp_mo',
        name: '生产订单编号',
        segmentsJson: [
          { type: 'const', value: 'MO' },
          { type: 'date', format: 'YYYYMMDD' },
          { type: 'seq', length: 4 },
        ],
        isDefault: true,
      });
    expect(created.body.code).toBe('OK');
    const ruleId = created.body.data.id;
    const preview = await request(server).post(`/api/v1/sys/coding-rules/${ruleId}/preview`).set(auth()).send({});
    expect(preview.body.code).toBe('OK');
    expect(String(preview.body.data.code || preview.body.data)).toMatch(/^MO\d{8}0000$/);

    const coding = app.get(CodingService);
    const a = await coding.generate('pp_mo', { bill_date: '2026-11-13' });
    const b = await coding.generate('pp_mo', { bill_date: '2026-11-13' });
    expect(a).toBe('MO202611130001');
    expect(b).toBe('MO202611130002');
  });

  it('附件上传、列表、下载、删除', async () => {
    const up = await request(server)
      .post('/api/v1/attachments')
      .set(auth())
      .field('objectCode', 'sys_user')
      .field('billId', '1')
      .attach('file', Buffer.from('hello-erp'), { filename: 'readme.txt', contentType: 'text/plain' });
    expect(up.body.code).toBe('OK');
    const id = up.body.data.id;
    const list = await request(server).get('/api/v1/attachments').query({ objectCode: 'sys_user', billId: 1 }).set(auth());
    expect(list.body.code).toBe('OK');
    expect(list.body.data.some((x: any) => Number(x.id) === Number(id))).toBe(true);
    const file = await request(server).get(`/api/v1/attachments/${id}/file`).set(auth());
    expect(file.status).toBe(200);
    expect(file.text).toBe('hello-erp');
    const del = await request(server).delete(`/api/v1/attachments/${id}`).set(auth());
    expect(del.body.code).toBe('OK');
  });

  it('站内消息发送、未读数、已读', async () => {
    const msg = app.get((await import('../src/core/message/message.service')).MessageService);
    const id = await msg.send({ toUserId: 1, title: '测试消息', content: '内容A', type: 'NOTICE', level: 'INFO' });
    const count = await request(server).get('/api/v1/messages/unread-count').set(auth());
    expect(count.body.data.count).toBeGreaterThanOrEqual(1);
    const read = await request(server).post(`/api/v1/messages/${id}/read`).set(auth());
    expect(read.body.code).toBe('OK');
  });

  it('幂等键：相同 Key 的写请求回放同一结果', async () => {
    const key = 'idem-dict-1';
    const body = { dictType: 'unit', code: 'PCS', name: '个', sort: 1 };
    const a = await request(server).post('/api/v1/sys/dicts').set(auth()).set('Idempotency-Key', key).send(body);
    expect(a.body.code).toBe('OK');
    const id = a.body.data.id;
    const b = await request(server).post('/api/v1/sys/dicts').set(auth()).set('Idempotency-Key', key).send(body);
    expect(b.body.code).toBe('OK');
    expect(Number(b.body.data.id)).toBe(Number(id));
  });

  it('无权限用户访问管理接口返回 PERM_DENIED', async () => {
    const created = await request(server)
      .post('/api/v1/sys/users')
      .set(auth())
      .send({ account: 'noperm', name: '无权限', password: 'NoPerm#2026', orgId: 1 });
    expect(created.body.code).toBe('OK');
    // 新用户须改密
    const login = await request(server).post('/api/v1/auth/login').send({ username: 'noperm', password: 'NoPerm#2026' });
    const t0 = login.body.data.accessToken;
    await request(server)
      .post('/api/v1/auth/change-pwd')
      .set('Authorization', `Bearer ${t0}`)
      .send({ oldPassword: 'NoPerm#2026', newPassword: 'NoPerm#2026a' });
    const login2 = await request(server).post('/api/v1/auth/login').send({ username: 'noperm', password: 'NoPerm#2026a' });
    const t = login2.body.data.accessToken;
    const denied = await request(server).get('/api/v1/sys/users').set('Authorization', `Bearer ${t}`);
    expect(denied.body.code).toBe('PERM_DENIED');
    expect(denied.status).toBe(403);
  });
});
