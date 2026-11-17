import type { WfModel } from "@erp3d/shared";
import { evalCountersign, nextSequential, type CsResult } from "./wf-countersign";
import { activateFrom } from "./wf-graph";

describe("会签与顺序审批", () => {
  const cases: Array<["any" | "all" | "ratio" | "votes", number, number, number, CsResult]> = [
    ["any", 1, 0, 2, "PASS"], ["any", 0, 3, 0, "FAIL"], ["any", 0, 1, 2, "PENDING"],
    ["all", 3, 0, 0, "PASS"], ["all", 1, 1, 1, "FAIL"], ["all", 2, 0, 1, "PENDING"],
    ["ratio", 3, 0, 2, "PASS"], ["ratio", 0, 3, 2, "FAIL"], ["ratio", 2, 0, 3, "PENDING"],
    ["votes", 2, 0, 3, "PASS"], ["votes", 1, 4, 0, "FAIL"], ["votes", 1, 0, 4, "PENDING"],
  ];
  it.each(cases)("%s：同意 %i、不同意 %i、待办 %i => %s", (multi, agree, disagree, pending, expected) => {
    const votes = [
      ...Array.from({ length: agree }, () => ({ vote: "AGREE" as const })),
      ...Array.from({ length: disagree }, () => ({ vote: "DISAGREE" as const })),
      ...Array.from({ length: pending }, () => ({ vote: null })),
    ];
    expect(evalCountersign({ multi, ratio: 0.6, votes: 2 }, votes)).toBe(expected);
  });
  it("空会签直接通过，票数上限为参与人数", () => {
    expect(evalCountersign({ multi: "all" }, [])).toBe("PASS");
    expect(evalCountersign({ multi: "votes", votes: 5 }, [{ vote: "AGREE" }])).toBe("PASS");
  });
  it("选出序号最小的待办，忽略其他状态；无待办返回 undefined", () => {
    const tasks = [{ seq: 3, status: "WAITING" }, { seq: 0, status: "DONE" }, { seq: 1, status: "WAITING" }];
    expect(nextSequential(tasks)).toBe(tasks[2]);
    expect(nextSequential([{ seq: 1, status: "DONE" }])).toBeUndefined();
    expect(nextSequential([])).toBeUndefined();
  });
});

describe("流程图推进", () => {
  const linear: WfModel = {
    processKey: "linear", name: "直线审批", startKey: "s",
    nodes: {
      s: { key: "s", name: "开始", type: "start", incoming: [], outgoing: ["sa"] },
      a: { key: "a", name: "审批", type: "userTask", incoming: ["sa"], outgoing: ["ae"] },
      e: { key: "e", name: "结束", type: "end", incoming: ["ae"], outgoing: [] },
    },
    flows: { sa: { id: "sa", source: "s", target: "a" }, ae: { id: "ae", source: "a", target: "e" } },
  };
  const exclusive: WfModel = {
    processKey: "exclusive", name: "条件审批", startKey: "s",
    nodes: {
      s: { key: "s", name: "开始", type: "start", incoming: [], outgoing: ["sx"] },
      x: { key: "x", name: "金额判断", type: "exclusiveGateway", incoming: ["sx"], outgoing: ["xb", "xa"], defaultFlow: "xb" },
      a: { key: "a", name: "大额审批", type: "userTask", incoming: ["xa"], outgoing: ["ae"] },
      b: { key: "b", name: "常规审批", type: "userTask", incoming: ["xb"], outgoing: ["be"] },
      e: { key: "e", name: "结束", type: "end", incoming: ["ae", "be"], outgoing: [] },
    },
    flows: {
      sx: { id: "sx", source: "s", target: "x" },
      xa: { id: "xa", source: "x", target: "a", condition: "amount > 10000" },
      xb: { id: "xb", source: "x", target: "b" },
      ae: { id: "ae", source: "a", target: "e" },
      be: { id: "be", source: "b", target: "e" },
    },
  };
  const parallel: WfModel = {
    processKey: "parallel", name: "并行审批", startKey: "s",
    nodes: {
      s: { key: "s", name: "开始", type: "start", incoming: [], outgoing: ["sf"] },
      f: { key: "f", name: "分叉", type: "parallelGateway", incoming: ["sf"], outgoing: ["fa", "fb"] },
      a: { key: "a", name: "审批甲", type: "userTask", incoming: ["fa"], outgoing: ["aj"] },
      b: { key: "b", name: "审批乙", type: "userTask", incoming: ["fb"], outgoing: ["bj"] },
      j: { key: "j", name: "汇聚", type: "parallelGateway", incoming: ["aj", "bj"], outgoing: ["jc"] },
      c: { key: "c", name: "复核", type: "userTask", incoming: ["jc"], outgoing: ["ce"] },
      e: { key: "e", name: "结束", type: "end", incoming: ["ce"], outgoing: [] },
    },
    flows: {
      sf: { id: "sf", source: "s", target: "f" }, fa: { id: "fa", source: "f", target: "a" }, fb: { id: "fb", source: "f", target: "b" },
      aj: { id: "aj", source: "a", target: "j" }, bj: { id: "bj", source: "b", target: "j" }, jc: { id: "jc", source: "j", target: "c" },
      ce: { id: "ce", source: "c", target: "e" },
    },
  };

  it("直线流程停在人工节点，完成后到达结束", () => {
    expect(activateFrom(linear, ["sa"], {}, {})).toEqual({ userTasks: ["a"], reachedEnd: false, joinState: {} });
    expect(activateFrom(linear, ["ae"], {}, {})).toEqual({ userTasks: [], reachedEnd: true, joinState: {} });
  });
  it.each([[20000, "a"], [10000, "b"]])("排他网关金额 %i 激活 %s", (amount, task) => {
    expect(activateFrom(exclusive, ["sx"], { amount }, {})).toEqual({
      userTasks: [task], reachedEnd: false, joinState: {},
    });
  });
  it("并行分叉激活所有分支，汇聚跨两次调用到齐后继续", () => {
    expect(activateFrom(parallel, ["sf"], {}, {})).toEqual({
      userTasks: ["a", "b"], reachedEnd: false, joinState: {},
    });
    const first = activateFrom(parallel, ["aj"], {}, {});
    expect(first).toEqual({ userTasks: [], reachedEnd: false, joinState: { j: ["aj"] } });
    const second = activateFrom(parallel, ["bj"], {}, first.joinState);
    expect(second).toEqual({ userTasks: ["c"], reachedEnd: false, joinState: { j: [] } });
    expect(first.joinState).toEqual({ j: ["aj"] });
  });
});
