import { describe, expect, it } from 'vitest';
import { fromFileFormula, toFileFormula } from '../calc/services/xlfn';

describe('Excel future-function prefixes', () => {
  it('adds the prefix to functions Excel keeps under it, in any case, and leaves the rest', () => {
    expect(toFileFormula('SUM(A1:A3)+xlookup(1,B:B,C:C)')).toBe('SUM(A1:A3)+_xlfn.XLOOKUP(1,B:B,C:C)');
    expect(toFileFormula('IFERROR(IFNA(A1,0),1)')).toBe('IFERROR(_xlfn.IFNA(A1,0),1)');
    expect(toFileFormula('SORT(A1:A9)')).toBe('_xlfn._xlws.SORT(A1:A9)');
    expect(toFileFormula('FILTER(A1:A9,B1:B9>0)')).toBe('_xlfn._xlws.FILTER(A1:A9,B1:B9>0)');
  });

  it('does not touch text in quotes, names that merely end like a function, or older functions', () => {
    expect(toFileFormula('"IFS(x)"&A1')).toBe('"IFS(x)"&A1');
    expect(toFileFormula('"a ""XLOOKUP(" b"&SWITCH(1,1,2)')).toBe('"a ""XLOOKUP(" b"&_xlfn.SWITCH(1,1,2)');
    expect(toFileFormula('MYIFS(1)+Sheet1.IFS(1)')).toBe('MYIFS(1)+Sheet1.IFS(1)');
    expect(toFileFormula('VLOOKUP(1,A:B,2,0)+TEXT(A1,"0")')).toBe('VLOOKUP(1,A:B,2,0)+TEXT(A1,"0")');
  });

  it('takes the prefix off again, outside text only', () => {
    expect(fromFileFormula('_xlfn.XLOOKUP(1,A:A,B:B)+_xlfn._xlws.SORT(A1)')).toBe('XLOOKUP(1,A:A,B:B)+SORT(A1)');
    expect(fromFileFormula('"_xlfn.keep"&_xlfn.IFS(TRUE,1)')).toBe('"_xlfn.keep"&IFS(TRUE,1)');
  });
});
