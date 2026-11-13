/**
 * 安全表达式引擎（不使用 eval）。用于：反写超额公式、关闭条件、转换规则过滤/字段公式、
 * 审批流连线条件、流程模板启动条件、操作时预警等。
 *
 * 语法：数字、'字符串' / "字符串"、true/false/null、标识符（可带点：head.amount、entry.qty）、
 *       + - * / %、== != > >= < <=、&& || !（也可写 and / or / not）、三元 a ? b : c、函数调用。
 * 数值一律用 Decimal 计算（避免 0.1+0.2 误差）；从数据库取出的 DECIMAL 字符串会自动当数字参与运算和比较。
 * 内置函数：ceil floor round(x,n) abs min max if(c,a,b) isnull(x,d) len(s) contains(s,sub) in(x,a,b,...)
 *           issueLimit(mode, mustQty, stdQty, scrapRate, minIssueQty)（领料超发上限，见平台开发约定 6.4）
 */
import Decimal from 'decimal.js';

export class ExprError extends Error {
  constructor(msg: string, public readonly pos?: number) {
    super(pos === undefined ? msg : `${msg} (位置 ${pos})`);
  }
}

type Tok =
  | { t: 'num'; v: string; p: number }
  | { t: 'str'; v: string; p: number }
  | { t: 'id'; v: string; p: number }
  | { t: 'op'; v: string; p: number }
  | { t: 'eof'; p: number };

const OPS = ['&&', '||', '==', '!=', '>=', '<=', '>', '<', '+', '-', '*', '/', '%', '!', '?', ':', '(', ')', ','];

function lex(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] ?? ''))) {
      const m = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(src.slice(i))!;
      out.push({ t: 'num', v: m[0], p: i });
      i += m[0].length;
      continue;
    }
    if (c === "'" || c === '"') {
      let j = i + 1;
      let s = '';
      while (j < src.length && src[j] !== c) {
        if (src[j] === '\\' && j + 1 < src.length) { s += src[j + 1]; j += 2; continue; }
        s += src[j++];
      }
      if (j >= src.length) throw new ExprError('字符串没有结束引号', i);
      out.push({ t: 'str', v: s, p: i });
      i = j + 1;
      continue;
    }
    if (/[A-Za-z_\u4e00-\u9fa5$]/.test(c)) {
      const m = /^[A-Za-z_\u4e00-\u9fa5$][A-Za-z0-9_\u4e00-\u9fa5$]*(?:\.[A-Za-z_\u4e00-\u9fa5$][A-Za-z0-9_\u4e00-\u9fa5$]*)*/.exec(src.slice(i))!;
      const w = m[0];
      if (w === 'and') out.push({ t: 'op', v: '&&', p: i });
      else if (w === 'or') out.push({ t: 'op', v: '||', p: i });
      else if (w === 'not') out.push({ t: 'op', v: '!', p: i });
      else out.push({ t: 'id', v: w, p: i });
      i += w.length;
      continue;
    }
    const op = OPS.find((o) => src.startsWith(o, i));
    if (!op) throw new ExprError(`无法识别的字符 "${c}"`, i);
    out.push({ t: 'op', v: op, p: i });
    i += op.length;
  }
  out.push({ t: 'eof', p: src.length });
  return out;
}

export type Node =
  | { k: 'lit'; v: Decimal | string | boolean | null }
  | { k: 'id'; name: string }
  | { k: 'un'; op: string; a: Node }
  | { k: 'bin'; op: string; a: Node; b: Node }
  | { k: 'tern'; c: Node; a: Node; b: Node }
  | { k: 'call'; fn: string; args: Node[]; p: number };

const PREC: Record<string, number> = { '||': 1, '&&': 2, '==': 3, '!=': 3, '>': 4, '>=': 4, '<': 4, '<=': 4, '+': 5, '-': 5, '*': 6, '/': 6, '%': 6 };

