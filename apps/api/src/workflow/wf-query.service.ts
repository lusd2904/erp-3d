import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { PageQuery } from './wf.types';

type QueryRow = Record<string, unknown> & {
  node_key?: string | null;
  model_json?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseModel(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'string') return asRecord(value);
  try {
    return asRecord(JSON.parse(value) as unknown);
  } catch {
    return null;
  }
}

function nodeName(modelValue: unknown, nodeKey: string | null | undefined): string | null {
  if (!nodeKey) return null;

  const model = parseModel(modelValue);
  if (!model) return null;

  const nodes = model.nodes ?? model.nodeMap ?? model.elements ?? model;
  let node: unknown;

  if (Array.isArray(nodes)) {
    node = nodes.find((item) => {
      const record = asRecord(item);
      return record?.id === nodeKey || record?.key === nodeKey || record?.node_key === nodeKey;
    });
  } else {
    node = asRecord(nodes)?.[nodeKey];
  }

  if (typeof node === 'string') return node;
  const record = asRecord(node);
  const name = record?.name ?? record?.label ?? record?.title;
  return typeof name === 'string' && name.length > 0 ? name : null;
}

function withNodeNames(rows: QueryRow[]): Record<string, unknown>[] {
  return rows.map(({ model_json, ...row }) => ({
    ...row,
    node_name: nodeName(model_json, row.node_key),
  }));
}

@Injectable()
export class WfQueryService {
  constructor(private readonly db: DbService) {}

  async todo(
    user: { id: number },
    q: PageQuery,
  ): Promise<{ rows: Record<string, unknown>[]; total: number }> {
    return this.pageTasks(user.id, ['PENDING'], q);
  }

  async done(
    user: { id: number },
    q: PageQuery,
  ): Promise<{ rows: Record<string, unknown>[]; total: number }> {
    return this.pageTasks(user.id, ['DONE', 'TRANSFERRED'], q);
  }

  async flow(
    form: string,
    billId: number,
  ): Promise<{
    instance: Record<string, unknown> | null;
    tasks: Record<string, unknown>[];
    logs: Record<string, unknown>[];
  }> {
    const instance = await this.db.one<Record<string, unknown>>(
      `SELECT *
       FROM wf_instance
       WHERE form = ? AND bill_id = ?
       ORDER BY started_at DESC, id DESC
       LIMIT 1`,
      [form, billId],
    );

    if (!instance) return { instance: null, tasks: [], logs: [] };

    const definitionId = Number(instance.definition_id);
    const definition = await this.db.one<{ model_json: unknown }>(
      'SELECT model_json FROM wf_definition WHERE id = ?',
      [definitionId],
    );

    const tasks = await this.db.q<QueryRow>(
      `SELECT t.*, d.model_json
       FROM wf_task t
       LEFT JOIN wf_definition d ON d.id = ?
       WHERE t.instance_id = ?
       ORDER BY t.id ASC`,
      [definitionId, instance.id],
    );

    const logs = await this.db.q<QueryRow>(
      `SELECT l.*, d.model_json
       FROM wf_action_log l
       LEFT JOIN wf_definition d ON d.id = ?
       WHERE l.instance_id = ?
       ORDER BY l.at ASC, l.id ASC`,
      [definitionId, instance.id],
    );

    const modelJson = definition?.model_json;
    return {
      instance,
      tasks: withNodeNames(tasks.map((row) => ({ ...row, model_json: modelJson }))),
      logs: withNodeNames(logs.map((row) => ({ ...row, model_json: modelJson }))),
    };
  }

  private async pageTasks(
    userId: number,
    statuses: string[],
    q: PageQuery,
  ): Promise<{ rows: Record<string, unknown>[]; total: number }> {
    const pageValue = Number(q?.page);
    const sizeValue = Number(q?.size);
    const page = Number.isFinite(pageValue) && pageValue >= 1 ? Math.floor(pageValue) : 1;
    const size =
      Number.isFinite(sizeValue) && sizeValue >= 1
        ? Math.min(200, Math.floor(sizeValue))
        : 20;
    const offset = (page - 1) * size;
    const statusSlots = statuses.map(() => '?').join(', ');
    const params = [userId, ...statuses];

    const count = await this.db.one<{ total: number | string }>(
      `SELECT COUNT(*) AS total
       FROM wf_task t
       JOIN wf_instance i ON i.id = t.instance_id
       WHERE t.assignee_id = ? AND t.status IN (${statusSlots})`,
      params,
    );

    const rows = await this.db.q<QueryRow>(
      `SELECT t.*, i.form, i.bill_id, i.bill_no, i.starter_id,
              i.started_at AS created_at, d.model_json
       FROM wf_task t
       JOIN wf_instance i ON i.id = t.instance_id
       LEFT JOIN wf_definition d ON d.id = i.definition_id
       WHERE t.assignee_id = ? AND t.status IN (${statusSlots})
       ORDER BY i.started_at DESC, t.id DESC
       LIMIT ? OFFSET ?`,
      [...params, size, offset],
    );

    return {
      rows: withNodeNames(rows),
      total: Number(count?.total ?? 0),
    };
  }
}
