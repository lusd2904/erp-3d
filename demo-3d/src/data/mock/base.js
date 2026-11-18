// 基础资料 —— 全部为【演示数据】，客户/供应商/品牌均为虚构
export const TODAY = '2026-11-12';

// 伪随机（固定种子，保证每次数据一致）
export function rng(seed = 20261112) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const addDays = (d, n) => { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
export const dateDiff = (a, b) => Math.round((new Date(a + 'T00:00:00Z') - new Date(b + 'T00:00:00Z')) / 86400000);
export const ymd6 = d => d.slice(2, 4) + d.slice(5, 7) + d.slice(8, 10);

export const customers = [
  { code: 'C001', name: '华锐通信设备有限公司', short: '华锐通信', region: '深圳', level: 'A' },
  { code: 'C002', name: '深蓝新能源科技有限公司', short: '深蓝新能源', region: '常州', level: 'A' },
  { code: 'C003', name: '启明汽车电子有限公司', short: '启明汽车电子', region: '苏州', level: 'A' },
  { code: 'C004', name: '博远医疗仪器有限公司', short: '博远医疗', region: '杭州', level: 'B' },
  { code: 'C005', name: '星河智能家居有限公司', short: '星河智能', region: '宁波', level: 'B' },
  { code: 'C006', name: '鹏程工控自动化有限公司', short: '鹏程工控', region: '东莞', level: 'B' },
];
export const suppliers = [
  { code: 'V001', name: '晶瓷电子材料有限公司', short: '晶瓷电子', cat: '阻容/瓷粉' },
  { code: 'V002', name: '东岳半导体有限公司', short: '东岳半导体', cat: 'IC/晶圆/MOS' },
  { code: 'V003', name: '恒铜电路板有限公司', short: '恒铜PCB', cat: 'PCB' },
  { code: 'V004', name: '蓝鲸焊锡材料有限公司', short: '蓝鲸锡材', cat: '锡膏/辅料' },
  { code: 'V005', name: '瑞丰包装材料有限公司', short: '瑞丰包材', cat: '载带/盖带/料盘' },
  { code: 'V006', name: '磁谷电感元件有限公司', short: '磁谷电感', cat: '电感' },
];

export const warehouses = [
  { code: 'WH01', name: '原材料立体库', type: '立体库(AS/RS)', area: 'WH-A 01-02排', keeper: '赵仓管', temp: '常温 22±3℃ / 湿度≤60%RH' },
  { code: 'WH02', name: 'SMT1线边仓', type: '线边仓', area: 'L1 线头', keeper: '钱物料', temp: '常温' },
  { code: 'WH03', name: 'SMT2线边仓', type: '线边仓', area: 'L2 线头', keeper: '孙物料', temp: '常温' },
  { code: 'WH04', name: '成品立体库', type: '立体库(AS/RS)', area: 'WH-A 03-04排', keeper: '李仓管', temp: '常温 防潮' },
  { code: 'WH05', name: '不良品仓', type: '平库', area: '质检区东侧', keeper: '周品管', temp: '常温' },
  { code: 'WH06', name: '锡膏冷藏库', type: '冷藏', area: '辅料间', keeper: '钱物料', temp: '2~10℃' },
  { code: 'WH07', name: '编测线边仓', type: '线边仓', area: 'L3 线头', keeper: '吴物料', temp: '干燥柜 ≤10%RH' },
];

// 物料：code 规格 封装 单位 包装 MSL 安全库存 单价 供应商
const m = (code, name, spec, pkg, cat, group, unit, packing, price, safety, sup, extra = {}) => ({ code, name, spec, pkg, cat, group, unit, packing, price, safety, sup, msl: '—', lotCtl: true, ...extra });
export const materials = [
  m('1.01.0001', '贴片电阻', '0402 10KΩ ±1% 1/16W 厚膜', '0402', '原材料', '电阻', 'PCS', '纸编带 10KPCS/7"盘', 0.0018, 400000, 'V001'),
  m('1.01.0002', '贴片电阻', '0402 4.7KΩ ±1% 1/16W 厚膜', '0402', '原材料', '电阻', 'PCS', '纸编带 10KPCS/7"盘', 0.0018, 200000, 'V001'),
  m('1.01.0003', '贴片电阻', '0603 100Ω ±1% 1/10W 厚膜', '0603', '原材料', '电阻', 'PCS', '纸编带 5KPCS/7"盘', 0.0022, 120000, 'V001'),
  m('1.01.0004', '贴片电阻', '1206 0.01Ω ±1% 1/2W 合金采样', '1206', '原材料', '电阻', 'PCS', '塑料编带 4KPCS/7"盘', 0.085, 30000, 'V001'),
  m('1.02.0001', '贴片电容MLCC', '0402 100nF 16V X7R ±10%', '0402', '原材料', '电容', 'PCS', '纸编带 10KPCS/7"盘', 0.0035, 500000, 'V001'),
  m('1.02.0002', '贴片电容MLCC', '0603 1μF 25V X5R ±10%', '0603', '原材料', '电容', 'PCS', '纸编带 4KPCS/7"盘', 0.0068, 200000, 'V001'),
  m('1.02.0003', '贴片电容MLCC', '0805 10μF 25V X5R ±10%', '0805', '原材料', '电容', 'PCS', '纸编带 4KPCS/7"盘', 0.021, 120000, 'V001'),
  m('1.02.0004', '贴片电容MLCC', '1206 22μF 25V X5R ±20%', '1206', '原材料', '电容', 'PCS', '塑料编带 2KPCS/7"盘', 0.068, 60000, 'V001'),
  m('1.03.0001', '一体成型电感', '0630 2.2μH 6.5A ±20%', '0630', '原材料', '电感', 'PCS', '塑料编带 1KPCS/13"盘', 0.32, 8000, 'V006'),
  m('1.03.0002', '功率电感', 'CD54 10μH 1.4A 屏蔽', 'CD54', '原材料', '电感', 'PCS', '塑料编带 1KPCS/13"盘', 0.26, 6000, 'V006'),
  m('1.04.0001', 'DC-DC降压IC', 'XCP3406 1.5MHz 600mA', 'SOT-23-5', '原材料', 'IC', 'PCS', '编带 3KPCS/7"盘', 0.62, 12000, 'V002', { msl: 'MSL3' }),
  m('1.04.0002', '32位MCU', 'XM32F030C8T6 48MHz 64KB', 'LQFP-48', '原材料', 'IC', 'PCS', '托盘 250PCS/盘', 2.85, 5000, 'V002', { msl: 'MSL3' }),
  m('1.04.0003', 'N沟道MOSFET', 'XN3060 30V 60A 4.5mΩ', 'DFN5x6', '原材料', '分立器件', 'PCS', '编带 5KPCS/13"盘', 0.48, 10000, 'V002', { msl: 'MSL1' }),
  m('1.04.0004', 'DC-DC晶圆', 'XCP3406 Die 8英寸 ~18k die/片', 'Wafer', '原材料', '晶圆', '片', '晶圆盒 25片/盒', 1850, 6, 'V002'),
  m('1.05.0001', 'PCB光板', 'PWR-12V5A FR-4 1.6mm 4层 沉金', '120×80mm', '原材料', 'PCB', 'PCS', '真空包装 50PCS/包', 6.8, 2000, 'V003'),
  m('1.05.0002', 'PCB光板', 'CTL-MCU-V2 FR-4 1.2mm 2层 OSP', '90×60mm', '原材料', 'PCB', 'PCS', '真空包装 100PCS/包', 2.4, 2000, 'V003'),
  m('1.06.0001', '无铅锡膏', 'SAC305 T4 Sn96.5Ag3Cu0.5 500g', '罐', '原材料', '辅料', '罐', '500g/罐 冷藏', 268, 40, 'V004', { shelf: '6个月(2~10℃)' }),
  m('1.06.0002', '引线框架', 'SOT-23-5 铜合金 镀银', 'SOT-23-5', '原材料', '封装材料', '条', '200条/箱', 0.9, 2000, 'V004'),
  m('1.06.0003', '环氧塑封料', 'EMC G700 绿色环保', '饼料', '原材料', '封装材料', 'kg', '5kg/箱 冷藏', 96, 50, 'V004', { shelf: '3个月(≤5℃)' }),
  m('1.07.0001', '纸质载带', '8mm 宽 2mm 孔距 0402/0603', '8mm', '原材料', '包材', 'm', '1000m/卷', 0.045, 30000, 'V005'),
  m('1.07.0002', '塑料载带', '12mm 宽 8mm 孔距 PS 黑色', '12mm', '原材料', '包材', 'm', '500m/卷', 0.12, 20000, 'V005'),
  m('1.07.0003', '上盖带', '8mm 热封型 防静电', '8mm', '原材料', '包材', 'm', '1000m/卷', 0.028, 60000, 'V005'),
  m('1.07.0004', '料盘', '7英寸 178mm 蓝色 抗静电', '7"', '原材料', '包材', 'PCS', '200PCS/箱', 0.85, 3000, 'V005'),
  m('1.07.0005', '料盘', '13英寸 330mm 抗静电', '13"', '原材料', '包材', 'PCS', '100PCS/箱', 1.6, 800, 'V005'),
  m('2.01.0001', 'MLCC散料(烧结后)', '0603 X7R 104K 50V 端电极后', '0603', '半成品', 'MLCC', 'PCS', '散料桶 2MPCS/桶', 0.0031, 4000000, '—', { src: '自制-前段' }),
  m('2.02.0001', 'XCP3406封装半成品', 'SOT-23-5 塑封切筋后待测', 'SOT-23-5', '半成品', 'IC封测', 'PCS', '料管/料盒', 0.21, 60000, '—', { src: '自制-封装段', msl: 'MSL3' }),
  m('2.03.0001', '功率电感散件', 'CD54 4.7μH 2.6A 绕线后', 'CD54', '半成品', '电感', 'PCS', '周转盒 2KPCS', 0.12, 20000, '—', { src: '自制-绕线' }),
  m('3.01.0001', 'PCBA 电源控制板', 'PWR-12V5A Rev.C 12V/5A', 'PCBA', '产成品', 'PCBA', 'PCS', '防静电吸塑 50PCS/箱', 46.5, 800, '—', { sn: true }),
  m('3.01.0002', 'PCBA 主控板', 'CTL-MCU-V2 Rev.B', 'PCBA', '产成品', 'PCBA', 'PCS', '防静电吸塑 100PCS/箱', 22.8, 1000, '—', { sn: true }),
  m('3.02.0001', 'MLCC 贴片电容', '0603 X7R 104K 50V 编带', '0603', '产成品', 'MLCC', 'PCS', '纸编带 4KPCS/7"盘', 0.0062, 2000000, '—'),
  m('3.03.0001', 'DC-DC降压IC', 'XCP3406B5R SOT-23-5 编带', 'SOT-23-5', '产成品', 'IC封测', 'PCS', '编带 3KPCS/7"盘', 0.45, 90000, '—', { msl: 'MSL3' }),
  m('3.04.0001', '功率电感', 'CD54-4R7M 4.7μH 2.6A 编带', 'CD54', '产成品', '电感', 'PCS', '塑料编带 1KPCS/13"盘', 0.29, 30000, '—'),
];
export const materialByCode = Object.fromEntries(materials.map(x => [x.code, x]));

// BOM：[子项, 单位用量(分子/分母), 损耗率, 发料方式]
const b = (code, qty, loss = 0.005, issue = '直接领料', pos = '') => ({ code, qty, loss, issue, pos });
export const boms = [
  { no: 'BOM-3.01.0001-V3', product: '3.01.0001', ver: 'V3.0', status: '已审核', eff: '2026-08-15', items: [
    b('1.05.0001', 1, 0.002, '直接领料', 'PCB'), b('1.01.0001', 12, 0.008, '直接领料', 'R1-R12'), b('1.01.0002', 6, 0.008, '直接领料', 'R13-R18'),
    b('1.01.0003', 4, 0.006, '直接领料', 'R19-R22'), b('1.01.0004', 2, 0.004, '直接领料', 'RS1-RS2'), b('1.02.0001', 18, 0.01, '直接领料', 'C1-C18'),
    b('1.02.0002', 8, 0.008, '直接领料', 'C19-C26'), b('1.02.0003', 6, 0.006, '直接领料', 'C27-C32'), b('1.02.0004', 4, 0.005, '直接领料', 'C33-C36'),
    b('1.03.0001', 2, 0.003, '直接领料', 'L1-L2'), b('1.04.0001', 1, 0.003, '直接领料', 'U1'), b('1.04.0003', 2, 0.003, '直接领料', 'Q1-Q2'),
    b('1.06.0001', 0.0016, 0.05, '倒冲', '锡膏 0.8g/板') ] },
  { no: 'BOM-3.01.0002-V2', product: '3.01.0002', ver: 'V2.1', status: '已审核', eff: '2026-06-01', items: [
    b('1.05.0002', 1, 0.002, '直接领料', 'PCB'), b('1.04.0002', 1, 0.002, '直接领料', 'U1'), b('1.01.0001', 16, 0.008, '直接领料', 'R1-R16'),
    b('1.01.0003', 6, 0.006, '直接领料', 'R17-R22'), b('1.02.0001', 22, 0.01, '直接领料', 'C1-C22'), b('1.02.0002', 4, 0.008, '直接领料', 'C23-C26'),
    b('1.03.0002', 1, 0.003, '直接领料', 'L1'), b('1.06.0001', 0.001, 0.05, '倒冲', '锡膏 0.5g/板') ] },
  { no: 'BOM-3.02.0001-V1', product: '3.02.0001', ver: 'V1.2', status: '已审核', eff: '2026-03-10', items: [
    b('2.01.0001', 1, 0.012, '直接领料', '测试分选损耗'), b('1.07.0001', 0.002, 0.01, '倒冲', '2mm孔距'), b('1.07.0003', 0.002, 0.01, '倒冲', ''),
    b('1.07.0004', 0.00025, 0, '直接领料', '4KPCS/盘') ] },
  { no: 'BOM-3.03.0001-V1', product: '3.03.0001', ver: 'V1.0', status: '已审核', eff: '2026-05-20', items: [
    b('2.02.0001', 1, 0.02, '直接领料', 'FT测试损耗'), b('1.07.0001', 0.004, 0.01, '倒冲', ''), b('1.07.0003', 0.004, 0.01, '倒冲', ''),
    b('1.07.0004', 0.000334, 0, '直接领料', '3KPCS/盘') ] },
  { no: 'BOM-3.04.0001-V1', product: '3.04.0001', ver: 'V1.1', status: '已审核', eff: '2026-04-02', items: [
    b('2.03.0001', 1, 0.008, '直接领料', ''), b('1.07.0002', 0.008, 0.01, '倒冲', '8mm孔距'), b('1.07.0005', 0.001, 0, '直接领料', '1KPCS/盘') ] },
  { no: 'BOM-2.02.0001-V1', product: '2.02.0001', ver: 'V1.0', status: '已审核', eff: '2026-05-20', items: [
    b('1.04.0004', 0.0000556, 0.03, '直接领料', '晶圆 18k die/片'), b('1.06.0002', 0.0125, 0.01, '直接领料', '80颗/条'), b('1.06.0003', 0.00002, 0.05, '倒冲', '塑封料') ] },
];
export const bomByProduct = Object.fromEntries(boms.map(x => [x.product, x]));

// 工作中心 / 工艺路线（设备 ID 与 CONTRACT/plant.js 一致）
export const workcenters = [
  { code: 'WC-SMT1', name: 'SMT线1', line: 'L1', dept: 'SMT车间', devices: ['L1-PRN', 'L1-SPI', 'L1-MNT1', 'L1-MNT2', 'L1-RFL', 'L1-AOI'], capacity: '5,200 板/班', cph: 168000, oee: 0.86 },
  { code: 'WC-SMT2', name: 'SMT线2', line: 'L2', dept: 'SMT车间', devices: ['L2-PRN', 'L2-SPI', 'L2-MNT1', 'L2-MNT2', 'L2-RFL', 'L2-AOI'], capacity: '4,800 板/班', cph: 152000, oee: 0.78 },
  { code: 'WC-TST', name: '测试分选', line: 'L3', dept: '编测车间', devices: ['L3-TST1', 'L3-TST2'], capacity: '1.0 MPCS/班', cph: 0, oee: 0.81 },
  { code: 'WC-TAP', name: '编带包装', line: 'L3', dept: '编测车间', devices: ['L3-TAP1', 'L3-TAP2'], capacity: '0.9 MPCS/班', cph: 0, oee: 0.84 },
  { code: 'WC-WH', name: '立体仓储', line: 'WH', dept: '仓储物流部', devices: ['WH-ASRS', 'WH-STK1', 'WH-STK2', 'AGV-01', 'AGV-02', 'AGV-03', 'AGV-04'], capacity: '288 库位', cph: 0, oee: 0.9 },
];
const op = (seq, name, wc, devices, std, ctrl = '') => ({ seq, name, wc, devices, std, ctrl });
const smt = (L) => [
  op(10, '锡膏印刷', `WC-SMT${L}`, [`L${L}-PRN`], '18s/拼板', '刮刀压力/脱模速度'), op(20, 'SPI锡膏检测', `WC-SMT${L}`, [`L${L}-SPI`], '15s/拼板', '体积 70~130%'),
  op(30, '高速贴片', `WC-SMT${L}`, [`L${L}-MNT1`], '22s/拼板', '抛料率 ≤0.3%'), op(40, '泛用贴片', `WC-SMT${L}`, [`L${L}-MNT2`], '20s/拼板', 'IC 共面性'),
  op(50, '回流焊接', `WC-SMT${L}`, [`L${L}-RFL`], '链速 80cm/min', '峰值 245±5℃ 氮气 ≤1000ppm'), op(60, 'AOI光学检测', `WC-SMT${L}`, [`L${L}-AOI`], '16s/拼板', '误判率 ≤0.5%'),
];
export const routings = [
  { no: 'RT-PCBA-L1', name: 'PCBA 双面SMT工艺(SMT线1)', products: ['3.01.0001', '3.01.0002'], line: 'L1', ops: smt(1) },
  { no: 'RT-PCBA-L2', name: 'PCBA 双面SMT工艺(SMT线2)', products: ['3.01.0001', '3.01.0002'], line: 'L2', ops: smt(2) },
  { no: 'RT-CHIP-L3', name: '片式元件测试编带工艺', products: ['3.02.0001', '3.04.0001'], line: 'L3', ops: [
    op(10, '电性能测试分选', 'WC-TST', ['L3-TST1', 'L3-TST2'], '42K PCS/h', '容值/DF/IR 分档'), op(20, '外观检测', 'WC-TST', ['L3-TST1', 'L3-TST2'], '在线CCD', '崩瓷/端头不良'),
    op(30, '编带封装', 'WC-TAP', ['L3-TAP1', 'L3-TAP2'], '38K PCS/h', '剥离力 0.1~0.7N'), op(40, '出货检验OQC', 'WC-TAP', [], '抽检 AQL0.65', '') ] },
  { no: 'RT-IC-L3', name: 'IC 成品测试编带工艺', products: ['3.03.0001'], line: 'L3', ops: [
    op(10, 'FT终测', 'WC-TST', ['L3-TST1', 'L3-TST2'], '18K UPH', 'Vout/Iq/效率'), op(20, '打标检查', 'WC-TST', ['L3-TST1', 'L3-TST2'], '在线视觉', '印字/引脚共面'),
    op(30, '编带烘烤包装', 'WC-TAP', ['L3-TAP1', 'L3-TAP2'], '20K UPH', 'MSL3 真空包装'), op(40, '出货检验OQC', 'WC-TAP', [], '抽检 AQL0.4', '') ] },
];
export const routingFor = (product, line) => routings.find(r => r.products.includes(product) && (!line || r.line === line)) || routings[0];

export const teams = [
  { code: 'T-S1A', name: 'SMT1 白班A组', wc: 'WC-SMT1', leader: '陈建华', members: 9, shift: '08:00-20:00' },
  { code: 'T-S1B', name: 'SMT1 夜班B组', wc: 'WC-SMT1', leader: '林志强', members: 8, shift: '20:00-08:00' },
  { code: 'T-S2A', name: 'SMT2 白班A组', wc: 'WC-SMT2', leader: '黄晓明', members: 9, shift: '08:00-20:00' },
  { code: 'T-S2B', name: 'SMT2 夜班B组', wc: 'WC-SMT2', leader: '吴海波', members: 8, shift: '20:00-08:00' },
  { code: 'T-L3A', name: '编测 白班A组', wc: 'WC-TST', leader: '郑丽娟', members: 12, shift: '08:00-20:00' },
  { code: 'T-L3B', name: '编测 夜班B组', wc: 'WC-TAP', leader: '王立新', members: 10, shift: '20:00-08:00' },
  { code: 'T-WH', name: '仓储物流组', wc: 'WC-WH', leader: '赵德胜', members: 6, shift: '两班倒' },
  { code: 'T-QC', name: 'IPQC 品质组', wc: '—', leader: '周雅琴', members: 7, shift: '两班倒' },
];
export const reportTypes = ['正常汇报', '设备故障', '欠料停线', '换线调机', '来料不良', '品质异常'];
