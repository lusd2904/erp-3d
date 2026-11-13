import { MigrationInterface, QueryRunner } from 'typeorm';
import { c, ensureTable, idx } from '../ddl';

/** WP01 平台核心表（技术方案 3.2.1）。幂等：重复执行只补缺失的表、列、索引。 */
const ID = c('id', "BIGINT NOT NULL COMMENT 'id'");
const CREATED = c('created_at', "DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间'");
const UPDATED = c('updated_at', "DATETIME(3) NULL ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '修改时间'");
const FORBID = c('forbid', "TINYINT(1) NOT NULL DEFAULT 0 COMMENT '禁用'");

export class PlatformCore1794500000001 implements MigrationInterface {
  name = 'PlatformCore1794500000001';

  async up(qr: QueryRunner): Promise<void> {
    await ensureTable(qr, {
      name: 'sys_org', comment: '组织',
      columns: [ID, c('code', "VARCHAR(50) NOT NULL COMMENT '编码'"), c('name', "VARCHAR(100) NOT NULL COMMENT '名称'"),
        c('form', "VARCHAR(20) NOT NULL DEFAULT 'FACTORY' COMMENT '形态 COMPANY/FACTORY'"),
        c('functions', "VARCHAR(200) NULL COMMENT '职能 SALE,PURCHASE,STOCK,FACTORY,QC,SETTLE'"),
        c('parent_id', "BIGINT NULL COMMENT '上级组织'"), FORBID, CREATED, UPDATED],
      indexes: [idx('uk_code', ['code'], true)],
    });
    await ensureTable(qr, {
      name: 'sys_dept', comment: '部门',
      columns: [ID, c('org_id', "BIGINT NOT NULL DEFAULT 1 COMMENT '组织'"), c('code', "VARCHAR(50) NOT NULL COMMENT '编码'"),
        c('name', "VARCHAR(100) NOT NULL COMMENT '名称'"), c('parent_id', "BIGINT NULL COMMENT '上级部门'"),
        c('leader_emp_id', "BIGINT NULL COMMENT '负责人(员工)'"), c('path', "VARCHAR(500) NULL COMMENT '路径 /1/5/'"), FORBID, CREATED, UPDATED],
      indexes: [idx('uk_org_code', ['org_id', 'code'], true), idx('ix_parent', ['parent_id'])],
    });
    await ensureTable(qr, {
      name: 'sys_position', comment: '岗位',
      columns: [ID, c('dept_id', "BIGINT NOT NULL COMMENT '部门'"), c('code', "VARCHAR(50) NOT NULL COMMENT '编码'"),
        c('name', "VARCHAR(100) NOT NULL COMMENT '名称'"), c('parent_position_id', "BIGINT NULL COMMENT '上级岗位(汇报关系)'"), FORBID, CREATED],
      indexes: [idx('uk_code', ['code'], true), idx('ix_dept', ['dept_id'])],
    });
    await ensureTable(qr, {
      name: 'sys_employee', comment: '员工',
      columns: [ID, c('org_id', "BIGINT NOT NULL DEFAULT 1 COMMENT '组织'"), c('code', "VARCHAR(50) NOT NULL COMMENT '工号'"),
        c('name', "VARCHAR(100) NOT NULL COMMENT '姓名'"), c('mobile', "VARCHAR(30) NULL COMMENT '手机'"), c('email', "VARCHAR(100) NULL COMMENT '邮箱'"),
        c('card_no', "VARCHAR(50) NULL COMMENT '工卡号'"), c('dept_id', "BIGINT NULL COMMENT '主部门'"), FORBID, CREATED, UPDATED],
      indexes: [idx('uk_code', ['code'], true), idx('ix_dept', ['dept_id'])],
    });
    await ensureTable(qr, {
      name: 'sys_emp_position', comment: '员工任岗',
      columns: [ID, c('employee_id', "BIGINT NOT NULL COMMENT '员工'"), c('position_id', "BIGINT NOT NULL COMMENT '岗位'"),
        c('is_main', "TINYINT(1) NOT NULL DEFAULT 1 COMMENT '主岗'"), c('start_date', "DATE NULL COMMENT '任岗开始'"), c('end_date', "DATE NULL COMMENT '任岗结束'")],
      indexes: [idx('ix_emp', ['employee_id']), idx('ix_pos', ['position_id'])],
    });
    await ensureTable(qr, {
      name: 'sys_user', comment: '用户',
      columns: [ID, c('account', "VARCHAR(50) NOT NULL COMMENT '账号'"), c('name', "VARCHAR(100) NOT NULL COMMENT '姓名'"),
        c('employee_id', "BIGINT NULL COMMENT '员工'"), c('org_id', "BIGINT NOT NULL DEFAULT 1 COMMENT '默认组织'"),
        c('dept_id', "BIGINT NULL COMMENT '部门(冗余，数据权限用)'"),
        c('status', "VARCHAR(10) NOT NULL DEFAULT 'ENABLED' COMMENT 'ENABLED/DISABLED/LOCKED'"),
        c('pwd_hash', "VARCHAR(100) NOT NULL COMMENT 'bcrypt'"), c('pwd_changed_at', "DATETIME(3) NULL COMMENT '改密时间'"),
        c('must_change_pwd', "TINYINT(1) NOT NULL DEFAULT 1 COMMENT '首次登录须改密'"), c('fail_count', "INT NOT NULL DEFAULT 0 COMMENT '连续失败次数'"),
        c('sign_image', "VARCHAR(300) NULL COMMENT '签名图片(电子签章)'"), c('last_login_at', "DATETIME(3) NULL COMMENT '最后登录'"),
        c('last_login_ip', "VARCHAR(50) NULL COMMENT '最后登录IP'"), c('user_type', "VARCHAR(20) NOT NULL DEFAULT 'INTERNAL' COMMENT 'INTERNAL/SUPPLIER/SCREEN/API'"),
        CREATED, UPDATED],
      indexes: [idx('uk_account', ['account'], true), idx('ix_emp', ['employee_id'])],
    });
    await ensureTable(qr, {
      name: 'sys_user_token', comment: '刷新令牌（可吊销）',
      columns: [ID, c('user_id', "BIGINT NOT NULL COMMENT '用户'"), c('jti', "VARCHAR(64) NOT NULL COMMENT '令牌id'"),
        c('expires_at', "DATETIME(3) NOT NULL COMMENT '过期'"), c('revoked', "TINYINT(1) NOT NULL DEFAULT 0 COMMENT '已吊销'"),
        c('ip', "VARCHAR(50) NULL"), c('device', "VARCHAR(200) NULL"), CREATED],
      indexes: [idx('uk_jti', ['jti'], true), idx('ix_user', ['user_id'])],
    });
    await ensureTable(qr, {
      name: 'sys_role', comment: '角色',
      columns: [ID, c('code', "VARCHAR(50) NOT NULL COMMENT '编码'"), c('name', "VARCHAR(100) NOT NULL COMMENT '名称'"),
        c('is_super', "TINYINT(1) NOT NULL DEFAULT 0 COMMENT '超级管理员(全部权限)'"), c('remark', "VARCHAR(300) NULL"), FORBID, CREATED, UPDATED],
      indexes: [idx('uk_code', ['code'], true)],
    });
    await ensureTable(qr, {
      name: 'sys_user_role', comment: '用户角色',
      columns: [ID, c('user_id', "BIGINT NOT NULL"), c('role_id', "BIGINT NOT NULL"), c('org_id', "BIGINT NOT NULL DEFAULT 1 COMMENT '在哪个组织生效'")],
      indexes: [idx('uk_user_role', ['user_id', 'role_id', 'org_id'], true), idx('ix_role', ['role_id'])],
    });
    await ensureTable(qr, {
      name: 'sys_biz_object', comment: '业务对象（单据/基础资料/平台对象）',
      columns: [ID, c('code', "VARCHAR(50) NOT NULL COMMENT '对象代码=表名'"), c('name', "VARCHAR(100) NOT NULL COMMENT '名称'"),
        c('subsystem', "VARCHAR(20) NOT NULL COMMENT '子系统'"), c('kind', "VARCHAR(20) NOT NULL DEFAULT 'bill' COMMENT 'bill/basedata/platform/report'"),
        c('form_meta_json', "JSON NULL COMMENT '单据元数据(启动时同步)'"), c('perm_items', "VARCHAR(500) NULL COMMENT '适用权限项代码,逗号分隔'"), CREATED, UPDATED],
      indexes: [idx('uk_code', ['code'], true)],
    });
    await ensureTable(qr, {
      name: 'sys_perm_item', comment: '权限项',
      columns: [ID, c('code', "VARCHAR(30) NOT NULL"), c('name', "VARCHAR(50) NOT NULL"), c('sort', "INT NOT NULL DEFAULT 0")],
      indexes: [idx('uk_code', ['code'], true)],
    });
    await ensureTable(qr, {
      name: 'sys_role_perm', comment: '角色功能权限（对象×权限项）',
      columns: [ID, c('role_id', "BIGINT NOT NULL"), c('object_code', "VARCHAR(50) NOT NULL"), c('perm_code', "VARCHAR(30) NOT NULL"),
        c('effect', "CHAR(1) NOT NULL DEFAULT 'A' COMMENT 'A允许 D禁止'")],
      indexes: [idx('uk_role_obj_perm', ['role_id', 'object_code', 'perm_code'], true), idx('ix_obj', ['object_code'])],
    });
    await ensureTable(qr, {
      name: 'sys_field_perm', comment: '字段权限',
      columns: [ID, c('role_id', "BIGINT NOT NULL"), c('object_code', "VARCHAR(50) NOT NULL"), c('field_key', "VARCHAR(80) NOT NULL COMMENT 'header.x 或 entry.x 或 x'"),
        c('can_view', "TINYINT(1) NOT NULL DEFAULT 1"), c('can_edit', "TINYINT(1) NOT NULL DEFAULT 1")],
      indexes: [idx('uk_role_obj_field', ['role_id', 'object_code', 'field_key'], true), idx('ix_obj', ['object_code'])],
    });
    await ensureTable(qr, {
      name: 'sys_data_rule', comment: '数据规则',
      columns: [ID, c('object_code', "VARCHAR(50) NOT NULL"), c('name', "VARCHAR(100) NOT NULL"),
        c('filter_json', "JSON NOT NULL COMMENT '{logic,conditions:[{field,op,value|var}]}'"),
        c('ops', "VARCHAR(100) NOT NULL DEFAULT 'view,edit,delete,audit' COMMENT '作用于哪些操作'"), CREATED],
      indexes: [idx('ix_obj', ['object_code'])],
    });
    await ensureTable(qr, {
      name: 'sys_role_data_rule', comment: '角色数据规则',
      columns: [ID, c('role_id', "BIGINT NOT NULL"), c('object_code', "VARCHAR(50) NOT NULL"), c('data_rule_id', "BIGINT NULL"),
        c('post_rule', "VARCHAR(10) NULL COMMENT 'SELF本人/DIRECT直接下属/ALL所有下属'"), c('combine', "VARCHAR(3) NOT NULL DEFAULT 'AND' COMMENT 'AND交集/OR并集'")],
      indexes: [idx('uk_role_obj', ['role_id', 'object_code'], true)],
    });
    await ensureTable(qr, {
      name: 'sys_menu', comment: '菜单',
      columns: [ID, c('parent_id', "BIGINT NULL"), c('name', "VARCHAR(100) NOT NULL"), c('object_code', "VARCHAR(50) NULL"),
        c('route', "VARCHAR(200) NULL"), c('icon', "VARCHAR(50) NULL"), c('sort', "INT NOT NULL DEFAULT 0")],
      indexes: [idx('ix_parent', ['parent_id'])],
    });
    await ensureTable(qr, {
      name: 'sys_coding_rule', comment: '编码规则',
      columns: [ID, c('code', "VARCHAR(80) NOT NULL COMMENT '规则代码'"), c('object_code', "VARCHAR(50) NOT NULL"), c('bill_type_id', "BIGINT NULL"),
        c('name', "VARCHAR(100) NOT NULL"), c('segments_json', "JSON NOT NULL COMMENT '[{type:const|date|field|seq,...}]'"),
        c('allow_edit', "TINYINT(1) NOT NULL DEFAULT 0 COMMENT '允许手工修改编号'"), c('gen_on', "VARCHAR(10) NOT NULL DEFAULT 'SAVE' COMMENT 'SAVE/NEW'"),
        c('refill_on_delete', "TINYINT(1) NOT NULL DEFAULT 0 COMMENT '删除补号(一期不支持,恒0)'"), c('is_default', "TINYINT(1) NOT NULL DEFAULT 1"), FORBID, CREATED, UPDATED],
      indexes: [idx('uk_code', ['code'], true), idx('ix_obj', ['object_code'])],
    });
    await ensureTable(qr, {
      name: 'sys_coding_seq', comment: '编码流水号',
      columns: [ID, c('rule_id', "BIGINT NOT NULL"), c('group_key', "VARCHAR(200) NOT NULL COMMENT '编码依据(归零分组)'"), c('current_no', "BIGINT NOT NULL DEFAULT 0")],
      indexes: [idx('uk_rule_group', ['rule_id', 'group_key'], true)],
    });
    await ensureTable(qr, {
      name: 'sys_bill_type', comment: '单据类型',
      columns: [ID, c('object_code', "VARCHAR(50) NOT NULL"), c('code', "VARCHAR(50) NOT NULL"), c('name', "VARCHAR(100) NOT NULL"),
        c('coding_rule_id', "BIGINT NULL"), c('required_json', "JSON NULL COMMENT '额外必录字段'"), c('locked_json', "JSON NULL COMMENT '锁定字段'"),
        c('wf_template_id', "BIGINT NULL"), c('print_ctrl_json', "JSON NULL"), c('params_json', "JSON NULL COMMENT '单据类型参数'"),
        c('is_default', "TINYINT(1) NOT NULL DEFAULT 0"), FORBID, CREATED],
      indexes: [idx('uk_obj_code', ['object_code', 'code'], true)],
    });
    await ensureTable(qr, {
      name: 'sys_param', comment: '系统参数',
      columns: [ID, c('scope', "VARCHAR(10) NOT NULL DEFAULT 'GLOBAL' COMMENT 'GLOBAL/ORG'"), c('org_id', "BIGINT NOT NULL DEFAULT 0"),
        c('module', "VARCHAR(30) NOT NULL"), c('param_key', "VARCHAR(80) NOT NULL"), c('param_value', "VARCHAR(2000) NULL"),
        c('value_type', "VARCHAR(10) NOT NULL DEFAULT 'string' COMMENT 'string/int/bool/json'"), c('name', "VARCHAR(100) NULL"), c('remark', "VARCHAR(300) NULL"), UPDATED],
      indexes: [idx('uk_scope_key', ['scope', 'org_id', 'module', 'param_key'], true)],
    });
    await ensureTable(qr, {
      name: 'sys_dict', comment: '辅助资料（数据字典）',
      columns: [ID, c('dict_type', "VARCHAR(50) NOT NULL"), c('code', "VARCHAR(50) NOT NULL"), c('name', "VARCHAR(100) NOT NULL"),
        c('sort', "INT NOT NULL DEFAULT 0"), FORBID],
      indexes: [idx('uk_type_code', ['dict_type', 'code'], true)],
    });
    await ensureTable(qr, {
      name: 'sys_op_log', comment: '上机操作日志',
      columns: [ID, c('user_id', "BIGINT NULL"), c('at', "DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)"), c('ip', "VARCHAR(50) NULL"),
        c('subsystem', "VARCHAR(20) NULL"), c('object_code', "VARCHAR(50) NULL"), c('op', "VARCHAR(30) NOT NULL"), c('bill_id', "BIGINT NULL"),
        c('bill_no', "VARCHAR(50) NULL"), c('description', "VARCHAR(1000) NULL"), c('trace_id', "VARCHAR(40) NULL")],
      indexes: [idx('ix_at', ['at']), idx('ix_obj_bill', ['object_code', 'bill_id']), idx('ix_user', ['user_id'])],
    });
    await ensureTable(qr, {
      name: 'sys_data_log', comment: '业务数据日志（修改前后）',
      columns: [ID, c('object_code', "VARCHAR(50) NOT NULL"), c('bill_id', "BIGINT NOT NULL"), c('version', "INT NOT NULL"),
        c('entity', "VARCHAR(30) NOT NULL DEFAULT 'header'"), c('row_id', "BIGINT NULL"), c('field_key', "VARCHAR(80) NOT NULL"),
        c('old_value', "VARCHAR(2000) NULL"), c('new_value', "VARCHAR(2000) NULL"), c('user_id', "BIGINT NULL"), c('at', "DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)")],
      indexes: [idx('ix_obj_bill', ['object_code', 'bill_id'])],
    });
    await ensureTable(qr, {
      name: 'sys_login_log', comment: '登录日志',
      columns: [ID, c('user_id', "BIGINT NULL"), c('account', "VARCHAR(50) NULL"), c('at', "DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)"),
        c('ip', "VARCHAR(50) NULL"), c('device', "VARCHAR(200) NULL"), c('success', "TINYINT(1) NOT NULL"), c('reason', "VARCHAR(200) NULL")],
      indexes: [idx('ix_user_at', ['user_id', 'at']), idx('ix_at', ['at'])],
    });
    await ensureTable(qr, {
      name: 'sys_api_log', comment: '接口日志',
      columns: [ID, c('req_id', "VARCHAR(40) NOT NULL"), c('at', "DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)"), c('client_ip', "VARCHAR(50) NULL"),
        c('user_id', "BIGINT NULL"), c('path', "VARCHAR(300) NOT NULL"), c('method', "VARCHAR(10) NOT NULL"), c('cost_ms', "INT NOT NULL DEFAULT 0"),
        c('http_status', "INT NOT NULL DEFAULT 200"), c('code', "VARCHAR(60) NULL"), c('success', "TINYINT(1) NOT NULL DEFAULT 1")],
      indexes: [idx('ix_at', ['at']), idx('ix_req', ['req_id'])],
    });
    await ensureTable(qr, {
      name: 'sys_attachment', comment: '附件',
      columns: [ID, c('object_code', "VARCHAR(50) NOT NULL"), c('bill_id', "BIGINT NOT NULL"), c('file_name', "VARCHAR(255) NOT NULL"),
        c('path', "VARCHAR(500) NOT NULL COMMENT '相对 FILES_DIR'"), c('size', "BIGINT NOT NULL DEFAULT 0"), c('mime', "VARCHAR(100) NULL"),
        c('sha256', "CHAR(64) NULL"), c('uploader_id', "BIGINT NULL"), CREATED],
      indexes: [idx('ix_obj_bill', ['object_code', 'bill_id'])],
    });
    await ensureTable(qr, {
      name: 'sys_message', comment: '站内消息',
      columns: [ID, c('msg_type', "VARCHAR(10) NOT NULL DEFAULT 'NOTICE' COMMENT 'TODO/RESULT/NOTICE/WARN/BROADCAST'"),
        c('level', "VARCHAR(10) NOT NULL DEFAULT 'INFO' COMMENT 'URGENT/WARN/INFO'"), c('title', "VARCHAR(200) NOT NULL"),
        c('content', "VARCHAR(2000) NULL"), c('to_user_id', "BIGINT NOT NULL"), c('from_user_id', "BIGINT NULL"),
        c('object_code', "VARCHAR(50) NULL"), c('bill_id', "BIGINT NULL"), c('link', "VARCHAR(300) NULL"),
        c('read_at', "DATETIME(3) NULL"), c('confirmed_at', "DATETIME(3) NULL COMMENT '紧急消息确认'"), CREATED],
      indexes: [idx('ix_to_read', ['to_user_id', 'read_at']), idx('ix_created', ['created_at'])],
    });
    await ensureTable(qr, {
      name: 'sys_message_template', comment: '消息模板',
      columns: [ID, c('code', "VARCHAR(50) NOT NULL"), c('title_tpl', "VARCHAR(300) NOT NULL"), c('content_tpl', "VARCHAR(2000) NULL")],
      indexes: [idx('uk_code', ['code'], true)],
    });
    await ensureTable(qr, {
      name: 'sys_idempotent_key', comment: '幂等键（防重复提交）',
      columns: [ID, c('idem_key', "VARCHAR(100) NOT NULL"), c('user_id', "BIGINT NULL"), c('method', "VARCHAR(10) NOT NULL"), c('path', "VARCHAR(300) NOT NULL"),
        c('status', "VARCHAR(10) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING/DONE'"), c('http_status', "INT NULL"), c('response_json', "MEDIUMTEXT NULL"), CREATED],
      indexes: [idx('uk_key_user', ['idem_key', 'user_id'], true), idx('ix_created', ['created_at'])],
    });
    await ensureTable(qr, {
      name: 'sys_event_outbox', comment: '事件 outbox（财务事件/外发消息，提交后由 worker 消费）',
      columns: [ID, c('event_type', "VARCHAR(60) NOT NULL"), c('object_code', "VARCHAR(50) NULL"), c('bill_id', "BIGINT NULL"),
        c('payload_json', "JSON NULL"), c('status', "VARCHAR(10) NOT NULL DEFAULT 'NEW' COMMENT 'NEW/DONE/FAILED'"),
        c('retry', "INT NOT NULL DEFAULT 0"), c('err', "VARCHAR(1000) NULL"), CREATED, c('done_at', "DATETIME(3) NULL")],
      indexes: [idx('ix_status', ['status', 'created_at'])],
    });
    await ensureTable(qr, {
      name: 'sys_job', comment: '后台任务',
      columns: [ID, c('name', "VARCHAR(100) NOT NULL"), c('cron', "VARCHAR(50) NULL"), c('interval_sec', "INT NULL"), c('handler', "VARCHAR(100) NOT NULL"),
        c('enabled', "TINYINT(1) NOT NULL DEFAULT 1"), c('only_prod_node', "TINYINT(1) NOT NULL DEFAULT 1"), c('last_run_at', "DATETIME(3) NULL")],
      indexes: [idx('uk_handler', ['handler'], true)],
    });
    await ensureTable(qr, {
      name: 'sys_job_log', comment: '后台任务日志',
      columns: [ID, c('job_id', "BIGINT NOT NULL"), c('start_at', "DATETIME(3) NOT NULL"), c('end_at', "DATETIME(3) NULL"),
        c('status', "VARCHAR(10) NOT NULL"), c('msg', "VARCHAR(2000) NULL")],
      indexes: [idx('ix_job', ['job_id', 'start_at'])],
    });
  }

  async down(): Promise<void> {
    // 平台表不提供自动回退（生产库禁止 DROP）；回退请用备份恢复。
  }
}
