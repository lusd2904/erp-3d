/** 引擎验收测试专用单据（tst_ 前缀，只在测试库建表），用于不依赖具体业务模块的规则验证 */
import type { BillMeta, StateMachineConfig } from '@erp3d/shared';
import { checkMoClose } from '../../../../packages/shared/src/close-ctrl';
import type { MoCloseMaterial, MoCloseScope, MoCloseStrength } from '../../../../packages/shared/src/close-ctrl';
import type { RegisterBillOptions } from '../../src/bill-engine/engine.types';
import { BizError } from '../../src/common/biz-error';
import { STD_STATE_MACHINE } from '../../src/bill-engine/state/std-state-machine';

const bill = (form: string, name: string, header: BillMeta['header'], fields: any[], extra: Partial<BillMeta> = {}): BillMeta => ({
  form, name, subsystem: 'tst', kind: 'bill', table: form, header, numbering: { prefix: form.toUpperCase().replace(/_/g, ''), dateFormat: 'YYMMDD', seqLength: 5 },
  entry: { key: 'entry', name: '分录', table: `${form}_entry`, fields }, ...extra,
});

// ---------- 验收 2：并发 ----------
export const TST_SRC: RegisterBillOptions = {
  meta: bill('tst_src', '并发测试上游', [], [
    { key: 'cap_qty', name: '上限数量', type: 'qty', required: true },
    { key: 'done_qty', name: '执行数量', type: 'qty', readonly: true },
  ]),
};
export const TST_DST: RegisterBillOptions = {
  meta: bill('tst_dst', '并发测试下游', [], []),
  writebacks: [{ code: 'wb_tst_done', name: '下游审核反写执行数量', srcForm: 'tst_src', tgtForm: 'tst_dst', srcField: 'done_qty', onEvent: 'audit', mode: 'add', overCtrl: 'FORBID', overExpr: 'cap_qty' }],
};

// ---------- 验收 3：超额四种模式 + ONCE ----------
export const TST_PPBOM: RegisterBillOptions = {
  meta: bill('tst_ppbom', '用料清单（测试）', [], [
    { key: 'must_qty', name: '应发数量', type: 'qty' },
    { key: 'std_qty', name: '标准用量', type: 'qty' },
    { key: 'scrap_rate', name: '损耗率%', type: 'rate' },
    { key: 'min_issue_qty', name: '最小发料批量', type: 'qty' },
    { key: 'over_ctrl', name: '超发控制', type: 'string', length: 20 },
    { key: 'picked_qty', name: '已领数量', type: 'qty', readonly: true },
    { key: 'in_qty', name: '已入库数量', type: 'qty', readonly: true },
  ]),
};
export const TST_PICK: RegisterBillOptions = {
  meta: bill('tst_pick', '领料单（测试）', [], []),
  writebacks: [{
    code: 'wb_tst_pick', name: '领料审核反写已领数量', srcForm: 'tst_ppbom', tgtForm: 'tst_pick', srcField: 'picked_qty', onEvent: 'audit', mode: 'add',
    overCtrl: 'FORBID', overExpr: 'issueLimit(over_ctrl, must_qty, std_qty, scrap_rate, min_issue_qty)', overMsg: '超过领料上限',
  }],
};
export const TST_INSTOCK: RegisterBillOptions = {
  meta: bill('tst_instock', '入库单（测试，允许超额一次）', [], []),
  writebacks: [{ code: 'wb_tst_in', name: '入库审核反写', srcForm: 'tst_ppbom', tgtForm: 'tst_instock', srcField: 'in_qty', onEvent: 'audit', mode: 'add', overCtrl: 'ONCE', overExpr: 'must_qty' }],
};

