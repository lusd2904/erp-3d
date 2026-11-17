import { XMLParser } from 'fast-xml-parser';
import {
  ErrorCodes,
  validateExpr,
  type UserTaskCfg,
  type WfFlow,
  type WfModel,
  type WfNode,
  type WfNodeType,
} from '@erp3d/shared';
import { BizError } from '../common/biz-error';

type XmlObject = Record<string, unknown>;

function fail(message: string): never {
  throw new BizError(ErrorCodes.SYS_VALIDATION, message);
}

function objectOf(value: unknown): XmlObject {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as XmlObject;
  }
  return {};
}

function localName(name: string): string {
  return name.slice(name.lastIndexOf(':') + 1);
}

function children(parent: XmlObject, name: string): unknown[] {
  const result: unknown[] = [];
  for (const [key, value] of Object.entries(parent)) {
    if (key.startsWith('@_') || localName(key) !== name) continue;
    if (Array.isArray(value)) result.push(...value);
    else result.push(value);
  }
  return result;
}

function attribute(element: XmlObject, name: string): string | undefined {
  const value = element[`@_${name}`];
  return typeof value === 'string' ? value.trim() : undefined;
}

function requiredAttribute(element: XmlObject, name: string, label: string): string {
  const value = attribute(element, name);
  if (!value) fail(`${label}缺少 ${name} 属性`);
  return value;
}

function textOf(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(textOf).join('');
  const element = objectOf(value);
  return Object.entries(element)
    .filter(([key]) => key === '#text' || key === '#cdata')
    .map(([, part]) => textOf(part))
    .join('');
}

function csv(value: string | undefined): string[] {
  return (value ?? '').split(',').map((item) => item.trim()).filter(Boolean);
}

function enumAttribute<T extends string>(
  element: XmlObject,
  name: string,
  allowed: readonly T[],
  fallback: T,
  label: string,
): T {
  const value = attribute(element, `erp:${name}`);
  if (value === undefined) return fallback;
  const found = allowed.find((item) => item === value);
  if (found === undefined) {
    fail(`${label}的 erp:${name} 必须为 ${allowed.join('、')} 之一`);
  }
  return found;
}

function booleanAttribute(element: XmlObject, name: string, label: string): boolean {
  const value = attribute(element, `erp:${name}`);
  if (value === undefined || value === 'false' || value === '0') return false;
  if (value === 'true' || value === '1') return true;
  fail(`${label}的 erp:${name} 必须为 true 或 false`);
}

function numberAttribute(
  element: XmlObject,
  name: string,
  label: string,
): number | undefined {
  const value = attribute(element, `erp:${name}`);
  if (value === undefined) return undefined;
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value)) {
    fail(`${label}的 erp:${name} 必须为有效数字`);
  }
  const number = Number(value);
  if (!Number.isFinite(number)) {
    fail(`${label}的 erp:${name} 必须为有限数字`);
  }
  return number;
}

function parseTask(element: XmlObject, label: string): UserTaskCfg {
  const task: UserTaskCfg = {
    assigneeType: enumAttribute(
      element,
      'assigneeType',
      ['user', 'role', 'deptLeader', 'starterLeader', 'starter'] as const,
      'user',
      label,
    ),
    assignees: csv(attribute(element, 'erp:assignees')),
    multi: enumAttribute(
      element,
      'multi',
      ['any', 'all', 'ratio', 'votes'] as const,
      'any',
      label,
    ),
    sequential: booleanAttribute(element, 'sequential', label),
    final: booleanAttribute(element, 'final', label),
    emptyPolicy: enumAttribute(
      element,
      'emptyPolicy',
      ['skip', 'admin'] as const,
      'admin',
      label,
    ),
    allowTransfer: booleanAttribute(element, 'allowTransfer', label),
    allowAddSign: booleanAttribute(element, 'allowAddSign', label),
    allowReject: booleanAttribute(element, 'allowReject', label),
    allowWithdraw: booleanAttribute(element, 'allowWithdraw', label),
    cc: csv(attribute(element, 'erp:cc')),
    editableFields: csv(attribute(element, 'erp:editableFields')),
  };

  const ratio = numberAttribute(element, 'ratio', label);
  const votes = numberAttribute(element, 'votes', label);
  const timeoutHours = numberAttribute(element, 'timeoutHours', label);
  if (ratio !== undefined) task.ratio = ratio;
  if (votes !== undefined) task.votes = votes;
  if (timeoutHours !== undefined) {
    if (!Number.isSafeInteger(timeoutHours)) {
      fail(`${label}的 erp:timeoutHours 必须为安全整数`);
    }
    task.timeoutHours = timeoutHours;
  }
  return task;
}

