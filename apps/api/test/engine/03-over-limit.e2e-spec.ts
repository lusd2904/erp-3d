/** 验收 3：超额控制（领料四种模式：允许 / 最小发料批量 / 不允许 / 按损耗率；入库允许超额一次） */
import { Ctx, setup, ok, api, createAudited, num } from './helpers';
import { TST_PPBOM, TST_PICK, TST_INSTOCK } from './test-bills';

describe('引擎验收 3：超额控制', () => {
  let c: Ctx;
  let bom: any;
  beforeAll(async () => {
    c = await setup([TST_PPBOM, TST_PICK, TST_INSTOCK]);
    bom = await createAudited(c, 'tst_ppbom', {}, [
      { material_id: 1, qty: 100, must_qty: 100, std_qty: 100, over_ctrl: 'ALLOW' },
      { material_id: 2, qty: 95, must_qty: 95, std_qty: 95, min_issue_qty: 20, over_ctrl: 'MIN_BATCH' },
      { material_id: 3, qty: 100, must_qty: 100, std_qty: 100, over_ctrl: 'FORBID' },
      { material_id: 4, qty: 100, must_qty: 100, std_qty: 100, scrap_rate: 5, over_ctrl: 'SCRAP' },
      { material_id: 5, qty: 100, must_qty: 100, std_qty: 100, over_ctrl: 'FORBID' },
    ]);
  });
  afterAll(async () => c.app.close());

  async function pick(form: string, line: number, qty: string | number) {
    const e = bom.entries[line];
    const v = await ok(c, 'post', `/bills/${form}`, { header: {}, entries: [{ material_id: e.material_id, qty, src_form: 'tst_ppbom', src_bill_id: bom.header.id, src_entry_id: e.id }] });
    await ok(c, 'post', `/bills/${form}/${v.header.id}/ops/submit`);
    return api(c, 'post', `/bills/${form}/${v.header.id}/ops/audit`);
  }
  const picked = async (line: number, f = 'picked_qty') => num((await ok(c, 'get', `/bills/tst_ppbom/${bom.header.id}`)).entries[line][f]);

  it('ALLOW：允许超发', async () => {
    expect((await pick('tst_pick', 0, 150)).code).toBe('OK');
    expect(await picked(0)).toBe(150);
  });
  it('MIN_BATCH：按最小发料批量向上取整（95 → 100）', async () => {
    expect((await pick('tst_pick', 1, 100)).code).toBe('OK');
    const r = await pick('tst_pick', 1, '0.001');
    expect(r.code).toBe('BIZ_OVER_LIMIT');
    expect(r.msg).toBe('超过领料上限');
    expect(await picked(1)).toBe(100);
  });
  it('FORBID：超 0.001 即拦截', async () => {
    expect((await pick('tst_pick', 2, '100.001')).code).toBe('BIZ_OVER_LIMIT');
    expect((await pick('tst_pick', 2, 100)).code).toBe('OK');
    expect((await pick('tst_pick', 2, '0.001')).code).toBe('BIZ_OVER_LIMIT');
    expect(await picked(2)).toBe(100);
  });
  it('SCRAP：按损耗率上限（100 × 1.05 = 105）', async () => {
    expect((await pick('tst_pick', 3, '105.001')).code).toBe('BIZ_OVER_LIMIT');
    expect((await pick('tst_pick', 3, 105)).code).toBe('OK');
    expect(await picked(3)).toBe(105);
  });
  it('ONCE：反写前未达上限可超一次，之后拦截', async () => {
    expect((await pick('tst_instock', 4, 80)).code).toBe('OK');
    expect((await pick('tst_instock', 4, 50)).code).toBe('OK');
    expect(await picked(4, 'in_qty')).toBe(130);
    expect((await pick('tst_instock', 4, 1)).code).toBe('BIZ_OVER_LIMIT');
  });
});
