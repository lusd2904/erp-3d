import { toDec } from '@erp3d/shared';
import type { BillHooks, BillHookContext } from '../engine.types';

/**
 * 采购申请单业务扩展钩子。
 */
export const PUR_REQ_HOOKS: BillHooks = {
  beforeSave: async (ctx: BillHookContext, _mode: 'draft' | 'save') => {
    for (const entry of ctx.entries) {
      const approveQty = toDec(entry.approve_qty);
      const orderQty =
        entry.order_qty !== undefined && entry.order_qty !== null ? toDec(entry.order_qty) : toDec(0);
      entry.remain_qty = approveQty.minus(orderQty).toFixed();
    }
  },
};
