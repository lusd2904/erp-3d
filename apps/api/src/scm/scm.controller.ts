import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, RequirePerm } from '../common/decorators';
import type { AuthUser } from '../common/request-context';
import { dateToIsoWeekDateCode, isoWeekDateCodeToDate } from './services/date-code';
import { InventoryService } from './services/inventory.service';

@ApiTags('库存与条码')
@ApiBearerAuth()
@Controller('scm')
export class ScmController {
  constructor(private readonly inventory: InventoryService) {}

  @Get('inventory/query')
  @RequirePerm('scm_inventory', 'view')
  @ApiOperation({ summary: '查询即时库存维度' })
  queryInventory(
    @Query('materialId') materialId: string,
    @Query('warehouseId') warehouseId: string,
    @Query('stockStatusId') stockStatusId: string,
    @Query('lotNo') lotNo: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.inventory.queryInventory({
      orgId: user.orgId,
      materialId: Number(materialId),
      warehouseId: warehouseId ? Number(warehouseId) : undefined,
      stockStatusId: stockStatusId ? Number(stockStatusId) : undefined,
      lotNo,
    });
  }

  @Post('inventory/fifo-check')
  @RequirePerm('scm_inventory', 'view')
  @ApiOperation({ summary: '校验卷盘先进先出顺序' })
  checkFifo(@Body() body: any, @CurrentUser() user: AuthUser) {
    return this.inventory.checkFifo({
      barcode: String(body.barcode ?? ''),
      materialId: Number(body.materialId),
      warehouseId: Number(body.warehouseId),
      orgId: user.orgId,
    });
  }

  @Post('barcode/scan')
  @RequirePerm('bc_barcode_master', 'view')
  @ApiOperation({ summary: '扫描卷盘条码' })
  scanBarcode(@Body() body: any, @CurrentUser() user: AuthUser) {
    return this.inventory.scanBarcode({
      barcode: String(body.barcode ?? ''),
      form: String(body.form ?? ''),
      billId: Number(body.billId),
      entryId: body.entryId === undefined ? undefined : Number(body.entryId),
      device: body.device === undefined ? undefined : String(body.device),
    }, user.id, user.orgId);
  }

  @Post('inventory/date-code/parse')
  @RequirePerm('scm_inventory', 'view')
  @ApiOperation({ summary: '解析 ISO 周期码' })
  parseDateCode(@Body() body: any) {
    const dateCode = String(body.dateCode ?? '');
    const productionDate = isoWeekDateCodeToDate(dateCode);
    return { dateCode, productionDate };
  }

  @Post('inventory/date-code/format')
  @RequirePerm('scm_inventory', 'view')
  @ApiOperation({ summary: '按 ISO 周生成周期码' })
  formatDateCode(@Body() body: any) {
    const productionDate = String(body.productionDate ?? '');
    return { productionDate, dateCode: dateToIsoWeekDateCode(productionDate) };
  }
}
