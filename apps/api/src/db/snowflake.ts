/**
 * 53 位雪花 id（保证 JS Number 安全，前端无需当字符串处理）：
 * 41 位毫秒（自 2026-01-01，可用约 69 年）+ 5 位工作节点 + 7 位序列（每毫秒每节点 128 个）。
 */
const EPOCH = 1767196800000n; // 2026-01-01T00:00:00+08:00
let lastMs = 0n;
let seq = 0n;
let worker = 1n;

export function setWorkerId(id: number) {
  worker = BigInt(id & 31);
}

export function nextId(): number {
  let now = BigInt(Date.now());
  if (now < lastMs) now = lastMs; // 时钟回拨：沿用上次时间
  if (now === lastMs) {
    seq = (seq + 1n) & 127n;
    if (seq === 0n) {
      while (BigInt(Date.now()) <= lastMs) {
        /* 等下一毫秒 */
      }
      now = BigInt(Date.now());
    }
  } else {
    seq = 0n;
  }
  lastMs = now;
  return Number(((now - EPOCH) << 12n) | (worker << 7n) | seq);
}
