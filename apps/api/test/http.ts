import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthGuard } from '../src/common/auth.guard';
import { IdempotencyInterceptor } from '../src/common/idempotency.interceptor';
import { ApiLogInterceptor } from '../src/common/api-log.interceptor';
import { ResponseInterceptor } from '../src/common/response.interceptor';
import { AllExceptionsFilter } from '../src/common/exception.filter';

export const ADMIN_NEW = 'Admin#2026xyz';
export const ADMIN_SEED = 'Admin@123';

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalGuards(app.get(AuthGuard));
  app.useGlobalInterceptors(
    app.get(IdempotencyInterceptor),
    app.get(ApiLogInterceptor),
    app.get(ResponseInterceptor),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();
  return app;
}

/** 拿到已改密的管理员 accessToken（可重复调用） */
export async function loginAdminReady(server: any): Promise<{ access: string; refresh: string }> {
  let res = await request(server).post('/api/v1/auth/login').send({ username: 'admin', password: ADMIN_NEW });
  if (res.body.code !== 'OK') {
    res = await request(server).post('/api/v1/auth/login').send({ username: 'admin', password: ADMIN_SEED });
    if (res.body.code === 'OK' && res.body.data.user.mustChangePwd) {
      const ch = await request(server)
        .post('/api/v1/auth/change-pwd')
        .set('Authorization', `Bearer ${res.body.data.accessToken}`)
        .send({ oldPassword: ADMIN_SEED, newPassword: ADMIN_NEW });
      if (ch.body.code !== 'OK') throw new Error('改密失败 ' + JSON.stringify(ch.body));
      res = await request(server).post('/api/v1/auth/login').send({ username: 'admin', password: ADMIN_NEW });
    }
  }
  if (res.body.code !== 'OK') throw new Error('管理员登录失败 ' + JSON.stringify(res.body));
  return { access: res.body.data.accessToken, refresh: res.body.data.refreshToken };
}
