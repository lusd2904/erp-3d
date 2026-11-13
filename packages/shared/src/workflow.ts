/**
 * L2 审批流模型。BPMN XML（bpmn-js 画）→ 解析成 WfModel 执行。扩展属性命名空间 erp = http://erp3d.local/bpmn
 */
export const WF_NS = 'http://erp3d.local/bpmn';

export type WfNodeType = 'start' | 'end' | 'userTask' | 'exclusiveGateway' | 'parallelGateway' | 'serviceTask';

export interface UserTaskCfg {
  /** user 指定用户（assignees 填 user id）/ role 角色（填角色 code）/ deptLeader 发起人部门负责人 /
   *  starterLeader 发起人上级（岗位上级，取不到时取上级部门负责人）/ starter 发起人本人 */
  assigneeType: 'user' | 'role' | 'deptLeader' | 'starterLeader' | 'starter';
  assignees: string[];
  /** any 或签（任一人通过）/ all 会签全部通过 / ratio 会签按比例 / votes 会签按票数 */
  multi: 'any' | 'all' | 'ratio' | 'votes';
  ratio?: number; // 0~1
  votes?: number;
  sequential?: boolean; // 会签按顺序处理
  final?: boolean; // 终审标记（信息用；流程走到结束事件时执行审核）
  emptyPolicy: 'skip' | 'admin'; // 解析不到人
  allowTransfer: boolean;
  allowAddSign: boolean;
  allowReject: boolean;
  allowWithdraw: boolean;
  timeoutHours?: number;
  cc?: string[]; // 抄送用户 id
  editableFields?: string[]; // 审批时可修改的头/分录字段（如批准数量）
}

export interface WfNode {
  key: string;
  name: string;
  type: WfNodeType;
  incoming: string[]; // flow id
  outgoing: string[];
  defaultFlow?: string;
  task?: UserTaskCfg;
}

export interface WfFlow {
  id: string;
  name?: string;
  source: string;
  target: string;
  condition?: string; // 表达式，变量为单据头字段（如 amount > 10000）及流程变量
}

export interface WfModel {
  processKey: string;
  name: string;
  startKey: string;
  nodes: Record<string, WfNode>;
  flows: Record<string, WfFlow>;
}

export const WfInstanceStatus = {
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED', // 驳回到发起人
  WITHDRAWN: 'WITHDRAWN', // 发起人撤回
  TERMINATED: 'TERMINATED',
} as const;

export const WfTaskStatus = {
  PENDING: 'PENDING', // 待办（顺序会签中未轮到的为 WAITING）
  WAITING: 'WAITING',
  DONE: 'DONE',
  CANCELED: 'CANCELED', // 节点已由他人完成 / 驳回 / 撤回导致失效
  TRANSFERRED: 'TRANSFERRED',
  CC: 'CC',
} as const;

export type WfAction = 'approve' | 'disagree' | 'reject' | 'transfer' | 'addSign' | 'withdraw' | 'terminate' | 'start' | 'skip' | 'read';
