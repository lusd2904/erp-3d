import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { DbModule } from './db/db.module';
import { PlatformInfraModule } from './common/platform-infra.module';
import { CoreModule } from './core/core.module';
import { BillEngineModule } from './bill-engine/bill-engine.module';
import { EngineSamplesModule } from './bill-engine/samples/engine-samples.module';
import { TraceMiddleware } from './common/trace.middleware';

@Module({
  imports: [DbModule, PlatformInfraModule, CoreModule, BillEngineModule, EngineSamplesModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 全路由接入链路追踪上下文
    consumer.apply(TraceMiddleware).forRoutes('*');
  }
}
