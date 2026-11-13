import { Global, Logger, Module, OnApplicationBootstrap } from '@nestjs/common';
import { BillEngineRegistry } from './bill-engine.registry';
import { BillStore } from './store/bill-store';
import { BillQueryService } from './service/bill-query.service';
import { LinkService } from './service/link.service';
import { WritebackService } from './service/writeback.service';
import { BillSaveService } from './service/bill-save.service';
import { ConvertService } from './service/convert.service';
import { BillOpService } from './service/bill-op.service';
import { OutboxService } from './service/outbox.service';
import { BillEngineController } from './bill-engine.controller';

@Global()
@Module({
  providers: [
    BillEngineRegistry,
    BillStore,
    BillQueryService,
    LinkService,
    WritebackService,
    BillSaveService,
    ConvertService,
    BillOpService,
    OutboxService,
  ],
  controllers: [BillEngineController],
  exports: [
    BillEngineRegistry,
    BillStore,
    BillQueryService,
    LinkService,
    WritebackService,
    BillSaveService,
    ConvertService,
    BillOpService,
    OutboxService,
  ],
})
export class BillEngineModule implements OnApplicationBootstrap {
  private readonly logger = new Logger('BillEngine');

  constructor(private readonly registry: BillEngineRegistry) {}

  async onApplicationBootstrap() {
    try {
      await this.registry.syncToDb();
    } catch (e: any) {
      this.logger.error('同步单据元数据失败: ' + (e as Error).message);
    }
  }
}
