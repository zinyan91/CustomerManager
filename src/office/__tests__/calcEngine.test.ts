import { describe, expect, it } from 'vitest';
import { adjustFormula } from '../calc/engine/adjust';
import { cellName, columnName, parseCell, parseRange } from '../calc/engine/cellRef';
import { matchesCriteria } from '../calc/engine/criteria';
import { formatValue, withDecimals } from '../calc/engine/numberFormat';
import { printFormula, parseFormula, shiftFormula } from '../calc/engine/parser';
import { CellError, ERRORS } from '../calc/engine/values';
import { Workbook } from '../calc/model/workbook';

/** A workbook whose A1.. cells are set from rows of text. */
function book(rows: string[][], sheetName = 'Sheet1'): Workbook {
  const wb = new Workbook();
  wb.sheets[0].name = sheetName;
  wb.now = () => new Date(2024, 2, 5, 10, 30, 0);
  rows.forEach((row, r) => row.forEach((raw, c) => raw !== '' && wb.putCell(0, r, c, { raw, style: 0 })));
  return wb;
}

const value = (wb: Workbook, ref: string) => {
  const pos = parseCell(ref)!;
  return wb.valueAt(0, pos.row, pos.col);
};
const calc = (formula: string, rows: string[][] = []) => value(book([[formula, ...[]], ...rows].map((r, i) => (i === 0 ? [formula] : r))), 'A1');

describe('addresses', () => {
  it('converts between names and positions', () => {
    expect(columnName(0)).toBe('A');
    expect(columnName(26)).toBe('AA');
    expect(columnName(701)).toBe('ZZ');
    expect(cellName(2, 1)).toBe('B3');
    expect(parseCell('$C$4')).toEqual({ row: 3, col: 2 });
    expect(parseCell('1A')).toBeNull();
    expect(parseRange('B2:A1')).toEqual({ r1: 0, c1: 0, r2: 1, c2: 1 });
  });
});

describe('formulas', () => {
  it('does arithmetic with Excel precedence, including a prefix minus before ^', () => {
    expect(calc('=1+2*3')).toBe(7);
    expect(calc('=(1+2)*3')).toBe(9);
    expect(calc('=-2^2')).toBe(4);
    expect(calc('=2^3^2')).toBe(64);
    expect(calc('=50%')).toBe(0.5);
    expect(calc('="a"&"b"&1')).toBe('ab1');
  });

  it('reports errors the Excel way', () => {
    expect(calc('=1/0')).toBe(ERRORS.div0);
    expect(calc('=FOO(1)')).toBe(ERRORS.name);
    expect(calc('="x"+1')).toBe(ERRORS.value);
    expect(calc('=1+')).toBe(ERRORS.syntax);
    expect(calc('=Nope!A1')).toBe(ERRORS.ref);
    expect(calc('=SQRT(-1)')).toBe(ERRORS.num);
  });

  it('reads cells and ranges, and follows chains of formulas', () => {
    const wb = book([['1', '2', '=A1+B1'], ['10', '20', '=SUM(A1:C1)+SUM(A2:B2)']]);
    expect(value(wb, 'C1')).toBe(3);
    expect(value(wb, 'C2')).toBe(36);
  });

  it('detects circular references instead of hanging', () => {
    const wb = book([['=B1', '=A1']]);
    expect(value(wb, 'A1')).toBeInstanceOf(CellError);
    expect((value(wb, 'A1') as CellError).code).toBe('#CIRC!');
  });

  it('recomputes after an edit', () => {
    const wb = book([['1', '=A1*2']]);
    expect(value(wb, 'B1')).toBe(2);
    wb.putCell(0, 0, 0, { raw: '5', style: 0 });
    expect(value(wb, 'B1')).toBe(10);
  });

  it('compares and branches, evaluating only the branch taken', () => {
    expect(calc('=IF(2>1,"yes","no")')).toBe('yes');
    expect(calc('=IF(1>2,1/0,"safe")')).toBe('safe');
    expect(calc('=IFERROR(1/0,"oops")')).toBe('oops');
    expect(calc('=IFS(1>2,"a",2>1,"b")')).toBe('b');
    expect(calc('=AND(1<2,"a"="A")')).toBe(true);
    expect(calc('=CHOOSE(2,"x","y","z")')).toBe('y');
  });
});

