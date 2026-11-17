import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { DbModule } from './db/db.module';
import { PlatformInfraModule } from './common/platform-infra.module';
import { CoreModule } from './core/core.module';
import { BillEngineModule } from './bill-engine/bill-engine.module';
import { EngineSamplesModule } from './bill-engine/samples/engine-samples.module';
import { TraceMiddleware } from './common/trace.middleware';
import { WorkflowModule } from './workflow/workflow.module';
import { ScmModule } from './scm/scm.module';
import { QmModule } from './qm/qm.module';

@Module({
  imports: [DbModule, PlatformInfraModule, CoreModule, BillEngineModule, WorkflowModule, EngineSamplesModule, ScmModule, QmModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 全路由接入链路追踪上下文
    consumer.apply(TraceMiddleware).forRoutes('*');
  }
}
