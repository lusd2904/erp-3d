import { assertInspectionDecisionQuantity } from './inspection-quantity';

describe('检验使用决策数量', () => {
  it('使用十进制精度验证各决策数量完整覆盖检验数量', () => {
    expect(() => assertInspectionDecisionQuantity(1, '0.3', [
      { base_qty: '0.1' },
      { base_qty: '0.2' },
    ])).not.toThrow();
  });

  it('拒绝缺失、超量或少量的决策', () => {
    expect(() => assertInspectionDecisionQuantity(2, 10, [])).toThrow('必须填写');
    expect(() => assertInspectionDecisionQuantity(2, 10, [{ qty: 11 }])).toThrow('不能超过');
    expect(() => assertInspectionDecisionQuantity(2, 10, [{ qty: 9 }])).toThrow('必须等于');
  });

  it('拒绝非正数和非数值数量', () => {
    expect(() => assertInspectionDecisionQuantity(3, 'NaN', [{ qty: 1 }])).toThrow('必须填写');
    expect(() => assertInspectionDecisionQuantity(3, 1, [{ qty: 'invalid' }])).toThrow('无效使用决策数量');
  });
});
