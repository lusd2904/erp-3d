import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePerm } from '../../common/decorators';
import { UserService } from './user.service';

@ApiTags('系统配置-用户管理')
@ApiBearerAuth()
@Controller('sys/users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  @RequirePerm('sys_user', 'view')
  @ApiOperation({ summary: '用户分页列表' })
  list(@Query() q: { keyword?: string; page?: string; size?: string; deptId?: string }) {
    return this.userService.list(q);
  }

  @Get(':id')
  @RequirePerm('sys_user', 'view')
  @ApiOperation({ summary: '用户详情' })
  get(@Param('id') id: string) {
    return this.userService.get(Number(id));
  }

  @Post()
  @RequirePerm('sys_user', 'new')
  @ApiOperation({ summary: '新建用户' })
  create(@Body() body: any) {
    return this.userService.create(body);
  }

  @Put(':id')
  @RequirePerm('sys_user', 'edit')
  @ApiOperation({ summary: '修改用户基础信息' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.userService.update(Number(id), body);
  }

  @Post(':id/reset-pwd')
  @RequirePerm('sys_user', 'edit')
  @ApiOperation({ summary: '管理员重置用户密码' })
  resetPwd(@Param('id') id: string, @Body() body: { newPassword?: string }) {
    return this.userService.resetPwd(Number(id), body?.newPassword);
  }

  @Post(':id/ops/forbid')
  @RequirePerm('sys_user', 'forbid')
  @ApiOperation({ summary: '禁用用户' })
  forbid(@Param('id') id: string) {
    return this.userService.forbid(Number(id));
  }

  @Post(':id/ops/unforbid')
  @RequirePerm('sys_user', 'forbid')
  @ApiOperation({ summary: '解禁用户' })
  unforbid(@Param('id') id: string) {
    return this.userService.unforbid(Number(id));
  }

  @Put(':id/roles')
  @RequirePerm('sys_user', 'edit')
  @ApiOperation({ summary: '分配用户角色' })
  updateRoles(@Param('id') id: string, @Body() body: { roleIds: number[]; orgId?: number }) {
    return this.userService.updateRoles(Number(id), body?.roleIds || [], body?.orgId);
  }
}