function parse(src: string): Node {
  const toks = lex(src);
  let i = 0;
  const peek = () => toks[i];
  const next = () => toks[i++];
  const expectOp = (v: string) => {
    const t = next();
    if (t.t !== 'op' || t.v !== v) throw new ExprError(`这里需要 "${v}"`, t.p);
  };
  function primary(): Node {
    const t = next();
    if (t.t === 'num') return { k: 'lit', v: new Decimal(t.v) };
    if (t.t === 'str') return { k: 'lit', v: t.v };
    if (t.t === 'id') {
      if (t.v === 'true') return { k: 'lit', v: true };
      if (t.v === 'false') return { k: 'lit', v: false };
      if (t.v === 'null') return { k: 'lit', v: null };
      const p = peek();
      if (p.t === 'op' && p.v === '(') {
        next();
        const args: Node[] = [];
        if (!(peek().t === 'op' && (peek() as any).v === ')')) {
          for (;;) {
            args.push(ternary());
            const q = peek();
            if (q.t === 'op' && q.v === ',') { next(); continue; }
            break;
          }
        }
        expectOp(')');
        if (!FUNCS[t.v]) throw new ExprError(`未知函数 ${t.v}`, t.p);
        return { k: 'call', fn: t.v, args, p: t.p };
      }
      return { k: 'id', name: t.v };
    }
    if (t.t === 'op' && t.v === '(') {
      const e = ternary();
      expectOp(')');
      return e;
    }
    if (t.t === 'op' && (t.v === '-' || t.v === '!' || t.v === '+')) return { k: 'un', op: t.v, a: unaryOperand() };
    throw new ExprError(t.t === 'eof' ? '表达式不完整' : `意外的 "${(t as any).v}"`, t.p);
  }
  function unaryOperand(): Node {
    return primary();
  }
  function binary(minPrec: number): Node {
    let left = primary();
    for (;;) {
      const t = peek();
      if (t.t !== 'op' || PREC[t.v] === undefined || PREC[t.v] < minPrec) return left;
      next();
      const right = binary(PREC[t.v] + 1);
      left = { k: 'bin', op: t.v, a: left, b: right };
    }
  }
  function ternary(): Node {
    const c = binary(1);
    const t = peek();
    if (t.t === 'op' && t.v === '?') {
      next();
      const a = ternary();
      expectOp(':');
      const b = ternary();
      return { k: 'tern', c, a, b };
    }
    return c;
  }
  const root = ternary();
  if (peek().t !== 'eof') throw new ExprError(`多余的内容`, peek().p);
  return root;
}

type Val = Decimal | string | boolean | null | undefined;