/** 解析第一个 process；流程语义错误交由 validateModel 汇总。 */
export function parseBpmn(xml: string): WfModel {
  if (typeof xml !== 'string' || !xml.trim()) {
    fail('BPMN XML 不能为空');
  }
  // 工作流定义无需 DTD；禁止实体声明，避免外部实体及实体展开。
  if (/<!DOCTYPE\b|<!ENTITY\b/i.test(xml)) {
    fail('BPMN XML 不允许包含 DTD 或实体声明');
  }

  let document: unknown;
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      removeNSPrefix: false,
      parseAttributeValue: false,
      parseTagValue: false,
      trimValues: false,
      cdataPropName: '#cdata',
    });
    document = parser.parse(xml, true) as unknown;
  } catch {
    fail('BPMN XML 解析失败，请检查 XML 格式');
  }

  const definitions = children(objectOf(document), 'definitions')[0];
  if (definitions === undefined) fail('BPMN XML 缺少 definitions 元素');
  const rawProcess = children(objectOf(definitions), 'process')[0];
  if (rawProcess === undefined) fail('BPMN XML 缺少 process 元素');
  const process = objectOf(rawProcess);
  const processKey = requiredAttribute(process, 'id', '流程');

  const model: WfModel = {
    processKey,
    name: attribute(process, 'name') || processKey,
    startKey: '',
    nodes: Object.create(null) as Record<string, WfNode>,
    flows: Object.create(null) as Record<string, WfFlow>,
  };
  const ids = new Set<string>([processKey]);
  const reserveId = (id: string): void => {
    if (ids.has(id)) fail(`BPMN 元素 ID 重复：${id}`);
    ids.add(id);
  };

  const nodeTypes: ReadonlyArray<readonly [string, WfNodeType]> = [
    ['startEvent', 'start'],
    ['endEvent', 'end'],
    ['userTask', 'userTask'],
    ['exclusiveGateway', 'exclusiveGateway'],
    ['parallelGateway', 'parallelGateway'],
    ['serviceTask', 'serviceTask'],
  ];

  for (const [tag, type] of nodeTypes) {
    for (const value of children(process, tag)) {
      const element = objectOf(value);
      const key = requiredAttribute(element, 'id', '流程节点');
      reserveId(key);
      const node: WfNode = {
        key,
        name: attribute(element, 'name') || key,
        type,
        incoming: [],
        outgoing: [],
      };
      if (type === 'userTask') {
        node.task = parseTask(element, `审批节点“${node.name}”`);
      }
      if (type === 'exclusiveGateway') {
        const defaultFlow = attribute(element, 'default');
        if (defaultFlow) node.defaultFlow = defaultFlow;
      }
      if (type === 'start' && !model.startKey) model.startKey = key;
      model.nodes[key] = node;
    }
  }

  for (const value of children(process, 'sequenceFlow')) {
    const element = objectOf(value);
    const id = requiredAttribute(element, 'id', '顺序流');
    reserveId(id);
    const flow: WfFlow = {
      id,
      source: requiredAttribute(element, 'sourceRef', `顺序流“${id}”`),
      target: requiredAttribute(element, 'targetRef', `顺序流“${id}”`),
    };
    const name = attribute(element, 'name');
    if (name) flow.name = name;

    const conditions = children(element, 'conditionExpression');
    if (conditions.length > 1) fail(`顺序流“${id}”只能配置一个条件表达式`);
    if (conditions.length === 1) flow.condition = textOf(conditions[0]).trim();

    model.flows[id] = flow;
    model.nodes[flow.source]?.outgoing.push(id);
    model.nodes[flow.target]?.incoming.push(id);
  }

  return model;
}

