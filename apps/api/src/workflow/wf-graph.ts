import { BizError } from "../common/biz-error";
import { ErrorCodes, compileExpr, type WfModel } from "@erp3d/shared";

function invalid(message: string): never {
  throw new BizError(ErrorCodes.SYS_VALIDATION, message);
}

function nodeOf(model: WfModel, key: string) {
  const node = Object.prototype.hasOwnProperty.call(model.nodes, key)
    ? model.nodes[key]
    : undefined;
  if (!node) invalid(`流程节点不存在：${key}`);
  return node;
}

function flowOf(model: WfModel, id: string) {
  const flow = Object.prototype.hasOwnProperty.call(model.flows, id)
    ? model.flows[id]
    : undefined;
  if (!flow) invalid(`流程连线不存在：${id}`);
  return flow;
}

export function outgoingOf(model: WfModel, nodeKey: string): string[] {
  return [...nodeOf(model, nodeKey).outgoing];
}

export function startFlows(model: WfModel): string[] {
  const start = nodeOf(model, model.startKey);
  if (start.type !== "start") invalid(`流程开始节点类型错误：${start.name}`);
  return [...start.outgoing];
}

export function activateFrom(
  model: WfModel,
  flowIds: string[],
  vars: Record<string, unknown>,
  joinState: Record<string, string[]>,
): {
  userTasks: string[];
  reachedEnd: boolean;
  joinState: Record<string, string[]>;
} {
  const state = new Map<string, string[]>(
    Object.entries(joinState).map(([key, ids]) => [key, [...ids]] as const),
  );
  const queue = [...flowIds];
  const tasks = new Set<string>();
  const visits = new Map<string, number>();
  let reachedEnd = false;

  for (const id of queue) {
    const node = nodeOf(model, flowOf(model, id).target);
    const count = (visits.get(node.key) ?? 0) + 1;
    visits.set(node.key, count);
    if (count > 100) invalid(`流程推进检测到循环：${node.name}`);

    if (node.type === "userTask") {
      tasks.add(node.key);
      continue;
    }
    if (node.type === "end") {
      reachedEnd = true;
      continue;
    }
    if (node.type === "exclusiveGateway") {
      let selected: string | undefined;
      for (const outgoing of node.outgoing) {
        if (outgoing === node.defaultFlow) continue;
        const flow = flowOf(model, outgoing);
        const condition = flow.condition;
        if (!condition?.trim()) continue;
        try {
          if (compileExpr(condition).evalBool(vars)) {
            selected = outgoing;
            break;
          }
        } catch {
          invalid(`排他网关条件无效：${node.name}（出线：${outgoing}）`);
        }
      }
      selected ??= node.defaultFlow;
      if (!selected) invalid(`排他网关无可走出线：${node.name}`);
      if (!node.outgoing.includes(selected)) {
        invalid(`排他网关默认出线无效：${node.name}`);
      }
      queue.push(selected);
      continue;
    }
    if (node.type === "parallelGateway" && node.incoming.length > 1) {
      if (!node.incoming.includes(id)) {
        invalid(`并行网关入线无效：${node.name}`);
      }
      const arrived = new Set(state.get(node.key) ?? []);
      arrived.add(id);
      state.set(node.key, [...arrived]);
      if (!node.incoming.every((incoming) => arrived.has(incoming))) continue;
      state.set(node.key, []);
    }
    queue.push(...node.outgoing);
  }

  return {
    userTasks: [...tasks],
    reachedEnd,
    joinState: Object.fromEntries(state),
  };
}

export function userTaskOrder(model: WfModel): string[] {
  const queue = [model.startKey];
  const seen = new Set<string>();
  const tasks: string[] = [];
  for (const key of queue) {
    if (seen.has(key)) continue;
    seen.add(key);
    const node = nodeOf(model, key);
    if (node.type === "userTask") tasks.push(node.key);
    for (const id of node.outgoing) {
      queue.push(flowOf(model, id).target);
    }
  }
  return tasks;
}
