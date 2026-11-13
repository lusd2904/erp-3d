import { MigrationInterface, QueryRunner } from 'typeorm';
import { c, ensureTable, idx } from '../ddl';

const ID = c('id', "BIGINT NOT NULL COMMENT 'id(雪花)'");
const CREATED = c('created_at', "DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间'");
const UPDATED = c('updated_at', "DATETIME(3) NULL ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '修改时间'");

/**
 * WP02 单据引擎核心数据表迁移
 */
export class BillEngine1794500000004 implements MigrationInterface {
  name = 'BillEngine1794500000004';

  async up(qr: QueryRunner): Promise<void> {
    // 1. 单据状态机配置表
    await ensureTable(qr, {
      name: 'sys_state_machine',
      comment: '单据状态机',
      columns: [
        ID,
        c('code', "VARCHAR(50) NOT NULL COMMENT '编码'"),
        c('name', "VARCHAR(100) NOT NULL COMMENT '名称'"),
        c('object_code', "VARCHAR(50) NULL COMMENT '业务对象代码'"),
        c('bill_type_id', "BIGINT NULL COMMENT '单据类型id'"),
        c('version', "INT NOT NULL DEFAULT 1 COMMENT '版本号'"),
        c('config_json', "JSON NOT NULL COMMENT '状态机配置JSON'"),
        CREATED,
        UPDATED,
      ],
      indexes: [idx('uk_code', ['code'], true)],
    });

    // 2. 下推转换规则表
    await ensureTable(qr, {
      name: 'sys_convert_rule',
      comment: '单据转换规则',
      columns: [
        ID,
        c('code', "VARCHAR(80) NOT NULL COMMENT '规则代码'"),
        c('name', "VARCHAR(100) NOT NULL COMMENT '规则名称'"),
        c('src_form', "VARCHAR(50) NOT NULL COMMENT '源单对象代码'"),
        c('tgt_form', "VARCHAR(50) NOT NULL COMMENT '目标单对象代码'"),
        c('config_json', "JSON NOT NULL COMMENT '转换配置JSON'"),
        c('status', "VARCHAR(10) NOT NULL DEFAULT 'NORMAL' COMMENT '状态 NORMAL/DISABLED'"),
        CREATED,
        UPDATED,
      ],
      indexes: [
        idx('uk_code', ['code'], true),
        idx('ix_src', ['src_form']),
        idx('ix_tgt', ['tgt_form']),
      ],
    });

    // 3. 反写规则表
    await ensureTable(qr, {
      name: 'sys_writeback_rule',
      comment: '单据反写规则',
      columns: [
        ID,
        c('code', "VARCHAR(80) NOT NULL COMMENT '规则代码'"),
        c('name', "VARCHAR(100) NOT NULL COMMENT '规则名称'"),
        c('src_form', "VARCHAR(50) NOT NULL COMMENT '源单对象代码'"),
        c('tgt_form', "VARCHAR(50) NOT NULL COMMENT '目标单对象代码'"),
        c('on_event', "VARCHAR(40) NOT NULL COMMENT '反写时机'"),
        c('config_json', "JSON NOT NULL COMMENT '反写配置JSON'"),
        c('status', "VARCHAR(10) NOT NULL DEFAULT 'NORMAL' COMMENT '状态 NORMAL/DISABLED'"),
        CREATED,
        UPDATED,
      ],
      indexes: [
        idx('uk_code', ['code'], true),
        idx('ix_src', ['src_form']),
        idx('ix_tgt', ['tgt_form']),
      ],
    });

    // 4. 单据上下查链路表
    await ensureTable(qr, {
      name: 'sys_bill_link',
      comment: '单据上下查链路',
      columns: [
        ID,
        c('src_form', "VARCHAR(50) NOT NULL COMMENT '源单对象代码'"),
        c('src_bill_id', "BIGINT NOT NULL COMMENT '源单id'"),
        c('src_entry_id', "BIGINT NULL COMMENT '源单分录id'"),
        c('tgt_form', "VARCHAR(50) NOT NULL COMMENT '目标单对象代码'"),
        c('tgt_bill_id', "BIGINT NOT NULL COMMENT '目标单id'"),
        c('tgt_entry_id', "BIGINT NULL COMMENT '目标单分录id'"),
        c('base_qty', "DECIMAL(23,10) NOT NULL DEFAULT 0 COMMENT '基本单位关联数量'"),
        c('rule_code', "VARCHAR(80) NULL COMMENT '转换规则编码'"),
        c('flow_instance_no', "VARCHAR(50) NULL COMMENT '流程实例号'"),
        CREATED,
      ],
      indexes: [
        idx('ix_src', ['src_form', 'src_bill_id']),
        idx('ix_tgt', ['tgt_form', 'tgt_bill_id']),
        idx('ix_src_entry', ['src_entry_id']),
        idx('ix_tgt_entry', ['tgt_entry_id']),
      ],
    });

    // 5. 反写流水日志表
    await ensureTable(qr, {
      name: 'sys_writeback_log',
      comment: '单据反写日志',
      columns: [
        ID,
        c('rule_code', "VARCHAR(80) NOT NULL COMMENT '反写规则代码'"),
        c('event', "VARCHAR(40) NOT NULL COMMENT '反写事件'"),
        c('src_form', "VARCHAR(50) NOT NULL COMMENT '源单对象代码'"),
        c('src_bill_id', "BIGINT NOT NULL COMMENT '源单头id'"),
        c('src_entry_id', "BIGINT NOT NULL COMMENT '源单分录id'"),
        c('src_field', "VARCHAR(64) NOT NULL COMMENT '源分录被反写字段'"),
        c('tgt_form', "VARCHAR(50) NOT NULL COMMENT '目标单对象代码'"),
        c('tgt_bill_id', "BIGINT NOT NULL COMMENT '目标单头id'"),
        c('tgt_entry_id', "BIGINT NOT NULL COMMENT '目标单分录id'"),
        c('mode', "VARCHAR(10) NOT NULL COMMENT '反写模式 add/sub/overwrite'"),
        c('delta', "DECIMAL(23,10) NOT NULL COMMENT '反写数值'"),
        c('old_value', "DECIMAL(23,10) NULL COMMENT '覆盖前原值'"),
        c('user_id', "BIGINT NULL COMMENT '操作人id'"),
        CREATED,
      ],
      indexes: [
        idx('ix_tgt', ['tgt_form', 'tgt_bill_id', 'event']),
        idx('ix_src_entry', ['src_entry_id']),
      ],
    });

    // 6. 业务事件执行状态记录表
    await ensureTable(qr, {
      name: 'sys_bill_event_state',
      comment: '单据业务事件执行状态',
      columns: [
        ID,
        c('form', "VARCHAR(50) NOT NULL COMMENT '单据对象代码'"),
        c('bill_id', "BIGINT NOT NULL COMMENT '单据头id'"),
        c('entry_id', "BIGINT NOT NULL DEFAULT 0 COMMENT '分录id(整单级为0)'"),
        c('event', "VARCHAR(40) NOT NULL COMMENT '事件代码'"),
        c('user_id', "BIGINT NULL COMMENT '操作人id'"),
        CREATED,
      ],
      indexes: [idx('uk_state', ['form', 'bill_id', 'entry_id', 'event'], true)],
    });
  }

  async down(): Promise<void> {
    // 生产与共享库禁止 DROP 单据物理表与系统表
  }
}
