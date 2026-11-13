import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { DbModule } from './db/db.module';
import { CoreModule } from './core/core.module';
import { TraceMiddleware } from './common/trace.middleware';

@Module({
  imports: [DbModule, CoreModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 全路由接入链路追踪上下文
    consumer.apply(TraceMiddleware).forRoutes('*');
  }
}
