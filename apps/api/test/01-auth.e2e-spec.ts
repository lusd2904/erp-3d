import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, ADMIN_NEW, ADMIN_SEED, loginAdminReady } from './http';

describe('WP01 鉴权', () => {
  let app: INestApplication;
  let server: any;

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  it('错误密码返回 AUTH_BAD_CREDENTIALS，响应体含 traceId', async () => {
    const res = await request(server).post('/api/v1/auth/login').send({ username: 'admin', password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('AUTH_BAD_CREDENTIALS');
    expect(res.body.traceId).toBeTruthy();
  });

  it('不带 token 返回 AUTH_REQUIRED；错误 token 返回 AUTH_INVALID_TOKEN', async () => {
    const a = await request(server).get('/api/v1/auth/me');
    expect(a.body.code).toBe('AUTH_REQUIRED');
    const b = await request(server).get('/api/v1/auth/me').set('Authorization', 'Bearer not-a-jwt');
    expect(b.body.code).toBe('AUTH_INVALID_TOKEN');
  });

  it('首次登录须改密：mustChangePwd、未改密被拦截、改密后可访问', async () => {
    let res = await request(server).post('/api/v1/auth/login').send({ username: 'admin', password: ADMIN_SEED });
    if (res.body.code === 'OK' && res.body.data.user.mustChangePwd) {
      const access0 = res.body.data.accessToken;
      const blocked = await request(server).get('/api/v1/sys/params').set('Authorization', `Bearer ${access0}`);
      expect(blocked.status).toBe(403);
      expect(blocked.body.code).toBe('AUTH_MUST_CHANGE_PWD');

      const me = await request(server).get('/api/v1/auth/me').set('Authorization', `Bearer ${access0}`);
      expect(me.status).toBe(200);
      expect(me.body.data.username).toBe('admin');
      expect(me.body.data.isSuper).toBe(true);

      const weak = await request(server)
        .post('/api/v1/auth/change-pwd')
        .set('Authorization', `Bearer ${access0}`)
        .send({ oldPassword: ADMIN_SEED, newPassword: 'abc12345' });
      expect(weak.body.code).toBe('AUTH_WEAK_PASSWORD');

      const ch = await request(server)
        .post('/api/v1/auth/change-pwd')
        .set('Authorization', `Bearer ${access0}`)
        .send({ oldPassword: ADMIN_SEED, newPassword: ADMIN_NEW });
      expect(ch.status).toBe(200);
      expect(ch.body.code).toBe('OK');
    }

    const again = await request(server).post('/api/v1/auth/login').send({ username: 'admin', password: ADMIN_NEW });
    expect(again.status).toBe(200);
    expect(again.body.code).toBe('OK');
    expect(again.body.data.user.mustChangePwd).toBe(false);
  });

  it('刷新令牌可以换到新的一对令牌，旧刷新令牌失效', async () => {
    const { access, refresh } = await loginAdminReady(server);
    expect(access).toBeTruthy();
    const res = await request(server).post('/api/v1/auth/refresh').send({ refreshToken: refresh });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
    const replay = await request(server).post('/api/v1/auth/refresh').send({ refreshToken: refresh });
    expect(replay.body.code).toBe('AUTH_INVALID_TOKEN');
  });

  it('新建用户连续失败会被锁定', async () => {
    const { access } = await loginAdminReady(server);
    const created = await request(server)
      .post('/api/v1/sys/users')
      .set('Authorization', `Bearer ${access}`)
      .send({ account: 'lockme', name: '锁定测试', password: 'Lock#2026aa', orgId: 1 });
    expect(created.body.code).toBe('OK');
    await request(server).post('/api/v1/auth/login').send({ username: 'lockme', password: 'bad1' });
    await request(server).post('/api/v1/auth/login').send({ username: 'lockme', password: 'bad2' });
    const third = await request(server).post('/api/v1/auth/login').send({ username: 'lockme', password: 'bad3' });
    expect(third.body.code).toBe('AUTH_LOCKED');
    const evenRight = await request(server).post('/api/v1/auth/login').send({ username: 'lockme', password: 'Lock#2026aa' });
    expect(evenRight.body.code).toBe('AUTH_LOCKED');
  });

  it('退出登录后刷新令牌失效', async () => {
    const { access, refresh } = await loginAdminReady(server);
    await request(server)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${access}`)
      .send({ refreshToken: refresh });
    const res = await request(server).post('/api/v1/auth/refresh').send({ refreshToken: refresh });
    expect(res.body.code).toBe('AUTH_INVALID_TOKEN');
  });
});
