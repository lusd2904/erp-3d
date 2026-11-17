import { MigrationInterface, QueryRunner } from 'typeorm';
import { BillMeta } from '@erp3d/shared';
import { c, ensureBillTables, ensureTable, idx } from '../ddl';
import { STOCK_BILL_METAS } from '../../scm/metas/stock-bill.meta';
import { QM_BILL_METAS } from '../../qm/metas/quality.meta';

const ID = c('id', "BIGINT NOT NULL COMMENT 'id(雪花)'");
const CREATED_AT = c('created_at', "DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间'");

const stockColumns = [
  c('org_id', "BIGINT NOT NULL COMMENT '组织'"),
  c('material_id', "BIGINT NOT NULL COMMENT '物料'"),
  c('aux_prop_id', "BIGINT NOT NULL DEFAULT 0 COMMENT '辅助属性，无则 0'"),
  c('lot_no', "VARCHAR(64) NOT NULL DEFAULT '' COMMENT '批号'"),
  c('prod_date', "DATE NOT NULL DEFAULT '1970-01-01' COMMENT '生产日期'"),
  c('exp_date', "DATE NOT NULL DEFAULT '1970-01-01' COMMENT '有效期至'"),
  c('bom_id', "BIGINT NOT NULL DEFAULT 0 COMMENT 'BOM 版本，无则 0'"),
  c('mto_no', "VARCHAR(64) NOT NULL DEFAULT '' COMMENT '计划跟踪号'"),
  c('stock_status_id', "BIGINT NOT NULL DEFAULT 0 COMMENT '库存状态'"),
  c('owner_type', "VARCHAR(20) NOT NULL DEFAULT '' COMMENT '货主类型'"),
  c('owner_id', "BIGINT NOT NULL DEFAULT 0 COMMENT '货主'"),
  c('keeper_type', "VARCHAR(20) NOT NULL DEFAULT '' COMMENT '保管者类型'"),
  c('keeper_id', "BIGINT NOT NULL DEFAULT 0 COMMENT '保管者'"),
  c('warehouse_id', "BIGINT NOT NULL DEFAULT 0 COMMENT '仓库'"),
  c('location_id', "BIGINT NOT NULL DEFAULT 0 COMMENT '仓位'"),
];

const inventoryDimensionNames = [
  'org_id', 'material_id', 'aux_prop_id', 'lot_no', 'prod_date', 'exp_date', 'bom_id', 'mto_no',
  'stock_status_id', 'owner_type', 'owner_id', 'keeper_type', 'keeper_id', 'warehouse_id', 'location_id', 'dim_hash',
];

/** WP10 库存与 WP11 质量迁移。国标抽样表只建结构，不写任何样本数据。 */
export class InventoryQuality1794500000006 implements MigrationInterface {
  name = 'InventoryQuality1794500000006';