describe('functions', () => {
  const data = [
    ['name', 'qty', 'price'],
    ['apple', '3', '1.5'],
    ['pear', '5', '2'],
    ['apple', '2', '1.5'],
  ];
  const at = (formula: string) => {
    const wb = book([...data.map((r) => [...r]), ['', '', '']]);
    wb.putCell(0, 5, 0, { raw: formula, style: 0 });
    return wb.valueAt(0, 5, 0);
  };

  it('aggregates, ignoring text inside ranges', () => {
    expect(at('=SUM(B2:B4)')).toBe(10);
    expect(Number(at('=AVERAGE(B2:B4)'))).toBeCloseTo(3.333, 2);
    expect(at('=MIN(B2:B4)')).toBe(2);
    expect(at('=MAX(A1:C4)')).toBe(5);
    expect(at('=COUNT(A1:C4)')).toBe(6);
    expect(at('=COUNTA(A1:C4)')).toBe(12);
    expect(at('=MEDIAN(B2:B4)')).toBe(3);
    expect(at('=SUMPRODUCT(B2:B4,C2:C4)')).toBe(3 * 1.5 + 5 * 2 + 2 * 1.5);
  });

  it('applies criteria', () => {
    expect(at('=SUMIF(A2:A4,"apple",B2:B4)')).toBe(5);
    expect(at('=COUNTIF(B2:B4,">2")')).toBe(2);
    expect(at('=COUNTIF(A2:A4,"a*")')).toBe(2);
    expect(at('=SUMIFS(B2:B4,A2:A4,"apple",C2:C4,">1")')).toBe(5);
    expect(at('=AVERAGEIF(A2:A4,"pear",B2:B4)')).toBe(5);
  });

  it('looks things up', () => {
    expect(at('=VLOOKUP("pear",A2:C4,2,FALSE)')).toBe(5);
    expect(at('=VLOOKUP("kiwi",A2:C4,2,FALSE)')).toBe(ERRORS.na);
    expect(at('=INDEX(A2:C4,2,3)')).toBe(2);
    expect(at('=MATCH("pear",A2:A4,0)')).toBe(2);
    expect(at('=IFERROR(VLOOKUP("kiwi",A2:C4,2,FALSE),0)')).toBe(0);
  });

  it('handles text, including Vietnamese', () => {
    expect(calc('=UPPER("hà nội")')).toBe('HÀ NỘI');
    expect(calc('=LEFT("Việt Nam",4)')).toBe('Việt');
    expect(calc('=MID("abcdef",2,3)')).toBe('bcd');
    expect(calc('=TRIM("  a   b ")')).toBe('a b');
    expect(calc('=SUBSTITUTE("a-b-c","-","+")')).toBe('a+b+c');
    expect(calc('=PROPER("xin CHÀO")')).toBe('Xin Chào');
    expect(calc('=CONCATENATE("a",1,TRUE)')).toBe('a1TRUE');
    expect(calc('=TEXT(1234.5,"#,##0.00")')).toBe('1,234.50');
  });

  it('does maths and rounding', () => {
    expect(calc('=ROUND(2.345,2)')).toBe(2.35);
    expect(calc('=ROUND(-2.5,0)')).toBe(-3);
    expect(calc('=ROUNDDOWN(2.999,1)')).toBe(2.9);
    expect(calc('=MOD(-3,2)')).toBe(1);
    expect(calc('=INT(-1.5)')).toBe(-2);
    expect(calc('=POWER(2,10)')).toBe(1024);
  });

  it('works with dates', () => {
    expect(calc('=TODAY()')).toBe(45356);
    expect(calc('=YEAR(DATE(2024,2,30))')).toBe(2024);
    expect(calc('=MONTH(DATE(2024,2,30))')).toBe(3);
    expect(calc('=DAY(DATE(2024,2,30))')).toBe(1);
    expect(calc('=DATE(2024,3,5)-DATE(2024,3,1)')).toBe(4);
  });
});

describe('criteria', () => {
  it('matches numbers, operators and wildcards', () => {
    expect(matchesCriteria(5, 5)).toBe(true);
    expect(matchesCriteria(5, '>=5')).toBe(true);
    expect(matchesCriteria('5', '>=5')).toBe(false);
    expect(matchesCriteria('Apple', 'apple')).toBe(true);
    expect(matchesCriteria('apple pie', 'apple*')).toBe(true);
    expect(matchesCriteria('x', '<>x')).toBe(false);
    expect(matchesCriteria(null, '')).toBe(true);
  });
});

