// 预览工具自测用样例（包装线A已有印刷机模型），模型部 bot 可参考接口
import { buildPrinter } from '../smt.js';
export const meta = { type: '_sample', name: '样例-印刷机', refs: [], size: {} };
export function build(device) { const r = buildPrinter(); const g = r.group; g.name = device.id; return g; }
