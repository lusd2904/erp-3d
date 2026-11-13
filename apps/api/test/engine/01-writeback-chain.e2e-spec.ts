/**
 * 验收 1：两段反写全周期（采购申请 → 采购订单：下推 → 暂存 → 保存 → 审核 → 反审核 → 作废 → 反作废 → 作废 → 删除），
 * 并覆盖：有下游禁止反审核、已审核须先反审核才能作废、整单自动关闭、上查下查、子分录 row[<key>]（T02）、元数据与列表接口。
 */
import { Ctx, setup, api, ok, createAudited, num } from './helpers';

const RULE = 'scm_pur_req-scm_pur_order';

describe('引擎验收 1：反写全链（采购申请 → 采购订单）', () => {
  let c: Ctx;
  let req: any; // 采购申请 BillView
  let e1: number;
  let e2: number;

  const reqRows = async () => {
    const v = await ok(c, 'get', `/bills/scm_pur_req/${req.header.id}`);
    return { h: v.header, r1: v.entries.find((x: any) => x.id === e1), r2: v.entries.find((x: any) => x.id === e2) };
  };

  beforeAll(async () => {
    c = await setup();
    req = await createAudited(c, 'scm_pur_req', { remark: '验收1' }, [
      { material_id: 101, qty: 100, apply_qty: 100, approve_qty: 100, arrive_date: '2026-12-01', sugg_supplier_id: 9001 },
      { material_id: 102, qty: 50, apply_qty: 50, approve_qty: 50, arrive_date: '2026-12-02', sugg_supplier_id: 9001 },
    ]);
    e1 = req.entries[0].id;
    e2 = req.entries[1].id;
  });
  afterAll(async () => c.app.close());

  it('元数据与列表接口', async () => {
    const m = await ok(c, 'get', '/meta/bills/scm_pur_order');
    expect(m.meta.form).toBe('scm_pur_order');
    expect(m.stateMachine.ops.map((o: any) => o.code)).toEqual(expect.arrayContaining(['submit', 'audit', 'unaudit', 'cancel', 'delete']));
    const mr = await ok(c, 'get', '/meta/bills/scm_pur_req');
    expect(mr.converts.map((x: any) => x.code)).toContain(RULE);
    expect((await api(c, 'get', '/meta/bills/no_such_bill')).code).toBe('BIZ_UNKNOWN_FORM');

    expect(req.header.status).toBe('AUDITED');
    expect(req.header.bill_no).toMatch(/^CGSQ\d{8}\d{5}$/);
    expect(req.allowedOps).toEqual(expect.arrayContaining(['unaudit', 'close', 'push']));
    expect(req.lockedFields).toEqual({ header: '*', entry: '*' });
    expect(num(req.entries[0].remain_qty)).toBe(100);

    const filter = JSON.stringify({ logic: 'and', conditions: [{ field: 'status', op: 'eq', value: 'AUDITED' }, { field: 'remark', op: 'like', value: '验收' }] });
    const list = await ok(c, 'get', `/bills/scm_pur_req?page=1&size=10&sort=bill_date:desc,id:desc&filter=${encodeURIComponent(filter)}`);
    expect(list.total).toBeGreaterThanOrEqual(1);
    expect(list.rows.some((r: any) => r.id === req.header.id)).toBe(true);
    const list2 = await ok(c, 'get', `/bills/scm_pur_req?withEntry=1&filter=${encodeURIComponent(JSON.stringify({ conditions: [{ field: 'id', op: 'eq', value: req.header.id }] }))}`);
    expect(list2.rows).toHaveLength(2);
    expect(list2.rows[0]['entry.approve_qty']).toBeDefined();
    expect((await api(c, 'get', `/bills/scm_pur_req?filter=${encodeURIComponent(JSON.stringify({ conditions: [{ field: 'nope', op: 'eq', value: 1 }] }))}`)).code).toBe('SYS_VALIDATION');
  });

  let order: any;
  it('下推 → 暂存（不占用）→ 保存（占用 link_qty），子分录挂在 row.plan', async () => {
    const push = await ok(c, 'post', `/convert/${RULE}`, { rule: RULE, entries: [{ entryId: e1, qty: 60 }, { entryId: e2 }] });
    expect(push.tgtForm).toBe('scm_pur_order');
    expect(push.drafts).toHaveLength(1);
    const d = push.drafts[0];
    expect(d.header.supplier_id).toBe(9001);
    expect(d.entries.map((x: any) => num(x.qty))).toEqual([60, 50]);
    expect(d.entries[0].src_entry_id).toBe(e1);
    expect(d.entries[0].deliver_date).toBe('2026-12-01');

    d.entries[0].plan = [{ date: '2026-12-01', qty: 30 }, { date: '2026-12-05', qty: 30 }];
    order = await ok(c, 'post', '/bills/scm_pur_order?mode=draft', d);
    expect(order.header.status).toBe('DRAFT');
    expect(order.entries[0].plan).toHaveLength(2);
    let { r1 } = await reqRows();
    expect(num(r1.link_qty)).toBe(0);

    order = await ok(c, 'put', `/bills/scm_pur_order/${order.header.id}?mode=save`, { header: order.header, entries: order.entries, version: order.header.version });
    expect(order.header.status).toBe('CREATED');
    expect(order.header.bill_no).toMatch(/^CGDD/);
    expect(order.entries[0].plan.map((p: any) => num(p.qty))).toEqual([30, 30]);
    const rr = await reqRows();
    expect([num(rr.r1.link_qty), num(rr.r2.link_qty)]).toEqual([60, 50]);
  });

  it('再次下推超出可下推数量被拦截；乐观锁版本冲突', async () => {
    const r = await api(c, 'post', `/convert/${RULE}`, { rule: RULE, entries: [{ entryId: e1, qty: 50 }] });
    expect(r.code).toBe('BIZ_OVER_LIMIT');
    const stale = await api(c, 'put', `/bills/scm_pur_order/${order.header.id}`, { header: { remark: 'x' }, version: order.header.version - 1 });
    expect(stale.code).toBe('BIZ_VERSION_CONFLICT');
  });

  it('审核反写 order_qty / remain_qty，行自动关闭；上游有下游时禁止反审核；已审核不能直接作废', async () => {
    await ok(c, 'post', `/bills/scm_pur_order/${order.header.id}/ops/submit`);
    order = await ok(c, 'post', `/bills/scm_pur_order/${order.header.id}/ops/audit`);
    expect(order.header.status).toBe('AUDITED');
    const { h, r1, r2 } = await reqRows();
    expect([num(r1.order_qty), num(r2.order_qty)]).toEqual([60, 50]);
    expect([num(r1.remain_qty), num(r2.remain_qty)]).toEqual([40, 0]);
    expect([r1.biz_close, r2.biz_close]).toEqual(['A', 'B']);
    expect(h.close_status).toBe('A');

    const un = await api(c, 'post', `/bills/scm_pur_req/${req.header.id}/ops/unaudit`);
    expect(un.code).toBe('BIZ_HAS_DOWNSTREAM');
    const can = await api(c, 'post', `/bills/scm_pur_order/${order.header.id}/ops/cancel`);
    expect(can.code).toBe('BIZ_STATE_NOT_ALLOWED');
    expect(can.msg).toContain('先反审核');
    // 审核后字段锁定
    const edit = await api(c, 'put', `/bills/scm_pur_order/${order.header.id}`, { header: { remark: '改' }, version: order.header.version });
    expect(edit.code).toBe('BIZ_FIELD_LOCKED');
  });

  it('上查 / 下查', async () => {
    const up = await ok(c, 'get', `/bills/scm_pur_order/${order.header.id}/links?dir=up`);
    expect(up).toHaveLength(2);
    expect(up[0]).toMatchObject({ form: 'scm_pur_req', billId: req.header.id, billNo: req.header.bill_no });
    const down = await ok(c, 'get', `/bills/scm_pur_req/${req.header.id}/links?dir=down`);
    expect(down.map((x: any) => x.billId)).toEqual([order.header.id, order.header.id]);
  });

  it('反审核冲回审核反写，行重新打开', async () => {
    order = await ok(c, 'post', `/bills/scm_pur_order/${order.header.id}/ops/unaudit`);
    expect(order.header.status).toBe('REAUDIT');
    const { r1, r2 } = await reqRows();
    expect([num(r1.order_qty), num(r2.order_qty)]).toEqual([0, 0]);
    expect([num(r1.remain_qty), num(r2.remain_qty)]).toEqual([100, 50]);
    expect([r1.biz_close, r2.biz_close]).toEqual(['A', 'A']);
    expect([num(r1.link_qty), num(r2.link_qty)]).toEqual([60, 50]);
  });

  it('作废释放占用；反作废重新占用；再作废', async () => {
    order = await ok(c, 'post', `/bills/scm_pur_order/${order.header.id}/ops/cancel`);
    expect(order.header.cancel_status).toBe('B');
    let rr = await reqRows();
    expect([num(rr.r1.link_qty), num(rr.r2.link_qty)]).toEqual([0, 0]);
    order = await ok(c, 'post', `/bills/scm_pur_order/${order.header.id}/ops/uncancel`);
    expect(order.header.cancel_status).toBe('A');
    expect(order.header.status).toBe('REAUDIT');
    rr = await reqRows();
    expect([num(rr.r1.link_qty), num(rr.r2.link_qty)]).toEqual([60, 50]);
    order = await ok(c, 'post', `/bills/scm_pur_order/${order.header.id}/ops/cancel`);
    rr = await reqRows();
    expect([num(rr.r1.link_qty), num(rr.r2.link_qty)]).toEqual([0, 0]);
  });

  it('删除：链路清除，上游数量回到初始值，上游可反审核', async () => {
    await ok(c, 'post', `/bills/scm_pur_order/${order.header.id}/ops/delete`);
    expect((await api(c, 'get', `/bills/scm_pur_order/${order.header.id}`)).code).toBe('BIZ_BILL_NOT_FOUND');
    const down = await ok(c, 'get', `/bills/scm_pur_req/${req.header.id}/links?dir=down`);
    expect(down).toHaveLength(0);
    const { h, r1, r2 } = await reqRows();
    for (const r of [r1, r2]) {
      expect(num(r.link_qty)).toBe(0);
      expect(num(r.order_qty)).toBe(0);
      expect(r.biz_close).toBe('A');
    }
    expect([num(r1.remain_qty), num(r2.remain_qty)]).toEqual([100, 50]);
    expect(h.close_status).toBe('A');
    const logs = await c.db.q(`SELECT COUNT(*) AS n FROM sys_writeback_log WHERE src_bill_id = ?`, [req.header.id]);
    expect(Number(logs[0].n)).toBe(0);
    const un = await ok(c, 'post', `/bills/scm_pur_req/${req.header.id}/ops/unaudit`);
    expect(un.header.status).toBe('REAUDIT');
  });

  it('全部数量下推审核后上游整单自动关闭，反审核后重新打开', async () => {
    const r = await createAudited(c, 'scm_pur_req', {}, [
      { material_id: 101, qty: 10, apply_qty: 10, approve_qty: 10, arrive_date: '2026-12-01', sugg_supplier_id: 9002 },
      { material_id: 102, qty: 20, apply_qty: 20, approve_qty: 20, arrive_date: '2026-12-01', sugg_supplier_id: 9002 },
    ]);
    const push = await ok(c, 'post', `/convert/${RULE}`, { rule: RULE, entries: r.entries.map((x: any) => ({ entryId: x.id })), save: true });
    expect(push.billIds).toHaveLength(1);
    const oid = push.billIds[0];
    await ok(c, 'post', `/bills/scm_pur_order/${oid}/ops/submit`);
    await ok(c, 'post', `/bills/scm_pur_order/${oid}/ops/audit`);
    let v = await ok(c, 'get', `/bills/scm_pur_req/${r.header.id}`);
    expect(v.header.close_status).toBe('B');
    expect(v.entries.map((x: any) => x.biz_close)).toEqual(['B', 'B']);
    // 已关闭的上游不能再下推
    expect((await api(c, 'post', `/convert/${RULE}`, { rule: RULE, entries: [{ entryId: r.entries[0].id }] })).code).toBe('BIZ_SRC_NOT_AVAILABLE');
    await ok(c, 'post', `/bills/scm_pur_order/${oid}/ops/unaudit`);
    v = await ok(c, 'get', `/bills/scm_pur_req/${r.header.id}`);
    expect(v.header.close_status).toBe('A');
    expect(v.entries.map((x: any) => x.biz_close)).toEqual(['A', 'A']);
  });

  it('必录校验返回逐行错误；暂存不校验', async () => {
    const bad = await api(c, 'post', '/bills/scm_pur_req', { header: {}, entries: [{ material_id: 1, qty: 1 }] });
    expect(bad.code).toBe('BIZ_REQUIRED');
    expect(bad.errors).toEqual(expect.arrayContaining([expect.objectContaining({ entity: 'entry', row: 1, field: 'apply_qty' })]));
    const draft = await ok(c, 'post', '/bills/scm_pur_req?mode=draft', { header: {}, entries: [{ material_id: 1, qty: 1 }] });
    expect(draft.header.status).toBe('DRAFT');
    expect((await api(c, 'post', `/bills/scm_pur_req/${draft.header.id}/ops/audit`)).code).toBe('BIZ_STATE_NOT_ALLOWED');
  });
});
