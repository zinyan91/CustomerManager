/**
 * Excel stores functions added after Excel 2007 with a prefix in the file
 * (`_xlfn.XLOOKUP(…)`); without it Excel shows #NAME? until the formula is
 * entered again. The app writes them with the prefix and reads it off.
 * Pure, so it is tested in Node.
 */

/** Functions Excel keeps under `_xlfn.`, which this app knows. */
const FUTURE_FUNCTIONS = new Set([
  'CONCAT',
  'DAYS',
  'IFNA',
  'IFS',
  'MAXIFS',
  'MINIFS',
  'SWITCH',
  'TEXTAFTER',
  'TEXTBEFORE',
  'TEXTJOIN',
  'XLOOKUP',
  'XMATCH',
  'XOR',
  'UNIQUE',
  'SEQUENCE',
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

/** A formula as the .xlsx file wants it (no leading `=`). */
export function toFileFormula(formula: string): string {
  return outsideStrings(formula, (part) =>
    part.replace(/(?<![A-Za-z0-9_.])([A-Za-z][A-Za-z0-9.]*)\(/g, (whole, name: string) => {
      const upper = name.toUpperCase();
      if (FUTURE_FUNCTIONS.has(upper)) return `_xlfn.${upper}(`;
      if (WORKSHEET_FUNCTIONS.has(upper)) return `_xlfn._xlws.${upper}(`;
      return whole;
    }),
  );
}

/** A formula from an .xlsx file as the app writes it. */
export function fromFileFormula(formula: string): string {
  return outsideStrings(formula, (part) => part.replace(/_xlfn\.(?:_xlws\.)?/gi, ''));
}
