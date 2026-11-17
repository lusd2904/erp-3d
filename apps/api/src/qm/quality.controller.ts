import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, RequirePerm } from '../common/decorators';
import type { AuthUser } from '../common/request-context';
import type { Gb2828Level, Gb2828Strictness } from './gb2828';
import { QualityService } from './quality.service';

@ApiTags('质量管理')
@ApiBearerAuth()
@Controller('qm')
export class QualityController {
  constructor(private readonly quality: QualityService) {}

  @Post('sampling/gb2828/import')
  @RequirePerm('qm_sampling_plan', 'edit')
  @ApiOperation({ summary: '导入 GB/T 2828.1 数据集' })
  importGb2828(@Body() body: any, @CurrentUser() user: AuthUser) {
    return this.quality.importGb2828Dataset({
      version: Number(body.version),
      sourceName: String(body.sourceName ?? ''),
      codeRows: body.codeRows,
      tableRows: body.tableRows,
    }, user);
  }

  @Post('sampling/gb2828/calculate')
  @RequirePerm('qm_sampling_plan', 'view')
  @ApiOperation({ summary: '计算 GB/T 2828.1 抽样方案' })
  calculateGb2828(@Body() body: any) {
    return this.quality.calculateGb2828Sample({
      batchQty: Number(body.batchQty),
      level: String(body.level) as Gb2828Level,
      strictness: String(body.strictness) as Gb2828Strictness,
      aql: Number(body.aql),
    });
  }

  @Get('reports/concession-statistics')
  @RequirePerm('qm_concession_stat', 'view')
  @ApiOperation({ summary: '查询让步接收入库统计' })
  concessionStatistics(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('materialId') materialId?: string,
    @Query('page') page?: string,
    @Query('size') size?: string,
  ) {
    return this.quality.concessionStatistics({
      dateFrom,
      dateTo,
      materialId: materialId ? Number(materialId) : undefined,
      page: page ? Number(page) : undefined,
      size: size ? Number(size) : undefined,
    });
  }
}
