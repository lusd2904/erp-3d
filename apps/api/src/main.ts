import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import * as fs from 'fs';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { config } from './config/config';
import { AuthGuard } from './common/auth.guard';
import { IdempotencyInterceptor } from './common/idempotency.interceptor';
import { ApiLogInterceptor } from './common/api-log.interceptor';
import { ResponseInterceptor } from './common/response.interceptor';
import { AllExceptionsFilter } from './common/exception.filter';

async function bootstrap() {
  // 确保附件根存储目录存在
  if (!fs.existsSync(config.filesDir)) {
    fs.mkdirSync(config.filesDir, { recursive: true });
  }

  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.use(json({ limit: '2mb' }));
  app.use(urlencoded({ extended: true, limit: '2mb' }));

  // 全局接口前缀
  app.setGlobalPrefix('api/v1');

  // 全局鉴权守卫
  app.useGlobalGuards(app.get(AuthGuard));

  // Nest 全局拦截器在请求阶段按注册顺序执行（Idempotency -> ApiLog -> Response），
  // 在响应阶段按注册相反顺序执行（Response -> ApiLog -> Idempotency）。
  // 因此：返回阶段先由 ResponseInterceptor 包装为统一格式 { code: 'OK', msg: '', data, traceId }，
  // ApiLogInterceptor 记录耗时与最终状态，
  // 最后 IdempotencyInterceptor 将包装后的完整响应体和 HTTP 状态存入 sys_idempotent_key。
  app.useGlobalInterceptors(
    app.get(IdempotencyInterceptor),
    app.get(ApiLogInterceptor),
    app.get(ResponseInterceptor),
  );

  // 全局异常过滤器
  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger 在 /api/docs（不挂在 api/v1 下）
  const swaggerConfig = new DocumentBuilder()
    .setTitle('芯程电子元器件生产管理 ERP')
    .setDescription('芯程电子元器件生产管理 ERP 接口契约')
    .setVersion('0.1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(config.port);
}

void bootstrap();