// ---------- 验收 4：合单 ----------
export const TST_PPBOM2: RegisterBillOptions = {
  meta: bill('tst_ppbom2', '用料清单（合单测试）', [
    { key: 'issue_org_id', name: '发料组织', type: 'ref', ref: 'sys_org' },
    { key: 'prd_org_id', name: '生产组织', type: 'ref', ref: 'sys_org' },
  ], [
    { key: 'owner_id', name: '货主', type: 'ref', ref: 'sys_org' },
    { key: 'owner_type', name: '货主类型', type: 'string', length: 20 },
    { key: 'must_qty', name: '应发数量', type: 'qty' },
  ]),
  converts: [
    {
      code: 'tst_r08', name: '补料单合单', srcForm: 'tst_ppbom2', tgtForm: 'tst_feed', srcQtyField: 'must_qty',
      header: [{ tgt: 'issue_org_id', src: 'head.issue_org_id' }, { tgt: 'prd_org_id', src: 'head.prd_org_id' }, { tgt: 'owner_id', src: 'entry.owner_id' }, { tgt: 'owner_type', src: 'entry.owner_type' }, { tgt: 'total_qty', src: 'qty', agg: 'sum' }],
      entry: [], groupBy: ['head.issue_org_id', 'head.prd_org_id', 'entry.owner_id', 'entry.owner_type'],
    },
    {
      code: 'tst_r17', name: '入库单合单', srcForm: 'tst_ppbom2', tgtForm: 'tst_feed', srcQtyField: 'must_qty',
      header: [{ tgt: 'prd_org_id', src: 'head.prd_org_id' }, { tgt: 'owner_id', src: 'entry.owner_id' }, { tgt: 'owner_type', src: 'entry.owner_type' }, { tgt: 'total_qty', expr: 'qty', agg: 'sum' }],
      entry: [], groupBy: ['head.prd_org_id', 'entry.owner_id', 'entry.owner_type'],
    },
  ],
};
export const TST_FEED: RegisterBillOptions = {
  meta: bill('tst_feed', '补料/入库（合单测试）', [
    { key: 'issue_org_id', name: '发料组织', type: 'ref', ref: 'sys_org' },
    { key: 'prd_org_id', name: '生产组织', type: 'ref', ref: 'sys_org' },
    { key: 'owner_id', name: '货主', type: 'ref', ref: 'sys_org' },
    { key: 'owner_type', name: '货主类型', type: 'string', length: 20 },
    { key: 'total_qty', name: '合计数量', type: 'qty' },
  ], []),
};

// ---------- 验收 5：行状态 ----------
const ROW_SM: StateMachineConfig = {
  ...STD_STATE_MACHINE,
  code: 'TST_MO',
  name: '生产订单（测试）',
  rowStatus: {
    entity: 'entry', field: 'biz_status', initial: 'PLANNED',
    states: [
      { code: 'PLANNED', name: '计划' }, { code: 'CONFIRMED', name: '计划确认' }, { code: 'RELEASED', name: '下达' },
      { code: 'STARTED', name: '开工' }, { code: 'FINISHED', name: '完工' }, { code: 'CLOSED', name: '结案' },
    ],
    transitions: [
      { op: 'confirm', name: '计划确认', from: ['PLANNED'], to: 'CONFIRMED', direction: 'forward' },
      { op: 'release', name: '下达', from: ['CONFIRMED'], to: 'RELEASED', direction: 'forward', hook: 'beforeRelease' },
      { op: 'start', name: '开工', from: ['RELEASED'], to: 'STARTED', direction: 'forward' },
      { op: 'finish', name: '完工', from: ['STARTED'], to: 'FINISHED', direction: 'forward', event: 'mo_finish' },
      { op: 'close_row', name: '结案', from: ['FINISHED'], to: 'CLOSED', direction: 'forward', hook: 'beforeCloseRow' },
      { op: 'unclose_row', name: '反结案', from: ['CLOSED'], to: 'FINISHED', direction: 'backward', hook: 'beforeUnclose', jumpable: false },
      { op: 'unfinish', name: '反完工', from: ['FINISHED'], to: 'STARTED', direction: 'backward', event: 'mo_unfinish' },
      { op: 'unstart', name: '反开工', from: ['STARTED'], to: 'RELEASED', direction: 'backward', hook: 'beforeUnstart' },
      { op: 'unrelease', name: '反下达', from: ['RELEASED'], to: 'CONFIRMED', direction: 'backward' },
      { op: 'unconfirm', name: '反确认', from: ['CONFIRMED'], to: 'PLANNED', direction: 'backward' },
    ],
  },
};
export const guardCalls: string[] = [];
export const eventCalls: string[] = [];
export const TST_MO: RegisterBillOptions = {
  meta: { ...bill('tst_mo', '生产订单（测试）', [], [
    { key: 'reported_qty', name: '已汇报数量', type: 'qty' },
    { key: 'settled', name: '已结算', type: 'bool' },
  ]), stateMachine: 'TST_MO' },
  stateMachine: ROW_SM,
  hooks: {
    rowGuards: {
      beforeRelease: async (e) => { guardCalls.push(`release:${e.line_no}`); },
      beforeUnstart: async (e) => {
        guardCalls.push(`unstart:${e.line_no}`);
        if (Number(e.reported_qty) > 0) throw new BizError('BIZ_ROW_STATE', `第${e.line_no}行已有汇报，不能反开工`);
      },
      beforeCloseRow: async (_entry, ctx) => {
        const {
          closeScope = 'ALL',
          closeStrength = 'IN_SCRAP',
          materials = [],
        } = (ctx.extra ?? {}) as {
          closeScope?: MoCloseScope;
          closeStrength?: MoCloseStrength;
          materials?: MoCloseMaterial[];
        };
        const violations = checkMoClose(closeScope, closeStrength, materials);
        if (violations.length > 0) {
          throw new BizError('BIZ_ROW_STATE', violations.map((v) => v.reason).join('；'));
        }
      },
      beforeUnclose: async (e) => {
        if (Number(e.settled)) throw new BizError('BIZ_ROW_STATE', `第${e.line_no}行已结算，不能反结案`);
      },
    },
  },
  events: [{
    code: 'mo_finish', name: '完工入账', level: 'entry', undo: { code: 'mo_unfinish', name: '撤销完工入账' },
    handler: async (ctx) => { eventCalls.push(`finish:${ctx.entryIds!.join(',')}`); },
    undoHandler: async (ctx) => { eventCalls.push(`unfinish:${ctx.entryIds!.join(',')}`); },
  }],
};

