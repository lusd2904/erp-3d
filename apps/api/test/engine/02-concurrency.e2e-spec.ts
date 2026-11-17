/** 验收 2：10 张下游并发审核反写同一上游的两行（加锁顺序相反），不超额、不死锁 */
import { Ctx, setup, ok, api, createAudited, num } from './helpers';
import { TST_SRC, TST_DST } from './test-bills';

describe('引擎验收 2：并发反写', () => {
  let c: Ctx;
  beforeAll(async () => { c = await setup([TST_SRC, TST_DST]); });
  afterAll(async () => c.app.close());

  // [集成修正] 测试账号无 PROCESS 权限时读不到 INNODB_METRICS，返回 null 跳过计数器比对（仍校验无 ER_LOCK_DEADLOCK 返回）
  async function deadlocks(): Promise<number | null> {
    try {
      const r = await c.db.one<any>(`SELECT COUNT AS n FROM information_schema.INNODB_METRICS WHERE NAME = 'lock_deadlocks'`);
      return Number(r?.n ?? 0);
    } catch {
      return null;
    }
  }

  it('10 个并发审核：只有不超上限的成功，累计数量 = 成功张数 × 15，无死锁', async () => {
    const src = await createAudited(c, 'tst_src', {}, [{ material_id: 1, qty: 100, cap_qty: 100 }, { material_id: 2, qty: 100, cap_qty: 100 }]);
    const [l1, l2] = src.entries;
    const link = (e: any) => ({ material_id: e.material_id, qty: 15, src_form: 'tst_src', src_bill_id: src.header.id, src_entry_id: e.id });
    const ids: number[] = [];
    for (let i = 0; i < 10; i++) {
      const v = await ok(c, 'post', '/bills/tst_dst', { header: {}, entries: i % 2 ? [link(l1), link(l2)] : [link(l2), link(l1)] });
      await ok(c, 'post', `/bills/tst_dst/${v.header.id}/ops/submit`);
      ids.push(v.header.id);
    }
    const before = await deadlocks();
    const results = await Promise.all(ids.map((id) => api(c, 'post', `/bills/tst_dst/${id}/ops/audit`)));
    const codes = results.map((r) => r.code);
    const okCount = codes.filter((x) => x === 'OK').length;
    expect(codes.every((x) => x === 'OK' || x === 'BIZ_OVER_LIMIT')).toBe(true);
    expect(okCount).toBe(6); // 6 × 15 = 90 ≤ 100，第 7 张 105 > 100
    const after = await deadlocks();
    if (before !== null && after !== null) expect(after - before).toBe(0);
    const v = await ok(c, 'get', `/bills/tst_src/${src.header.id}`);
    expect(v.entries.map((e: any) => num(e.done_qty))).toEqual([90, 90]);
    const logSum = await c.db.one<any>(`SELECT SUM(delta) AS s FROM sys_writeback_log WHERE src_bill_id = ?`, [src.header.id]);
    expect(num(logSum.s)).toBe(180);
  });

  it('批量审核接口逐张返回结果', async () => {
    const src = await createAudited(c, 'tst_src', {}, [{ material_id: 1, qty: 10, cap_qty: 10 }]);
    const e = src.entries[0];
    const mk = async (q: number) => {
      const v = await ok(c, 'post', '/bills/tst_dst', { header: {}, entries: [{ material_id: 1, qty: q, src_form: 'tst_src', src_bill_id: src.header.id, src_entry_id: e.id }] });
      await ok(c, 'post', `/bills/tst_dst/${v.header.id}/ops/submit`);
      return v.header.id;
    };
    const a = await mk(6);
    const b = await mk(6);
    const r = await ok(c, 'post', '/bills/tst_dst/batch-ops/audit', { ids: [a, b] });
    expect(r.results.map((x: any) => x.ok)).toEqual([true, false]);
    expect(r.results[1].code).toBe('BIZ_OVER_LIMIT');
  });
});