/** 校验图结构及审批配置，不修改传入模型。 */
export function validateModel(m: WfModel): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const entries = Object.entries(m.nodes);
  const starts = entries.filter(([, node]) => node.type === 'start');
  const ends = entries.filter(([, node]) => node.type === 'end');
  const incoming = new Map<string, WfFlow[]>();
  const outgoing = new Map<string, WfFlow[]>();

  for (const [key, node] of entries) {
    incoming.set(key, []);
    outgoing.set(key, []);
    if (!key || node.key !== key) errors.push(`节点“${key}”的标识与模型索引不一致`);
  }

  if (starts.length !== 1) errors.push('流程必须且只能包含一个开始事件');
  if (ends.length === 0) errors.push('流程必须至少包含一个结束事件');
  if (starts.length === 1 && m.startKey !== starts[0]?.[0]) {
    errors.push('流程 startKey 必须指向唯一的开始事件');
  }

  for (const [id, flow] of Object.entries(m.flows)) {
    if (!id || flow.id !== id) errors.push(`顺序流“${id}”的标识与模型索引不一致`);
    if (incoming.has(id)) errors.push(`顺序流“${id}”与节点使用了相同的标识`);

    const sourceFlows = outgoing.get(flow.source);
    const targetFlows = incoming.get(flow.target);
    if (!sourceFlows) errors.push(`顺序流“${id}”引用的来源节点“${flow.source}”不存在`);
    if (!targetFlows) errors.push(`顺序流“${id}”引用的目标节点“${flow.target}”不存在`);
    sourceFlows?.push(flow);
    targetFlows?.push(flow);

    if (flow.condition !== undefined) {
      if (!flow.condition.trim()) {
        errors.push(`顺序流“${id}”的条件表达式不能为空`);
      } else {
        try {
          const issue = validateExpr(flow.condition);
          if (issue !== null) errors.push(`顺序流“${id}”的条件表达式无效：${issue}`);
        } catch {
          errors.push(`顺序流“${id}”的条件表达式无效`);
        }
      }
    }
  }

  let splitCount = 0;
  let joinCount = 0;
  let splitBranches = 0;
  let joinBranches = 0;

  for (const [key, node] of entries) {
    const label = `节点“${node.name || key}”`;
    const ins = incoming.get(key) ?? [];
    const outs = outgoing.get(key) ?? [];

    if (node.type === 'start' && ins.length > 0) {
      errors.push(`${label}是开始事件，不能有入线`);
    }
    if (node.type === 'end' && outs.length > 0) {
      errors.push(`${label}是结束事件，不能有出线`);
    }

    if (node.type === 'userTask') {
      const task = node.task;
      if (!task) {
        errors.push(`${label}缺少审批配置`);
      } else {
        if (!['user', 'role', 'deptLeader', 'starterLeader', 'starter'].includes(task.assigneeType)) {
          errors.push(`${label}的审批人类型无效`);
        }
        if (
          (task.assigneeType === 'user' || task.assigneeType === 'role') &&
          (!Array.isArray(task.assignees) ||
            task.assignees.length === 0 ||
            task.assignees.some((value) => typeof value !== 'string' || !value.trim()))
        ) {
          errors.push(`${label}必须配置非空的审批用户或角色列表`);
        }
        if (!['any', 'all', 'ratio', 'votes'].includes(task.multi)) {
          errors.push(`${label}的会签方式无效`);
        }
        if (
          (task.multi === 'ratio' || task.ratio !== undefined) &&
          (typeof task.ratio !== 'number' ||
            !Number.isFinite(task.ratio) ||
            task.ratio <= 0 ||
            task.ratio > 1)
        ) {
          errors.push(`${label}的会签比例必须大于 0 且不大于 1`);
        }
        if (
          (task.multi === 'votes' || task.votes !== undefined) &&
          (typeof task.votes !== 'number' ||
            !Number.isSafeInteger(task.votes) ||
            task.votes <= 0)
        ) {
          errors.push(`${label}的会签票数必须为正的安全整数`);
        }
        if (!['skip', 'admin'].includes(task.emptyPolicy)) {
          errors.push(`${label}的空审批人处理策略无效`);
        }
      }
    }

    if (node.type === 'exclusiveGateway') {
      if (node.defaultFlow !== undefined && !outs.some((flow) => flow.id === node.defaultFlow)) {
        errors.push(`${label}的默认顺序流必须是该网关的出线`);
      }
      if (outs.length > 1) {
        for (const flow of outs) {
          if (flow.id !== node.defaultFlow && !flow.condition?.trim()) {
            errors.push(`${label}的非默认出线“${flow.id}”必须配置条件表达式`);
          }
        }
      }
    }

    if (node.type === 'parallelGateway') {
      if (ins.length === 1 && outs.length > 1) {
        splitCount += 1;
        splitBranches += outs.length - 1;
      } else if (ins.length > 1 && outs.length === 1) {
        joinCount += 1;
        joinBranches += ins.length - 1;
      } else {
        errors.push(`${label}必须为并行分支（一入多出）或并行汇聚（多入一出）`);
      }
    }
  }

  if (splitCount !== joinCount || splitBranches !== joinBranches) {
    errors.push('并行网关的分支与汇聚必须成对，且分支数量必须匹配');
  }

  const walk = (seeds: string[], reverse: boolean): Set<string> => {
    const visited = new Set<string>();
    const pending = [...seeds];
    while (pending.length > 0) {
      const key = pending.pop();
      if (key === undefined || visited.has(key) || !incoming.has(key)) continue;
      visited.add(key);
      const flows = (reverse ? incoming : outgoing).get(key) ?? [];
      for (const flow of flows) {
        pending.push(reverse ? flow.source : flow.target);
      }
    }
    return visited;
  };

  if (starts.length === 1) {
    const reachable = walk(starts.map(([key]) => key), false);
    for (const [key, node] of entries) {
      if (!reachable.has(key)) errors.push(`节点“${node.name || key}”无法从开始事件到达`);
    }
  }
  if (ends.length > 0) {
    const reachesEnd = walk(ends.map(([key]) => key), true);
    for (const [key, node] of entries) {
      if (!reachesEnd.has(key)) errors.push(`节点“${node.name || key}”无法到达任何结束事件`);
    }
  }

  return { valid: errors.length === 0, errors };
}
