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

describe('functions Excel 2010 and later keep under the prefix', () => {
  it('prefixes the statistical, engineering and 365 functions, and not the older ones', () => {
    expect(toFileFormula('STDEV.S(A1:A3)+NORM.DIST(1,0,1,TRUE)')).toBe('_xlfn.STDEV.S(A1:A3)+_xlfn.NORM.DIST(1,0,1,TRUE)');
    expect(toFileFormula('BITAND(13,25)+COT(1)+AGGREGATE(9,4,A1:A3)')).toBe('_xlfn.BITAND(13,25)+_xlfn.COT(1)+_xlfn.AGGREGATE(9,4,A1:A3)');
    expect(toFileFormula('TDIST(1,2,2)+STDEV(A1:A3)+DELTA(1,2)+CEILING(1,2)')).toBe('TDIST(1,2,2)+STDEV(A1:A3)+DELTA(1,2)+CEILING(1,2)');
  });

  it('files the names of a LET as parameters, and reads them back', () => {
    expect(toFileFormula('LET(x,1,y,x+1,x*y)')).toBe('_xlfn.LET(_xlpm.x,1,_xlpm.y,_xlpm.x+1,_xlpm.x*_xlpm.y)');
    expect(toFileFormula('LET(x,"x y",LEN(x))')).toBe('_xlfn.LET(_xlpm.x,"x y",LEN(_xlpm.x))');
    expect(fromFileFormula('_xlfn.LET(_xlpm.x,1,_xlpm.x+1)')).toBe('LET(x,1,x+1)');
  });
});

describe('LAMBDA in a file', () => {
  it('files its parameters, and those of a LET around it, as _xlpm names', () => {
    expect(toFileFormula('BYROW(A1:B3,LAMBDA(r,SUM(r)))')).toBe('_xlfn.BYROW(A1:B3,_xlfn.LAMBDA(_xlpm.r,SUM(_xlpm.r)))');
    expect(toFileFormula('LET(f,2,MAP(A1:A3,LAMBDA(x,x+f)))')).toBe('_xlfn.LET(_xlpm.f,2,_xlfn.MAP(A1:A3,_xlfn.LAMBDA(_xlpm.x,_xlpm.x+_xlpm.f)))');
  });
});
