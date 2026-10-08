import { MAX_COLS, MAX_ROWS, columnIndex, columnName } from './cellRef';
import { errorFromCode, type CellError } from './values';

/**
 * Excel formula syntax → a tree, and back to text. The text form is what
 * copying and filling use to move references (printFormula after shifting).
 */
export interface RefNode {
  t: 'ref';
  sheet: string | null;
  row: number;
  col: number;
  absRow: boolean;
  absCol: boolean;
}

export interface RangeNode {
  t: 'range';
  sheet: string | null;
  from: RefNode;
  to: RefNode;
}

export type Node =
  | { t: 'num'; v: number }
  | { t: 'str'; v: string }
  | { t: 'bool'; v: boolean }
  | { t: 'err'; v: CellError }
  | { t: 'name'; v: string }
  | RefNode
  | RangeNode
  | { t: 'call'; name: string; args: Node[] }
  | { t: 'bin'; op: string; l: Node; r: Node }
  | { t: 'un'; op: '-' | '+'; e: Node }
  | { t: 'pct'; e: Node };

export class ParseError extends Error {}

const CELL_PART = /^(\$?)([A-Za-z]{1,3})(\$?)(\d{1,7})$/;

function refFrom(text: string, sheet: string | null): RefNode | null {
  const m = CELL_PART.exec(text);
  if (!m) return null;
  const col = columnIndex(m[2]);
  const row = Number(m[4]) - 1;
  if (col >= MAX_COLS || row >= MAX_ROWS || row < 0) return null;
  return { t: 'ref', sheet, row, col, absRow: m[3] === '$', absCol: m[1] === '$' };
}

class Parser {
  private pos = 0;
  private readonly src: string;

  constructor(src: string) {
    this.src = src;
  }

  parse(): Node {
    const node = this.comparison();
    this.space();
    if (this.pos < this.src.length) throw new ParseError(`Unexpected "${this.src[this.pos]}"`);
    return node;
  }

  private space(): void {
    while (this.pos < this.src.length && /\s/.test(this.src[this.pos])) this.pos += 1;
  }

  private peek(...options: string[]): string | null {
    this.space();
    for (const option of options) if (this.src.startsWith(option, this.pos)) return option;
    return null;
  }

  private comparison(): Node {
    let left = this.concat();
    for (;;) {
      const op = this.peek('<=', '>=', '<>', '=', '<', '>');
      if (!op) return left;
      this.pos += op.length;
      left = { t: 'bin', op, l: left, r: this.concat() };
    }
  }

  private concat(): Node {
    let left = this.additive();
    while (this.peek('&')) {
      this.pos += 1;
      left = { t: 'bin', op: '&', l: left, r: this.additive() };
    }
    return left;
  }

  private additive(): Node {
    let left = this.multiplicative();
    for (;;) {
      const op = this.peek('+', '-');
      if (!op) return left;
      this.pos += 1;
      left = { t: 'bin', op, l: left, r: this.multiplicative() };
    }
  }

  private multiplicative(): Node {
    let left = this.power();
    for (;;) {
      const op = this.peek('*', '/');
      if (!op) return left;
      this.pos += 1;
      left = { t: 'bin', op, l: left, r: this.power() };
    }
  }

  // In Excel a prefix minus binds tighter than ^, so -2^2 is 4.
  private power(): Node {
    let left = this.unary();
    while (this.peek('^')) {
      this.pos += 1;
      left = { t: 'bin', op: '^', l: left, r: this.unary() };
    }
    return left;
  }

  private unary(): Node {
    const op = this.peek('-', '+');
    if (op) {
      this.pos += 1;
      return { t: 'un', op: op as '-' | '+', e: this.unary() };
    }
    let node = this.primary();
    while (this.peek('%')) {
      this.pos += 1;
      node = { t: 'pct', e: node };
    }
    return node;
  }

