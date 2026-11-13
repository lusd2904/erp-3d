/** 验收 4：合单分组（R08：发料组织+生产组织+货主+货主类型；R17：生产组织+货主+货主类型） */
import { Ctx, setup, ok, createAudited, num } from './helpers';
import { TST_PPBOM2, TST_FEED } from './test-bills';

describe('引擎验收 4：合单分组', () => {
  let c: Ctx;
  let entryIds: number[] = [];
  beforeAll(async () => {
    c = await setup([TST_PPBOM2, TST_FEED]);
    const mk = (issue: number, prd: number, rows: [number, string, number][]) =>
      createAudited(c, 'tst_ppbom2', { issue_org_id: issue, prd_org_id: prd }, rows.map(([owner, type, q], i) => ({ material_id: i + 1, qty: q, must_qty: q, owner_id: owner, owner_type: type })));
    const a = await mk(1, 10, [[100, 'ORG', 1], [100, 'ORG', 2], [200, 'ORG', 3]]);
    const b = await mk(1, 10, [[100, 'ORG', 4], [100, 'SUP', 5]]);
    const d = await mk(2, 10, [[100, 'ORG', 6]]);
    const e = await mk(2, 20, [[100, 'ORG', 7]]);
    entryIds = [a, b, d, e].flatMap((x: any) => x.entries.map((r: any) => r.id));
  });
  afterAll(async () => c.app.close());

  const key = (h: any, ks: string[]) => ks.map((k) => String(h[k])).join('|');

  it('R08 补料：按 发料组织+生产组织+货主+货主类型 分组', async () => {
    const r = await ok(c, 'post', '/convert/tst_r08', { rule: 'tst_r08', entries: entryIds.map((entryId) => ({ entryId })) });
    // 组合：(1,10,100,ORG)[1,2,4] (1,10,200,ORG)[3] (1,10,100,SUP)[5] (2,10,100,ORG)[6] (2,20,100,ORG)[7]
    expect(r.drafts).toHaveLength(5);
    const ks = r.drafts.map((d: any) => key(d.header, ['issue_org_id', 'prd_org_id', 'owner_id', 'owner_type']));
    expect(new Set(ks).size).toBe(5);
    const g = r.drafts.find((d: any) => key(d.header, ['issue_org_id', 'prd_org_id', 'owner_id', 'owner_type']) === '1|10|100|ORG');
    expect(g.entries).toHaveLength(3);
    expect(num(g.header.total_qty)).toBe(7);
  });

  it('R17 入库：跨源单按 生产组织+货主+货主类型 合并', async () => {
    const r = await ok(c, 'post', '/convert/tst_r17', { rule: 'tst_r17', entries: entryIds.map((entryId) => ({ entryId })) });
    // 组合：(10,100,ORG)[1,2,4,6] (10,200,ORG)[3] (10,100,SUP)[5] (20,100,ORG)[7]
    expect(r.drafts).toHaveLength(4);
    const g = r.drafts.find((d: any) => key(d.header, ['prd_org_id', 'owner_id', 'owner_type']) === '10|100|ORG');
    expect(g.entries.map((x: any) => num(x.qty)).sort()).toEqual([1, 2, 4, 6]);
    expect(num(g.header.total_qty)).toBe(13);
    expect(new Set(g.entries.map((x: any) => x.src_bill_id)).size).toBe(3);
  });
});
