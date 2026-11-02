import { describe, expect, it } from 'vitest';
import { FUNCTION_SIGNATURES } from '../calc/engine/functionSignatures';
import { applySuggestion, FUNCTION_NAMES, signatureAt, suggestFunctions } from '../calc/engine/formulaAssist';
import { FUNCTIONS } from '../calc/engine/functionTable';

describe('function names while typing a formula', () => {
  it('lists the functions that begin with what was typed, in order', () => {
    expect(suggestFunctions('=SU', 3).slice(0, 4)).toEqual(['SUBSTITUTE', 'SUBTOTAL', 'SUM', 'SUMIF']);
    expect(suggestFunctions('=1+vlo', 6)).toEqual(['VLOOKUP']);
    expect(suggestFunctions('=IF(A1>1,xl', 11)).toEqual(['XLOOKUP']);
  });

  it('offers nothing in text, for a cell reference, inside a word, or in a value that is not a formula', () => {
    expect(suggestFunctions('=SUM("SU', 8)).toEqual([]);
    expect(suggestFunctions('=A1', 3)).toEqual([]);
    expect(suggestFunctions('=SUM', 3)).toEqual([]);
    expect(suggestFunctions('SU', 2)).toEqual([]);
    expect(suggestFunctions('=', 1)).toEqual([]);
    expect(suggestFunctions('=SUM(', 5)).toEqual([]);
  });

  it('does not offer a function that is already written with its bracket', () => {
    expect(suggestFunctions('=SUM(1)', 4)).not.toContain('SUM');
    expect(suggestFunctions('=SUM', 4)).toContain('SUM');
  });

  it('writes the chosen name with its bracket and puts the caret after it', () => {
    expect(applySuggestion('=SU', 3, 'SUM')).toEqual({ text: '=SUM(', caret: 5 });
    expect(applySuggestion('=1+vlo', 6, 'VLOOKUP')).toEqual({ text: '=1+VLOOKUP(', caret: 11 });
    expect(applySuggestion('=SU(1)', 3, 'SUM')).toEqual({ text: '=SUM(1)', caret: 5 });
  });
});

describe('the arguments of the function being typed', () => {
  it('names the call and the argument the caret is in', () => {
    expect(signatureAt('=SUM(', 5)).toMatchObject({ signature: { name: 'SUM' }, index: 0 });
    expect(signatureAt('=VLOOKUP(A1,B:C,', 16)).toMatchObject({ signature: { name: 'VLOOKUP' }, index: 2 });
    expect(signatureAt('=IF(A1>1,SUM(1,2),', 18)).toMatchObject({ signature: { name: 'IF' }, index: 2 });
  });

  it('stays with the function inside a group and ignores commas in text and arrays', () => {
    expect(signatureAt('=IF((A1+1)>2,"a,b",', 19)).toMatchObject({ signature: { name: 'IF' }, index: 2 });
    expect(signatureAt('=SUM({1,2},', 11)).toMatchObject({ signature: { name: 'SUM' }, index: 1 });
    expect(signatureAt('=SUM(1)+', 8)).toBeNull();
    expect(signatureAt('=A1+(2', 6)).toBeNull();
    expect(signatureAt('SUM(', 4)).toBeNull();
  });

  it('keeps an argument that repeats on the last one', () => {
    expect(signatureAt('=SUM(1,2,3,4,5,', 15)?.index).toBe(2);
  });
});

describe('the catalogue', () => {
  it('has a signature for every function a user can type, bar the older spellings', () => {
    const aliases = new Set(['CHIDIST', 'CHIINV', 'FDIST', 'FINV', 'TDIST', 'TINV', 'BETADIST', 'BETAINV', 'LOGNORMDIST', 'LOGINV', 'CONFIDENCE', 'ZTEST', 'WEIBULL', 'GAMMADIST', 'GAMMAINV', 'NORMDIST', 'NORMSDIST', 'NORMINV', 'NORMSINV', 'BINOMDIST', 'POISSON', 'EXPONDIST', 'COVAR', 'FORECAST.LINEAR', 'STDEV.S', 'STDEV.P', 'VAR.S', 'VAR.P', 'MODE.SNGL', 'PERCENTILE.INC', 'QUARTILE.INC', 'PERCENTRANK.INC', 'CEILING.PRECISE', 'FLOOR.PRECISE']);
    const missing = FUNCTION_NAMES.filter((name) => !FUNCTION_SIGNATURES.has(name) && !aliases.has(name));
    expect(missing).toEqual([]);
  });

  it('only describes functions the engine has', () => {
    const special = new Set(['IF', 'IFS', 'IFERROR', 'IFNA', 'CHOOSE', 'ROWS', 'COLUMNS', 'SUBTOTAL', 'AGGREGATE', 'SWITCH', 'LET', 'OFFSET', 'INDIRECT', 'ISREF', 'ISFORMULA', 'FORMULATEXT', 'SHEET', 'SHEETS', 'BYROW', 'BYCOL', 'MAP', 'REDUCE', 'SCAN', 'MAKEARRAY', 'LAMBDA']);
    const unknown = [...FUNCTION_SIGNATURES.keys()].filter((name) => !(name in FUNCTIONS) && !special.has(name));
    expect(unknown).toEqual([]);
  });
});
