import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PushRequest } from '@erp3d/shared';
import { DbService } from '../db/db.service';
import { BillQueryService } from './service/bill-query.service';
import { LinkService } from './service/link.service';
import { BillOpService } from './service/bill-op.service';
import { ConvertService } from './service/convert.service';
import { OpParams } from './engine.types';

@ApiTags('单据引擎')
@ApiBearerAuth()
@Controller()
export class BillEngineController {
  constructor(
    private readonly query: BillQueryService,
    private readonly links: LinkService,
    private readonly ops: BillOpService,
    private readonly convert: ConvertService,
    private readonly db: DbService,
  ) {}

  @Get('meta/bills/:form')
  async meta(@Param('form') form: string) {
    return this.query.meta(form);
  }

  @Get('bills/:form')
  async list(@Param('form') form: string, @Query() q: any) {
    return this.query.list(form, q);
  }

  @Get('bills/:form/:id')
  async view(@Param('form') form: string, @Param('id') id: string) {
    return this.query.view(form, Number(id));
  }

  @Post('bills/:form')
  async create(
    @Param('form') form: string,
    @Query('mode') mode: 'draft' | 'save' = 'save',
    @Body() body: any,
  ) {
    return this.ops.save(form, null, body, mode === 'draft' ? 'draft' : 'save');
  }

  @Put('bills/:form/:id')
  async update(
    @Param('form') form: string,
    @Param('id') id: string,
    @Query('mode') mode: 'draft' | 'save' = 'save',
    @Body() body: any,
  ) {
    return this.ops.save(form, Number(id), body, mode === 'draft' ? 'draft' : 'save');
  }

  @Post('bills/:form/batch-ops/:op')
  async batch(
    @Param('form') form: string,
    @Param('op') op: string,
    @Body() body: { ids: (number | string)[]; [k: string]: unknown },
  ) {
    const { ids, ...rest } = body || {};
    return this.ops.batch(form, op, (ids || []).map(Number), rest);
  }

  @Post('bills/:form/:id/ops/:op')
  async execOp(
    @Param('form') form: string,
    @Param('id') id: string,
    @Param('op') op: string,
    @Query('target') queryTarget: string,
    @Body() body: OpParams,
  ) {
    const params: OpParams = { ...body };
    if (queryTarget && !params.target) {
      params.target = queryTarget;
    }
    return this.ops.execOp(form, Number(id), op, params);
  }

  @Get('bills/:form/:id/links')
  async getLinks(
    @Param('form') form: string,
    @Param('id') id: string,
    @Query('dir') dir: 'up' | 'down' = 'down',
  ) {
    return this.links.query(form, Number(id), dir === 'up' ? 'up' : 'down');
  }

  @Post('convert/:rule')
  async convertBill(@Param('rule') rule: string, @Body() body: PushRequest) {
    return this.db.tx(() => this.convert.push(rule, body));
  }
}
