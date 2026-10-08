import { describe, expect, it } from 'vitest';
import { serialFromParts } from '../calc/engine/dates';
import { parseCell } from '../calc/engine/cellRef';
import { CellError, ERRORS } from '../calc/engine/values';
import { Workbook } from '../calc/model/workbook';

/** One formula in A1 of a workbook whose other cells come from `data` (row 2 down, "A2", "B2", …). */
function calc(formula: string, data: string[][] = []) {
  const wb = new Workbook();
  wb.putCell(0, 0, 0, { raw: formula, style: 0 });
  data.forEach((row, r) => row.forEach((raw, c) => raw !== '' && wb.putCell(0, r + 1, c, { raw, style: 0 })));
  const pos = parseCell('A1')!;
  return wb.valueAt(0, pos.row, pos.col);
}

const column = (...values: Array<string | number>) => values.map((v) => [String(v)]);
const near = (value: unknown, expected: number, digits = 4) => {
  expect(typeof value).toBe('number');
  expect(value as number).toBeCloseTo(expected, digits);
};
const date = (y: number, m: number, d: number) => serialFromParts(y, m, d);

describe('statistics', () => {
  const data = column(3, 1, 4, 1, 5).map((row, i) => [row[0], String([2, 4, 6, 8, 10][i])]);

  it('picks the k-th largest and smallest, and ranks', () => {
    expect(calc('=LARGE(A2:A6,2)', data)).toBe(4);
    expect(calc('=SMALL(A2:A6,2)', data)).toBe(1);
    expect(calc('=LARGE(A2:A6,9)', data)).toBe(ERRORS.num);
    expect(calc('=RANK(4,A2:A6)', data)).toBe(2);
    expect(calc('=RANK(4,A2:A6,1)', data)).toBe(4);
    expect(calc('=RANK(7,A2:A6)', data)).toBe(ERRORS.na);
  });

  it('finds the mode, the variance and percentiles', () => {
    expect(calc('=MODE(A2:A5)', column(1, 2, 2, 3))).toBe(2);
    expect(calc('=MODE(A2:A4)', column(1, 2, 3))).toBe(ERRORS.na);
    const sample = column(2, 4, 4, 4, 5, 5, 7, 9);
    near(calc('=VAR(A2:A9)', sample), 4.5714);
    near(calc('=VARP(A2:A9)', sample), 4);
    expect(calc('=PERCENTILE(A2:A6,0.25)', column(1, 2, 3, 4, 5))).toBe(2);
    expect(calc('=QUARTILE(A2:A6,3)', column(1, 2, 3, 4, 5))).toBe(4);
    expect(calc('=SUMSQ(A2:A4)', column(1, 2, 3))).toBe(14);
  });

  it('fits a line', () => {
    const xy = [['1', '2'], ['2', '4'], ['3', '6']];
    near(calc('=SLOPE(B2:B4,A2:A4)', xy), 2);
    near(calc('=INTERCEPT(B2:B4,A2:A4)', xy), 0);
    near(calc('=CORREL(B2:B4,A2:A4)', xy), 1);
    near(calc('=FORECAST(4,B2:B4,A2:A4)', xy), 8);
  });
});

describe('maths', () => {
  it('knows odd and even, gcd, lcm, factorial and combinations', () => {
    expect(calc('=ISODD(3)')).toBe(true);
    expect(calc('=ISEVEN(3)')).toBe(false);
    expect(calc('=GCD(12,18)')).toBe(6);
    expect(calc('=LCM(4,6)')).toBe(12);
    expect(calc('=FACT(5)')).toBe(120);
    expect(calc('=FACT(-1)')).toBe(ERRORS.num);
    expect(calc('=COMBIN(5,2)')).toBe(10);
  });
});

describe('finance', () => {
  it('matches Excel on loans, annuities and cash flows', () => {
    near(calc('=PMT(0.05/12,60,10000)'), -188.7123, 3);
    near(calc('=FV(0.06/12,10,-200,-500,1)'), 2581.4034, 3);
    near(calc('=PV(0.08/12,240,500)'), -59777.1458, 3);
    near(calc('=NPV(0.1,-10000,3000,4200,6800)'), 1188.4434, 3);
    near(calc('=IRR(A2:A7)', column(-70000, 12000, 15000, 18000, 21000, 26000)), 0.0866, 3);
    near(calc('=IRR(A2:A6)', column(-70000, 12000, 15000, 18000, 21000)), -0.0212, 3);
    expect(calc('=IRR(A2:A3)', column(1, 2))).toBe(ERRORS.num);
  });
});

describe('dates', () => {
  it('moves by months, clamping to the end of a short month', () => {
    expect(calc('=EDATE(DATE(2024,1,31),1)')).toBe(date(2024, 2, 29));
    expect(calc('=EDATE(DATE(2024,3,15),-2)')).toBe(date(2024, 1, 15));
    expect(calc('=EOMONTH(DATE(2024,1,15),1)')).toBe(date(2024, 2, 29));
    expect(calc('=EOMONTH(DATE(2024,12,1),0)')).toBe(date(2024, 12, 31));
  });

  it('counts whole years, months and days between dates', () => {
    expect(calc('=DATEDIF(DATE(2020,1,15),DATE(2024,3,10),"Y")')).toBe(4);
    expect(calc('=DATEDIF(DATE(2020,1,15),DATE(2024,3,10),"M")')).toBe(49);
    expect(calc('=DATEDIF(DATE(2020,1,15),DATE(2024,3,10),"YM")')).toBe(1);
    expect(calc('=DATEDIF(DATE(2024,1,1),DATE(2024,1,31),"D")')).toBe(30);
    expect(calc('=DATEDIF(DATE(2024,5,1),DATE(2024,1,1),"D")')).toBe(ERRORS.num);
    expect(calc('=DATEDIF(DATE(2024,1,1),DATE(2024,2,1),"Q")')).toBe(ERRORS.num);
  });

  it('counts and adds working days', () => {
    expect(calc('=NETWORKDAYS(DATE(2024,1,1),DATE(2024,1,7))')).toBe(5);
    expect(calc('=WORKDAY(DATE(2024,1,5),1)')).toBe(date(2024, 1, 8));
    expect(calc('=WORKDAY(DATE(2024,1,8),-1)')).toBe(date(2024, 1, 5));
  });
});