// ---------- WP11：自定义事件反写（质检完成 / 撤销） ----------
export const TST_RECV: RegisterBillOptions = {
  meta: bill('tst_recv', '收料单（测试）', [], [
    { key: 'rcv_qty', name: '收料数量', type: 'qty' },
    { key: 'ok_qty', name: '合格数量', type: 'qty', readonly: true },
    { key: 'ng_qty', name: '不合格数量', type: 'qty', readonly: true },
    { key: 'concession_qty', name: '让步接收数量', type: 'qty', readonly: true },
  ]),
};
export const TST_INSPECT_OUTBOX: string[] = [];
export function tstInspect(outbox: { enqueue: (t: string, p: any) => Promise<number> }): RegisterBillOptions {
  const wb = (field: string) => ({
    code: `wb_tst_inspect_${field}`, name: `质检完成反写${field}`, srcForm: 'tst_recv', tgtForm: 'tst_inspect', srcField: field, tgtValue: field,
    onEvent: 'inspect_complete', mode: 'add' as const, overCtrl: 'FORBID' as const, overExpr: 'rcv_qty - (ok_qty + ng_qty + concession_qty) + ' + field,
    overMsg: '合格+不合格+让步数量超过收料数量',
  });
  return {
    meta: bill('tst_inspect', '检验单（测试）', [], [
      { key: 'inspect_qty', name: '检验数量', type: 'qty' },
      { key: 'ok_qty', name: '合格数量', type: 'qty' },
      { key: 'ng_qty', name: '不合格数量', type: 'qty' },
      { key: 'concession_qty', name: '让步接收数量', type: 'qty' },
    ]),
    writebacks: [wb('ok_qty'), wb('ng_qty'), wb('concession_qty')],
    events: [{
      code: 'inspect_complete', name: '质检完成', level: 'entry', undo: { code: 'inspect_cancel', name: '撤销质检完成' },
      rowFilter: 'inspect_qty > 0',
      handler: async (ctx) => {
        await outbox.enqueue('qm.inspect.completed', { objectCode: 'tst_inspect', billId: ctx.billId, payload: { entryIds: ctx.entryIds } });
      },
      undoHandler: async (ctx) => {
        await outbox.enqueue('qm.inspect.cancelled', { objectCode: 'tst_inspect', billId: ctx.billId, payload: { entryIds: ctx.entryIds } });
      },
    }],
  };
}
