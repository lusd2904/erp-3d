import { Injectable } from '@nestjs/common';
import { ErrorCodes } from '@erp3d/shared';
import { BizError } from '../common/biz-error';
import type { AuthUser } from '../common/request-context';
import { WsGateway } from '../core/ws/ws.gateway';
import { DbService } from '../db/db.service';
import { nowStr } from '../bill-engine/meta/meta-util';
import { evalCountersign, nextSequential } from './wf-countersign';
import { WfEngine } from './wf-engine.service';
import type { ApproveInput, WfTaskRow } from './wf.types';

@Injectable()
export class WfActionService {
  constructor(
    private readonly db: DbService,
    private readonly engine: WfEngine,
    private readonly ws: WsGateway,
  ) {}

  approve(input: ApproveInput, user: AuthUser): Promise<void> {
    return this.vote(input, user, 'AGREE');
  }

  disagree(input: ApproveInput, user: AuthUser): Promise<void> {
    return this.vote(input, user, 'DISAGREE');
  }

  private async vote(input: ApproveInput, user: AuthUser, vote: 'AGREE' | 'DISAGREE'): Promise<void> {
    await this.db.tx(async () => {
      const instanceId = await this.engine.instanceIdForTask(input.taskId);
      const inst = await this.engine.lockInstance(instanceId);
      if (inst.status !== 'RUNNING') throw new BizError(ErrorCodes.WF_TASK_DONE, '流程已结束，待办已失效');
      const task = await this.taskForUpdate(input.taskId);
      this.assertPendingTask(task, user);
      const model = await this.engine.loadModel(inst);
      const node = model.nodes[task.node_key];
      if (!node?.task) throw new BizError(ErrorCodes.WF_DEF_INVALID, '待办节点不存在或配置无效');

      await this.db.exec(
        `UPDATE wf_task SET status = 'DONE', vote = ?, opinion = ?, done_at = ? WHERE id = ?`,
        [vote, input.opinion ?? null, nowStr(), task.id],
      );
      await this.engine.logAction(
        inst, task.id, task.node_key, vote, user, input.opinion, null, input.signImage,
      );
      this.notify(user.id, user.id);

      if (task.add_sign_from !== null) {
        await this.finishAddSign(inst, task, vote, user, Boolean(node.task.sequential));
        return;
      }

      const rows = await this.db.q<WfTaskRow>(
        `SELECT * FROM wf_task
          WHERE instance_id = ? AND node_key = ? AND round = ?
            AND add_sign_from IS NULL AND is_cc = 0
            AND status IN ('PENDING', 'WAITING', 'DONE')
          ORDER BY seq ASC, id ASC`,
        [inst.id, task.node_key, task.round],
      );
      const result = evalCountersign(node.task, rows);
      if (result === 'FAIL') {
        await this.engine.endInstance(inst, 'REJECTED', user);
      } else if (result === 'PASS') {
        await this.engine.nodePassed(inst, model, task.node_key, user);
      } else if (node.task.sequential) {
        const next = nextSequential(rows);
        if (next) {
          await this.db.exec('UPDATE wf_task SET status = \'PENDING\' WHERE id = ?', [next.id]);
          this.notify(user.id, Number(next.assignee_id));
        }
      }
    });
  }

  private async finishAddSign(
    inst: Awaited<ReturnType<WfEngine['lockInstance']>>,
    task: WfTaskRow,
    vote: 'AGREE' | 'DISAGREE',
    user: AuthUser,
    sequential: boolean,
  ) {
    if (vote === 'DISAGREE') {
      await this.engine.endInstance(inst, 'REJECTED', user);
      return;
    }
    const signers = await this.db.q<WfTaskRow>(
      `SELECT * FROM wf_task
        WHERE add_sign_from = ? AND status IN ('PENDING', 'WAITING')
        ORDER BY seq ASC, id ASC`,
      [task.add_sign_from],
    );
    if (signers.length > 0) {
      if (sequential) {
        const next = nextSequential(signers);
        if (next) {
          await this.db.exec('UPDATE wf_task SET status = \'PENDING\' WHERE id = ?', [next.id]);
          this.notify(user.id, Number(next.assignee_id));
        }
      }
      return;
    }

    const original = await this.taskForUpdate(Number(task.add_sign_from));
    if (original.status !== 'WAITING') return;
    await this.db.exec('UPDATE wf_task SET status = \'PENDING\' WHERE id = ?', [original.id]);
    await this.engine.logAction(inst, original.id, original.node_key, 'ADD_SIGN', user, '加签完成');
    this.notify(user.id, Number(original.assignee_id));
  }

  private async taskForUpdate(taskId: number): Promise<WfTaskRow> {
    const task = await this.db.one<WfTaskRow>('SELECT * FROM wf_task WHERE id = ? FOR UPDATE', [taskId]);
    if (!task) throw new BizError(ErrorCodes.WF_TASK_NOT_FOUND, '审批任务不存在');
    return task;
  }

  private assertPendingTask(task: WfTaskRow, user: AuthUser) {
    if (task.status !== 'PENDING') throw new BizError(ErrorCodes.WF_TASK_DONE, '待办已处理或尚未轮到处理');
    if (Number(task.assignee_id) !== user.id) {
      throw new BizError(ErrorCodes.WF_TASK_NOT_YOURS, '该审批待办不属于当前用户');
    }
    if (task.is_cc) {
      throw new BizError(ErrorCodes.WF_ACTION_NOT_ALLOWED, '抄送任务不能审批');
    }
  }

  private notify(actorId: number, assigneeId: number) {
    for (const id of new Set([actorId, assigneeId])) {
      this.db.afterCommit(() => this.ws.emitToUser(id, 'todo.changed', {}));
    }
  }
}
