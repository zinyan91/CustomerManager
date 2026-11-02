import { describe, expect, it } from 'vitest';
import golden from './fixtures/excel-golden.json';
import { formatValue } from '../calc/engine/numberFormat';
import { isError, type Scalar } from '../calc/engine/values';
import { Workbook } from '../calc/model/workbook';

/**
 * What Microsoft Excel 16 answered for the same formulas and number formats,
 * measured through its COM interface and kept here. Each formula sits in its
 * own row of column H over the data in A1:E8.
 */
interface GoldenFormula {
  f: string;
  rows: number;
  cols: number;
  cells?: [string, unknown][][];
}

/** Known differences: Excel's own quirks or features this engine does not have. */
const KNOWN_DIFFERENCES = new Set([
  '=DATEDIF(D4,D1,"YD")', // Excel's "YD" is off by a day around month ends
  '=MATCH(25,A1:A5,-1)', // descending match on unsorted data: Excel gives #N/A
  '=BYROW(A1:B2,LAMBDA(r,SUM(r)))', // LAMBDA is not implemented
]);

function describeScalar(v: Scalar): string {
  if (isError(v)) return `e:${v.code}`;
  if (typeof v === 'number') return `n:${v}`;
  if (typeof v === 'boolean') return `b:${v}`;
  return v === null ? 'z' : `s:${v}`;
}

function describeExcel([kind, value]: [string, unknown]): string {
  if (kind === 'b') return `b:${value ? 'true' : 'false'}`;
  return kind === 'z' ? 'z' : `${kind}:${value}`;
}

const sameNumber = (a: string, b: string): boolean => {
  if (!a.startsWith('n:') || !b.startsWith('n:')) return false;
  const [x, y] = [Number(a.slice(2)), Number(b.slice(2))];
  return Math.abs(x - y) <= 1e-9 * Math.max(1, Math.abs(y));
};

/** A blank cell in a result is 0 or "" depending on who asks. */
const bothEmpty = (a: string, b: string): boolean => (a === 'z' && (b === 'n:0' || b === 's:')) || (b === 'z' && (a === 'n:0' || a === 's:'));

function mismatches(round: { data: string[][]; formulas: GoldenFormula[] }): string[] {
  const book = new Workbook();
  book.now = () => new Date(2026, 9, 11, 10, 0, 0);
  round.data.forEach((row, r) => row.forEach((raw, c) => raw !== '' && book.putCell(0, r, c, { raw, style: 0 })));
  round.formulas.forEach((entry, i) => book.putCell(0, 20 * i, 7, { raw: entry.f, style: 0 }));
  const wrong: string[] = [];
  round.formulas.forEach((entry, i) => {
    for (let a = 0; a < entry.rows; a += 1)
      for (let b = 0; b < entry.cols; b += 1) {
        const mine = describeScalar(book.valueAt(0, 20 * i + a, 7 + b));
        const theirs = describeExcel(entry.cells?.[a]?.[b] ?? ['z', null]);
        if (mine === theirs || sameNumber(mine, theirs) || bothEmpty(mine, theirs)) continue;
        wrong.push(entry.f);
        return;
      }
  });
  return wrong;
}

/** Fractions Excel rounds in a way no simple rule reproduces: it shows 0/1 for 0.1 where 1/9 is closer. */
const KNOWN_FORMAT_DIFFERENCES = new Set(['0.1 | ?/?', '0.1 | # ?/?']);

describe('against Microsoft Excel', () => {
  golden.rounds.forEach((round, index) => {
    it(`gives Excel's answer for every formula of round ${index + 1}, but the known differences`, () => {
      const wrong = mismatches(round as { data: string[][]; formulas: GoldenFormula[] });
      expect(wrong.filter((f) => !KNOWN_DIFFERENCES.has(f))).toEqual([]);
    });
  });

  it('writes numbers, dates and text under number formats as Excel does', () => {
    const wrong = golden.formats
      .filter((entry) => formatValue(entry.value as Scalar, entry.format === 'General' ? undefined : entry.format).trim() !== entry.text.trim())
      .map((entry) => `${JSON.stringify(entry.value)} | ${entry.format}`);
    expect(wrong.filter((entry) => !KNOWN_FORMAT_DIFFERENCES.has(entry))).toEqual([]);
  });
});
