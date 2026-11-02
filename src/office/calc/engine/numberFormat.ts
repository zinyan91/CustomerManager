import { renderDate } from './formatDate';
import { isDateSection, parseFormatCode, splitSections, type Condition, type FormatSection } from './formatCode';
import { renderNumber } from './formatNumber';
import { formatGeneral, isError, type Scalar } from './values';

/**
 * Number formats as Excel writes them: General, digit placeholders with
 * grouping, scaling and percent, scientific and fractions, dates and times
 * (including elapsed [h]:mm), conditions and colours in brackets, "@" for
 * text, and up to four sections (positive;negative;zero;text).
 */
export const FORMAT_PRESETS = {
  general: 'General',
  number: '0.00',
  thousands: '#,##0',
  currency: '#,##0.00 "₫"',
  currencyUsd: '"$"#,##0.00',
  percent: '0%',
  percent2: '0.00%',
  date: 'dd/mm/yyyy',
  dateLong: 'dd mmmm yyyy',
  time: 'hh:mm:ss',
  text: '@',
} as const;

/** True when the code has a section of its own for zero (three or more sections), which a sheet hiding zeros still shows. */
export function hasZeroSection(code: string | undefined): boolean {
  return code !== undefined && splitSections(code).length >= 3;
}

/** True when the code shows a date or a time. */
export function isDateFormat(code: string): boolean {
  return splitSections(code).some(isDateSection);
}

function satisfies(condition: Condition, value: number): boolean {
  switch (condition.op) {
    case '<':
      return value < condition.value;
    case '<=':
      return value <= condition.value;
    case '>':
      return value > condition.value;
    case '>=':
      return value >= condition.value;
    case '=':
      return value === condition.value;
    default:
      return value !== condition.value;
  }
}

/** The section that formats `value`, and whether it should print its own minus sign. */
function pick(sections: FormatSection[], value: number): { section: FormatSection; showSign: boolean } {
  const count = Math.min(sections.length, 3);
  const conditional = sections.slice(0, 2).some((s) => s.condition);
  for (let i = 0; i < count; i += 1) {
    const section = sections[i];
    const last = i === count - 1;
    const matches = section.condition
      ? satisfies(section.condition, value)
      : last || (i === 0 ? (conditional || count > 2 ? value > 0 : value >= 0) : value < 0);
    if (!matches) continue;
    // The second section writes its own minus only when the code has no conditions: with them a negative keeps its sign.
    return { section, showSign: !(i === 1 && !conditional) };
  }
  return { section: sections[count - 1], showSign: true };
}

function textSection(sections: FormatSection[]): FormatSection | null {
  return sections[3] ?? (sections.length === 1 && sections[0].tokens.some((t) => t.k === 'text') ? sections[0] : null);
}

/** The text a cell shows for `value` under `code`. */
export function formatValue(value: Scalar, code: string | undefined): string {
  if (isError(value)) return value.code;
  if (value === null) return '';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (!code || code === 'General') return typeof value === 'number' ? formatGeneral(value) : value;
  const sections = parseFormatCode(code);
  if (typeof value === 'string') {
    const section = textSection(sections);
    return section ? section.tokens.map((t) => (t.k === 'lit' ? t.text : t.k === 'text' ? value : '')).join('') : value;
  }
  const { section, showSign } = pick(sections, value);
  if (section.kind === 'date') return value < 0 ? '#NUM!' : renderDate(value, section);
  return renderNumber(value, section, showSign);
}

/** A format code for a number of decimals, keeping the thousands grouping and percent. */
export function withDecimals(code: string | undefined, delta: 1 | -1): string {
  const current = code && code !== 'General' ? code : '0';
  const m = /^([^0#]*)([0#,]*)(?:\.([0#]*))?(.*)$/.exec(current);
  if (!m) return current;
  const [, prefix, whole, fraction = '', suffix] = m;
  const digits = Math.max(0, Math.min(10, fraction.length + delta));
  if (code === undefined || code === 'General') {
    return digits > 0 ? `0.${'0'.repeat(digits)}` : '0';
  }
  return `${prefix}${whole || '0'}${digits > 0 ? `.${'0'.repeat(digits)}` : ''}${suffix}`;
}
