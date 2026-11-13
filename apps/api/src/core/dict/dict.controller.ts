import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePerm } from '../../common/decorators';
import { DictService } from './dict.service';

@ApiTags('系统配置-数据字典')
@ApiBearerAuth()
@Controller('sys/dicts')
export class DictController {
  constructor(private dictService: DictService) {}

  @Get()
  @RequirePerm('sys_dict', 'view')
  @ApiOperation({ summary: '查询字典项列表' })
  list(@Query() q: { dictType?: string; keyword?: string; page?: string; size?: string }) {
    return this.dictService.list(q);
  }

  @Get(':id')
  @RequirePerm('sys_dict', 'view')
  @ApiOperation({ summary: '字典项详情' })
  get(@Param('id') id: string) {
    return this.dictService.get(Number(id));
  }

  @Post()
  @RequirePerm('sys_dict', 'new')
  @ApiOperation({ summary: '新建字典项' })
  create(@Body() body: { dictType: string; code: string; name: string; sort?: number }) {
    return this.dictService.create(body);
  }

  @Put(':id')
  @RequirePerm('sys_dict', 'edit')
  @ApiOperation({ summary: '修改字典项' })
  update(@Param('id') id: string, @Body() body: { name?: string; sort?: number; code?: string }) {
    return this.dictService.update(Number(id), body);
  }

  @Delete(':id')
  @RequirePerm('sys_dict', 'delete')
  @ApiOperation({ summary: '删除字典项' })
  delete(@Param('id') id: string) {
    return this.dictService.delete(Number(id));
  }

  @Post(':id/ops/forbid')
  @RequirePerm('sys_dict', 'forbid')
  @ApiOperation({ summary: '禁用字典项' })
  forbid(@Param('id') id: string) {
    return this.dictService.setForbid(Number(id), 1);
  }

  @Post(':id/ops/unforbid')
  @RequirePerm('sys_dict', 'forbid')
  @ApiOperation({ summary: '启用字典项' })
  unforbid(@Param('id') id: string) {
    return this.dictService.setForbid(Number(id), 0);
  }
}
