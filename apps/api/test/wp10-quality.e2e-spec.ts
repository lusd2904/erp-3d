import { QualityService } from '../src/qm/quality.service';
import { api, ok, setup, type Ctx } from './engine/helpers';

describe('WP10/WP11 垂直验收', () => {
  let c: Ctx;

  beforeAll(async () => { c = await setup(); });
  afterAll(async () => c.app.close());

  it('GB/T 2828.1 表以空表启动，导入新版本后按箭头计算', async () => {
    const codeCount = await c.db.one<{ count: number }>('SELECT COUNT(*) AS count FROM qm_gb2828_code');
    const tableCount = await c.db.one<{ count: number }>('SELECT COUNT(*) AS count FROM qm_gb2828_table');
    expect(Number(codeCount?.count)).toBe(0);
    expect(Number(tableCount?.count)).toBe(0);

    const imported = await ok(c, 'post', '/qm/sampling/gb2828/import', {
      version: 1,
      sourceName: '自动化验收数据集',
      codeRows: [
        { batch_from: 1, batch_to: 5, level_i: 'A', level_ii: 'A', level_iii: 'B', level_s1: 'A', level_s2: 'A', level_s3: 'A', level_s4: 'A' },
        { batch_from: 6, batch_to: 15, level_i: 'B', level_ii: 'B', level_iii: 'C', level_s1: 'A', level_s2: 'B', level_s3: 'B', level_s4: 'B' },
      ],
      tableRows: [
        { table_type: 'NORMAL', code: 'A', aql: 1, sample_qty: null, ac: null, re: null, arrow: 'DOWN' },
        { table_type: 'NORMAL', code: 'B', aql: 1, sample_qty: 8, ac: 0, re: 1, arrow: 'NONE' },
      ],
    });
    expect(imported).toMatchObject({ version: 1, codeRows: 2, tableRows: 2, active: true });

    const calculated = await ok(c, 'post', '/qm/sampling/gb2828/calculate', {
      batchQty: 3, level: 'II', strictness: 'NORMAL', aql: 1,
    });
    expect(calculated).toMatchObject({ version: 1, code: 'B', sample_qty: 8, ac: 0, re: 1 });

    const duplicate = await api(c, 'post', '/qm/sampling/gb2828/import', {
      version: 1,
      sourceName: '重复版本',
      codeRows: [{ batch_from: 1, batch_to: 5, level_i: 'A', level_ii: 'A', level_iii: 'B', level_s1: 'A', level_s2: 'A', level_s3: 'A', level_s4: 'A' }],
      tableRows: [{ table_type: 'NORMAL', code: 'A', aql: 1, sample_qty: 5, ac: 0, re: 1, arrow: 'NONE' }],
    });
    expect(duplicate.code).toBe('BIZ_QM_GB2828_VERSION_INVALID');
  });

  it('反审核追加冲销流水，D54 冻结和撤销都经 D46', async () => {
    await c.db.q(`CREATE TABLE scm_stock_status (
      id BIGINT NOT NULL PRIMARY KEY, code VARCHAR(30) NOT NULL, forbid_status CHAR(1) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await c.db.exec("INSERT INTO scm_stock_status VALUES (41, 'AVAILABLE', 'A'), (42, 'FROZEN', 'A')");

    const initial = await ok(c, 'post', '/bills/scm_other_in', {
      header: {},
      entries: [{ material_id: 701, unit_id: 1, base_unit_id: 1, qty: 100, base_qty: 100, warehouse_id: 31, stock_status_id: 41, lot_no: 'LOT-STOCK' }],
    });
    const initialId = Number(initial.header.id);
    await ok(c, 'post', `/bills/scm_other_in/${initialId}/ops/submit`);
    await ok(c, 'post', `/bills/scm_other_in/${initialId}/ops/audit`);

    const request = await ok(c, 'post', '/bills/qm_stock_req', {
      header: { biz_type: 'STOCK' },
      entries: [{ material_id: 701, unit_id: 1, base_unit_id: 1, qty: 30, base_qty: 30, warehouse_id: 31, stock_status_id: 41, lot_no: 'LOT-STOCK' }],
    });
    const requestId = Number(request.header.id);
    await ok(c, 'post', `/bills/qm_stock_req/${requestId}/ops/submit`);
    await ok(c, 'post', `/bills/qm_stock_req/${requestId}/ops/audit`);

    const balances = await c.db.q<any>("SELECT stock_status_id, base_qty FROM scm_inventory WHERE org_id = 1 AND material_id = 701 AND lot_no = 'LOT-STOCK' ORDER BY stock_status_id");
    expect(balances.map((row) => [Number(row.stock_status_id), Number(row.base_qty)])).toEqual([[41, 70], [42, 30]]);

    await ok(c, 'post', `/bills/qm_stock_req/${requestId}/ops/unaudit`);
    const afterUndo = await c.db.q<any>("SELECT stock_status_id, base_qty FROM scm_inventory WHERE org_id = 1 AND material_id = 701 AND lot_no = 'LOT-STOCK' ORDER BY stock_status_id");
    expect(afterUndo.map((row) => [Number(row.stock_status_id), Number(row.base_qty)])).toEqual([[41, 100], [42, 0]]);
    const history = await c.db.q<any>("SELECT direction, audit_batch FROM scm_inv_txn WHERE form = 'scm_status_convert' ORDER BY id");
    expect(history.map((row) => row.direction).sort()).toEqual(['IN', 'OUT', 'REV_IN', 'REV_OUT']);
    expect(history.every((row) => Number(row.audit_batch) === 1)).toBe(true);

    await ok(c, 'post', `/bills/scm_other_in/${initialId}/ops/unaudit`);
    await ok(c, 'post', `/bills/scm_other_in/${initialId}/ops/submit`);
    await ok(c, 'post', `/bills/scm_other_in/${initialId}/ops/audit`);
    const inboundHistory = await c.db.q<any>("SELECT direction, audit_batch FROM scm_inv_txn WHERE form = 'scm_other_in' AND bill_id = ? ORDER BY id", [initialId]);
    expect(inboundHistory.map((row) => [row.direction, Number(row.audit_batch)])).toEqual([['IN', 1], ['REV_OUT', 1], ['IN', 2]]);
  });

  it('让步接收视图只呈现已审核的采购入库行', async () => {
    await c.db.q(`CREATE TABLE scm_pur_instock (
      id BIGINT NOT NULL PRIMARY KEY, bill_no VARCHAR(64) NOT NULL, bill_date DATETIME(3) NOT NULL,
      status VARCHAR(20) NOT NULL, cancel_status CHAR(1) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await c.db.q(`CREATE TABLE scm_pur_instock_entry (
      id BIGINT NOT NULL PRIMARY KEY, bill_id BIGINT NOT NULL, material_id BIGINT NOT NULL,
      lot_no VARCHAR(64) NOT NULL, base_qty DECIMAL(23,10) NOT NULL, base_unit_id BIGINT NOT NULL,
      in_type VARCHAR(20) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await c.db.exec("INSERT INTO scm_pur_instock VALUES (1, 'RK001', NOW(3), 'AUDITED', 'A'), (2, 'RK002', NOW(3), 'CREATED', 'A')");
    await c.db.exec("INSERT INTO scm_pur_instock_entry VALUES (11, 1, 101, 'LOT-A', 5, 1, '让步接收'), (12, 2, 102, 'LOT-B', 8, 1, '让步接收')");

    const quality = c.app.get(QualityService);
    expect(await quality.ensureConcessionView()).toBe(true);
    const report = await ok(c, 'get', '/qm/reports/concession-statistics');
    expect(report.total).toBe(1);
    expect(report.rows[0]).toMatchObject({ instock_entry_id: 11, bill_id: 1, concession_qty: '5.0000000000' });
  });
});
