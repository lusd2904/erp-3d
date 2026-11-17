import { type UserTaskCfg } from "@erp3d/shared";

export type CsResult = "PENDING" | "PASS" | "FAIL";

export function evalCountersign(
  cfg: Pick<UserTaskCfg, "multi" | "ratio" | "votes">,
  votes: { vote: "AGREE" | "DISAGREE" | null }[],
): CsResult {
  const total = votes.length;
  if (total === 0) return "PASS";

  let agree = 0;
  let disagree = 0;
  for (const item of votes) {
    if (item.vote === "AGREE") agree += 1;
    else if (item.vote === "DISAGREE") disagree += 1;
  }

  const pending = total - agree - disagree;

  switch (cfg.multi) {
    case "any":
      if (agree >= 1) return "PASS";
      return disagree === total ? "FAIL" : "PENDING";

    case "ratio":
    case "votes": {
      const need =
        cfg.multi === "ratio"
          ? Math.ceil(total * (cfg.ratio ?? 1) - 1e-9)
          : Math.min(cfg.votes ?? total, total);

      if (agree >= need) return "PASS";
      return agree + pending < need ? "FAIL" : "PENDING";
    }

    case "all":
    default:
      if (disagree >= 1) return "FAIL";
      return agree === total ? "PASS" : "PENDING";
  }
}

export function nextSequential<T extends { seq: number; status: string }>(
  tasks: T[],
): T | undefined {
  let next: T | undefined;
  for (const task of tasks) {
    if (
      task.status === "WAITING" &&
      (next === undefined || task.seq < next.seq)
    ) {
      next = task;
    }
  }
  return next;
}
