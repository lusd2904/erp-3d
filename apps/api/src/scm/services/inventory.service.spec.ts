import { buildInventoryMovements, inventoryDimension, inventoryDimensionHash } from './inventory.service';

describe('库存维度和 D46 流水构建', () => {
  it('规范化空维度后生成稳定哈希', () => {
    const first = inventoryDimension(1, { id: 7, material_id: 10, warehouse_id: 20 });
    const second = inventoryDimension(1, { material_id: 10, warehouse_id: 20, lot_no: '', aux_prop_id: 0 });
    expect(first).toEqual(second);
    expect(inventoryDimensionHash(first)).toBe(inventoryDimensionHash(second));
  });

  it('为每个 D46 转换组构建数量相等的出入库动作', () => {
    const movements = buildInventoryMovements('scm_status_convert', 1, {}, [
      { id: 1, group_no: 'g1', convert_type: 'BEFORE', material_id: 10, warehouse_id: 20, stock_status_id: 1, base_qty: 5 },
      { id: 2, group_no: 'g1', convert_type: 'AFTER', material_id: 10, warehouse_id: 20, stock_status_id: 2, base_qty: 5 },
    ]);
    expect(movements.map((movement) => movement.direction)).toEqual(['OUT', 'IN']);
    expect(movements.map((movement) => movement.base_qty)).toEqual(['5', '5']);
  });

  it('拒绝前后数量不等或缺少转换组的 D46', () => {
    expect(() => buildInventoryMovements('scm_status_convert', 1, {}, [
      { id: 1, group_no: 'g1', convert_type: 'BEFORE', material_id: 10, warehouse_id: 20, base_qty: 5 },
      { id: 2, group_no: 'g1', convert_type: 'AFTER', material_id: 10, warehouse_id: 20, base_qty: 4 },
    ])).toThrow('基本数量必须相等');
    expect(() => buildInventoryMovements('scm_status_convert', 1, {}, [
      { id: 1, convert_type: 'BEFORE', material_id: 10, warehouse_id: 20, base_qty: 5 },
    ])).toThrow('转换分组');
  });
});
