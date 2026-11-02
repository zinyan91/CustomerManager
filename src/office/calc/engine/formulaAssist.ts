import { FUNCTION_SIGNATURES, type Signature } from './functionSignatures';
import { FUNCTIONS } from './functionTable';

/** Functions the evaluator handles itself, so they are not in the function table. */
const SPECIAL = ['IF', 'IFS', 'IFERROR', 'IFNA', 'CHOOSE', 'ROWS', 'COLUMNS', 'SUBTOTAL', 'AGGREGATE', 'SWITCH', 'LET', 'OFFSET', 'INDIRECT', 'ISREF', 'ISFORMULA', 'FORMULATEXT', 'SHEET', 'SHEETS', 'BYROW', 'BYCOL', 'MAP', 'REDUCE', 'SCAN', 'MAKEARRAY', 'LAMBDA'];

/** The names offered while a formula is typed: those with a signature first-class, the older spellings too. */
export const FUNCTION_NAMES: readonly string[] = [...new Set([...Object.keys(FUNCTIONS), ...SPECIAL])].sort();

const MAX_SUGGESTIONS = 10;

function insideText(text: string, caret: number): boolean {
  let open = false;
  for (let i = 0; i < caret; i += 1) if (text[i] === '"') open = !open;
  return open;
}

/** The word being typed where a function name could start, with where it starts; null when none. */
function typedWord(text: string, caret: number): { word: string; start: number } | null {
  if (!text.startsWith('=') || insideText(text, caret)) return null;
  const found = /(?:^|[=+\-*/^&<>(,;:\s%@])([A-Za-z][A-Za-z0-9._]*)$/.exec(text.slice(0, caret));
  if (!found) return null;
  if (/[A-Za-z0-9._]/.test(text[caret] ?? '')) return null;
  return { word: found[1], start: caret - found[1].length };
}

/** The function names that begin with what is being typed, as Excel lists them under the cell. */
export function suggestFunctions(text: string, caret: number): string[] {
  const typed = typedWord(text, caret);
  if (!typed) return [];
  const prefix = typed.word.toUpperCase();
  if (/^[A-Z]{1,3}[0-9]+$/.test(prefix)) return [];
  const hits = FUNCTION_NAMES.filter((name) => name.startsWith(prefix) && !(name === prefix && text[caret] === '('));
  return hits.slice(0, MAX_SUGGESTIONS);
}

/** The text with the typed word replaced by the chosen function and its opening bracket, and where the caret goes. */
export function applySuggestion(text: string, caret: number, name: string): { text: string; caret: number } {
  const typed = typedWord(text, caret);
  if (!typed) return { text, caret };
  const rest = text.slice(caret);
  const open = rest.startsWith('(') ? '' : '(';
  const next = `${text.slice(0, typed.start)}${name}${open}${rest}`;
  return { text: next, caret: typed.start + name.length + 1 };
}

export interface ArgumentHint {
  signature: Signature;
  /** The argument the caret is in. */
  index: number;
}

/** The function call the caret is inside, and which of its arguments it is in; null outside any known call. */
export function signatureAt(text: string, caret: number): ArgumentHint | null {
  if (!text.startsWith('=')) return null;
  const frames: Array<{ name: string; commas: number }> = [];
  let inString = false;
  for (let i = 1; i < caret; i += 1) {
    const c = text[i];
    if (c === '"') inString = !inString;
    if (inString) continue;
    if (c === '(') {
      const name = /([A-Za-z][A-Za-z0-9._]*)$/.exec(text.slice(0, i))?.[1]?.toUpperCase() ?? '';
      frames.push({ name, commas: 0 });
    } else if (c === '{') frames.push({ name: '', commas: 0 });
    else if (c === ')' || c === '}') frames.pop();
    else if (c === ',' && frames.length > 0) frames[frames.length - 1].commas += 1;
  }
  for (let i = frames.length - 1; i >= 0; i -= 1) {
    const frame = frames[i];
    if (frame.name === '') continue;
    const signature = FUNCTION_SIGNATURES.get(frame.name);
    if (!signature) return null;
    return { signature, index: Math.min(frame.commas, Math.max(0, signature.args.length - 1)) };
  }
  return null;
}
