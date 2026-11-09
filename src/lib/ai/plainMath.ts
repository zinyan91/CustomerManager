const SYMBOLS: Record<string, string> = {
  times: '×', div: '÷', cdot: '·', pm: '±', approx: '≈', neq: '≠', ne: '≠', leq: '≤', le: '≤', geq: '≥', ge: '≥',
  ldots: '…', dots: '…', cdots: '…', rightarrow: '→', to: '→', Rightarrow: '⇒', leftarrow: '←', infty: '∞',
  sum: 'Σ', Delta: 'Δ', delta: 'δ', alpha: 'α', beta: 'β', sigma: 'σ', mu: 'μ', percent: '%',
};

/** Bỏ một cặp ngoặc nhọn bao ngoài cùng của đối số LaTeX, đã xử lý lồng nhau. */
function readGroup(text: string, start: number): { value: string; end: number } | null {
  if (text[start] !== '{') return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) return { value: text.slice(start + 1, i), end: i + 1 };
  }
  return null;
}

/** Bản chữ thường của một công thức LaTeX: dùng khi KaTeX chưa tải xong hoặc công thức viết sai. */
export function latexExpressionToPlain(expr: string): string {
  let out = '';
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (ch === '\\') {
      const next = expr[i + 1] ?? '';
      if (/[%$&#_{}]/.test(next)) {
        out += next;
        i += 2;
        continue;
      }
      if (next === ',' || next === ';' || next === ':' || next === '!' || next === ' ') {
        out += next === '!' ? '' : ' ';
        i += 2;
        continue;
      }
      if (next === '\\') {
        out += ' ';
        i += 2;
        continue;
      }
      const name = /^[a-zA-Z]+/.exec(expr.slice(i + 1))?.[0] ?? '';
      i += 1 + name.length;
      if (name === 'frac' || name === 'dfrac' || name === 'tfrac') {
        const num = readGroup(expr, i);
        const den = num ? readGroup(expr, num.end) : null;
        if (num && den) {
          const a = latexExpressionToPlain(num.value).trim();
          const b = latexExpressionToPlain(den.value).trim();
          const wrap = (s: string) => (/[\s+\-×÷]/.test(s) ? `(${s})` : s);
          out += `${wrap(a)} / ${wrap(b)}`;
          i = den.end;
          continue;
        }
      }
      if (['text', 'textbf', 'textit', 'mathrm', 'mathbf', 'operatorname', 'mbox'].includes(name)) {
        const group = readGroup(expr, i);
        if (group) {
          out += latexExpressionToPlain(group.value);
          i = group.end;
          continue;
        }
      }
      if (name === 'left' || name === 'right') continue;
      if (name === 'quad' || name === 'qquad') {
        out += ' ';
        continue;
      }
      out += SYMBOLS[name] ?? '';
      continue;
    }
    if (ch === '{' || ch === '}') {
      i++;
      continue;
    }
    out += ch;
    i++;
  }
  return out.replace(/[ \t]{2,}/g, ' ');
}

export type MathSegment = { kind: 'text'; value: string } | { kind: 'math'; tex: string; display: boolean };

const MATH_SPANS = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$([^$\n]+?)\$/g;

/**
 * Tách một dòng thành chữ và công thức. `$...$` chỉ coi là công thức khi bên trong có lệnh `\`, để
 * không đụng tới "$5" hay "$10" viết bình thường.
 */
export function splitMathSegments(text: string): MathSegment[] {
  const out: MathSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(MATH_SPANS)) {
    const [whole, block, bracket, paren, inline] = m;
    if (inline !== undefined && !inline.includes('\\')) continue;
    const start = m.index ?? 0;
    if (start > last) out.push({ kind: 'text', value: text.slice(last, start) });
    out.push({ kind: 'math', tex: (block ?? bracket ?? paren ?? inline).trim(), display: block !== undefined || bracket !== undefined });
    last = start + whole.length;
  }
  if (last < text.length) out.push({ kind: 'text', value: text.slice(last) });
  return out;
}

/** Bộ hiển thị đọc từng dòng, nên công thức $$...$$ hay \[...\] viết trên nhiều dòng được gộp về một dòng. Khối code giữ nguyên. */
export function joinMultilineMath(markdown: string): string {
  return markdown
    .split(/(```[\s\S]*?(?:```|$))/)
    .map((part, idx) => (idx % 2 === 1 ? part : part.replace(/\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]/g, (m) => m.replace(/\s*\n\s*/g, ' '))))
    .join('');
}
