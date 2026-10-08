import { compareValues, isError, parseNumber, type Scalar } from './values';

/** "a*b?" → a regular expression matching the whole text, case-insensitively; "~*" is a literal star. */
function wildcard(pattern: string): RegExp {
  let body = '';
  for (let i = 0; i < pattern.length; i += 1) {
    const ch = pattern[i];
    const next = pattern[i + 1];
    if (ch === '~' && (next === '*' || next === '?' || next === '~')) {
      body += next === '~' ? '~' : `\\${next}`;
      i += 1;
    } else if (ch === '*') body += '.*';
    else if (ch === '?') body += '.';
    else body += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${body}$`, 'i');
}

/**
 * COUNTIF-style criteria: a number or text for equality, or an operator and
 * an operand (">=5", "<>done", "=a*"). Text compares case-insensitively and
 * understands * and ? ; a numeric operand matches numbers, and the same text.
 */
export function matchesCriteria(cell: Scalar, criteria: Scalar): boolean {
  if (isError(cell)) return false;
  let op = '=';
  let operand: Scalar = criteria;
  let typed = '';
  if (typeof criteria === 'string') {
    const m = /^(<=|>=|<>|=|<|>)?(.*)$/s.exec(criteria);
    op = m?.[1] ?? '=';
    const rest = m?.[2] ?? '';
    typed = rest;
    const n = parseNumber(rest);
    operand = n !== null ? n : rest.toUpperCase() === 'TRUE' ? true : rest.toUpperCase() === 'FALSE' ? false : rest;
  }

  if (typeof operand === 'string') {
    if (op === '=' || op === '<>') {
      if (operand === '' ) {
        const empty = cell === null || cell === '';
        return op === '=' ? empty : !empty;
      }
      const text = typeof cell === 'string' ? cell : cell === null ? '' : String(cell);
      const hit = wildcard(operand).test(text);
      return op === '=' ? hit : !hit;
    }
    if (typeof cell !== 'string') return false;
    const order = compareValues(cell, operand);
    return op === '<' ? order < 0 : op === '>' ? order > 0 : op === '<=' ? order <= 0 : order >= 0;
  }

  // "007" typed as a criterion is a number, but it also matches the text "007", as in Excel.
  if (typeof operand === 'number' && typeof cell === 'string' && (op === '=' || op === '<>') && typed !== '') {
    const same = cell.toLowerCase() === typed.toLowerCase();
    return op === '=' ? same : !same;
  }
  if (operand === null || cell === null) return op === '<>' ? cell !== operand : false;
  const sameKind = typeof cell === typeof operand;
  if (!sameKind) return op === '<>';
  const order = compareValues(cell, operand);
  switch (op) {
    case '=':
      return order === 0;
    case '<>':
      return order !== 0;
    case '<':
      return order < 0;
    case '>':
      return order > 0;
    case '<=':
      return order <= 0;
    default:
      return order >= 0;
  }
}