  private primary(): Node {
    this.space();
    const ch = this.src[this.pos];
    if (ch === undefined) throw new ParseError('Unexpected end');
    if (ch === '(') {
      this.pos += 1;
      const inner = this.comparison();
      if (!this.peek(')')) throw new ParseError('Missing )');
      this.pos += 1;
      return inner;
    }
    if (ch === '"') return this.string();
    if (/[0-9.]/.test(ch)) return this.number();
    if (ch === '#') return this.errorLiteral();
    if (ch === "'") return this.quotedSheet();
    if (/[A-Za-z_$]/.test(ch)) return this.name(null);
    throw new ParseError(`Unexpected "${ch}"`);
  }

  private number(): Node {
    const m = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(this.src.slice(this.pos));
    if (!m) throw new ParseError('Bad number');
    this.pos += m[0].length;
    return { t: 'num', v: Number(m[0]) };
  }

  private string(): Node {
    let out = '';
    this.pos += 1;
    for (;;) {
      const ch = this.src[this.pos];
      if (ch === undefined) throw new ParseError('Unterminated string');
      this.pos += 1;
      if (ch === '"') {
        if (this.src[this.pos] === '"') {
          out += '"';
          this.pos += 1;
          continue;
        }
        return { t: 'str', v: out };
      }
      out += ch;
    }
  }

  private errorLiteral(): Node {
    const m = /^#(?:DIV\/0!|REF!|NAME\?|VALUE!|N\/A|NUM!|CIRC!|ERROR!)/i.exec(this.src.slice(this.pos));
    if (!m) throw new ParseError('Bad error');
    this.pos += m[0].length;
    return { t: 'err', v: errorFromCode(m[0])! };
  }

  private quotedSheet(): Node {
    let sheet = '';
    this.pos += 1;
    for (;;) {
      const ch = this.src[this.pos];
      if (ch === undefined) throw new ParseError('Unterminated sheet name');
      this.pos += 1;
      if (ch === "'") {
        if (this.src[this.pos] === "'") {
          sheet += "'";
          this.pos += 1;
          continue;
        }
        break;
      }
      sheet += ch;
    }
    if (this.src[this.pos] !== '!') throw new ParseError('Missing !');
    this.pos += 1;
    return this.cellOrRange(sheet);
  }

  private name(sheet: string | null): Node {
    const m = /^[A-Za-z_$][A-Za-z0-9_.$]*/.exec(this.src.slice(this.pos));
    if (!m) throw new ParseError('Bad name');
    const word = m[0];
    const after = this.src[this.pos + word.length];
    if (after === '(') {
      this.pos += word.length + 1;
      return { t: 'call', name: word.toUpperCase(), args: this.args() };
    }
    if (after === '!' && sheet === null) {
      this.pos += word.length + 1;
      return this.cellOrRange(word);
    }
    const upper = word.toUpperCase();
    if (upper === 'TRUE' || upper === 'FALSE') {
      this.pos += word.length;
      return { t: 'bool', v: upper === 'TRUE' };
    }
    if (CELL_PART.test(word)) return this.cellOrRange(sheet);
    this.pos += word.length;
    return { t: 'name', v: word };
  }

  private cellOrRange(sheet: string | null): Node {
    const m = /^\$?[A-Za-z]{1,3}\$?\d{1,7}/.exec(this.src.slice(this.pos));
    const from = m ? refFrom(m[0], sheet) : null;
    if (!m || !from) throw new ParseError('Bad reference');
    this.pos += m[0].length;
    if (this.src[this.pos] === ':') {
      const m2 = /^\$?[A-Za-z]{1,3}\$?\d{1,7}/.exec(this.src.slice(this.pos + 1));
      const to = m2 ? refFrom(m2[0], sheet) : null;
      if (!m2 || !to) throw new ParseError('Bad range');
      this.pos += 1 + m2[0].length;
      return { t: 'range', sheet, from, to };
    }
    return from;
  }

