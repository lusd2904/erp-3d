import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePerm } from '../../common/decorators';
import { RoleService } from './role.service';

@ApiTags('系统配置-角色与权限')
@ApiBearerAuth()
@Controller('sys/roles')
export class RoleController {
  constructor(private roleService: RoleService) {}

  @Get()
  @RequirePerm('sys_role', 'view')
  @ApiOperation({ summary: '角色列表' })
  list(@Query() q: { keyword?: string; page?: string; size?: string }) {
    return this.roleService.list(q);
  }

  @Get(':id')
  @RequirePerm('sys_role', 'view')
  @ApiOperation({ summary: '角色详情' })
  get(@Param('id') id: string) {
    return this.roleService.get(Number(id));
  }

  @Post()
  @RequirePerm('sys_role', 'new')
  @ApiOperation({ summary: '新建角色' })
  create(@Body() body: any) {
    return this.roleService.create(body);
  }

  @Put(':id')
  @RequirePerm('sys_role', 'edit')
  @ApiOperation({ summary: '修改角色' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.roleService.update(Number(id), body);
  }

  @Delete(':id')
  @RequirePerm('sys_role', 'delete')
  @ApiOperation({ summary: '删除角色' })
  delete(@Param('id') id: string) {
    return this.roleService.delete(Number(id));
  }

  @Post(':id/ops/forbid')
  @RequirePerm('sys_role', 'forbid')
  @ApiOperation({ summary: '禁用角色' })
  forbid(@Param('id') id: string) {
    return this.roleService.forbid(Number(id));
  }

  @Post(':id/ops/unforbid')
  @RequirePerm('sys_role', 'forbid')
  @ApiOperation({ summary: '启用角色' })
  unforbid(@Param('id') id: string) {
    return this.roleService.unforbid(Number(id));
  }

  @Get(':id/perms')
  @RequirePerm('sys_role', 'view')
  @ApiOperation({ summary: '获取角色挂载的权限明细' })
  getPerms(@Param('id') id: string) {
    return this.roleService.getPerms(Number(id));
  }

  @Put(':id/perms')
  @RequirePerm('sys_role', 'admin')
  @ApiOperation({ summary: '配置角色的功能、字段及数据权限' })
  savePerms(
    @Param('id') id: string,
    @Body() body: {
      perms?: { objectCode: string; permCode: string; effect: string }[];
      fieldPerms?: { objectCode: string; fieldKey: string; canView: boolean | number; canEdit: boolean | number }[];
      dataRules?: { objectCode: string; dataRuleId?: number; postRule?: string; combine?: string }[];
    },
  ) {
    return this.roleService.savePerms(Number(id), body);
  }
}
