import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePerm } from '../../common/decorators';
import { OrgService } from './org.service';

@ApiTags('系统配置-组织管理')
@ApiBearerAuth()
@Controller('sys/orgs')
export class OrgController {
  constructor(private orgService: OrgService) {}

  @Get()
  @RequirePerm('sys_org', 'view')
  @ApiOperation({ summary: '组织分页列表' })
  list(@Query() q: { keyword?: string; page?: string; size?: string }) {
    return this.orgService.listOrgs(q);
  }

  @Get(':id')
  @RequirePerm('sys_org', 'view')
  @ApiOperation({ summary: '组织详情' })
  get(@Param('id') id: string) {
    return this.orgService.getOrg(Number(id));
  }

  @Post()
  @RequirePerm('sys_org', 'new')
  @ApiOperation({ summary: '新建组织' })
  create(@Body() body: any) {
    return this.orgService.createOrg(body);
  }

  @Put(':id')
  @RequirePerm('sys_org', 'edit')
  @ApiOperation({ summary: '修改组织' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.orgService.updateOrg(Number(id), body);
  }

  @Delete(':id')
  @RequirePerm('sys_org', 'delete')
  @ApiOperation({ summary: '删除组织' })
  delete(@Param('id') id: string) {
    return this.orgService.deleteOrg(Number(id));
  }

  @Post(':id/ops/forbid')
  @RequirePerm('sys_org', 'forbid')
  @ApiOperation({ summary: '禁用组织' })
  forbid(@Param('id') id: string) {
    return this.orgService.setOrgForbid(Number(id), 1);
  }

  @Post(':id/ops/unforbid')
  @RequirePerm('sys_org', 'forbid')
  @ApiOperation({ summary: '启用组织' })
  unforbid(@Param('id') id: string) {
    return this.orgService.setOrgForbid(Number(id), 0);
  }
}

@ApiTags('系统配置-部门管理')
@ApiBearerAuth()
@Controller('sys/depts')
export class DeptController {
  constructor(private orgService: OrgService) {}

  @Get()
  @RequirePerm('sys_dept', 'view')
  @ApiOperation({ summary: '部门层级列表' })
  list(@Query() q: { orgId?: string; keyword?: string }) {
    return this.orgService.listDepts(q);
  }

  @Get(':id')
  @RequirePerm('sys_dept', 'view')
  @ApiOperation({ summary: '部门详情' })
  get(@Param('id') id: string) {
    return this.orgService.getDept(Number(id));
  }

  @Post()
  @RequirePerm('sys_dept', 'new')
  @ApiOperation({ summary: '新建部门' })
  create(@Body() body: any) {
    return this.orgService.createDept(body);
  }

  @Put(':id')
  @RequirePerm('sys_dept', 'edit')
  @ApiOperation({ summary: '修改部门' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.orgService.updateDept(Number(id), body);
  }

  @Delete(':id')
  @RequirePerm('sys_dept', 'delete')
  @ApiOperation({ summary: '删除部门' })
  delete(@Param('id') id: string) {
    return this.orgService.deleteDept(Number(id));
  }

  @Post(':id/ops/forbid')
  @RequirePerm('sys_dept', 'forbid')
  @ApiOperation({ summary: '禁用部门' })
  forbid(@Param('id') id: string) {
    return this.orgService.setDeptForbid(Number(id), 1);
  }

  @Post(':id/ops/unforbid')
  @RequirePerm('sys_dept', 'forbid')
  @ApiOperation({ summary: '启用部门' })
  unforbid(@Param('id') id: string) {
    return this.orgService.setDeptForbid(Number(id), 0);
  }
}

@ApiTags('系统配置-岗位管理')
@ApiBearerAuth()
@Controller('sys/positions')
export class PositionController {
  constructor(private orgService: OrgService) {}

  @Get()
  @RequirePerm('sys_position', 'view')
  @ApiOperation({ summary: '岗位列表' })
  list(@Query() q: { deptId?: string; keyword?: string; page?: string; size?: string }) {
    return this.orgService.listPositions(q);
  }

  @Get(':id')
  @RequirePerm('sys_position', 'view')
  @ApiOperation({ summary: '岗位详情' })
  get(@Param('id') id: string) {
    return this.orgService.getPosition(Number(id));
  }

  @Post()
  @RequirePerm('sys_position', 'new')
  @ApiOperation({ summary: '新建岗位' })
  create(@Body() body: any) {
    return this.orgService.createPosition(body);
  }

  @Put(':id')
  @RequirePerm('sys_position', 'edit')
  @ApiOperation({ summary: '修改岗位' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.orgService.updatePosition(Number(id), body);
  }

  @Delete(':id')
  @RequirePerm('sys_position', 'delete')
  @ApiOperation({ summary: '删除岗位' })
  delete(@Param('id') id: string) {
    return this.orgService.deletePosition(Number(id));
  }

  @Post(':id/ops/forbid')
  @RequirePerm('sys_position', 'forbid')
  @ApiOperation({ summary: '禁用岗位' })
  forbid(@Param('id') id: string) {
    return this.orgService.setPositionForbid(Number(id), 1);
  }

  @Post(':id/ops/unforbid')
  @RequirePerm('sys_position', 'forbid')
  @ApiOperation({ summary: '启用岗位' })
  unforbid(@Param('id') id: string) {
    return this.orgService.setPositionForbid(Number(id), 0);
  }
}

@ApiTags('系统配置-员工管理')
@ApiBearerAuth()
@Controller('sys/employees')
export class EmployeeController {
  constructor(private orgService: OrgService) {}

  @Get()
  @RequirePerm('sys_employee', 'view')
  @ApiOperation({ summary: '员工列表' })
  list(@Query() q: { deptId?: string; keyword?: string; page?: string; size?: string }) {
    return this.orgService.listEmployees(q);
  }

  @Get(':id')
  @RequirePerm('sys_employee', 'view')
  @ApiOperation({ summary: '员工详情' })
  get(@Param('id') id: string) {
    return this.orgService.getEmployee(Number(id));
  }

  @Post()
  @RequirePerm('sys_employee', 'new')
  @ApiOperation({ summary: '新建员工' })
  create(@Body() body: any) {
    return this.orgService.createEmployee(body);
  }

  @Put(':id')
  @RequirePerm('sys_employee', 'edit')
  @ApiOperation({ summary: '修改员工' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.orgService.updateEmployee(Number(id), body);
  }

  @Delete(':id')
  @RequirePerm('sys_employee', 'delete')
  @ApiOperation({ summary: '删除员工' })
  delete(@Param('id') id: string) {
    return this.orgService.deleteEmployee(Number(id));
  }

  @Post(':id/ops/forbid')
  @RequirePerm('sys_employee', 'forbid')
  @ApiOperation({ summary: '禁用员工' })
  forbid(@Param('id') id: string) {
    return this.orgService.setEmployeeForbid(Number(id), 1);
  }

  @Post(':id/ops/unforbid')
  @RequirePerm('sys_employee', 'forbid')
  @ApiOperation({ summary: '启用员工' })
  unforbid(@Param('id') id: string) {
    return this.orgService.setEmployeeForbid(Number(id), 0);
  }
}
