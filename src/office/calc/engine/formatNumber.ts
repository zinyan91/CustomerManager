import type { FormatSection, FormatToken } from './formatCode';
import { digitsOf, formatGeneral, type Digits } from './values';

interface Fixed {
  int: string;
  frac: string;
}

/** Adds one to a string of digits. */
function increment(digits: string): string {
  const out = digits.split('');
  for (let i = out.length - 1; i >= 0; i -= 1) {
    if (out[i] === '9') out[i] = '0';
    else {
      out[i] = String(Number(out[i]) + 1);
      return out.join('');
    }
  }
  return `1${out.join('')}`;
}

/** The number as `decimals` places, rounded half up on its 15 significant digits (so 1.005 is 1.01, as in Excel). */
function fixed({ digits, exp }: Digits, decimals: number): Fixed {
  const keep = exp + 1 + decimals;
  if (keep < 0) return { int: '0', frac: '0'.repeat(decimals) };
  let n = digits.slice(0, keep).padEnd(keep, '0');
  if (keep < digits.length && digits[keep] >= '5') n = increment(n);
  n = n.replace(/^0+/, '').padStart(decimals + 1, '0');
  return { int: n.slice(0, n.length - decimals), frac: n.slice(n.length - decimals) };
}

const isDigit = (t: FormatToken): t is Extract<FormatToken, { k: 'digit' }> => t.k === 'digit';

