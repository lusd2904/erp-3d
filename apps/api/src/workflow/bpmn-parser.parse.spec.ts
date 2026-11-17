import { parseBpmn } from './bpmn-parser';

const wrap = (content: string): string => `
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:erp="urn:erp">
  <bpmn:process id="purchase" name="采购审批">${content}</bpmn:process>
</bpmn:definitions>`;

describe('parseBpmn', () => {
  it('解析约定审批流程的节点、连线和 erp 属性', () => {
    const model = parseBpmn(wrap(`
      <bpmn:startEvent id="start" />
      <bpmn:userTask id="dept" name="部门主管" erp:assigneeType="deptLeader" erp:multi="any" />
      <bpmn:userTask id="buyer" name="采购主管" erp:assigneeType="role"
        erp:assignees=" buyer_mgr " erp:multi="all" erp:final="true"
        erp:sequential="1" erp:emptyPolicy="skip" erp:allowTransfer="true"
        erp:allowAddSign="1" erp:allowReject="true" erp:allowWithdraw="true"
        erp:cc=" u1, , u2 " erp:editableFields=" amount, remark " erp:timeoutHours="24" />
      <bpmn:endEvent id="end" />
      <bpmn:sequenceFlow id="f1" sourceRef="start" targetRef="dept" />
      <bpmn:sequenceFlow id="f2" sourceRef="dept" targetRef="buyer" />
      <bpmn:sequenceFlow id="f3" sourceRef="buyer" targetRef="end" />
    `));
    expect(model).toMatchObject({ processKey: 'purchase', name: '采购审批', startKey: 'start' });
    expect(Object.keys(model.nodes).sort()).toEqual(['buyer', 'dept', 'end', 'start']);
    expect(model.nodes).toMatchObject({
      start: { key: 'start', name: 'start', type: 'start', incoming: [], outgoing: ['f1'] },
      dept: { key: 'dept', name: '部门主管', type: 'userTask', incoming: ['f1'], outgoing: ['f2'] },
      buyer: { key: 'buyer', name: '采购主管', type: 'userTask', incoming: ['f2'], outgoing: ['f3'] },
      end: { key: 'end', name: 'end', type: 'end', incoming: ['f3'], outgoing: [] },
    });
    expect(model.flows).toEqual({
      f1: { id: 'f1', source: 'start', target: 'dept' },
      f2: { id: 'f2', source: 'dept', target: 'buyer' },
      f3: { id: 'f3', source: 'buyer', target: 'end' },
    });
    expect(model.nodes['dept']?.task).toEqual({
      assigneeType: 'deptLeader', assignees: [], multi: 'any', sequential: false,
      final: false, emptyPolicy: 'admin', allowTransfer: false, allowAddSign: false,
      allowReject: false, allowWithdraw: false, cc: [], editableFields: [],
    });
    expect(model.nodes['buyer']?.task).toEqual({
      assigneeType: 'role', assignees: ['buyer_mgr'], multi: 'all', sequential: true,
      final: true, emptyPolicy: 'skip', allowTransfer: true, allowAddSign: true,
      allowReject: true, allowWithdraw: true, cc: ['u1', 'u2'],
      editableFields: ['amount', 'remark'], timeoutHours: 24,
    });
  });

  it('解析排他网关的条件表达式和默认连线', () => {
    const model = parseBpmn(wrap(`
      <bpmn:startEvent id="start" />
      <bpmn:exclusiveGateway id="gate" default="fallback" />
      <bpmn:endEvent id="end" />
      <bpmn:sequenceFlow id="enter" sourceRef="start" targetRef="gate" />
      <bpmn:sequenceFlow id="large" name="大额" sourceRef="gate" targetRef="end">
        <bpmn:conditionExpression><![CDATA[  amount >= 1000  ]]></bpmn:conditionExpression>
      </bpmn:sequenceFlow>
      <bpmn:sequenceFlow id="fallback" sourceRef="gate" targetRef="end" />
    `));
    expect(model.nodes['gate']).toMatchObject({
      key: 'gate', type: 'exclusiveGateway', defaultFlow: 'fallback',
      incoming: ['enter'], outgoing: ['large', 'fallback'],
    });
    expect(model.flows['large']).toEqual({
      id: 'large', name: '大额', source: 'gate', target: 'end', condition: 'amount >= 1000',
    });
    expect(model.flows['fallback']).toEqual({ id: 'fallback', source: 'gate', target: 'end' });
  });

  it.each(['', '<bpmn:definitions><bpmn:process></bpmn:definitions>'])(
    '非法 XML 抛错：%p',
    (xml: string) => {
      expect(() => parseBpmn(xml)).toThrow();
    },
  );
});
