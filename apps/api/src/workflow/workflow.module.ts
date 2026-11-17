import { Module } from '@nestjs/common';
import { BillEngineModule } from '../bill-engine/bill-engine.module';
import { WfAction2Service } from './wf-action2.service';
import { WfActionService } from './wf-action.service';
import { WfBridge } from './wf-bridge';
import { WfController, WfBillController } from './wf.controller';
import { WfDefinitionService } from './wf-definition.service';
import { WfDelegationService } from './wf-delegation.service';
import { WfEngine } from './wf-engine.service';
import { WfJobs } from './wf-jobs';
import { WfQueryService } from './wf-query.service';
import { WfTaskFactory } from './wf-task.factory';
import { AssigneeResolver } from './assignee.resolver';

@Module({
  imports: [BillEngineModule],
  providers: [
    AssigneeResolver,
    WfTaskFactory,
    WfEngine,
    WfActionService,
    WfAction2Service,
    WfQueryService,
    WfDefinitionService,
    WfDelegationService,
    WfJobs,
    WfBridge,
  ],
  controllers: [WfController, WfBillController],
  exports: [WfEngine, WfActionService, WfAction2Service, WfQueryService, WfDefinitionService],
})
export class WorkflowModule {}
