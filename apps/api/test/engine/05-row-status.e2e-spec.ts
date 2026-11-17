/** 验收 5：行状态执行至 / 反执行至跳跃、守卫拦截、单步行操作、已结算不能反结案及结案 9 种控制组合 */
import { Ctx, setup, ok, api, createAudited } from './helpers';
import { TST_MO, guardCalls, eventCalls } from './test-bills';
import { checkMoClose } from '../../../../packages/shared/src/close-ctrl';
import type { MoCloseMaterial, MoCloseScope, MoCloseStrength } from '../../../../packages/shared/src/close-ctrl';

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

describe('引擎验收 5b：结案 9 种控制矩阵', () => {
  let c: Ctx;
  let billId: number;
  let entryId: number;

  // 顺序固定：普通非倒冲物料、倒冲物料、非倒冲关键物料。
  // 标准耗用均为 100，损耗率均为 2%，因此允许损耗上限均为 2。
  const materialsWithWip = (wips: readonly [number, number, number]): MoCloseMaterial[] => [
    { materialId: 101, isBackflush: false, isKey: false, pickedQty: 100 + wips[0], stdConsumeQty: 100, scrapRate: 2 },
    { materialId: 102, isBackflush: true, isKey: false, pickedQty: 100 + wips[1], stdConsumeQty: 100, scrapRate: 2 },
    { materialId: 103, isBackflush: false, isKey: true, pickedQty: 100 + wips[2], stdConsumeQty: 100, scrapRate: 2 },
  ];

  const scenarios: { name: string; materials: MoCloseMaterial[] }[] = [
    { name: '全部在制为零', materials: materialsWithWip([0, 0, 0]) },
    { name: '全部在损耗范围内并包含上限', materials: materialsWithWip([1, 2, 1]) },
    { name: '仅倒冲物料超损耗', materials: materialsWithWip([0, 3, 0]) },
    { name: '仅普通物料超损耗', materials: materialsWithWip([3, 0, 0]) },
    { name: '仅关键物料超损耗', materials: materialsWithWip([0, 0, 3]) },
    { name: '仅关键物料欠料', materials: materialsWithWip([0, 0, -1]) },
  ];

  // 每行的六个数组与 scenarios 一一对应；空数组表示允许结案，
  // 非空数组明确列出应被拦截的物料，避免用被测函数生成矩阵期望。
  const matrix: [MoCloseScope, MoCloseStrength, number[][]][] = [
    ['ALL', 'ZERO', [
      [], [101, 102, 103], [102], [101], [103], [103],
    ]],
    ['ALL', 'IN_SCRAP', [
      [], [], [102], [101], [103], [103],
    ]],
    ['ALL', 'NONE', [
      [], [], [], [], [], [],
    ]],
    ['NON_BACKFLUSH', 'ZERO', [
      [], [101, 103], [], [101], [103], [103],
    ]],
    ['NON_BACKFLUSH', 'IN_SCRAP', [
      [], [], [], [101], [103], [103],
    ]],
    ['NON_BACKFLUSH', 'NONE', [
      [], [], [], [], [], [],
    ]],
    ['KEY', 'ZERO', [
      [], [103], [], [], [103], [103],
    ]],
    ['KEY', 'IN_SCRAP', [
      [], [], [], [], [103], [103],
    ]],
    ['KEY', 'NONE', [
      [], [], [], [], [], [],
    ]],
  ];

  beforeAll(async () => {
    c = await setup([TST_MO]);
    const mo = await createAudited(c, 'tst_mo', {}, [
      { material_id: 1, qty: 10, settled: 0 },
    ]);
    billId = mo.header.id;
    entryId = mo.entries[0].id;
    await ok(c, 'post', `/bills/tst_mo/${billId}/ops/exec_to`, {
      target: 'FINISHED',
      entryIds: [entryId],
    });
  });

  afterAll(async () => {
    if (c) await c.app.close();
  });

  const expectStatus = async (status: string): Promise<void> => {
    const view = await ok(c, 'get', `/bills/tst_mo/${billId}`);
    expect(view.entries).toHaveLength(1);
    expect(view.entries[0].id).toBe(entryId);
    expect(view.entries[0].biz_status).toBe(status);
    expect(Number(view.entries[0].settled)).toBe(0);
  };

  const unclose = async (): Promise<void> => {
    // 此清单不满足 ALL + ZERO，但反结案守卫只检查 settled。
    await ok(c, 'post', `/bills/tst_mo/${billId}/ops/unclose_row`, {
      entryIds: [entryId],
      closeScope: 'ALL',
      closeStrength: 'ZERO',
      materials: materialsWithWip([0, 0, -1]),
    });
    await expectStatus('FINISHED');
  };

  it.each(matrix)('%s × %s：逐场景验证结案和失败回滚', async (scope, strength, expectedIdsByScenario) => {
    await expectStatus('FINISHED');
    expect(expectedIdsByScenario).toHaveLength(scenarios.length);
    expect(expectedIdsByScenario.some((ids) => ids.length === 0)).toBe(true);
    expect(expectedIdsByScenario.some((ids) => ids.length > 0)).toBe(strength !== 'NONE');

    for (const [index, scenario] of scenarios.entries()) {
      const expectedIds = expectedIdsByScenario[index]!;
      const result = await api(c, 'post', `/bills/tst_mo/${billId}/ops/close_row`, {
        entryIds: [entryId],
        closeScope: scope,
        closeStrength: strength,
        materials: scenario.materials,
      });

      // 将场景名放进断言，便于定位同一组合中的具体失败场景。
      expect({ scenario: scenario.name, code: result.code }).toEqual({
        scenario: scenario.name,
        code: expectedIds.length > 0 ? 'BIZ_ROW_STATE' : 'OK',
      });

      if (expectedIds.length > 0) {
        const reasons = result.msg.split('；');
        expect(reasons).toHaveLength(expectedIds.length);
        expect(reasons.map((reason) => {
          const match = /^物料 (\d+) 在制 /.exec(reason);
          return match ? Number(match[1]) : null;
        })).toEqual(expectedIds);
        if (strength === 'ZERO') {
          expect(reasons.every((reason) => reason.includes('在制材料必须为零'))).toBe(true);
        } else if (scenario.name === '仅关键物料欠料') {
          expect(result.msg).toContain('存在欠料，禁止结案');
        } else {
          expect(reasons.every((reason) => reason.includes('超出损耗范围'))).toBe(true);
        }
        // 守卫失败后仍为 FINISHED，下一场景直接重复尝试。
        await expectStatus('FINISHED');
      } else {
        await expectStatus('CLOSED');
        await unclose();
      }
    }
  });

  it('省略控制参数时使用 ALL + IN_SCRAP；省略物料时兼容原有结案操作', async () => {
    await expectStatus('FINISHED');

    const blocked = await api(c, 'post', `/bills/tst_mo/${billId}/ops/close_row`, {
      entryIds: [entryId],
      materials: materialsWithWip([0, 3, 0]),
    });
    expect(blocked.code).toBe('BIZ_ROW_STATE');
    expect(blocked.msg).toBe('物料 102 在制 3（上限 2），超出损耗范围');
    await expectStatus('FINISHED');

    await ok(c, 'post', `/bills/tst_mo/${billId}/ops/close_row`, {
      entryIds: [entryId],
      materials: materialsWithWip([1, 2, 1]),
    });
    await expectStatus('CLOSED');
    await unclose();

    await ok(c, 'post', `/bills/tst_mo/${billId}/ops/close_row`, {
      entryIds: [entryId],
    });
    await expectStatus('CLOSED');
    await unclose();
  });

  it('纯函数：范围过滤保留正确物料及原始顺序', () => {
    const materials = materialsWithWip([3, 3, 3]);
    expect(checkMoClose('ALL', 'IN_SCRAP', materials).map((v) => v.materialId))
      .toEqual([101, 102, 103]);
    expect(checkMoClose('NON_BACKFLUSH', 'IN_SCRAP', materials).map((v) => v.materialId))
      .toEqual([101, 103]);
    expect(checkMoClose('KEY', 'IN_SCRAP', materials).map((v) => v.materialId))
      .toEqual([103]);
  });

  it('纯函数：损耗上限包含边界，超出一个精度单位或欠料均拦截', () => {
    const material: MoCloseMaterial = {
      materialId: '边界物料',
      pickedQty: '102',
      stdConsumeQty: '100',
      scrapRate: '2',
    };
    expect(checkMoClose('ALL', 'IN_SCRAP', [material])).toEqual([]);
    expect(checkMoClose('ALL', 'IN_SCRAP', [
      { ...material, pickedQty: '102.000001' },
    ])).toEqual([{
      materialId: '边界物料',
      wipQty: 2.000001,
      limitQty: 2,
      reason: '物料 边界物料 在制 2.000001（上限 2），超出损耗范围',
    }]);
    expect(checkMoClose('ALL', 'IN_SCRAP', [
      { ...material, pickedQty: '99.999999' },
    ])).toEqual([{
      materialId: '边界物料',
      wipQty: -0.000001,
      limitQty: 2,
      reason: '物料 边界物料 在制 -0.000001（上限 2），存在欠料，禁止结案',
    }]);
  });

  it('纯函数：ZERO 消除浮点误差但拦截非零在制，NONE 忽略超损耗和欠料', () => {
    const material: MoCloseMaterial = {
      materialId: '精度物料',
      pickedQty: 0.1 + 0.2,
      stdConsumeQty: '0.3',
    };
    expect(checkMoClose('ALL', 'ZERO', [material])).toEqual([]);
    expect(checkMoClose('ALL', 'ZERO', [
      { ...material, pickedQty: '0.300001' },
    ])).toEqual([{
      materialId: '精度物料',
      wipQty: 0.000001,
      limitQty: 0,
      reason: '物料 精度物料 在制 0.000001（上限 0），在制材料必须为零',
    }]);

    const scopes: MoCloseScope[] = ['ALL', 'NON_BACKFLUSH', 'KEY'];
    for (const scope of scopes) {
      expect(checkMoClose(scope, 'NONE', materialsWithWip([3, 3, -1]))).toEqual([]);
    }
  });
});
