import { Injectable } from '@nestjs/common';
import { ErrorCodes, validateExpr } from '@erp3d/shared';
import { BizError } from '../common/biz-error';
import type { AuthUser } from '../common/request-context';
import { BillEngineRegistry } from '../bill-engine/bill-engine.registry';
import { DbService } from '../db/db.service';
import { nextId } from '../db/snowflake';
import { parseBpmn, validateModel } from './bpmn-parser';
import type { WfTemplateInput } from './wf.types';

@Injectable()
export class WfDefinitionService {
  constructor(
    private readonly db: DbService,
    private readonly registry: BillEngineRegistry,
  ) {}

  async saveDraft(
    input: { defKey: string; name: string; form: string; bpmnXml: string },
    user: AuthUser,
  ): Promise<{ id: number; version: number; status: string }> {
    this.assertDefinitionInput(input);
    this.registry.get(input.form);
    return this.db.tx(async () => {
      const draft = await this.db.one<{ id: number; version: number }>(
        `SELECT id, version FROM wf_definition
          WHERE org_id = ? AND def_key = ? AND status = 'DRAFT'
          ORDER BY version DESC, id DESC LIMIT 1 FOR UPDATE`,
        [user.orgId, input.defKey],
      );
      if (draft) {
        await this.db.exec(
          `UPDATE wf_definition SET name = ?, form = ?, bpmn_xml = ?, modifier_id = ?, modified_at = NOW(3)
            WHERE id = ?`,
          [input.name, input.form, input.bpmnXml, user.id, draft.id],
        );
        return { id: Number(draft.id), version: Number(draft.version), status: 'DRAFT' };
      }

      const max = await this.db.one<{ version: number | string | null }>(
        `SELECT MAX(version) AS version FROM wf_definition WHERE org_id = ? AND def_key = ?`,
        [user.orgId, input.defKey],
      );
      const version = Number(max?.version ?? 0) + 1;
      const id = nextId();
      await this.db.exec(
        `INSERT INTO wf_definition
          (id, org_id, creator_id, def_key, name, form, version, bpmn_xml, model_json, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, JSON_OBJECT(), 'DRAFT')`,
        [id, user.orgId, user.id, input.defKey, input.name, input.form, version, input.bpmnXml],
      );
      return { id, version, status: 'DRAFT' };
    });
  }

  validate(xml: string): { valid: boolean; errors: string[] } {
    try {
      const result = validateModel(parseBpmn(xml));
      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'BPMN XML 解析失败';
      return { valid: false, errors: [message] };
    }
  }

  async publish(defKey: string, user: AuthUser): Promise<{ id: number; version: number; status: string }> {
    return this.db.tx(async () => {
      const draft = await this.db.one<Record<string, any>>(
        `SELECT * FROM wf_definition
          WHERE org_id = ? AND def_key = ? AND status = 'DRAFT'
          ORDER BY version DESC, id DESC LIMIT 1 FOR UPDATE`,
        [user.orgId, defKey],
      );
      if (!draft) throw new BizError(ErrorCodes.WF_DEF_INVALID, '没有可发布的流程草稿');
      this.registry.get(String(draft.form));

      let model;
      try {
        model = parseBpmn(String(draft.bpmn_xml ?? ''));
      } catch (error: unknown) {
        throw new BizError(ErrorCodes.WF_DEF_INVALID, error instanceof Error ? error.message : 'BPMN XML 解析失败');
      }
      const validation = validateModel(model);
      if (!validation.valid) {
        throw new BizError(ErrorCodes.WF_DEF_INVALID, '流程定义校验失败', {
          errors: validation.errors.map((msg) => ({ msg })),
        });
      }
      await this.db.exec(
        `UPDATE wf_definition SET model_json = ?, status = 'PUBLISHED', modifier_id = ?, modified_at = NOW(3)
          WHERE id = ?`,
        [JSON.stringify(model), user.id, draft.id],
      );
      return { id: Number(draft.id), version: Number(draft.version), status: 'PUBLISHED' };
    });
  }

