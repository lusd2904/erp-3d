/** 验收 5（引擎部分）：行状态执行至 / 反执行至跳跃、守卫拦截、单步行操作、已结算不能反结案；结案 9 种组合由 WP06 生产模块实现后补 */
import { Ctx, setup, ok, api, createAudited } from './helpers';
import { TST_MO, guardCalls, eventCalls } from './test-bills';

describe('引擎验收 5：行状态执行至', () => {
  let c: Ctx;
  let mo: any;
  beforeAll(async () => {
    c = await setup([TST_MO]);
    mo = await createAudited(c, 'tst_mo', {}, [{ material_id: 1, qty: 10 }, { material_id: 2, qty: 20 }]);
  });
  afterAll(async () => c.app.close());
  const rows = async () => (await ok(c, 'get', `/bills/tst_mo/${mo.header.id}`)).entries;

  it('新行初始状态为 PLANNED；审核前不能执行', async () => {
    expect((await rows()).map((e: any) => e.biz_status)).toEqual(['PLANNED', 'PLANNED']);
    const d = await ok(c, 'post', '/bills/tst_mo', { header: {}, entries: [{ material_id: 1, qty: 1 }] });
    expect((await api(c, 'post', `/bills/tst_mo/${d.header.id}/ops/exec_to`, { target: 'RELEASED' })).code).toBe('BIZ_STATE_NOT_ALLOWED');
  });

  it('执行至 FINISHED：自动经过中间状态，按序触发守卫和绑定事件', async () => {
    const e1 = mo.entries[0].id;
    await ok(c, 'post', `/bills/tst_mo/${mo.header.id}/ops/exec_to`, { target: 'FINISHED', entryIds: [e1] });
    const r = await rows();
    expect(r.map((e: any) => e.biz_status)).toEqual(['FINISHED', 'PLANNED']);
    expect(guardCalls).toEqual(['release:1']);
    expect(eventCalls).toEqual([`finish:${e1}`]);
    expect((await api(c, 'post', `/bills/tst_mo/${mo.header.id}/ops/exec_to`, { target: 'NOPE', entryIds: [mo.entries[1].id] })).code).toBe('SYS_VALIDATION');
    // 已有行执行时整单不能反审核
    expect((await api(c, 'post', `/bills/tst_mo/${mo.header.id}/ops/unaudit`)).code).toBe('BIZ_ROW_STATE');
  });

  it('反执行至 STARTED（撤销完工事件）；有汇报时守卫拦截反开工', async () => {
    const e1 = mo.entries[0].id;
    await ok(c, 'post', `/bills/tst_mo/${mo.header.id}/ops/exec_to`, { target: 'STARTED', entryIds: [e1] });
    expect((await rows())[0].biz_status).toBe('STARTED');
    expect(eventCalls).toEqual([`finish:${e1}`, `unfinish:${e1}`]);
    await c.db.exec(`UPDATE tst_mo_entry SET reported_qty = 5 WHERE id = ?`, [e1]);
    const r = await api(c, 'post', `/bills/tst_mo/${mo.header.id}/ops/exec_to`, { target: 'PLANNED', entryIds: [e1] });
    expect(r.code).toBe('BIZ_ROW_STATE');
    expect(r.msg).toContain('已有汇报');
    expect((await rows())[0].biz_status).toBe('STARTED'); // 整体回滚
  });

  it('单步行操作；已结算不能反结案', async () => {
    const e2 = mo.entries[1].id;
    await ok(c, 'post', `/bills/tst_mo/${mo.header.id}/ops/confirm`, { entryIds: [e2] });
    expect((await rows())[1].biz_status).toBe('CONFIRMED');
    expect((await api(c, 'post', `/bills/tst_mo/${mo.header.id}/ops/start`, { entryIds: [e2] })).code).toBe('BIZ_ROW_STATE');
    await ok(c, 'post', `/bills/tst_mo/${mo.header.id}/ops/exec_to`, { target: 'FINISHED', entryIds: [e2] });
    await ok(c, 'post', `/bills/tst_mo/${mo.header.id}/ops/close_row`, { entryIds: [e2] });
    // 反结案不允许被“反执行至”自动跳过（jumpable: false）
    expect((await api(c, 'post', `/bills/tst_mo/${mo.header.id}/ops/exec_to`, { target: 'STARTED', entryIds: [e2] })).code).toBe('BIZ_ROW_STATE');
    await c.db.exec(`UPDATE tst_mo_entry SET settled = 1 WHERE id = ?`, [e2]);
    const r = await api(c, 'post', `/bills/tst_mo/${mo.header.id}/ops/unclose_row`, { entryIds: [e2] });
    expect(r.code).toBe('BIZ_ROW_STATE');
    expect(r.msg).toContain('已结算');
  });
});
