import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePerm } from '../../common/decorators';
import { ParamService } from '../param.service';

@ApiTags('系统配置-系统参数')
@ApiBearerAuth()
@Controller('sys/params')
export class ParamController {
  constructor(private paramService: ParamService) {}

  @Get()
  @RequirePerm('sys_param', 'view')
  @ApiOperation({ summary: '查询系统参数列表' })
  list(@Query('module') module?: string) {
    return this.paramService.list(module);
  }

  @Put()
  @RequirePerm('sys_param', 'edit')
  @ApiOperation({ summary: '更新或新增参数（支持单个或批量）' })
  async set(
    @Body()
    body:
      | { module: string; key: string; value: string; scope?: 'GLOBAL' | 'ORG'; orgId?: number }
      | { module: string; key: string; value: string; scope?: 'GLOBAL' | 'ORG'; orgId?: number }[],
  ) {
    const list = Array.isArray(body) ? body : [body];
    for (const item of list) {
      if (item.module && item.key) {
        await this.paramService.set(
          item.module,
          item.key,
          item.value ?? '',
          item.scope || 'GLOBAL',
          item.orgId || 0,
        );
      }
    }
    return { ok: true };
  }
}