  async list(form?: string, user?: AuthUser): Promise<Record<string, unknown>[]> {
    const where = ['org_id = ?'];
    const params: unknown[] = [user?.orgId ?? 1];
    if (form) { where.push('form = ?'); params.push(form); }
    return this.db.q(
      `SELECT id, def_key, name, form, version, status, creator_id, created_at, modified_at
         FROM wf_definition WHERE ${where.join(' AND ')}
        ORDER BY def_key, version DESC, id DESC`,
      params,
    );
  }

  async listTemplates(user: AuthUser, form?: string): Promise<Record<string, unknown>[]> {
    const where = ['t.org_id = ?'];
    const params: unknown[] = [user.orgId];
    if (form) { where.push('t.form = ?'); params.push(form); }
    return this.db.q(
      `SELECT t.*, d.name AS definition_name, d.version AS definition_version
         FROM wf_template t
         LEFT JOIN wf_definition d
           ON d.id = (
             SELECT d2.id FROM wf_definition d2
              WHERE d2.org_id = t.org_id AND d2.def_key = t.definition_key AND d2.form = t.form
                AND d2.status = 'PUBLISHED'
              ORDER BY d2.version DESC, d2.id DESC LIMIT 1
           )
        WHERE ${where.join(' AND ')}
        ORDER BY t.priority DESC, t.form, t.id DESC`,
      params,
    );
  }

  async upsertTemplate(input: WfTemplateInput, user: AuthUser): Promise<{ id: number }> {
    if (!input.form || !input.definitionKey) {
      throw new BizError(ErrorCodes.SYS_VALIDATION, '单据类型和流程定义不能为空');
    }
    this.registry.get(input.form);
    if (input.startCondition?.trim()) {
      const issue = validateExpr(input.startCondition);
      if (issue) throw new BizError(ErrorCodes.WF_DEF_INVALID, `流程启动条件无效：${issue}`);
    }
    return this.db.tx(async () => {
      const definition = await this.db.one<{ id: number }>(
        `SELECT id FROM wf_definition
          WHERE org_id = ? AND def_key = ? AND form = ? AND status = 'PUBLISHED'
          ORDER BY version DESC LIMIT 1`,
        [user.orgId, input.definitionKey, input.form],
      );
      if (!definition) throw new BizError(ErrorCodes.WF_DEF_INVALID, '模板只能引用已发布的同类单据流程');

      const values = [
        input.form,
        input.billTypeId ?? null,
        input.definitionKey,
        input.startCondition?.trim() || null,
        input.effDate ?? null,
        input.expDate ?? null,
        input.enabled === false ? 0 : 1,
        Number.isSafeInteger(input.priority) ? input.priority : 0,
        input.nodeView ? JSON.stringify(input.nodeView) : null,
      ];
      if (input.id) {
        const existing = await this.db.one<{ id: number }>(
          'SELECT id FROM wf_template WHERE id = ? AND org_id = ? FOR UPDATE',
          [input.id, user.orgId],
        );
        if (!existing) throw new BizError(ErrorCodes.SYS_NOT_FOUND, '流程模板不存在');
        await this.db.exec(
          `UPDATE wf_template
              SET form = ?, bill_type_id = ?, definition_key = ?, start_condition = ?, eff_date = ?,
                  exp_date = ?, enabled = ?, priority = ?, node_view_json = ?, modifier_id = ?, modified_at = NOW(3)
            WHERE id = ?`,
          [...values, user.id, input.id],
        );
        return { id: Number(input.id) };
      }
      const id = nextId();
      await this.db.exec(
        `INSERT INTO wf_template
          (id, org_id, creator_id, form, bill_type_id, definition_key, start_condition,
           eff_date, exp_date, enabled, priority, node_view_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, user.orgId, user.id, ...values],
      );
      return { id };
    });
  }

  private assertDefinitionInput(input: { defKey: string; name: string; form: string; bpmnXml: string }) {
    if (!/^[A-Za-z][A-Za-z0-9_.-]{0,79}$/.test(input.defKey ?? '') ||
        !input.name?.trim() || input.name.length > 100 ||
        !input.form?.trim() || !input.bpmnXml?.trim()) {
      throw new BizError(ErrorCodes.SYS_VALIDATION, '流程标识、名称、单据类型和 BPMN XML 均为必填项');
    }
  }
}
