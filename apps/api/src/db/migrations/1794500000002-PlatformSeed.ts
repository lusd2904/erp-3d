import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { upsert } from '../ddl';

/** WP01 平台种子数据。只插入不覆盖（重复执行不会重置已改过的密码、参数）。 */
export const PERM_ITEMS: [string, string][] = [
  ['view', '查看'], ['new', '新增'], ['edit', '修改'], ['delete', '删除'], ['submit', '提交'], ['audit', '审核'],
  ['unaudit', '反审核'], ['close', '关闭'], ['cancel', '作废'], ['forbid', '禁用'], ['import', '引入'], ['export', '引出'],
  ['print', '打印'], ['attachment', '附件'], ['push', '下推'], ['execute', '行执行'], ['admin', '管理'],
];

/** 需求说明书 10.2 一期预置角色 */
export const PRESET_ROLES: [string, string][] = [
  ['admin', '系统管理员'], ['gm', '总经理'], ['sales', '销售员'], ['sales_mgr', '销售主管'], ['pmc', '计划员（PMC）'],
  ['pmc_mgr', '计划主管'], ['buyer', '采购员'], ['buyer_mgr', '采购主管'], ['wh', '仓管员'], ['wh_mgr', '仓库主管'],
  ['eng', '工程师'], ['eng_mgr', '工程主管'], ['dispatcher', '车间调度'], ['line_leader', '班组长 / 线长'], ['operator', '操作工'],
  ['feeder', '上料员'], ['qc', '检验员（IQC/IPQC/OQC）'], ['qc_mgr', '品质主管'], ['eqp_eng', '设备工程师'], ['prd_mgr', '生产主管'],
  ['supplier', '供应商（门户）'], ['finance', '财务（预留）'], ['screen', '大屏只读账号'],
];

const PLATFORM_OBJECTS: [string, string, string][] = [
  ['sys_user', '用户', 'view,new,edit,delete,forbid,admin'],
  ['sys_role', '角色与权限', 'view,new,edit,delete,admin'],
  ['sys_org', '组织', 'view,new,edit,delete'],
  ['sys_dept', '部门', 'view,new,edit,delete'],
  ['sys_position', '岗位', 'view,new,edit,delete'],
  ['sys_employee', '员工', 'view,new,edit,delete'],
  ['sys_coding_rule', '编码规则', 'view,edit'],
  ['sys_bill_type', '单据类型', 'view,new,edit'],
  ['sys_param', '系统参数', 'view,edit'],
  ['sys_dict', '辅助资料', 'view,new,edit,delete'],
  ['sys_op_log', '上机操作日志', 'view,export'],
  ['sys_message', '消息', 'view,new'],
  ['sys_rule', '转换/反写规则', 'view,edit'],
  ['wf_definition', '流程定义与模板', 'view,new,edit,delete,admin'],
  ['wf_delegate', '流程委托', 'view,new,edit'],
];

export const DEFAULT_PARAMS: [string, string, string, string, string][] = [
  // module, key, value, type, name
  ['security', 'login.maxFail', '3', 'int', '登录失败锁定次数'],
  ['security', 'pwd.expireDays', '90', 'int', '密码有效期(天)，0 不过期'],
  ['security', 'pwd.minLen', '8', 'int', '密码最小长度'],
  ['security', 'pwd.maxLen', '20', 'int', '密码最大长度'],
  ['bill', 'lock.timeoutMinutes', '30', 'int', '网络互斥锁超时(分钟)'],
  ['bill', 'stock.updateOn', 'AUDIT', 'string', '库存更新时机(一期固定审核时)'],
  ['wf', 'emptyAssigneeAdminUserId', '1', 'int', '审批节点找不到人时转交的管理员'],
  ['wf', 'taskWithdrawToSelf', 'true', 'bool', '流程任务撤销回本人'],
  ['attachment', 'maxSizeMB', '50', 'int', '单个附件大小上限(MB)'],
];

export class PlatformSeed1794500000002 implements MigrationInterface {
  name = 'PlatformSeed1794500000002';

  async up(qr: QueryRunner): Promise<void> {
    await upsert(qr, 'sys_org', [{ id: 1, code: '100', name: '本组织', form: 'FACTORY', functions: 'SALE,PURCHASE,STOCK,FACTORY,QC,SETTLE' }]);
    await upsert(qr, 'sys_dept', [{ id: 1, org_id: 1, code: 'D00', name: '总经办', path: '/1/' }]);
    await upsert(qr, 'sys_perm_item', PERM_ITEMS.map(([code, name], i) => ({ id: i + 1, code, name, sort: i + 1 })), ['name', 'sort']);
    await upsert(qr, 'sys_role', PRESET_ROLES.map(([code, name], i) => ({ id: i + 1, code, name, is_super: code === 'admin' ? 1 : 0 })));
    const hash = bcrypt.hashSync('Admin@123', 10);
    await upsert(qr, 'sys_user', [{ id: 1, account: 'admin', name: '系统管理员', org_id: 1, dept_id: 1, status: 'ENABLED', pwd_hash: hash, must_change_pwd: 1 }]);
    await upsert(qr, 'sys_user_role', [{ id: 1, user_id: 1, role_id: 1, org_id: 1 }]);
    await upsert(
      qr,
      'sys_biz_object',
      PLATFORM_OBJECTS.map(([code, name, perms], i) => ({ id: 100 + i, code, name, subsystem: 'sys', kind: 'platform', perm_items: perms })),
      ['name', 'perm_items'],
    );
    await upsert(
      qr,
      'sys_param',
      DEFAULT_PARAMS.map(([module, key, value, type, name], i) => ({ id: i + 1, scope: 'GLOBAL', org_id: 0, module, param_key: key, param_value: value, value_type: type, name })),
    );
    await upsert(qr, 'sys_message_template', [
      { id: 1, code: 'wf.todo', title_tpl: '待审批：{{formName}} {{billNo}}', content_tpl: '{{starterName}} 提交的 {{formName}} {{billNo}} 等待您在「{{nodeName}}」审批' },
      { id: 2, code: 'wf.rejected', title_tpl: '被驳回：{{formName}} {{billNo}}', content_tpl: '{{userName}} 驳回：{{opinion}}' },
      { id: 3, code: 'wf.completed', title_tpl: '已审核：{{formName}} {{billNo}}', content_tpl: '审批流程已完成，单据已审核' },
      { id: 4, code: 'wf.timeout', title_tpl: '审批超时提醒：{{formName}} {{billNo}}', content_tpl: '「{{nodeName}}」已超过时限，请尽快处理' },
      { id: 5, code: 'wf.cc', title_tpl: '抄送：{{formName}} {{billNo}}', content_tpl: '{{starterName}} 提交的单据抄送给您' },
    ]);
  }

  async down(): Promise<void> {}
}
