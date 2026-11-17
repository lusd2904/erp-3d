import type { UserTaskCfg, WfModel, WfNode, WfNodeType } from '@erp3d/shared';
import { validateModel } from './bpmn-parser';

function node(key: string, type: WfNodeType, incoming: string[] = [], outgoing: string[] = []): WfNode {
  return { key, name: key, type, incoming, outgoing };
}

function model(patch: Partial<UserTaskCfg> = {}): WfModel {
  const task: UserTaskCfg = {
    assigneeType: 'user', assignees: ['u1'], multi: 'any', sequential: false, final: false,
    emptyPolicy: 'admin', allowTransfer: false, allowAddSign: false,
    allowReject: false, allowWithdraw: false, cc: [], editableFields: [], ...patch,
  };
  return {
    processKey: 'approval', name: '审批流程', startKey: 'start',
    nodes: {
      start: node('start', 'start', [], ['f1']),
      task: { ...node('task', 'userTask', ['f1'], ['f2']), task },
      end: node('end', 'end', ['f2']),
    },
    flows: {
      f1: { id: 'f1', source: 'start', target: 'task' },
      f2: { id: 'f2', source: 'task', target: 'end' },
    },
  };
}

function expectInvalid(m: WfModel, keyword: string): void {
  const result = validateModel(m);
  expect(result.valid).toBe(false);
  expect(result.errors.join('\n')).toContain(keyword);
}

describe('validateModel', () => {
  it('合法模型通过校验', () => {
    expect(validateModel(model())).toEqual({ valid: true, errors: [] });
  });
  it('无开始事件时报错', () => {
    const m = model();
    m.nodes.start = node('start', 'serviceTask', [], ['f1']);
    m.startKey = '';
    expectInvalid(m, '必须且只能包含一个开始事件');
  });
  it('多个开始事件时报错', () => {
    const m = model();
    m.nodes.otherStart = node('otherStart', 'start');
    expectInvalid(m, '必须且只能包含一个开始事件');
  });
  it('存在不可达节点时报错', () => {
    const m = model();
    m.nodes.orphan = node('orphan', 'serviceTask');
    expectInvalid(m, '无法从开始事件到达');
  });
  it('角色审批未配置审批人时报错', () => {
    expectInvalid(model({ assigneeType: 'role', assignees: [] }), '审批用户或角色列表');
  });
  it.each([0, -0.1, 1.1])('会签比例 %s 超范围时报错', (ratio) => {
    expectInvalid(model({ multi: 'ratio', ratio }), '会签比例');
  });
  it('排他网关的非默认出线缺少条件时报错', () => {
    const m = model();
    m.nodes.task = {
      ...node('task', 'exclusiveGateway', ['f1'], ['f2', 'fallback']), defaultFlow: 'fallback',
    };
    m.flows.fallback = { id: 'fallback', source: 'task', target: 'end' };
    m.nodes.end = node('end', 'end', ['f2', 'fallback']);
    expectInvalid(m, '非默认出线');
  });
  it('非法条件表达式时报错', () => {
    const m = model();
    m.flows.f2 = { id: 'f2', source: 'task', target: 'end', condition: '(' };
    expectInvalid(m, '条件表达式无效');
  });
});