function groupDigits(text: string): string {
  return text.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** The tokens before the decimal point with their digits filled in from the right. */
function wholePart(tokens: FormatToken[], integer: string, grouped: boolean): string {
  const slots = tokens.filter(isDigit);
  const digits = integer === '0' ? '' : integer;
  const filler = (slot: Extract<FormatToken, { k: 'digit' }>): string => (slot.ch === '0' ? '0' : slot.ch === '?' ? ' ' : '');
  const assigned = slots.map((_s, index) => digits[digits.length - slots.length + index] ?? '');
  const extra = digits.length > slots.length ? digits.slice(0, digits.length - slots.length) : '';
  const fill = slots.map((slot, index) => (digits.length - (slots.length - index) >= 0 ? assigned[index] : filler(slot)));

  if (grouped) {
    const core = groupDigits(extra + fill.filter((c) => c !== ' ').join(''));
    const pad = fill.filter((c) => c === ' ').join('');
    let first = true;
    return tokens
      .map((t) => {
        if (t.k === 'lit') return t.text;
        if (!isDigit(t)) return '';
        if (!first) return '';
        first = false;
        return pad + core;
      })
      .join('');
  }
  if (slots.length === 0) return extra + tokens.map((t) => (t.k === 'lit' ? t.text : '')).join('');
  let slot = 0;
  return tokens
    .map((t) => {
      if (t.k === 'lit') return t.text;
      if (!isDigit(t)) return '';
      const piece = (slot === 0 ? extra : '') + fill[slot];
      slot += 1;
      return piece;
    })
    .join('');
}

/** The tokens after the decimal point: zeros after the last significant digit show only where the code says 0. */
function fractionPart(tokens: FormatToken[], frac: string): string {
  const lastSignificant = frac.search(/[1-9]0*$/);
  let slot = 0;
  return tokens
    .map((t) => {
      if (t.k === 'lit') return t.text;
      if (!isDigit(t)) return '';
      const index = slot;
      slot += 1;
      if (t.ch === '0' || index <= lastSignificant) return frac[index] ?? '0';
      return t.ch === '?' ? ' ' : '';
    })
    .join('');
}

function literals(tokens: FormatToken[], general: string): string {
  return tokens.map((t) => (t.k === 'lit' ? t.text : t.k === 'percent' ? '%' : t.k === 'text' || t.k === 'general' ? general : '')).join('');
}

function plain(abs: number, negative: boolean, section: FormatSection): string {
  const { tokens } = section;
  const digitSlots = tokens.filter(isDigit);
  if (digitSlots.length === 0) return literals(tokens, '');
  const pointAt = tokens.findIndex((t) => t.k === 'point');
  const firstDigit = tokens.findIndex(isDigit);
  const lastDigit = tokens.map((t) => t.k).lastIndexOf('digit');
  const start = pointAt >= 0 ? Math.min(firstDigit, pointAt) : firstDigit;
  const end = pointAt >= 0 ? Math.max(lastDigit, pointAt) : lastDigit;
  const wholeEnd = pointAt >= 0 ? pointAt : tokens.length;

  // A comma between digits groups thousands; one after the last digit of the whole part (or the code) divides by a thousand.
  let scale = 0;
  let grouped = false;
  tokens.forEach((t, index) => {
    if (t.k !== 'comma') return;
    if (index > lastDigit || (index < wholeEnd && !tokens.slice(index + 1, wholeEnd).some(isDigit))) scale += 1;
    else if (index < wholeEnd) grouped = true;
  });

  const percent = tokens.filter((t) => t.k === 'percent').length;
  const decimals = (pointAt < 0 ? [] : tokens.slice(pointAt + 1)).filter(isDigit).length;
  const source = digitsOf(abs);
  const { int, frac } = abs === 0 ? { int: '0', frac: '0'.repeat(decimals) } : fixed({ digits: source.digits, exp: source.exp + 2 * percent - 3 * scale }, decimals);
  const sign = negative && !(/^0*$/.test(int) && /^0*$/.test(frac)) ? '-' : '';

  const inner = tokens.slice(start, end + 1);
  const innerPoint = inner.findIndex((t) => t.k === 'point');
  const shown = (list: FormatToken[]): FormatToken[] => list.filter((t) => t.k === 'lit' || t.k === 'digit');
  const text = [
    literals(tokens.slice(0, start), ''),
    wholePart(shown(innerPoint < 0 ? inner : inner.slice(0, innerPoint)), int, grouped),
    innerPoint < 0 ? '' : `.${fractionPart(shown(inner.slice(innerPoint + 1)), frac)}`,
    literals(tokens.slice(end + 1), ''),
  ];
  return sign + text.join('');
}

function scientific(abs: number, negative: boolean, section: FormatSection): string {
  const { tokens } = section;
  const expAt = tokens.findIndex((t) => t.k === 'exp');
  const exp = tokens[expAt] as Extract<FormatToken, { k: 'exp' }>;
  const mantissa = tokens.slice(0, expAt);
  const pointAt = mantissa.findIndex((t) => t.k === 'point');
  const wholeSlots = (pointAt < 0 ? mantissa : mantissa.slice(0, pointAt)).filter(isDigit).length || 1;
  const decimals = (pointAt < 0 ? [] : mantissa.slice(pointAt + 1)).filter(isDigit).length;
  const expSlots = tokens.slice(expAt + 1).filter(isDigit).length;

  const source = abs === 0 ? { digits: '0', exp: 0 } : digitsOf(abs);
  let power = abs === 0 ? 0 : Math.floor(source.exp / wholeSlots) * wholeSlots;
  let { int, frac } = fixed({ digits: source.digits, exp: source.exp - power }, decimals);
  if (int.length > wholeSlots && abs !== 0) {
    power += wholeSlots;
    ({ int, frac } = fixed({ digits: source.digits, exp: source.exp - power }, decimals));
  }
  const body = wholePart(mantissa.slice(0, pointAt < 0 ? mantissa.length : pointAt).filter((t) => t.k === 'lit' || t.k === 'digit'), int, false) + (pointAt < 0 ? '' : `.${fractionPart(mantissa.slice(pointAt + 1).filter((t) => t.k === 'lit' || t.k === 'digit'), frac)}`);
  const signText = power < 0 ? '-' : exp.sign === '+' ? '+' : '';
  const after = tokens.slice(expAt + 1).filter((t) => !isDigit(t));
  return `${negative && abs !== 0 ? '-' : ''}${body}E${signText}${String(Math.abs(power)).padStart(expSlots, '0')}${literals(after, '')}`;
}

/** How much closer a semiconvergent has to be than the last convergent before it replaces it (measured against Excel). */
const SEMICONVERGENT_GAIN = 0.12;

/**
 * The numerator and denominator Excel picks, found with the continued fraction of
 * the value: the last convergent whose denominator fits, or the largest
 * intermediate fraction past it when that is far closer.
 */
function nearestFraction(value: number, limit: number, fixedDenominator: number | null): [number, number] {
  if (fixedDenominator) return [Math.round(value * fixedDenominator), fixedDenominator];
  let [previousN, previousD, n, d] = [1, 0, Math.floor(value), 1];
  let rest = value - Math.floor(value);
  while (rest > 1e-12) {
    const inverse = 1 / rest;
    const term = Math.floor(inverse + 1e-12);
    rest = inverse - term;
    const nextN = term * n + previousN;
    const nextD = term * d + previousD;
    if (nextD > limit) {
      const k = Math.min(term - 1, Math.floor((limit - previousD) / d));
      if (k >= 1) {
        const [semiN, semiD] = [k * n + previousN, k * d + previousD];
        if (Math.abs(value - semiN / semiD) < Math.abs(value - n / d) * SEMICONVERGENT_GAIN) return [semiN, semiD];
      }
      break;
    }
    [previousN, previousD, n, d] = [n, d, nextN, nextD];
  }
  return [n, d];
}

function fraction(abs: number, negative: boolean, section: FormatSection): string {
  const { tokens } = section;
  const slashAt = tokens.findIndex((t) => t.k === 'slash');
  const before = tokens.slice(0, slashAt);
  const after = tokens.slice(slashAt + 1);
  // The numerator is the digit run just before the slash; any digits ahead of that are the whole part.
  let numeratorStart = before.length;
  while (numeratorStart > 0 && isDigit(before[numeratorStart - 1])) numeratorStart -= 1;
  const numeratorSlots = before.slice(numeratorStart).filter(isDigit);
  const wholeTokens = before.slice(0, numeratorStart);
  const hasWhole = wholeTokens.some(isDigit);
  const denominatorSlots = after.filter(isDigit);
  const fixedText = after.find((t) => t.k === 'lit' && /^\d+/.test(t.text));
  const fixedDenominator = fixedText && fixedText.k === 'lit' ? Number(/^\d+/.exec(fixedText.text)![0]) : null;
  const limit = denominatorSlots.length ? 10 ** denominatorSlots.length - 1 : 9;

  let whole = hasWhole ? Math.floor(abs) : 0;
  let [n, d] = nearestFraction(hasWhole ? abs - whole : abs, limit, fixedDenominator);
  if (hasWhole && n === d) {
    whole += 1;
    n = 0;
  }
  const pad = (text: string, slots: Extract<FormatToken, { k: 'digit' }>[], left: boolean): string => {
    const width = slots.length;
    const filler = slots[0]?.ch === '0' ? '0' : ' ';
    return left ? text.padStart(width, filler) : text.padEnd(width, ' ');
  };
  const wholeText = hasWhole ? wholePart(wholeTokens, String(whole), false) : '';
  const shownWhole = hasWhole && whole === 0 && n === 0 ? wholeText.replace(/[^ ]*/, '0') : wholeText;
  const isZero = n === 0 && whole === 0;
  const sign = negative && !isZero ? '-' : '';
  const fractionText = n === 0 && hasWhole ? ' '.repeat(numeratorSlots.length + 1 + (fixedDenominator ? String(fixedDenominator).length : denominatorSlots.length)) : `${pad(String(n), numeratorSlots, true)}/${fixedDenominator ? String(d) : pad(String(d), denominatorSlots, false)}`;
  const trailing = after.filter((t) => t.k === 'lit' && !/^\d+$/.test(t.text)).map((t) => (t.k === 'lit' ? t.text.replace(/^\d+/, '') : '')).join('');
  return sign + shownWhole + fractionText + trailing;
}

/** A number under one section of a format code. `showSign` is false when the section is the negative one, which writes its own minus. */
export function renderNumber(value: number, section: FormatSection, showSign: boolean): string {
  const { tokens } = section;
  const abs = Math.abs(value);
  const negative = value < 0 && showSign;
  if (tokens.some((t) => t.k === 'general')) return (negative ? '-' : '') + literals(tokens, formatGeneral(abs));
  if (!tokens.some(isDigit) && tokens.some((t) => t.k === 'text')) return literals(tokens, formatGeneral(value));
  if (tokens.some((t) => t.k === 'exp') && tokens.some(isDigit)) return scientific(abs, negative, section);
  if (tokens.some((t) => t.k === 'slash')) return fraction(abs, negative, section);
  return plain(abs, negative, section);
}
