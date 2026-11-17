import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ErrorCodes } from '@erp3d/shared';
import { BizError } from '../common/biz-error';
import { CurrentUser } from '../common/decorators';
import type { AuthUser } from '../common/request-context';
import { BillQueryService } from '../bill-engine/service/bill-query.service';
import { WfAction2Service } from './wf-action2.service';
import { WfActionService } from './wf-action.service';
import { WfDefinitionService } from './wf-definition.service';
import { WfDelegationService, type WfDelegationInput } from './wf-delegation.service';
import { WfQueryService } from './wf-query.service';
import type { AddSignInput, ApproveInput, RejectInput, TransferInput, WfTemplateInput } from './wf.types';

@ApiTags('审批流')
@ApiBearerAuth()
@Controller('wf')
export class WfController {
  constructor(
    private readonly query: WfQueryService,
    private readonly actions: WfActionService,
    private readonly actions2: WfAction2Service,
    private readonly definitions: WfDefinitionService,
    private readonly delegations: WfDelegationService,
  ) {}

  @Get('tasks/todo')
  todo(@CurrentUser() user: AuthUser, @Query() query: { page?: number; size?: number }) {
    return this.query.todo(user, query);
  }

  @Get('tasks/done')
  done(@CurrentUser() user: AuthUser, @Query() query: { page?: number; size?: number }) {
    return this.query.done(user, query);
  }

  @Get('tasks/cc')
  cc(@CurrentUser() user: AuthUser, @Query() query: { page?: number; size?: number }) {
    return this.query.cc(user, query);
  }

  @Get('instances/started')
  started(@CurrentUser() user: AuthUser, @Query() query: { page?: number; size?: number }) {
    return this.query.started(user, query);
  }

  @Get('delegations')
  listDelegations(@CurrentUser() user: AuthUser) {
    return this.delegations.list(user);
  }

  @Post('delegations')
  createDelegation(@Body() body: WfDelegationInput, @CurrentUser() user: AuthUser) {
    return this.delegations.create(body, user);
  }

  @Post('delegations/:id/revoke')
  revokeDelegation(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.delegations.revoke(id, user);
  }

  @Post('tasks/:id/approve')
  approve(@Param('id', ParseIntPipe) id: number, @Body() body: Omit<ApproveInput, 'taskId'>, @CurrentUser() user: AuthUser) {
    return this.actions.approve({ ...body, taskId: id }, user);
  }

  @Post('tasks/:id/disagree')
  disagree(@Param('id', ParseIntPipe) id: number, @Body() body: Omit<ApproveInput, 'taskId'>, @CurrentUser() user: AuthUser) {
    return this.actions.disagree({ ...body, taskId: id }, user);
  }

  @Post('tasks/:id/reject')
  reject(@Param('id', ParseIntPipe) id: number, @Body() body: Omit<RejectInput, 'taskId'>, @CurrentUser() user: AuthUser) {
    return this.actions2.reject({ ...body, taskId: id }, user);
  }

  @Post('tasks/:id/transfer')
  transfer(@Param('id', ParseIntPipe) id: number, @Body() body: Omit<TransferInput, 'taskId'>, @CurrentUser() user: AuthUser) {
    return this.actions2.transfer({ ...body, taskId: id }, user);
  }

  @Post('tasks/:id/add-sign')
  addSign(@Param('id', ParseIntPipe) id: number, @Body() body: Omit<AddSignInput, 'taskId'>, @CurrentUser() user: AuthUser) {
    return this.actions2.addSign({ ...body, taskId: id }, user);
  }

  @Post('instances/:id/withdraw')
  withdraw(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.actions2.withdraw(id, user);
  }

  @Post('instances/:id/terminate')
  terminate(@Param('id', ParseIntPipe) id: number, @Body() body: { opinion?: string }, @CurrentUser() user: AuthUser) {
    return this.actions2.terminate(id, user, body?.opinion);
  }

  @Post('definitions/validate')
  validate(@Body() body: { bpmnXml?: string }) {
    return this.definitions.validate(body?.bpmnXml ?? '');
  }

  @Get('definitions')
  listDefinitions(@CurrentUser() user: AuthUser, @Query('form') form?: string) {
    return this.definitions.list(form, user);
  }

  @Get('templates')
  listTemplates(@CurrentUser() user: AuthUser, @Query('form') form?: string) {
    return this.definitions.listTemplates(user, form);
  }

  @Post('definitions/draft')
  saveDraft(@Body() body: { defKey: string; name: string; form: string; bpmnXml: string }, @CurrentUser() user: AuthUser) {
    this.assertAdministrator(user);
    return this.definitions.saveDraft(body, user);
  }

  @Post('definitions/:key/publish')
  publish(@Param('key') key: string, @CurrentUser() user: AuthUser) {
    this.assertAdministrator(user);
    return this.definitions.publish(key, user);
  }

  @Post('templates')
  upsertTemplate(@Body() body: WfTemplateInput, @CurrentUser() user: AuthUser) {
    this.assertAdministrator(user);
    return this.definitions.upsertTemplate(body, user);
  }

  private assertAdministrator(user: AuthUser) {
    if (!user.isSuper) throw new BizError(ErrorCodes.PERM_DENIED, '只有系统管理员可以管理审批流程定义');
  }
}

@ApiTags('单据审批历史')
@ApiBearerAuth()
@Controller('bills')
export class WfBillController {
  constructor(
    private readonly query: WfQueryService,
    private readonly bills: BillQueryService,
  ) {}

  @Get(':form/:id/flow')
  async flow(@Param('form') form: string, @Param('id', ParseIntPipe) id: number) {
    await this.bills.view(form, id);
    return this.query.flow(form, id);
  }
}
