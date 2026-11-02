export type FormatToken =
  | { k: 'lit'; text: string }
  | { k: 'digit'; ch: '0' | '#' | '?' }
  | { k: 'point' }
  | { k: 'comma' }
  | { k: 'percent' }
  | { k: 'slash' }
  | { k: 'text' }
  | { k: 'general' }
  | { k: 'exp'; sign: '+' | '-' }
  | { k: 'date'; raw: string }
  | { k: 'elapsed'; unit: 'h' | 'm' | 's'; width: number }
  | { k: 'frac'; digits: number };

export interface Condition {
  op: '<' | '<=' | '>' | '>=' | '=' | '<>';
  value: number;
}

export interface FormatSection {
  condition: Condition | null;
  color: string | null;
  tokens: FormatToken[];
  kind: 'date' | 'number';
}

const COLORS = /^(black|blue|cyan|green|magenta|red|white|yellow|color\s*\d+)$/i;
const DATE_TOKEN = /^(yyyy|yy|y|mmmmm|mmmm|mmm|mm|m|dddd|ddd|dd|d|hh|h|ss|s|am\/pm|a\/p)/i;

/** Splits a code on `;` that is not inside quotes, brackets or after a backslash. */
export function splitSections(code: string): string[] {
  const out: string[] = [];
  let current = '';
  let quoted = false;
  let bracket = false;
  for (let i = 0; i < code.length; i += 1) {
    const ch = code[i];
    if (!quoted && !bracket && ch === '\\') {
      current += ch + (code[i + 1] ?? '');
      i += 1;
      continue;
    }
    if (ch === '"' && !bracket) quoted = !quoted;
    else if (!quoted && ch === '[') bracket = true;
    else if (!quoted && ch === ']') bracket = false;
    if (ch === ';' && !quoted && !bracket) {
      out.push(current);
      current = '';
    } else current += ch;
  }
  out.push(current);
  return out;
}

/** What is left of a section when quotes, brackets and escaped characters are taken out. */
function bare(section: string): string {
  return section.replace(/"[^"]*"/g, '').replace(/\[[^\]]*\]/g, (m) => (/^\[\$/.test(m) || COLORS.test(m.slice(1, -1)) || /^\[[<>=]/.test(m) ? '' : m)).replace(/\\./g, '').replace(/_./g, '').replace(/\*./g, '');
}

export function isDateSection(section: string): boolean {
  const text = bare(section);
  if (/\[(h+|m+|s+)\]/i.test(text)) return true;
  const letters = text.replace(/\[[^\]]*\]/g, '');
  if (/am\/pm|a\/p/i.test(letters)) return true;
  return /[ydhs]/i.test(letters.replace(/general/gi, '')) || (/m/i.test(letters) && !/[0#?]/.test(letters));
}

const OPERATOR = /^(<=|>=|<>|<|>|=)\s*(-?\d+(?:\.\d+)?)$/;

function bracket(text: string, section: { condition: Condition | null; color: string | null }): FormatToken[] {
  if (COLORS.test(text)) {
    section.color = text.toLowerCase();
    return [];
  }
  const condition = OPERATOR.exec(text);
  if (condition) {
    section.condition = { op: condition[1] as Condition['op'], value: Number(condition[2]) };
    return [];
  }
  const elapsed = /^(h+|m+|s+)$/i.exec(text);
  if (elapsed) return [{ k: 'elapsed', unit: elapsed[1][0].toLowerCase() as 'h' | 'm' | 's', width: elapsed[1].length }];
  const currency = /^\$([^-\]]*)(?:-.*)?$/.exec(text);
  return currency && currency[1] ? [{ k: 'lit', text: currency[1] }] : [];
}

function parseSection(source: string): FormatSection {
  const meta: { condition: Condition | null; color: string | null } = { condition: null, color: null };
  const date = isDateSection(source);
  const tokens: FormatToken[] = [];
  const lit = (text: string): void => {
    const last = tokens[tokens.length - 1];
    if (last?.k === 'lit') last.text += text;
    else tokens.push({ k: 'lit', text });
  };
  let i = 0;
  while (i < source.length) {
    const rest = source.slice(i);
    const ch = rest[0];
    if (ch === '"') {
      const end = source.indexOf('"', i + 1);
      lit(source.slice(i + 1, end < 0 ? source.length : end));
      i = end < 0 ? source.length : end + 1;
    } else if (ch === '\\') {
      lit(rest[1] ?? '');
      i += 2;
    } else if (ch === '_') {
      lit(' ');
      i += 2;
    } else if (ch === '*') {
      i += 2;
    } else if (ch === '[') {
      const end = source.indexOf(']', i);
      const stop = end < 0 ? source.length : end;
      for (const t of bracket(source.slice(i + 1, stop), meta)) tokens.push(t);
      i = stop + 1;
    } else if (/^general/i.test(rest)) {
      tokens.push({ k: 'general' });
      i += 7;
    } else if (date) {
      const token = DATE_TOKEN.exec(rest)?.[0];
      const fraction = /^\.(0+)/.exec(rest);
      if (token) {
        tokens.push({ k: 'date', raw: token });
        i += token.length;
      } else if (fraction && tokens.some((t) => t.k === 'date' && /^s/i.test(t.raw))) {
        tokens.push({ k: 'frac', digits: fraction[1].length });
        i += fraction[0].length;
      } else {
        lit(ch);
        i += 1;
      }
    } else if (ch === '0' || ch === '#' || ch === '?') {
      tokens.push({ k: 'digit', ch });
      i += 1;
    } else if (ch === '.') {
      tokens.push({ k: 'point' });
      i += 1;
    } else if (ch === ',') {
      tokens.push({ k: 'comma' });
      i += 1;
    } else if (ch === '%') {
      tokens.push({ k: 'percent' });
      i += 1;
    } else if (ch === '@') {
      tokens.push({ k: 'text' });
      i += 1;
    } else if (ch === '/' && tokens.some((t) => t.k === 'digit') && /^\/\s*[0#?\d]/.test(rest)) {
      tokens.push({ k: 'slash' });
      i += 1;
    } else if (/^e[+-]/i.test(rest) && tokens.some((t) => t.k === 'digit')) {
      tokens.push({ k: 'exp', sign: rest[1] as '+' | '-' });
      i += 2;
    } else {
      lit(ch);
      i += 1;
    }
  }
  return { ...meta, tokens, kind: date ? 'date' : 'number' };
}

const cache = new Map<string, FormatSection[]>();

/** A format code as its sections (positive; negative; zero; text), parsed once. */
export function parseFormatCode(code: string): FormatSection[] {
  let sections = cache.get(code);
  if (!sections) {
    sections = splitSections(code).map(parseSection);
    if (cache.size > 500) cache.clear();
    cache.set(code, sections);
  }
  return sections;
}
