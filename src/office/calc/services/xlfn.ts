/**
 * Excel stores functions added after Excel 2007 with a prefix in the file
 * (`_xlfn.XLOOKUP(…)`); without it Excel shows #NAME? until the formula is
 * entered again. The app writes them with the prefix and reads it off.
 * Pure, so it is tested in Node.
 */

/** Functions Excel keeps under `_xlfn.` in a file: everything added after Excel 2007, which this app knows. */
const FUTURE_FUNCTIONS = new Set([
  'ACOT', 'ACOTH', 'AGGREGATE', 'ARABIC', 'BASE', 'BETA.DIST', 'BETA.INV', 'BINOM.DIST', 'BINOM.DIST.RANGE',
  'BINOM.INV', 'BITAND', 'BITLSHIFT', 'BITOR', 'BITRSHIFT', 'BITXOR', 'CEILING.MATH', 'CEILING.PRECISE',
  'CHISQ.DIST', 'CHISQ.DIST.RT', 'CHISQ.INV', 'CHISQ.INV.RT', 'CHISQ.TEST', 'COMBINA', 'CONCAT', 'CONFIDENCE.NORM',
  'CONFIDENCE.T', 'COT', 'COTH', 'COVARIANCE.P', 'COVARIANCE.S', 'CSC', 'CSCH', 'DAYS', 'DECIMAL', 'ERF.PRECISE',
  'ERFC.PRECISE', 'EXPON.DIST', 'F.DIST', 'F.DIST.RT', 'F.INV', 'F.INV.RT', 'F.TEST', 'FLOOR.MATH', 'FLOOR.PRECISE',
  'FORECAST.LINEAR', 'FORMULATEXT', 'GAMMA', 'GAMMA.DIST', 'GAMMA.INV', 'GAMMALN.PRECISE', 'GAUSS', 'HYPGEOM.DIST',
  'IFNA', 'IFS', 'ISFORMULA', 'ISOWEEKNUM', 'LOGNORM.DIST', 'LOGNORM.INV', 'MAXIFS', 'MINIFS', 'MODE.MULT',
  'MODE.SNGL', 'MUNIT', 'NEGBINOM.DIST', 'NETWORKDAYS.INTL', 'NORM.DIST', 'NORM.INV', 'NORM.S.DIST', 'NORM.S.INV',
  'NUMBERVALUE', 'PDURATION', 'PERCENTILE.EXC', 'PERCENTILE.INC', 'PERCENTRANK.EXC', 'PERCENTRANK.INC',
  'PERMUTATIONA', 'PHI', 'POISSON.DIST', 'QUARTILE.EXC', 'QUARTILE.INC', 'RANK.AVG', 'RANK.EQ', 'RRI', 'SEC', 'SECH',
  'SHEET', 'SHEETS', 'SKEW.P', 'STDEV.P', 'STDEV.S', 'SWITCH', 'T.DIST', 'T.DIST.2T', 'T.DIST.RT', 'T.INV',
  'T.INV.2T', 'T.TEST', 'TEXTJOIN', 'UNICHAR', 'UNICODE', 'VAR.P', 'VAR.S', 'WEIBULL.DIST', 'WORKDAY.INTL', 'XOR',
  'Z.TEST', 'XLOOKUP', 'XMATCH', 'UNIQUE', 'SEQUENCE', 'RANDARRAY', 'LET', 'SORTBY', 'TEXTBEFORE', 'TEXTAFTER',
  'TEXTSPLIT', 'TAKE', 'DROP', 'CHOOSECOLS', 'CHOOSEROWS', 'VSTACK', 'HSTACK', 'EXPAND', 'TOCOL', 'TOROW',
  'WRAPCOLS', 'WRAPROWS', 'BYROW', 'BYCOL', 'MAP', 'REDUCE', 'SCAN', 'MAKEARRAY', 'LAMBDA', 'ISOMITTED',
]);

/** Dynamic-array functions Excel files under `_xlfn._xlws.`. */
const WORKSHEET_FUNCTIONS = new Set(['FILTER', 'SORT']);

/** Runs `change` on the parts of a formula outside text in quotes. */
function outsideStrings(formula: string, change: (part: string) => string): string {
  return formula
    .split(/("(?:[^"]|"")*")/)
    .map((part, i) => (i % 2 === 1 ? part : change(part)))
    .join('');
}

/** The ranges of a formula that are text in quotes. */
function stringRanges(formula: string): Array<[number, number]> {
  return Array.from(formula.matchAll(/"(?:[^"]|"")*"/g), (m) => [m.index, m.index + m[0].length] as [number, number]);
}

/**
 * Excel files the names a LET gives its values, and the parameters of a LAMBDA, as `_xlpm.name`: where each name
 * sits inside the LET or LAMBDA, from the first argument to the closing bracket, outside text.
 */
function letNameStarts(formula: string): Set<number> {
  const strings = stringRanges(formula);
  const inText = (at: number): boolean => strings.some(([from, to]) => at >= from && at < to);
  const starts = new Set<number>();
  for (const found of formula.matchAll(/(?<![A-Za-z0-9_.])(?:_xlfn\.)?(LET|LAMBDA)\(/gi)) {
    if (inText(found.index)) continue;
    const bodyStart = found.index + found[0].length;
    const spans: Array<[number, number]> = [];
    let depth = 1;
    let argStart = bodyStart;
    let close = -1;
    for (let i = bodyStart; i < formula.length; i += 1) {
      if (inText(i)) continue;
      const c = formula[i];
      if (c === '(' || c === '{') depth += 1;
      else if (c === ')' || c === '}') {
        depth -= 1;
        if (depth === 0) {
          spans.push([argStart, i]);
          close = i;
          break;
        }
      } else if (c === ',' && depth === 1) {
        spans.push([argStart, i]);
        argStart = i + 1;
      }
    }
    if (close < 0) continue;
    const isLet = found[1].toUpperCase() === 'LET';
    const names = spans.filter((_span, i) => i < spans.length - 1 && (!isLet || i % 2 === 0)).map(([from, to]) => formula.slice(from, to).trim());
    for (const name of names) {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) continue;
      const use = new RegExp(`(?<![A-Za-z0-9_.!$'])${name}(?![A-Za-z0-9_.(!])`, 'gi');
      for (const hit of formula.slice(bodyStart, close).matchAll(use)) {
        const at = bodyStart + hit.index;
        if (!inText(at) && formula.slice(Math.max(0, at - 6), at) !== '_xlpm.') starts.add(at);
      }
    }
  }
  return starts;
}

/** A formula as the .xlsx file wants it (no leading `=`). */
export function toFileFormula(formula: string): string {
  const prefixed = outsideStrings(formula, (part) =>
    part.replace(/(?<![A-Za-z0-9_.])([A-Za-z][A-Za-z0-9.]*)\(/g, (whole, name: string) => {
      const upper = name.toUpperCase();
      if (FUTURE_FUNCTIONS.has(upper)) return `_xlfn.${upper}(`;
      if (WORKSHEET_FUNCTIONS.has(upper)) return `_xlfn._xlws.${upper}(`;
      return whole;
    }),
  );
  const starts = [...letNameStarts(prefixed)].sort((x, y) => y - x);
  return starts.reduce((text, at) => `${text.slice(0, at)}_xlpm.${text.slice(at)}`, prefixed);
}

/** A formula from an .xlsx file as the app writes it. */
export function fromFileFormula(formula: string): string {
  return outsideStrings(formula, (part) => part.replace(/_xlfn\.(?:_xlws\.)?/gi, '').replace(/_xlpm\./gi, ''));
}