  private args(): Node[] {
    const out: Node[] = [];
    if (this.peek(')')) {
      this.pos += 1;
      return out;
    }
    for (;;) {
      // An empty argument (=IF(A1,,2)) is an empty cell.
      if (this.peek(',', ';', ')')) out.push({ t: 'name', v: '' });
      else out.push(this.comparison());
      const sep = this.peek(',', ';', ')');
      if (!sep) throw new ParseError('Missing )');
      this.pos += 1;
      if (sep === ')') return out;
    }
  }
}

export function parseFormula(source: string): Node {
  return new Parser(source.startsWith('=') ? source.slice(1) : source).parse();
}

const SHEET_PLAIN = /^[A-Za-z_][A-Za-z0-9_.]*$/;

function sheetPrefix(sheet: string | null): string {
  if (sheet === null) return '';
  return SHEET_PLAIN.test(sheet) ? `${sheet}!` : `'${sheet.replace(/'/g, "''")}'!`;
}

function printRef(ref: RefNode): string {
  return `${ref.absCol ? '$' : ''}${columnName(ref.col)}${ref.absRow ? '$' : ''}${ref.row + 1}`;
}

/** Operator precedence for adding parentheses only where they change the meaning. */
const PRECEDENCE: Record<string, number> = { '=': 1, '<>': 1, '<': 1, '>': 1, '<=': 1, '>=': 1, '&': 2, '+': 3, '-': 3, '*': 4, '/': 4, '^': 5 };

export function printNode(node: Node, parent = 0): string {
  switch (node.t) {
    case 'num':
      return String(node.v);
    case 'str':
      return `"${node.v.replace(/"/g, '""')}"`;
    case 'bool':
      return node.v ? 'TRUE' : 'FALSE';
    case 'err':
      return node.v.code;
    case 'name':
      return node.v;
    case 'ref':
      return sheetPrefix(node.sheet) + printRef(node);
    case 'range':
      return `${sheetPrefix(node.sheet)}${printRef(node.from)}:${printRef(node.to)}`;
    case 'call':
      return `${node.name}(${node.args.map((a) => (a.t === 'name' && a.v === '' ? '' : printNode(a))).join(',')})`;
    case 'un':
      return `${node.op}${printNode(node.e, 6)}`;
    case 'pct':
      return `${printNode(node.e, 7)}%`;
    case 'bin': {
      const own = PRECEDENCE[node.op];
      const text = `${printNode(node.l, own)}${node.op}${printNode(node.r, own + 1)}`;
      return own < parent ? `(${text})` : text;
    }
  }
}

export function printFormula(node: Node): string {
  return `=${printNode(node)}`;
}

/** The same tree with every reference (single or range end) run through `fn`. */
export function mapRefs(node: Node, fn: (ref: RefNode) => RefNode | null): Node {
  const REF_ERROR: Node = { t: 'err', v: errorFromCode('#REF!')! };
  switch (node.t) {
    case 'ref':
      return fn(node) ?? REF_ERROR;
    case 'range': {
      const from = fn(node.from);
      const to = fn(node.to);
      return from && to ? { ...node, from, to } : REF_ERROR;
    }
    case 'call':
      return { ...node, args: node.args.map((a) => mapRefs(a, fn)) };
    case 'bin':
      return { ...node, l: mapRefs(node.l, fn), r: mapRefs(node.r, fn) };
    case 'un':
    case 'pct':
      return { ...node, e: mapRefs(node.e, fn) };
    default:
      return node;
  }
}

/** A formula text as if it had been copied `dRow` rows and `dCol` columns: relative parts move. */
export function shiftFormula(formula: string, dRow: number, dCol: number): string {
  try {
    const tree = mapRefs(parseFormula(formula), (ref) => {
      const row = ref.absRow ? ref.row : ref.row + dRow;
      const col = ref.absCol ? ref.col : ref.col + dCol;
      return row < 0 || col < 0 || row >= MAX_ROWS || col >= MAX_COLS ? null : { ...ref, row, col };
    });
    return printFormula(tree);
  } catch {
    return formula;
  }
}
