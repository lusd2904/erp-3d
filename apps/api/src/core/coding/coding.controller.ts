import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePerm } from '../../common/decorators';
import { DbService } from '../../db/db.service';
import { nextId } from '../../db/snowflake';
import { BizError } from '../../common/biz-error';
import { ErrorCodes } from '@erp3d/shared';
import { CodingService } from './coding.service';

@ApiTags('系统配置-编码规则')
@ApiBearerAuth()
@Controller('sys/coding-rules')
export class CodingController {
  constructor(
    private codingService: CodingService,
    private db: DbService,
  ) {}

  @Get()
  @RequirePerm('sys_coding_rule', 'view')
  @ApiOperation({ summary: '编码规则分页列表' })
  async list(@Query('objectCode') objectCode?: string, @Query('page') page?: string, @Query('size') size?: string) {
    const p = Math.max(Number(page) || 1, 1);
    const s = Math.min(Math.max(Number(size) || 50, 1), 500);
    const where: string[] = [];
    const params: unknown[] = [];
    if (objectCode) {
      where.push('object_code = ?');
      params.push(objectCode);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await this.db.q(
      `SELECT id, code, object_code AS objectCode, bill_type_id AS billTypeId, name, segments_json AS segmentsJson,
              allow_edit AS allowEdit, gen_on AS genOn, refill_on_delete AS refillOnDelete, is_default AS isDefault,
              forbid, created_at AS createdAt, updated_at AS updatedAt
       FROM sys_coding_rule ${w} ORDER BY id DESC LIMIT ${s} OFFSET ${(p - 1) * s}`,
      params,
    );
    const [{ total }] = await this.db.q(`SELECT COUNT(*) AS total FROM sys_coding_rule ${w}`, params);
    return { rows, total: Number(total), page: p, size: s };
  }

  @Get(':id')
  @RequirePerm('sys_coding_rule', 'view')
  @ApiOperation({ summary: '编码规则详情' })
  async get(@Param('id') id: string) {
    const row = await this.db.one(
      `SELECT id, code, object_code AS objectCode, bill_type_id AS billTypeId, name, segments_json AS segmentsJson,
              allow_edit AS allowEdit, gen_on AS genOn, refill_on_delete AS refillOnDelete, is_default AS isDefault,
              forbid, created_at AS createdAt, updated_at AS updatedAt
       FROM sys_coding_rule WHERE id = ?`,
      [Number(id)],
    );
    if (!row) throw new BizError(ErrorCodes.SYS_NOT_FOUND, '编码规则不存在');
    return row;
  }

  @Post()
  @RequirePerm('sys_coding_rule', 'edit')
  @ApiOperation({ summary: '新建编码规则' })
  async create(@Body() body: any) {
    if (!body?.code || !body?.name || !body?.objectCode || !body?.segmentsJson) {
      throw new BizError(ErrorCodes.SYS_VALIDATION, '编码规则必填项缺失');
    }
    const id = nextId();
    await this.db.exec(
      `INSERT INTO sys_coding_rule (id, code, object_code, bill_type_id, name, segments_json, allow_edit, gen_on, is_default, forbid)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        id,
        body.code,
        body.objectCode,
        body.billTypeId || null,
        body.name,
        typeof body.segmentsJson === 'string' ? body.segmentsJson : JSON.stringify(body.segmentsJson),
        body.allowEdit ? 1 : 0,
        body.genOn || 'SAVE',
        body.isDefault ? 1 : 0,
      ],
    );
    return { id };
  }

  @Put(':id')
  @RequirePerm('sys_coding_rule', 'edit')
  @ApiOperation({ summary: '修改编码规则' })
  async update(@Param('id') id: string, @Body() body: any) {
    const updates: string[] = [];
    const params: unknown[] = [];
    if (body.name !== undefined) { updates.push('name = ?'); params.push(body.name); }
    if (body.segmentsJson !== undefined) {
      updates.push('segments_json = ?');
      params.push(typeof body.segmentsJson === 'string' ? body.segmentsJson : JSON.stringify(body.segmentsJson));
    }
    if (body.allowEdit !== undefined) { updates.push('allow_edit = ?'); params.push(body.allowEdit ? 1 : 0); }
    if (body.genOn !== undefined) { updates.push('gen_on = ?'); params.push(body.genOn); }
    if (body.isDefault !== undefined) { updates.push('is_default = ?'); params.push(body.isDefault ? 1 : 0); }
    if (body.billTypeId !== undefined) { updates.push('bill_type_id = ?'); params.push(body.billTypeId || null); }
    if (!updates.length) return { ok: true };

    params.push(Number(id));
    await this.db.exec(`UPDATE sys_coding_rule SET ${updates.join(', ')} WHERE id = ?`, params);
    return { ok: true };
  }

  @Delete(':id')
  @RequirePerm('sys_coding_rule', 'edit')
  @ApiOperation({ summary: '删除编码规则' })
  async delete(@Param('id') id: string) {
    await this.db.exec(`DELETE FROM sys_coding_rule WHERE id = ?`, [Number(id)]);
    return { ok: true };
  }

  @Post(':id/preview')
  @RequirePerm('sys_coding_rule', 'view')
  @ApiOperation({ summary: '试算编码规则结果' })
  async preview(@Param('id') id: string, @Body() body: { header?: Record<string, unknown> }) {
    const code = await this.codingService.preview(Number(id), body?.header || {});
    return { code };
  }

  @Post(':id/ops/forbid')
  @RequirePerm('sys_coding_rule', 'edit')
  @ApiOperation({ summary: '禁用编码规则' })
  async forbid(@Param('id') id: string) {
    await this.db.exec(`UPDATE sys_coding_rule SET forbid = 1 WHERE id = ?`, [Number(id)]);
    return { ok: true };
  }

  @Post(':id/ops/unforbid')
  @RequirePerm('sys_coding_rule', 'edit')
  @ApiOperation({ summary: '启用编码规则' })
  async unforbid(@Param('id') id: string) {
    await this.db.exec(`UPDATE sys_coding_rule SET forbid = 0 WHERE id = ?`, [Number(id)]);
    return { ok: true };
  }
}
