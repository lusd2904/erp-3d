import { Module, OnModuleInit, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { BillEngineRegistry } from '../bill-engine.registry';
import { SCM_PUR_REQ_META } from './scm-pur-req.meta';
import { SCM_PUR_ORDER_META } from './scm-pur-order.meta';
import { PUR_REQ_HOOKS } from './pur-req.hooks';
import {
  RULE_PUR_REQ_TO_ORDER,
  WB_PUR_REQ_LINK_QTY,
  WB_PUR_REQ_ORDER_QTY,
  WB_PUR_REQ_REMAIN_QTY,
} from './pur-rules';

/**
 * 样例单据模块：仅用于引擎验收测试。
 * WP08 采购模块接手后删除本目录并改由 ScmModule 注册。
 */
@Module({})
export class EngineSamplesModule implements OnModuleInit, OnApplicationBootstrap {
  private readonly logger = new Logger('EngineSamplesModule');

  constructor(private readonly registry: BillEngineRegistry) {}

  onModuleInit(): void {
    if (process.env.ENGINE_SAMPLES !== 'true') return;

    // 注册采购申请单
    this.registry.registerBill({
      meta: SCM_PUR_REQ_META,
      hooks: PUR_REQ_HOOKS,
      converts: [RULE_PUR_REQ_TO_ORDER],
    });

    // 注册采购订单
    this.registry.registerBill({
      meta: SCM_PUR_ORDER_META,
      writebacks: [WB_PUR_REQ_LINK_QTY, WB_PUR_REQ_ORDER_QTY, WB_PUR_REQ_REMAIN_QTY],
    });
  }

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.ENGINE_SAMPLES !== 'true') return;

    try {
      await this.registry.ensureTables(SCM_PUR_REQ_META.form);
      await this.registry.ensureTables(SCM_PUR_ORDER_META.form);
    } catch (e) {
      this.logger.error('样例单据自动建表失败: ' + (e as Error).message);
    }
  }
}
