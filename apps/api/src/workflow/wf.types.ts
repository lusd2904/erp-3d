export interface WfInstanceRow {
  id: number;
  org_id: number;
  definition_id: number;
  template_id: number;
  form: string;
  bill_id: number;
  bill_no: string;
  starter_id: number;
  status: 'RUNNING' | 'COMPLETED' | 'REJECTED' | 'WITHDRAWN' | 'TERMINATED';
  current_nodes_json: unknown;
  round: number;
  started_at: string | null;
  ended_at: string | null;
}

export interface WfTaskRow {
  id: number;
  org_id: number;
  instance_id: number;
  node_key: string;
  owner_id: number;
  assignee_id: number;
  delegate_id: number | null;
  seq: number;
  round: number;
  vote: 'AGREE' | 'DISAGREE' | null;
  status: 'PENDING' | 'WAITING' | 'DONE' | 'CANCELED' | 'TRANSFERRED' | 'CC';
  is_cc: number;
  add_sign_from: number | null;
  due_at: string | null;
  done_at: string | null;
  opinion: string | null;
}

export interface WfActionLogRow {
  instance_id: number;
  task_id: number | null;
  node_key: string | null;
  round: number;
  action: 'AGREE' | 'DISAGREE' | 'REJECT' | 'TRANSFER' | 'ADD_SIGN' | 'WITHDRAW' | 'TERMINATE' | 'DELEGATE' | 'RETURN' | 'CC';
  target_node_key: string | null;
  opinion: string | null;
  sign_image: string | null;
  user_id: number;
  at: string | null;
  action_data_json: unknown;
}

export interface ApproveInput { taskId: number; opinion?: string; signImage?: string; }
export interface RejectInput { taskId: number; opinion?: string; targetNodeKey?: string; /* 缺省=驳回到发起人 */ }
export interface TransferInput { taskId: number; toUserId: number; opinion?: string; }
export interface AddSignInput { taskId: number; userIds: number[]; opinion?: string; /* 后加签：加签人全部同意后回到原处理人 */ }
export interface PageQuery { page?: number; size?: number; }

export interface StarterInfo {
  userId: number;
  deptId: number | null;
  employeeId: number | null;
  orgId: number;
}

export interface WfTemplateInput {
  id?: number;
  form: string;
  billTypeId?: number | null;
  definitionKey: string;
  startCondition?: string | null;
  effDate?: string | null;
  expDate?: string | null;
  enabled?: boolean;
  priority?: number;
  nodeView?: Record<string, unknown> | null;
}
