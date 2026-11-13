/**
 * WP11 追加：自定义业务事件反写与冲回（质检完成 inspect_complete / 撤销 inspect_cancel，分录级），
 * outbox 在业务事务内插入、提交后投递；事件失败整体回滚（反写、事件状态、outbox 都不留）。
 */
import { Ctx, setup, ok, api, createAudited, num } from './helpers';
import { TST_RECV, tstInspect } from './test-bills';
import { OutboxService } from '../../src/bill-engine/service/outbox.service';
import { BillEngineRegistry } from '../../src/bill-engine/bill-engine.registry';
import { DbService } from '../../src/db/db.service';

describe('自定义事件反写（WP11 质检完成）', () => {
  let c: Ctx;
  let outbox: OutboxService;
  let recv: any;
  const delivered: any[] = [];
  beforeAll(async () => {
    c = await setup([TST_RECV]);
    outbox = c.app.get(OutboxService);
    const reg = c.app.get(BillEngineRegistry);
    const insp = tstInspect(outbox);
    reg.registerBill(insp);
    await reg.ensureTables('tst_inspect');
    await reg.syncToDb('tst_inspect');
    outbox.registerHandler('qm.inspect.completed', async (row) => { delivered.push(row); });
    recv = await createAudited(c, 'tst_recv', {}, [{ material_id: 1, qty: 100, rcv_qty: 100 }, { material_id: 2, qty: 50, rcv_qty: 50 }]);
  });
  afterAll(async () => c.app.close());

  const recvRows = async () => (await ok(c, 'get', `/bills/tst_recv/${recv.header.id}`)).entries;
  const mkInspect = async (rows: { line: number; ok: number; ng: number; con?: number }[]) =>
    createAudited(c, 'tst_inspect', {}, rows.map((r) => {
      const e = recv.entries[r.line];
      return { material_id: e.material_id, qty: r.ok + r.ng + (r.con ?? 0), inspect_qty: r.ok + r.ng + (r.con ?? 0), ok_qty: r.ok, ng_qty: r.ng, concession_qty: r.con ?? 0, src_form: 'tst_recv', src_bill_id: recv.header.id, src_entry_id: e.id };
    }));
  const outboxCount = async (billId: number) => Number((await c.db.one<any>(`SELECT COUNT(*) AS n FROM sys_event_outbox WHERE bill_id = ?`, [billId])).n);

  it('分录级质检完成：只反写选中行，写 outbox，提交后投递', async () => {
    const insp = await mkInspect([{ line: 0, ok: 90, ng: 8, con: 2 }, { line: 1, ok: 50, ng: 0 }]);
    expect(insp.allowedOps).toEqual(expect.arrayContaining(['inspect_complete', 'inspect_cancel']));
    const [i1, i2] = insp.entries.map((e: any) => e.id);
    await ok(c, 'post', `/bills/tst_inspect/${insp.header.id}/ops/inspect_complete`, { entryIds: [i1] });
    let r = await recvRows();
    expect([num(r[0].ok_qty), num(r[0].ng_qty), num(r[0].concession_qty)]).toEqual([90, 8, 2]);
    expect(num(r[1].ok_qty)).toBe(0);
    expect(await outboxCount(insp.header.id)).toBe(1);
    // 提交后 kick 投递；这里再显式调一次 dispatch 保证完成
    await outbox.dispatch();
    expect(delivered.some((d) => Number(d.bill_id) === insp.header.id && d.payload.entryIds[0] === i1)).toBe(true);
    const ob = await c.db.one<any>(`SELECT status FROM sys_event_outbox WHERE bill_id = ? AND event_type = 'qm.inspect.completed'`, [insp.header.id]);
    expect(ob.status).toBe('DONE');

    // 同一行不能重复完成；事件未撤销时不能反审核
    expect((await api(c, 'post', `/bills/tst_inspect/${insp.header.id}/ops/inspect_complete`, { entryIds: [i1] })).code).toBe('BIZ_ROW_STATE');
    expect((await api(c, 'post', `/bills/tst_inspect/${insp.header.id}/ops/unaudit`)).code).toBe('BIZ_STATE_NOT_ALLOWED');

    // 不带 entryIds：处理剩余未完成的行
    await ok(c, 'post', `/bills/tst_inspect/${insp.header.id}/ops/inspect_complete`, {});
    r = await recvRows();
    expect(num(r[1].ok_qty)).toBe(50);

    // 撤销第 1 行：只冲回第 1 行
    await ok(c, 'post', `/bills/tst_inspect/${insp.header.id}/ops/inspect_cancel`, { entryIds: [i1] });
    r = await recvRows();
    expect([num(r[0].ok_qty), num(r[0].ng_qty), num(r[0].concession_qty)]).toEqual([0, 0, 0]);
    expect(num(r[1].ok_qty)).toBe(50);
    expect((await api(c, 'post', `/bills/tst_inspect/${insp.header.id}/ops/inspect_cancel`, { entryIds: [i1] })).code).toBe('BIZ_ROW_STATE');
    // 全部撤销后可以反审核
    await ok(c, 'post', `/bills/tst_inspect/${insp.header.id}/ops/inspect_cancel`, {});
    r = await recvRows();
    expect(num(r[1].ok_qty)).toBe(0);
    await ok(c, 'post', `/bills/tst_inspect/${insp.header.id}/ops/unaudit`);
    const logs = await c.db.one<any>(`SELECT COUNT(*) AS n FROM sys_writeback_log WHERE tgt_bill_id = ?`, [insp.header.id]);
    expect(Number(logs.n)).toBe(0);
  });

  it('超额时整个事件回滚：上游不变、事件状态不留、outbox 不留', async () => {
    const a = await mkInspect([{ line: 1, ok: 40, ng: 0 }]);
    await ok(c, 'post', `/bills/tst_inspect/${a.header.id}/ops/inspect_complete`, {});
    const b = await mkInspect([{ line: 1, ok: 5, ng: 6 }]); // 40 + 11 > 50
    const r = await api(c, 'post', `/bills/tst_inspect/${b.header.id}/ops/inspect_complete`, {});
    expect(r.code).toBe('BIZ_OVER_LIMIT');
    expect(r.msg).toBe('合格+不合格+让步数量超过收料数量');
    const rows = await recvRows();
    expect([num(rows[1].ok_qty), num(rows[1].ng_qty)]).toEqual([40, 0]);
    expect(await outboxCount(b.header.id)).toBe(0);
    const st = await c.db.one<any>(`SELECT COUNT(*) AS n FROM sys_bill_event_state WHERE form = 'tst_inspect' AND bill_id = ?`, [b.header.id]);
    expect(Number(st.n)).toBe(0);
  });

  it('outbox：事务回滚则不插入；事务提交才投递', async () => {
    const db = c.app.get(DbService);
    await expect(db.tx(async () => {
      await outbox.enqueue('t.rollback', { billId: 424242 });
      throw new Error('业务失败');
    })).rejects.toThrow('业务失败');
    expect(await outboxCount(424242)).toBe(0);
    const got: number[] = [];
    outbox.registerHandler('t.commit', async (row) => { got.push(Number(row.bill_id)); });
    await db.tx(async () => { await outbox.enqueue('t.commit', { billId: 434343 }); });
    for (let i = 0; i < 20 && !got.length; i++) await new Promise((r) => setTimeout(r, 100));
    expect(got).toEqual([434343]);
  });
});