describe('text', () => {
  it('replaces, splits and tidies', () => {
    expect(calc('=REPLACE("abcdef",3,2,"XY")')).toBe('abXYef');
    expect(calc('=TEXTBEFORE("a-b-c","-")')).toBe('a');
    expect(calc('=TEXTAFTER("a-b-c","-")')).toBe('b-c');
    expect(calc('=TEXTBEFORE("abc","-")')).toBe(ERRORS.na);
    expect(calc('=T("x")')).toBe('x');
    expect(calc('=T(5)')).toBe('');
    expect(calc('=HYPERLINK("https://a.vn","Trang chủ")')).toBe('Trang chủ');
    expect(calc('=ADDRESS(2,3)')).toBe('$C$2');
    expect(calc('=ADDRESS(2,3,4)')).toBe('C2');
  });
});

describe('lookups', () => {
  const table = [['1', '10'], ['2', '20'], ['3', '30']];

  it('XLOOKUP finds an exact match, a fallback or the nearest', () => {
    expect(calc('=XLOOKUP(2,A2:A4,B2:B4)', table)).toBe(20);
    expect(calc('=XLOOKUP(9,A2:A4,B2:B4,"không có")', table)).toBe('không có');
    expect(calc('=XLOOKUP(9,A2:A4,B2:B4)', table)).toBe(ERRORS.na);
    expect(calc('=XLOOKUP(2.5,A2:A4,B2:B4,,-1)', table)).toBe(20);
    expect(calc('=XLOOKUP(2.5,A2:A4,B2:B4,,1)', table)).toBe(30);
  });

  it('XMATCH and LOOKUP give positions and approximate matches', () => {
    expect(calc('=XMATCH(3,A2:A4)', table)).toBe(3);
    expect(calc('=XMATCH(5,A2:A4)', table)).toBe(ERRORS.na);
    expect(calc('=LOOKUP(2.5,A2:A4,B2:B4)', table)).toBe(20);
    expect(calc('=LOOKUP(0,A2:A4,B2:B4)', table)).toBe(ERRORS.na);
  });

  it('XLOOKUP searches last to first on request', () => {
    expect(calc('=XLOOKUP(1,A2:A4,B2:B4,,0,-1)', [['1', 'first'], ['2', 'x'], ['1', 'last']])).toBe('last');
  });
});

describe('errors stay errors', () => {
  it('is not a made-up value', () => {
    expect(calc('=LARGE(A2:A3,1)', [['x'], ['y']])).toBeInstanceOf(CellError);
  });
});

describe('OFFSET and INDIRECT', () => {
  const grid = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']];

  it('OFFSET moves a reference, optionally resizing it', () => {
    expect(calc('=OFFSET(A2,1,1)', grid)).toBe(5);
    expect(calc('=OFFSET(B3,-1,-1)', grid)).toBe(1);
    expect(calc('=SUM(OFFSET(A2,0,0,2,2))', grid)).toBe(12);
    expect(calc('=SUM(OFFSET(A2:B3,1,1))', grid)).toBe(5 + 6 + 8 + 9);
    expect(calc('=OFFSET(A2,-5,0)', grid)).toBe(ERRORS.ref);
    expect(calc('=OFFSET(A2,0,0,0,1)', grid)).toBe(ERRORS.ref);
    expect(calc('=OFFSET("A2",1,1)', grid)).toBe(ERRORS.value);
  });

  it('INDIRECT reads a reference from text', () => {
    expect(calc('=INDIRECT("B3")', grid)).toBe(5);
    expect(calc('=SUM(INDIRECT("$A$2:$C$2"))', grid)).toBe(6);
    expect(calc('=INDIRECT("A"&"4")', grid)).toBe(7);
    expect(calc('=INDIRECT("Sheet1!C4")', grid)).toBe(9);
    expect(calc("=INDIRECT(\"'Sheet1'!C4\")", grid)).toBe(9);
    expect(calc('=INDIRECT("nonsense")', grid)).toBe(ERRORS.ref);
    expect(calc('=INDIRECT("Nope!A1")', grid)).toBe(ERRORS.ref);
  });

  it('follows a change in the cell it reaches, and is caught when it points at itself', () => {
    const wb = new Workbook();
    wb.putCell(0, 0, 0, { raw: '=INDIRECT("B1")*2', style: 0 });
    wb.putCell(0, 0, 1, { raw: '4', style: 0 });
    expect(wb.valueAt(0, 0, 0)).toBe(8);
    wb.putCell(0, 0, 1, { raw: '5', style: 0 });
    expect(wb.valueAt(0, 0, 0)).toBe(10);
    wb.putCell(0, 1, 0, { raw: '=INDIRECT("A2")', style: 0 });
    expect(wb.valueAt(0, 1, 0)).toBe(ERRORS.circular);
  });
});