  async up(qr: QueryRunner): Promise<void> {
    await ensureTable(qr, {
      name: 'scm_inventory',
      comment: '即时库存（库存维度）',
      columns: [
        ID, ...stockColumns,
        c('dim_hash', "CHAR(64) NOT NULL COMMENT '库存维度 SHA-256'"),
        c('qty', 'DECIMAL(23,10) NOT NULL DEFAULT 0 COMMENT \'库存数量（基本单位）\''),
        c('base_qty', 'DECIMAL(23,10) NOT NULL DEFAULT 0 COMMENT \'基本单位数量\''),
        c('lock_qty', 'DECIMAL(23,10) NOT NULL DEFAULT 0 COMMENT \'预留数量，不代表库存冻结\''),
        c('version', "INT NOT NULL DEFAULT 0 COMMENT '乐观锁版本'"),
        CREATED_AT,
        c('modified_at', "DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '修改时间'"),
      ],
      indexes: [
        idx('uk_inventory_dim', inventoryDimensionNames, true),
        idx('ix_inventory_material', ['org_id', 'material_id']),
        idx('ix_inventory_lot', ['org_id', 'lot_no']),
        idx('ix_inventory_status_wh', ['org_id', 'stock_status_id', 'warehouse_id']),
      ],
    });

    await ensureTable(qr, {
      name: 'scm_inv_batch',
      comment: '库存单据审核批次',
      columns: [
        ID,
        c('org_id', "BIGINT NOT NULL COMMENT '组织'"),
        c('form', "VARCHAR(50) NOT NULL COMMENT '单据类型'"),
        c('bill_id', "BIGINT NOT NULL COMMENT '单据头ID'"),
        c('audit_batch', "INT NOT NULL COMMENT '递增审核批次'"),
        c('status', "VARCHAR(20) NOT NULL DEFAULT 'PROCESSING' COMMENT 'PROCESSING/APPLIED/REVERSED'"),
        c('operator_id', "BIGINT NOT NULL COMMENT '审核人'"),
        c('audited_at', "DATETIME(3) NOT NULL COMMENT '审核时间'"),
        c('reversed_by', "BIGINT NULL COMMENT '反审核人'"),
        c('reversed_at', "DATETIME(3) NULL COMMENT '反审核时间'"),
      ],
      indexes: [idx('uk_inv_batch_bill', ['form', 'bill_id', 'audit_batch'], true), idx('ix_inv_batch_state', ['form', 'bill_id', 'status'])],
    });

    await ensureTable(qr, {
      name: 'scm_inv_txn',
      comment: '只增不删的库存流水',
      columns: [
        ID,
        c('org_id', "BIGINT NOT NULL COMMENT '组织'"),
        c('inventory_id', "BIGINT NOT NULL COMMENT '即时库存行ID'"),
        c('form', "VARCHAR(50) NOT NULL COMMENT '单据类型'"),
        c('bill_id', "BIGINT NOT NULL COMMENT '单据头ID'"),
        c('entry_id', "BIGINT NOT NULL COMMENT '单据分录ID'"),
        c('direction', "VARCHAR(20) NOT NULL COMMENT 'IN/OUT/REV_IN/REV_OUT'"),
        c('base_qty', "DECIMAL(23,10) NOT NULL COMMENT '非负基本数量'"),
        c('balance_after', "DECIMAL(23,10) NOT NULL COMMENT '发生后库存结存'"),
        c('audit_batch', "INT NOT NULL COMMENT '单据审核批次'"),
        c('reversal_of', "BIGINT NULL COMMENT '反向流水对应的原流水ID'"),
        c('op', "VARCHAR(20) NOT NULL COMMENT 'AUDIT/UNAUDIT'"),
        c('operator_id', "BIGINT NOT NULL COMMENT '操作人'"),
        c('at', "DATETIME(3) NOT NULL COMMENT '发生时间'"),
      ],
      indexes: [
        idx('uk_inv_txn_idem', ['form', 'bill_id', 'entry_id', 'direction', 'audit_batch'], true),
        idx('ix_inv_txn_bill', ['form', 'bill_id', 'audit_batch']),
        idx('ix_inv_txn_inventory', ['inventory_id', 'id']),
        idx('ix_inv_txn_at', ['org_id', 'at']),
      ],
    });

    await ensureTable(qr, {
      name: 'scm_lot_master', comment: '批号主档',
      columns: [
        ID, c('org_id', "BIGINT NOT NULL COMMENT '组织'"), c('material_id', "BIGINT NOT NULL COMMENT '物料'"),
        c('lot_no', "VARCHAR(64) NOT NULL COMMENT '批号'"), c('in_date', "DATE NOT NULL COMMENT '入库日期'"),
        c('prod_date', "DATE NULL COMMENT '生产日期'"), c('date_code', "VARCHAR(4) NOT NULL DEFAULT '' COMMENT 'ISO 周年周序 YYWW'"),
        c('exp_date', "DATE NULL COMMENT '有效期至'"), c('supplier_lot', "VARCHAR(64) NOT NULL DEFAULT '' COMMENT '供应商批号'"),
        c('recheck_date', "DATE NULL COMMENT '复检日期'"), CREATED_AT,
        c('modified_at', "DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '修改时间'"),
      ],
      indexes: [idx('uk_lot_org_material_no', ['org_id', 'material_id', 'lot_no'], true), idx('ix_lot_recheck', ['org_id', 'recheck_date']), idx('ix_lot_exp', ['org_id', 'exp_date'])],
    });

    await ensureTable(qr, {
      name: 'bc_barcode_rule', comment: '条码解析规则',
      columns: [ID, c('org_id', "BIGINT NOT NULL COMMENT '组织'"), c('object_id', "VARCHAR(64) NOT NULL COMMENT '业务对象'"),
        c('mode', "VARCHAR(20) NOT NULL COMMENT 'MASTER/DYNAMIC'"), c('segments_json', "JSON NOT NULL COMMENT '解析段定义'"),
        c('status', "VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' COMMENT 'ACTIVE/DISABLED'"), c('version', "INT NOT NULL DEFAULT 0 COMMENT '乐观锁'"), CREATED_AT],
      indexes: [idx('ix_barcode_rule_object', ['org_id', 'object_id', 'status'])],
    });

    await ensureTable(qr, {
      name: 'bc_barcode_master', comment: '条码与卷盘主档',
      columns: [
        ID, c('org_id', "BIGINT NOT NULL COMMENT '组织'"), c('barcode', "VARCHAR(128) NOT NULL COMMENT '唯一条码'"),
        c('material_id', "BIGINT NOT NULL COMMENT '物料'"), c('aux_prop_id', "BIGINT NOT NULL DEFAULT 0 COMMENT '辅助属性'"),
        c('lot_no', "VARCHAR(64) NOT NULL DEFAULT '' COMMENT '批号'"), c('prod_date', "DATE NULL COMMENT '生产日期'"),
        c('exp_date', "DATE NULL COMMENT '有效期至'"), c('warehouse_id', "BIGINT NOT NULL COMMENT '仓库'"),
        c('location_id', "BIGINT NOT NULL DEFAULT 0 COMMENT '仓位'"), c('stock_status_id', "BIGINT NOT NULL DEFAULT 0 COMMENT '库存状态'"),
        c('owner_type', "VARCHAR(20) NOT NULL DEFAULT '' COMMENT '货主类型'"), c('owner_id', "BIGINT NOT NULL DEFAULT 0 COMMENT '货主'"),
        c('qty', "DECIMAL(23,10) NOT NULL DEFAULT 0 COMMENT '数量'"), c('base_unit_id', "BIGINT NULL COMMENT '基本单位'"),
        c('base_qty', "DECIMAL(23,10) NOT NULL DEFAULT 0 COMMENT '基本数量'"), c('status', "VARCHAR(20) NOT NULL DEFAULT 'IN' COMMENT 'IN/OUT'"),
        c('reel_id', "VARCHAR(64) NULL COMMENT '卷盘ID'"), c('mpn', "VARCHAR(64) NULL COMMENT 'MPN'"), c('date_code', "VARCHAR(4) NULL COMMENT 'ISO YYWW'"),
        c('msl_level', "VARCHAR(8) NULL COMMENT 'MSL等级'"), c('msl_status', "VARCHAR(20) NOT NULL DEFAULT 'SEALED' COMMENT 'SEALED/OPENED/TIMEOUT_FROZEN/BAKING'"),
        c('opened_at', "DATETIME(3) NULL COMMENT '开封时间'"), c('last_open_at', "DATETIME(3) NULL COMMENT '最近开封时间'"),
        c('floor_life_h', "DECIMAL(23,10) NULL COMMENT '车间寿命小时'"), c('exposed_min', "DECIMAL(23,10) NOT NULL DEFAULT 0 COMMENT '累计暴露分钟'"),
        c('bake_count', "INT NOT NULL DEFAULT 0 COMMENT '烘烤次数'"), c('last_bake_at', "DATETIME(3) NULL COMMENT '最近烘烤时间'"),
        c('parent_barcode', "VARCHAR(128) NULL COMMENT '父条码'"), c('src_form', "VARCHAR(50) NULL COMMENT '来源单据类型'"),
        c('src_bill_id', "BIGINT NULL COMMENT '来源单据ID'"), c('src_entry_id', "BIGINT NULL COMMENT '来源分录ID'"),
        c('version', "INT NOT NULL DEFAULT 0 COMMENT '乐观锁'"), CREATED_AT,
        c('modified_at', "DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '修改时间'"),
      ],
      indexes: [idx('uk_barcode_org_code', ['org_id', 'barcode'], true), idx('ix_barcode_reel', ['org_id', 'reel_id']),
        idx('ix_barcode_stock', ['org_id', 'material_id', 'lot_no', 'warehouse_id', 'location_id']), idx('ix_barcode_msl', ['org_id', 'msl_status', 'msl_level'])],
    });

    await ensureTable(qr, {
      name: 'bc_scan_log', comment: '条码扫描记录',
      columns: [ID, c('org_id', "BIGINT NOT NULL COMMENT '组织'"), c('barcode', "VARCHAR(128) NOT NULL COMMENT '条码'"),
        c('form', "VARCHAR(50) NOT NULL COMMENT '单据类型'"), c('bill_id', "BIGINT NOT NULL COMMENT '单据头ID'"),
        c('entry_id', "BIGINT NULL COMMENT '单据分录ID'"), c('op', "VARCHAR(20) NOT NULL COMMENT '扫描动作'"),
        c('user_id', "BIGINT NOT NULL COMMENT '操作人'"), c('device', "VARCHAR(64) NULL COMMENT 'PDA/设备'"), c('at', "DATETIME(3) NOT NULL COMMENT '扫描时间'"),
      ],
      indexes: [idx('ix_scan_barcode', ['org_id', 'barcode', 'at']), idx('ix_scan_bill', ['form', 'bill_id', 'entry_id'])],
    });

    await ensureTable(qr, {
      name: 'bc_msl_log', comment: '卷盘 MSL 生命周期事件',
      columns: [ID, c('org_id', "BIGINT NOT NULL COMMENT '组织'"), c('barcode', "VARCHAR(128) NOT NULL COMMENT '卷盘条码'"),
        c('event', "VARCHAR(30) NOT NULL COMMENT 'MSL 事件'"), c('at', "DATETIME(3) NOT NULL COMMENT '事件时间'"),
        c('user_id', "BIGINT NOT NULL COMMENT '操作人'"), c('temp', "DECIMAL(23,10) NULL COMMENT '烘烤温度'"),
        c('hours', "DECIMAL(23,10) NULL COMMENT '烘烤时长'"),
      ],
      indexes: [idx('ix_msl_log_barcode', ['org_id', 'barcode', 'at']), idx('ix_msl_log_event', ['org_id', 'event', 'at'])],
    });

    await ensureTable(qr, {
      name: 'qm_sampling_plan', comment: '抽样方案',
      columns: [ID, c('org_id', "BIGINT NOT NULL COMMENT '组织'"), c('code', "VARCHAR(64) NOT NULL COMMENT '方案编码'"),
        c('name', "VARCHAR(128) NOT NULL COMMENT '方案名称'"), c('sampling_type', "VARCHAR(20) NOT NULL COMMENT '抽样类型'"),
        c('level', "VARCHAR(20) NULL COMMENT '检验水平'"), c('strictness', "VARCHAR(20) NULL COMMENT '严格度'"),
        c('aql', "DECIMAL(23,10) NULL COMMENT 'AQL'"), c('forbid_status', "CHAR(1) NOT NULL DEFAULT 'A' COMMENT 'A 正常 B 禁用'"),
        c('status', "VARCHAR(20) NOT NULL DEFAULT 'CREATED' COMMENT '审核状态'"), c('creator_id', "BIGINT NOT NULL COMMENT '创建人'"),
        CREATED_AT, c('version', "INT NOT NULL DEFAULT 0 COMMENT '乐观锁'"), c('remark', "VARCHAR(512) NULL COMMENT '备注'"),
      ],
      indexes: [idx('uk_qm_sampling_org_code', ['org_id', 'code'], true), idx('ix_qm_sampling_type', ['org_id', 'sampling_type', 'status'])],
    });

    await ensureTable(qr, {
      name: 'qm_sampling_plan_entry', comment: '抽样方案区间',
      columns: [ID, c('plan_id', "BIGINT NOT NULL COMMENT '抽样方案ID'"), c('line_no', "INT NOT NULL COMMENT '行号'"),
        c('batch_from', "DECIMAL(23,10) NOT NULL COMMENT '批量下限'"), c('batch_to', "DECIMAL(23,10) NULL COMMENT '批量上限'"),
        c('sample_qty', "DECIMAL(23,10) NULL COMMENT '样本量'"), c('sample_percent', "DECIMAL(23,10) NULL COMMENT '抽样百分比'"),
        c('ac', "INT NULL COMMENT 'Ac'"), c('re', "INT NULL COMMENT 'Re'"), c('remark', "VARCHAR(512) NULL COMMENT '备注'"),
      ],
      indexes: [idx('uk_qm_sampling_entry_line', ['plan_id', 'line_no'], true), idx('ix_qm_sampling_entry_batch', ['batch_from', 'batch_to'])],
    });

    await ensureTable(qr, {
      name: 'qm_gb2828_code', comment: 'GB/T 2828.1 样本量字码（空表，等待正式正文导入）',
      columns: [ID, c('batch_from', "DECIMAL(23,10) NOT NULL COMMENT '批量下限'"), c('batch_to', "DECIMAL(23,10) NOT NULL COMMENT '批量上限'"),
        c('level_i', "VARCHAR(8) NOT NULL COMMENT '一般检验水平 I 字码'"), c('level_ii', "VARCHAR(8) NOT NULL COMMENT '一般检验水平 II 字码'"),
        c('level_iii', "VARCHAR(8) NOT NULL COMMENT '一般检验水平 III 字码'"), c('level_s1', "VARCHAR(8) NOT NULL COMMENT 'S-1 字码'"),
        c('level_s2', "VARCHAR(8) NOT NULL COMMENT 'S-2 字码'"), c('level_s3', "VARCHAR(8) NOT NULL COMMENT 'S-3 字码'"),
        c('level_s4', "VARCHAR(8) NOT NULL COMMENT 'S-4 字码'"), c('version', "INT NOT NULL COMMENT '数据集版本'"),
      ],
      indexes: [idx('uk_qm_gb2828_code_ver_batch', ['version', 'batch_from', 'batch_to'], true)],
    });

    await ensureTable(qr, {
      name: 'qm_gb2828_table', comment: 'GB/T 2828.1 抽样方案（空表，等待正式正文导入）',
      columns: [ID, c('table_type', "VARCHAR(20) NOT NULL COMMENT 'NORMAL/TIGHTENED/REDUCED'"), c('code', "VARCHAR(8) NOT NULL COMMENT '样本量字码'"),
        c('aql', "DECIMAL(23,10) NOT NULL COMMENT 'AQL'"), c('sample_qty', "INT NULL COMMENT '样本量，箭头行留空'"),
        c('ac', "INT NULL COMMENT 'Ac，箭头行留空'"), c('re', "INT NULL COMMENT 'Re，箭头行留空'"),
        c('arrow', "VARCHAR(8) NOT NULL DEFAULT 'NONE' COMMENT 'NONE/DOWN/UP'"), c('version', "INT NOT NULL COMMENT '数据集版本'"),
      ],
      indexes: [idx('uk_qm_gb2828_table_ver_plan', ['version', 'table_type', 'code', 'aql'], true), idx('ix_qm_gb2828_table_code', ['version', 'code'])],
    });

    await ensureTable(qr, {
      name: 'qm_gb2828_dataset', comment: 'GB/T 2828.1 导入数据集版本',
      columns: [ID, c('dataset_version', "INT NOT NULL COMMENT '导入版本'"), c('status', "VARCHAR(20) NOT NULL DEFAULT 'INACTIVE' COMMENT 'INACTIVE/ACTIVE'"),
        c('active_lock', "TINYINT GENERATED ALWAYS AS (CASE WHEN `status` = 'ACTIVE' THEN 1 ELSE NULL END) STORED COMMENT '单一当前版本锁'"),
        c('code_row_count', "INT NOT NULL COMMENT '字码行数'"), c('table_row_count', "INT NOT NULL COMMENT '抽样方案行数'"),
        c('source_name', "VARCHAR(128) NOT NULL COMMENT '正式标准来源'"), c('imported_by', "BIGINT NOT NULL COMMENT '导入人'"),
        c('imported_at', "DATETIME(3) NOT NULL COMMENT '导入时间'"),
      ],
      indexes: [idx('uk_qm_gb2828_dataset_version', ['dataset_version'], true), idx('uk_qm_gb2828_dataset_active', ['active_lock'], true)],
    });

    for (const meta of [...STOCK_BILL_METAS, ...QM_BILL_METAS] as BillMeta[]) await ensureBillTables(qr, meta);
  }

  async down(): Promise<void> {
    // 迁移仅创建业务账与不可变追溯数据；不自动删除任何表或历史记录。
  }
}
