import { ERRORS, fail, isError, isRange, toNumber, type CellError, type Scalar } from './values';
import { block, num1, round, scalar, text1, type Fn } from './functions';

const group = (digits: string): string => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** `n` as Excel's FIXED and DOLLAR write it: `decimals` places (rounded, or tens and hundreds when negative), thousands grouped. */
function fixed(n: number, decimals: number, commas: boolean): string {
  const rounded = round(n, decimals, 'half');
  const [whole, fraction = ''] = Math.abs(rounded).toFixed(Math.max(0, decimals)).split('.');
  const text = commas ? group(whole) : whole;
  return `${rounded < 0 && Number(whole + fraction) !== 0 ? '-' : ''}${text}${fraction ? `.${fraction}` : ''}`;
}

const ERROR_NUMBERS: Record<string, number> = { '#NULL!': 1, '#DIV/0!': 2, '#VALUE!': 3, '#REF!': 4, '#NAME?': 5, '#NUM!': 6, '#N/A': 7, '#SPILL!': 9, '#CALC!': 14 };

export const TEXT_INFO_FUNCTIONS: Record<string, Fn> = {
  UNICODE: (a) => text1(a).codePointAt(0) ?? fail(ERRORS.value),
  UNICHAR: (a) => {
    const code = Math.trunc(num1(a));
    return code < 1 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff) ? fail(ERRORS.value) : String.fromCodePoint(code);
  },
  N: (a) => {
    const v = scalar(a[0]);
    if (isError(v)) return fail(v);
    return typeof v === 'number' ? v : typeof v === 'boolean' ? (v ? 1 : 0) : 0;
  },
  NUMBERVALUE: (a) => {
    const decimal = a[1] === undefined ? '.' : text1(a, 1);
    const grouping = a[2] === undefined ? ',' : text1(a, 2);
    let text = text1(a).replace(/\s/g, '');
    if (text === '') return 0;
    let percent = 0;
    while (text.endsWith('%')) {
      text = text.slice(0, -1);
      percent += 1;
    }
    if (grouping) text = text.split(grouping).join('');
    if (decimal !== '.') text = text.split(decimal).join('.');
    if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(text)) return fail(ERRORS.value);
    return Number(text) / 100 ** percent;
  },
  FIXED: (a) => fixed(num1(a), a[1] === undefined ? 2 : Math.trunc(num1(a, 1)), a[2] === undefined || toNumber(scalar(a[2])) === 0),
  DOLLAR: (a) => {
    const text = fixed(Math.abs(num1(a)), a[1] === undefined ? 2 : Math.trunc(num1(a, 1)), true);
    return num1(a) < 0 && Number(text.replace(/,/g, '')) !== 0 ? `($${text})` : `$${text}`;
  },
  TEXTSPLIT: (a) => {
    const text = text1(a);
    const columns = text1(a, 1);
    const rows = a[2] === undefined ? '' : text1(a, 2);
    const lines = rows ? text.split(rows) : [text];
    const cells = lines.map((line) => (columns ? line.split(columns) : [line]));
    const width = Math.max(...cells.map((line) => line.length));
    return block(cells.map((line): Scalar[] => Array.from({ length: width }, (_v, i) => line[i] ?? ERRORS.na)));
  },
  // Information
  ISERR: (a) => {
    const v = scalar(a[0]);
    return isError(v) && v !== ERRORS.na;
  },
  ISNONTEXT: (a) => typeof scalar(a[0]) !== 'string',
  TYPE: (a) => {
    if (isRange(a[0]) && (a[0].rows > 1 || a[0].cols > 1)) return 64;
    const v = scalar(a[0]);
    return isError(v) ? 16 : typeof v === 'number' || v === null ? 1 : typeof v === 'string' ? 2 : 4;
  },
  'ERROR.TYPE': (a) => {
    const v: Scalar | CellError = scalar(a[0]);
    return isError(v) ? (ERROR_NUMBERS[v.code] ?? 7) : fail(ERRORS.na);
  },
  AREAS: () => 1,
};
