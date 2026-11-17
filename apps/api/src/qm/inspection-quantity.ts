import Decimal from 'decimal.js';
import { BizError } from '../common/biz-error';

export function assertInspectionDecisionQuantity(
  lineNo: number,
  inspectedValue: unknown,
  decisions: { base_qty?: unknown; qty?: unknown }[],
): void {
  const inspectedQty = decimal(inspectedValue);
  if (!inspectedQty || inspectedQty.lte(0) || !decisions.length) {
    throw new BizError('BIZ_QM_DECISION_REQUIRED', `第 ${lineNo} 行必须填写有效检验数量和使用决策`);
  }

  let decidedQty = new Decimal(0);
  for (const decision of decisions) {
    const decisionQty = decimal(decision.base_qty ?? decision.qty ?? 0);
    if (!decisionQty || decisionQty.lte(0)) {
      throw new BizError('BIZ_QM_DECISION_INVALID', `第 ${lineNo} 行存在无效使用决策数量`);
    }
    decidedQty = decidedQty.plus(decisionQty);
  }
  if (decidedQty.gt(inspectedQty)) {
    throw new BizError('BIZ_QM_DECISION_OVER_INSPECT', `第 ${lineNo} 行决策数量不能超过检验数量`);
  }
  if (!decidedQty.eq(inspectedQty)) {
    throw new BizError('BIZ_QM_DECISION_QTY_INCOMPLETE', `第 ${lineNo} 行决策数量必须等于检验数量`);
  }
}

function decimal(value: unknown): Decimal | null {
  try {
    const result = new Decimal(value as Decimal.Value);
    return result.isFinite() ? result : null;
  } catch {
    return null;
  }
}
