export type MoCloseScope = 'ALL' | 'NON_BACKFLUSH' | 'KEY';

export type MoCloseStrength = 'ZERO' | 'IN_SCRAP' | 'NONE';

export interface MoCloseMaterial {
  materialId: number | string;
  isBackflush?: boolean;
  isKey?: boolean;
  pickedQty: number | string;
  stdConsumeQty: number | string;
  scrapRate?: number | string;
}

export interface MoCloseViolation {
  materialId: number | string;
  wipQty: number;
  limitQty: number;
  reason: string;
}

const QUANTITY_SCALE = 1_000_000;

function readNumber(value: number | string, label: string): number {
  if (typeof value === 'string' && value.trim() === '') {
    throw new Error(`${label}不能为空`);
  }

  const result = Number(value);
  if (!Number.isFinite(result)) {
    throw new Error(`${label}必须为有限数值`);
  }
  return result;
}

function roundScaled(value: number, label: string): number {
  const result = Math.round(value);
  if (!Number.isSafeInteger(result)) {
    throw new Error(`${label}超出安全计算范围`);
  }
  return result === 0 ? 0 : result;
}

function toScaledQuantity(value: number | string, label: string): number {
  return roundScaled(readNumber(value, label) * QUANTITY_SCALE, label);
}

/**
 * 生产订单结案材料控制。
 *
 * stdConsumeQty 由调用方计算：完工数量 × 单位用量，不包含损耗。
 * wip = pickedQty - stdConsumeQty。
 * ZERO：wip = 0。
 * IN_SCRAP：0 ≤ wip ≤ stdConsumeQty × scrapRate / 100；
 * 即已领量最多为标准耗用量 × (1 + 损耗率)，wip < 0 表示欠料。
 *
 * 数量统一按 1e6 放大并四舍五入，再使用整数进行比较。
 * scrapRate 使用百分数，例如 2 表示 2%，缺省为 0。
 */
export function checkMoClose(
  scope: MoCloseScope,
  strength: MoCloseStrength,
  materials: MoCloseMaterial[],
): MoCloseViolation[] {
  if (scope !== 'ALL' && scope !== 'NON_BACKFLUSH' && scope !== 'KEY') {
    throw new Error(`非法的结案材料控制范围：${String(scope)}`);
  }
  if (strength !== 'ZERO' && strength !== 'IN_SCRAP' && strength !== 'NONE') {
    throw new Error(`非法的结案材料控制强度：${String(strength)}`);
  }
  if (strength === 'NONE') {
    return [];
  }

  const violations: MoCloseViolation[] = [];

  for (const material of materials) {
    if (scope === 'NON_BACKFLUSH' && material.isBackflush === true) {
      continue;
    }
    if (scope === 'KEY' && material.isKey !== true) {
      continue;
    }

    const label = `物料 ${material.materialId}`;
    const pickedScaled = toScaledQuantity(material.pickedQty, `${label}已领数量`);
    const stdScaled = toScaledQuantity(material.stdConsumeQty, `${label}标准耗用数量`);
    const wipScaled = pickedScaled - stdScaled;

    if (!Number.isSafeInteger(wipScaled)) {
      throw new Error(`${label}在制数量超出安全计算范围`);
    }

    let limitScaled = 0;
    if (strength === 'IN_SCRAP') {
      const scrapRate = readNumber(material.scrapRate ?? 0, `${label}损耗率`);
      if (scrapRate < 0) {
        throw new Error(`${label}损耗率不能为负数`);
      }
      limitScaled = roundScaled(
        stdScaled * (scrapRate / 100),
        `${label}损耗上限`,
      );
    }

    const passed =
      strength === 'ZERO'
        ? wipScaled === 0
        : wipScaled >= 0 && wipScaled <= limitScaled;

    if (passed) {
      continue;
    }

    const wipQty = wipScaled / QUANTITY_SCALE;
    const limitQty = limitScaled / QUANTITY_SCALE;
    const detail =
      strength === 'ZERO'
        ? '在制材料必须为零'
        : wipScaled < 0
          ? '存在欠料，禁止结案'
          : '超出损耗范围';

    violations.push({
      materialId: material.materialId,
      wipQty,
      limitQty,
      reason: `${label} 在制 ${wipQty}（上限 ${limitQty}），${detail}`,
    });
  }

  return violations;
}