const NUM_RE = /^\s*-?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?\s*$/i;
export function isNumLike(v: unknown): boolean {
  return v instanceof Decimal || typeof v === 'number' || (typeof v === 'string' && NUM_RE.test(v));
}
export function toDec(v: unknown): Decimal {
  if (v instanceof Decimal) return v;
  if (v === null || v === undefined || v === '') return new Decimal(0);
  if (typeof v === 'boolean') return new Decimal(v ? 1 : 0);
  if (typeof v === 'number' || (typeof v === 'string' && NUM_RE.test(v))) return new Decimal(v as any);
  throw new ExprError(`"${String(v)}" 不是数字`);
}
function truthy(v: Val): boolean {
  if (v instanceof Decimal) return !v.isZero();
  return !!v;
}
function norm(v: unknown): Val {
  if (typeof v === 'number') return new Decimal(v);
  if (typeof v === 'bigint') return new Decimal(v.toString());
  if (v instanceof Date) return v.toISOString();
  return v as Val;
}
function cmp(a: Val, b: Val): number | null {
  if (a === null || a === undefined || b === null || b === undefined) return null;
  if (isNumLike(a) && isNumLike(b)) return toDec(a).cmp(toDec(b));
  const sa = String(a), sb = String(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}
function eq(a: Val, b: Val): boolean {
  if ((a === null || a === undefined) && (b === null || b === undefined)) return true;
  if (a === null || a === undefined || b === null || b === undefined) return false;
  if (typeof a === 'boolean' || typeof b === 'boolean') return truthy(a) === truthy(b);
  return cmp(a, b) === 0;
}

/** 领料超发控制上限。mode: ALLOW/1=允许超发；MIN_BATCH/2=按最小发料批量；FORBID/3=不允许；SCRAP/4=按损耗率 */
export function issueLimit(mode: unknown, mustQty: unknown, stdQty: unknown, scrapRate: unknown, minIssueQty: unknown): Decimal {
  const m = String(mode ?? '').toUpperCase();
  const must = toDec(mustQty);
  if (m === 'ALLOW' || m === '1') return new Decimal('1e30');
  if (m === 'MIN_BATCH' || m === '2') {
    const b = toDec(minIssueQty);
    if (b.lte(0)) return must;
    return must.div(b).ceil().mul(b);
  }
  if (m === 'SCRAP' || m === '4') return toDec(stdQty).mul(toDec(scrapRate).div(100).plus(1));
  return must; // FORBID / 3 / 其他
}

const FUNCS: Record<string, (args: Val[]) => Val> = {
  ceil: ([a]) => toDec(a).ceil(),
  floor: ([a]) => toDec(a).floor(),
  round: ([a, n]) => toDec(a).toDecimalPlaces(n === undefined ? 0 : toDec(n).toNumber(), Decimal.ROUND_HALF_UP),
  abs: ([a]) => toDec(a).abs(),
  min: (as) => Decimal.min(...as.map(toDec)),
  max: (as) => Decimal.max(...as.map(toDec)),
  if: ([c, a, b]) => (truthy(c) ? a : b),
  isnull: ([a, d]) => (a === null || a === undefined || a === '' ? d : a),
  len: ([s]) => new Decimal(String(s ?? '').length),
  contains: ([s, sub]) => String(s ?? '').includes(String(sub ?? '')),
  in: ([x, ...rest]) => rest.some((r) => eq(x, r)),
  issueLimit: ([m, a, b, c, d]) => issueLimit(m, a, b, c, d),
};

function lookup(vars: Record<string, unknown>, name: string): Val {
  if (name in vars) return norm(vars[name]);
  const parts = name.split('.');
  let cur: any = vars;
  for (const p of parts) {
    if (cur === null || cur === undefined || typeof cur !== 'object') return undefined;
    if (!Object.prototype.hasOwnProperty.call(cur, p)) return undefined;
    cur = cur[p];
  }
  return norm(cur);
}

function ev(n: Node, vars: Record<string, unknown>): Val {
  switch (n.k) {
    case 'lit': return n.v;
    case 'id': return lookup(vars, n.name);
    case 'un': {
      const a = ev(n.a, vars);
      if (n.op === '!') return !truthy(a);
      if (n.op === '-') return toDec(a).neg();
      return toDec(a);
    }
    case 'tern': return truthy(ev(n.c, vars)) ? ev(n.a, vars) : ev(n.b, vars);
    case 'call': return FUNCS[n.fn](n.args.map((x) => ev(x, vars)));
    case 'bin': {
      if (n.op === '&&') return truthy(ev(n.a, vars)) && truthy(ev(n.b, vars));
      if (n.op === '||') return truthy(ev(n.a, vars)) || truthy(ev(n.b, vars));
      const a = ev(n.a, vars), b = ev(n.b, vars);
      switch (n.op) {
        case '==': return eq(a, b);
        case '!=': return !eq(a, b);
        case '>': { const c = cmp(a, b); return c !== null && c > 0; }
        case '>=': { const c = cmp(a, b); return c !== null && c >= 0; }
        case '<': { const c = cmp(a, b); return c !== null && c < 0; }
        case '<=': { const c = cmp(a, b); return c !== null && c <= 0; }
        case '+':
          if (typeof a === 'string' && !isNumLike(a)) return a + String(b ?? '');
          return toDec(a).plus(toDec(b));
        case '-': return toDec(a).minus(toDec(b));
        case '*': return toDec(a).mul(toDec(b));
        case '/': { const d = toDec(b); if (d.isZero()) throw new ExprError('除数为 0'); return toDec(a).div(d); }
        case '%': return toDec(a).mod(toDec(b));
      }
    }
  }
  throw new ExprError('无法计算');
}

function collectIds(n: Node, out: Set<string>) {
  switch (n.k) {
    case 'id': out.add(n.name); break;
    case 'un': collectIds(n.a, out); break;
    case 'bin': collectIds(n.a, out); collectIds(n.b, out); break;
    case 'tern': collectIds(n.c, out); collectIds(n.a, out); collectIds(n.b, out); break;
    case 'call': n.args.forEach((a) => collectIds(a, out)); break;
  }
}

export interface CompiledExpr {
  source: string;
  identifiers: string[];
  eval(vars: Record<string, unknown>): Val;
  evalBool(vars: Record<string, unknown>): boolean;
  evalDec(vars: Record<string, unknown>): Decimal;
}

const cache = new Map<string, CompiledExpr>();
export function compileExpr(source: string): CompiledExpr {
  const hit = cache.get(source);
  if (hit) return hit;
  const ast = parse(source);
  const ids = new Set<string>();
  collectIds(ast, ids);
  const c: CompiledExpr = {
    source,
    identifiers: [...ids],
    eval: (vars) => ev(ast, vars),
    evalBool: (vars) => truthy(ev(ast, vars)),
    evalDec: (vars) => toDec(ev(ast, vars)),
  };
  if (cache.size > 2000) cache.clear();
  cache.set(source, c);
  return c;
}

/** 校验表达式语法，返回错误信息（null 表示合法） */
export function validateExpr(source: string): string | null {
  try {
    compileExpr(source);
    return null;
  } catch (e: any) {
    return e.message;
  }
}

export { Decimal };