describe('number formats', () => {
  it('shows General, numbers, percent and currency', () => {
    expect(formatValue(1234.5678, 'General')).toBe('1234.5678');
    expect(formatValue(0.1 + 0.2, 'General')).toBe('0.3');
    expect(formatValue(1e12, 'General')).toBe('1E+12');
    expect(formatValue(1234.5, '#,##0.00')).toBe('1,234.50');
    expect(formatValue(-1234.5, '#,##0')).toBe('-1,235');
    expect(formatValue(0.256, '0.0%')).toBe('25.6%');
    expect(formatValue(1500000, '#,##0 "₫"')).toBe('1,500,000 ₫');
    expect(formatValue(5, '"$"#,##0.00')).toBe('$5.00');
    expect(formatValue(-5, '0.00;(0.00)')).toBe('(5.00)');
    expect(formatValue('abc', '0.00')).toBe('abc');
  });

  it('shows dates and times', () => {
    expect(formatValue(45356, 'dd/mm/yyyy')).toBe('05/03/2024');
    expect(formatValue(45356, 'yyyy-mm-dd')).toBe('2024-03-05');
    expect(formatValue(45356.5, 'dd mmmm yyyy hh:mm')).toBe('05 March 2024 12:00');
    expect(formatValue(0.75, 'hh:mm:ss')).toBe('18:00:00');
  });

  it('steps decimals', () => {
    expect(withDecimals(undefined, 1)).toBe('0.0');
    expect(withDecimals('0.00', -1)).toBe('0.0');
    expect(withDecimals('#,##0', 1)).toBe('#,##0.0');
    expect(withDecimals('0.0%', 1)).toBe('0.00%');
  });
});

describe('copying and moving references', () => {
  it('shifts relative references and keeps absolute ones', () => {
    expect(shiftFormula('=A1+$B$2+C$3', 1, 1)).toBe('=B2+$B$2+D$3');
    expect(shiftFormula('=SUM(A1:B2)', 2, 0)).toBe('=SUM(A3:B4)');
    expect(shiftFormula('=A1', -1, 0)).toBe('=#REF!');
  });

  it('prints formulas with only the parentheses that matter', () => {
    expect(printFormula(parseFormula('=(1+2)*3'))).toBe('=(1+2)*3');
    expect(printFormula(parseFormula('=1+(2*3)'))).toBe('=1+2*3');
    expect(printFormula(parseFormula('=if( a1>1 ,"x""y",)'))).toBe('=IF(A1>1,"x""y",)');
  });

  it('adjusts formulas when rows are inserted or deleted', () => {
    const ins = { axis: 'row', at: 1, count: 2, mode: 'insert' } as const;
    expect(adjustFormula('=A1+A2+SUM(A1:A3)', 'S', 'S', ins)).toBe('=A1+A4+SUM(A1:A5)');
    const del = { axis: 'row', at: 1, count: 1, mode: 'delete' } as const;
    expect(adjustFormula('=A1+A2+A3', 'S', 'S', del)).toBe('=A1+#REF!+A2');
    expect(adjustFormula('=SUM(A1:A3)', 'S', 'S', del)).toBe('=SUM(A1:A2)');
    expect(adjustFormula('=SUM(A2:A2)', 'S', 'S', del)).toBe('=SUM(#REF!)');
    expect(adjustFormula('=Other!A5', 'S', 'S', ins)).toBe('=Other!A5');
    expect(adjustFormula('=S!A5', 'T', 'S', ins)).toBe('=S!A7');
  });

  it('moves cells, merges and formulas in the workbook on insert and delete', () => {
    const wb = book([['1'], ['2'], ['=A1+A2']]);
    wb.sheets[0].merges.push({ r1: 1, c1: 0, r2: 2, c2: 0 });
    wb.editStructure(0, { axis: 'row', at: 1, count: 1, mode: 'insert' });
    expect(value(wb, 'A3')).toBe(2);
    expect(value(wb, 'A4')).toBe(3);
    expect(wb.sheets[0].cells.get(3 * 16384)?.raw).toBe('=A1+A3');
    expect(wb.sheets[0].merges[0]).toMatchObject({ r1: 2, r2: 3 });
    wb.editStructure(0, { axis: 'row', at: 2, count: 1, mode: 'delete' });
    expect(wb.sheets[0].cells.get(2 * 16384)?.raw).toBe('=A1+#REF!');
  });
});
