/** 验收 6：比例会签自动终审、退回历史节点重办、代理到期归还。 */
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { Ctx, setup, api, ok } from './helpers';
import { nowStr } from '../../src/bill-engine/meta/meta-util';
import { WfJobs } from '../../src/workflow/wf-jobs';

const PASSWORD = 'WfTest#2026';

describe('引擎验收 6：审批流', () => {
  let c: Ctx;
  let userNo = 0;

  beforeAll(async () => {
    c = await setup();
  });

  afterAll(async () => c.app.close());

  async function createUser(): Promise<{ id: number; token: string }> {
    userNo += 1;
    const created = await ok(c, 'post', '/sys/users', {
      account: `wf_case_${userNo}`,
      name: `流程验收用户${userNo}`,
      password: PASSWORD,
      orgId: 1,
    });
    const id = Number(created.id);
    await c.db.exec('UPDATE sys_user SET must_change_pwd = 0 WHERE id = ?', [id]);
    const jwt = c.app.get(JwtService);
    const token = await jwt.signAsync({ sub: String(id), typ: 'access' });
    return { id, token };
  }

  async function asUser(token: string, method: 'get' | 'post', path: string, body?: unknown) {
    let req = request(c.server)[method](`/api/v1${path}`).set('Authorization', `Bearer ${token}`);
    if (body !== undefined) req = req.send(body as any);
    const response = await req;
    return response.body as { code: string; msg: string; data: any };
  }

  async function createFlow(
    defKey: string,
    assigneeXml: (node: string, index: number) => string,
    nodes: string[],
    startCondition?: string,
  ) {
    const taskElements = nodes.map((node, index) => {
      return `<bpmn:userTask id="${node}" name="节点${index + 1}" ${assigneeXml(node, index)} />`;
    }).join('\n');
    const flowElements = [
      `<bpmn:sequenceFlow id="Flow_Start" sourceRef="Start_1" targetRef="${nodes[0]}" />`,
      ...nodes.slice(0, -1).map((node, index) =>
        `<bpmn:sequenceFlow id="Flow_${node}_${nodes[index + 1]}" sourceRef="${node}" targetRef="${nodes[index + 1]}" />`,
      ),
      `<bpmn:sequenceFlow id="Flow_${nodes[nodes.length - 1]}_End" sourceRef="${nodes[nodes.length - 1]}" targetRef="End_1" />`,
    ].join('\n');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:erp="http://erp3d.local/bpmn">
        <bpmn:process id="${defKey}" name="审批验收流程" isExecutable="true">
          <bpmn:startEvent id="Start_1" />
          ${taskElements}
          ${flowElements}
          <bpmn:endEvent id="End_1" />
        </bpmn:process>
      </bpmn:definitions>`;
    const saved = await ok(c, 'post', '/wf/definitions/draft', {
      defKey,
      name: '审批验收流程',
      form: 'scm_pur_req',
      bpmnXml: xml,
    });
    const validation = await ok(c, 'post', '/wf/definitions/validate', { bpmnXml: xml });
    expect(validation.valid).toBe(true);
    await ok(c, 'post', `/wf/definitions/${defKey}/publish`);
    await ok(c, 'post', '/wf/templates', {
      form: 'scm_pur_req',
      definitionKey: defKey,
      startCondition,
      enabled: true,
    });
    return saved;
  }

  async function createBillAndSubmit(remark: string) {
    const bill = await ok(c, 'post', '/bills/scm_pur_req', {
      header: { remark },
      entries: [{ material_id: 701, qty: 10, apply_qty: 10, approve_qty: 10 }],
    });
    const submitted = await ok(c, 'post', `/bills/scm_pur_req/${bill.header.id}/ops/submit`);
    return { id: Number(bill.header.id), submitted };
  }

  async function tasks(billId: number) {
    return c.db.q<any>(
      `SELECT t.*, i.status AS instance_status, i.round AS instance_round
         FROM wf_task t JOIN wf_instance i ON i.id = t.instance_id
        WHERE i.form = 'scm_pur_req' AND i.bill_id = ?
        ORDER BY t.round, t.seq, t.id`,
      [billId],
    );
  }

  it('会签 60% 通过后流程和单据在同一审批动作内自动审核', async () => {
    const voters = await Promise.all(Array.from({ length: 5 }, () => createUser()));
    const ccUser = await createUser();
    await createFlow(
      'wf_ratio_60',
      () => `erp:assigneeType="user" erp:assignees="${voters.map((v) => v.id).join(',')}" erp:multi="ratio" erp:ratio="0.6" erp:allowReject="true" erp:cc="${ccUser.id}"`,
      ['Approval'],
      'head.bill_no != null',
    );
    const { id: billId } = await createBillAndSubmit('比例会签验收');
    let createdTasks = await tasks(billId);
    expect(createdTasks).toHaveLength(5);
    expect(createdTasks.every((task) => task.status === 'PENDING')).toBe(true);

    for (const voter of voters.slice(0, 2)) {
      const task = createdTasks.find((row) => Number(row.assignee_id) === voter.id)!;
      const result = await asUser(voter.token, 'post', `/wf/tasks/${task.id}/approve`, { opinion: '同意' });
      expect(result.code).toBe('OK');
    }
    const stillRunning = await c.db.one<any>('SELECT status FROM wf_instance WHERE form = ? AND bill_id = ?', ['scm_pur_req', billId]);
    expect(stillRunning.status).toBe('RUNNING');
    let bill = await ok(c, 'get', `/bills/scm_pur_req/${billId}`);
    expect(bill.header.status).toBe('AUDITING');

    const third = voters[2];
    const thirdTask = createdTasks.find((row) => Number(row.assignee_id) === third.id)!;
    const passed = await asUser(third.token, 'post', `/wf/tasks/${thirdTask.id}/approve`, { opinion: '达到比例' });
    expect(passed.code).toBe('OK');
    const completed = await c.db.one<any>('SELECT status FROM wf_instance WHERE form = ? AND bill_id = ?', ['scm_pur_req', billId]);
    expect(completed.status).toBe('COMPLETED');
    createdTasks = await tasks(billId);
    expect(createdTasks).toHaveLength(6);
    expect(createdTasks.find((task) => task.is_cc === 1)?.status).toBe('CC');
    const ccInbox = await asUser(ccUser.token, 'get', '/wf/tasks/cc');
    expect(ccInbox.data.rows.some((row: any) => Number(row.bill_id) === billId)).toBe(true);
    bill = await ok(c, 'get', `/bills/scm_pur_req/${billId}`);
    expect(bill.header.status).toBe('AUDITED');
    const history = await ok(c, 'get', `/bills/scm_pur_req/${billId}/flow`);
    expect(history.logs.map((log: any) => log.action)).toEqual(expect.arrayContaining(['AGREE']));
  });

  it('第三节点驳回到第二节点后重建待办并可继续终审', async () => {
    const [first, second, third] = await Promise.all([createUser(), createUser(), createUser()]);
    await createFlow(
      'wf_reject_middle',
      (node, index) => {
        const user = [first, second, third][index];
        return `erp:assigneeType="user" erp:assignees="${user.id}" erp:multi="all" erp:allowReject="true"`;
      },
      ['Node_A', 'Node_B', 'Node_C'],
    );
    const { id: billId } = await createBillAndSubmit('中间节点退回验收');
    let rows = await tasks(billId);
    expect(rows.map((row) => row.node_key)).toEqual(['Node_A']);
    await asUser(first.token, 'post', `/wf/tasks/${rows[0].id}/approve`, {});
    rows = await tasks(billId);
    const secondTask = rows.find((row) => row.node_key === 'Node_B' && row.status === 'PENDING')!;
    await asUser(second.token, 'post', `/wf/tasks/${secondTask.id}/approve`, {});
    rows = await tasks(billId);
    const thirdTask = rows.find((row) => row.node_key === 'Node_C' && row.status === 'PENDING')!;

    const returned = await asUser(third.token, 'post', `/wf/tasks/${thirdTask.id}/reject`, {
      targetNodeKey: 'Node_B',
      opinion: '请补充后重审',
    });
    expect(returned.code).toBe('OK');
    rows = await tasks(billId);
    const retry = rows.find((row) => row.node_key === 'Node_B' && row.round === 2 && row.status === 'PENDING');
    expect(retry).toBeTruthy();
    expect(rows.find((row) => row.id === thirdTask.id)?.status).toBe('CANCELED');

    await asUser(second.token, 'post', `/wf/tasks/${retry.id}/approve`, {});
    rows = await tasks(billId);
    const secondThird = rows.find((row) => row.node_key === 'Node_C' && row.round === 2 && row.status === 'PENDING')!;
    await asUser(third.token, 'post', `/wf/tasks/${secondThird.id}/approve`, {});
    const bill = await ok(c, 'get', `/bills/scm_pur_req/${billId}`);
    expect(bill.header.status).toBe('AUDITED');
  });

  it('代理生效时任务归属代理人，代理到期后任务归还本人', async () => {
    const [owner, delegatee] = await Promise.all([createUser(), createUser()]);
    await createFlow(
      'wf_delegate_return',
      () => `erp:assigneeType="user" erp:assignees="${owner.id}" erp:multi="any"`,
      ['Approval'],
    );
    const delegateFrom = nowStr(new Date(Date.now() - 60 * 60 * 1000));
    const delegateTo = nowStr(new Date(Date.now() + 60 * 60 * 1000));
    const delegation = await asUser(owner.token, 'post', '/wf/delegations', {
      delegateeId: delegatee.id,
      forms: ['scm_pur_req'],
      effFrom: delegateFrom,
      effTo: delegateTo,
    });
    expect(delegation.code).toBe('OK');
    const delegationList = await asUser(owner.token, 'get', '/wf/delegations');
    expect(delegationList.data.some((item: any) => Number(item.id) === Number(delegation.data.id))).toBe(true);
    const { id: billId } = await createBillAndSubmit('代理到期验收');
    let rows = await tasks(billId);
    expect(Number(rows[0].owner_id)).toBe(owner.id);
    expect(Number(rows[0].assignee_id)).toBe(delegatee.id);
    expect(rows[0].delegate_id).toBeTruthy();

    const expiredAt = nowStr(new Date(Date.now() - 1000));
    const scanAt = nowStr(new Date(Date.now() + 1000));
    await c.db.exec('UPDATE wf_delegate SET eff_to = ? WHERE delegator_id = ?', [expiredAt, owner.id]);
    const returned = await c.app.get(WfJobs).returnExpiredDelegations(scanAt);
    expect(returned).toBe(1);
    rows = await tasks(billId);
    expect(Number(rows[0].assignee_id)).toBe(owner.id);
    expect(rows[0].delegate_id).toBeNull();
    const log = await c.db.one<any>(
      `SELECT action FROM wf_action_log WHERE instance_id = ? ORDER BY id DESC LIMIT 1`,
      [rows[0].instance_id],
    );
    expect(log.action).toBe('RETURN');

    const result = await asUser(owner.token, 'post', `/wf/tasks/${rows[0].id}/approve`, {});
    expect(result.code).toBe('OK');
    const bill = await ok(c, 'get', `/bills/scm_pur_req/${billId}`);
    expect(bill.header.status).toBe('AUDITED');
  });

  it('撤回代理授权后立即把未完成待办归还本人', async () => {
    const [owner, delegatee] = await Promise.all([createUser(), createUser()]);
    await createFlow(
      'wf_delegate_revoke',
      () => `erp:assigneeType="user" erp:assignees="${owner.id}" erp:multi="any"`,
      ['Approval'],
    );
    const delegation = await asUser(owner.token, 'post', '/wf/delegations', {
      delegateeId: delegatee.id,
      forms: ['scm_pur_req'],
      effFrom: nowStr(new Date(Date.now() - 60 * 60 * 1000)),
      effTo: nowStr(new Date(Date.now() + 60 * 60 * 1000)),
    });
    const { id: billId } = await createBillAndSubmit('撤回代理验收');
    let rows = await tasks(billId);
    expect(Number(rows[0].assignee_id)).toBe(delegatee.id);
    const revoked = await asUser(owner.token, 'post', `/wf/delegations/${delegation.data.id}/revoke`);
    expect(revoked.code).toBe('OK');
    expect(revoked.data.returned).toBe(1);
    rows = await tasks(billId);
    expect(Number(rows[0].assignee_id)).toBe(owner.id);
    expect(rows[0].delegate_id).toBeNull();
    const approved = await asUser(owner.token, 'post', `/wf/tasks/${rows[0].id}/approve`, {});
    expect(approved.code).toBe('OK');
  });

  it('转交后顺序加签逐个审批，全部同意后回到原待办', async () => {
    const [owner, assignee, signer1, signer2] = await Promise.all([
      createUser(), createUser(), createUser(), createUser(),
    ]);
    await createFlow(
      'wf_transfer_add_sign',
      () => `erp:assigneeType="user" erp:assignees="${owner.id}" erp:multi="all" erp:sequential="true" erp:allowTransfer="true" erp:allowAddSign="true"`,
      ['Approval'],
    );
    const { id: billId } = await createBillAndSubmit('转交顺序加签验收');
    let rows = await tasks(billId);
    const original = rows.find((row) => row.status === 'PENDING')!;
    const transferred = await asUser(owner.token, 'post', `/wf/tasks/${original.id}/transfer`, {
      toUserId: assignee.id,
      opinion: '转交处理',
    });
    expect(transferred.code).toBe('OK');
    rows = await tasks(billId);
    expect(rows.find((row) => row.id === original.id)?.status).toBe('TRANSFERRED');
    const reassigned = rows.find((row) => Number(row.owner_id) === assignee.id && row.status === 'PENDING')!;
    expect(Number(reassigned.assignee_id)).toBe(assignee.id);
    const done = await asUser(owner.token, 'get', '/wf/tasks/done');
    expect(done.data.rows.some((row: any) => Number(row.id) === Number(original.id))).toBe(true);

    const added = await asUser(assignee.token, 'post', `/wf/tasks/${reassigned.id}/add-sign`, {
      userIds: [signer1.id, signer2.id],
    });
    expect(added.code).toBe('OK');
    rows = await tasks(billId);
    const signs = rows.filter((row) => Number(row.add_sign_from) === Number(reassigned.id));
    expect(signs.map((row) => row.status)).toEqual(['PENDING', 'WAITING']);
    await asUser(signer1.token, 'post', `/wf/tasks/${signs[0].id}/approve`, {});
    rows = await tasks(billId);
    expect(rows.find((row) => row.id === signs[1].id)?.status).toBe('PENDING');
    await asUser(signer2.token, 'post', `/wf/tasks/${signs[1].id}/approve`, {});
    rows = await tasks(billId);
    expect(rows.find((row) => row.id === reassigned.id)?.status).toBe('PENDING');
    const approved = await asUser(assignee.token, 'post', `/wf/tasks/${reassigned.id}/approve`, {});
    expect(approved.code).toBe('OK');
    const bill = await ok(c, 'get', `/bills/scm_pur_req/${billId}`);
    expect(bill.header.status).toBe('AUDITED');
  });

  it('发起人可在审批开始前撤回，流程超时任务会发送站内提醒', async () => {
    const owner = await createUser();
    await createFlow(
      'wf_withdraw_timeout',
      () => `erp:assigneeType="user" erp:assignees="${owner.id}" erp:multi="any" erp:allowWithdraw="true" erp:timeoutHours="1"`,
      ['Approval'],
    );
    const { id: billId } = await createBillAndSubmit('撤回和超时提醒验收');
    const rows = await tasks(billId);
    const pending = rows.find((row) => row.status === 'PENDING')!;
    const timeout = await c.db.one<any>('SELECT * FROM wf_node_timeout WHERE task_id = ?', [pending.id]);
    expect(timeout).toBeTruthy();
    const future = nowStr(new Date(Date.now() + 48 * 60 * 60 * 1000));
    await c.db.exec('UPDATE wf_node_timeout SET remind_at = ? WHERE task_id = ?', [future, pending.id]);
    const before = await c.db.one<any>('SELECT COUNT(*) AS count FROM sys_message WHERE to_user_id = ?', [owner.id]);
    const reminders = await c.app.get(WfJobs).remindTimeouts(future);
    expect(reminders).toBe(1);
    const after = await c.db.one<any>('SELECT COUNT(*) AS count FROM sys_message WHERE to_user_id = ?', [owner.id]);
    expect(Number(after.count)).toBe(Number(before.count) + 1);

    const instance = await c.db.one<any>(
      `SELECT id FROM wf_instance WHERE form = 'scm_pur_req' AND bill_id = ?`, [billId],
    );
    const withdrawn = await asUser(c.access, 'post', `/wf/instances/${instance.id}/withdraw`);
    expect(withdrawn.code).toBe('OK');
    const status = await c.db.one<any>('SELECT status FROM wf_instance WHERE id = ?', [instance.id]);
    expect(status.status).toBe('WITHDRAWN');
    const bill = await ok(c, 'get', `/bills/scm_pur_req/${billId}`);
    expect(bill.header.status).toBe('REAUDIT');
  });
});
