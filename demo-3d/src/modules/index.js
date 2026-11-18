// 业务模块注册表（线B维护）。每项为模块命名空间：{ meta:{id,title,group,icon}, mount(container, ctx) => cleanup }
// meta.icon 为外壳 icons.js 的图标名（order/plan/bom/task/pick/report/stock/quality/trace）。
// 顺序即左侧导航顺序；按金蝶生产管理主线：基础资料 → 销售订单 → 生产订单 → 用料清单 → 齐套 → 领料 → 汇报 → 入库 → 库存 → 质检 → 追溯 → 报表
import * as base from './base.js';
import * as sales from './sales.js';
import * as mo from './mo.js';
import * as ppbom from './ppbom.js';
import * as kitting from './kitting.js';
import * as picking from './picking.js';
import * as prodreport from './prodreport.js';
import * as instock from './instock.js';
import * as inventory from './inventory.js';
import * as quality from './quality.js';
import * as trace from './trace.js';
import * as reports from './reports.js';
export default [base, sales, mo, ppbom, kitting, picking, prodreport, instock, inventory, quality, trace, reports];
