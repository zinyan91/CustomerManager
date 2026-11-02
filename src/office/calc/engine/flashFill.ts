/**
 * Flash Fill: from a few examples (what the adjacent columns hold in a row, and
 * what the user typed beside it) it finds a recipe built from pieces of the
 * inputs (a word, the start or end of a value, its initials, upper or lower case…)
 * and fixed text, and applies it to the rows that have no example.
 */
export type Case = 'asis' | 'upper' | 'lower' | 'proper';

type Piece =
  | { kind: 'lit'; text: string }
  | { kind: 'whole'; col: number; as: Case }
  | { kind: 'word'; col: number; index: number; as: Case }
  | { kind: 'initial'; col: number; index: number }
  | { kind: 'left'; col: number; count: number }
  | { kind: 'right'; col: number; count: number };

export interface FlashExample {
  inputs: string[];
  output: string;
}

const WORD = /[\p{L}\p{N}]+/gu;
const words = (text: string): string[] => text.match(WORD) ?? [];

const cased = (text: string, as: Case): string => {
  if (as === 'upper') return text.toUpperCase();
  if (as === 'lower') return text.toLowerCase();
  if (as === 'proper') return text.replace(/\p{L}[\p{L}\p{N}]*/gu, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
  return text;
};

function render(piece: Piece, inputs: string[]): string | null {
  if (piece.kind === 'lit') return piece.text;
  const value = inputs[piece.col] ?? '';
  switch (piece.kind) {
    case 'whole':
      return value === '' ? null : cased(value, piece.as);
    case 'word': {
      const list = words(value);
      const word = list[piece.index >= 0 ? piece.index : list.length + piece.index];
      return word === undefined ? null : cased(word, piece.as);
    }
    case 'initial': {
      const list = words(value);
      const word = list[piece.index >= 0 ? piece.index : list.length + piece.index];
      return word === undefined ? null : word[0].toUpperCase();
    }
    case 'left':
      return value.length >= piece.count ? value.slice(0, piece.count) : null;
    case 'right':
      return value.length >= piece.count ? value.slice(value.length - piece.count) : null;
  }
}

const run = (program: Piece[], inputs: string[]): string | null => {
  let out = '';
  for (const piece of program) {
    const text = render(piece, inputs);
    if (text === null) return null;
    out += text;
  }
  return out;
};

/** Every piece that could stand for some of the output, written with the first example's inputs. */
function candidates(inputs: string[]): Piece[] {
  const out: Piece[] = [];
  inputs.forEach((value, col) => {
    if (value === '') return;
    const list = words(value);
    for (const as of ['asis', 'upper', 'lower', 'proper'] as Case[]) out.push({ kind: 'whole', col, as });
    list.forEach((_, i) => {
      for (const as of ['asis', 'upper', 'lower', 'proper'] as Case[]) {
        out.push({ kind: 'word', col, index: i, as });
        out.push({ kind: 'word', col, index: i - list.length, as });
      }
      out.push({ kind: 'initial', col, index: i });
      out.push({ kind: 'initial', col, index: i - list.length });
    });
    for (let count = 1; count <= value.length; count += 1) {
      out.push({ kind: 'left', col, count });
      out.push({ kind: 'right', col, count });
    }
  });
  return out;
}

/** A recipe that gives every example's output from its inputs, or null. */
export function learnFlashFill(examples: FlashExample[]): Piece[] | null {
  if (examples.length === 0) return null;
  const first = examples[0];
  const pool = candidates(first.inputs)
    .map((piece) => ({ piece, text: render(piece, first.inputs) ?? '' }))
    .filter((c) => c.text !== '')
    .sort((a, b) => b.text.length - a.text.length);
  let budget = 40_000;
  const fits = (program: Piece[]) => examples.every((e) => run(program, e.inputs) === e.output);
  const search = (at: number, program: Piece[]): Piece[] | null => {
    if (budget-- <= 0) return null;
    if (at === first.output.length) return fits(program) ? program : null;
    for (const c of pool) {
      if (!first.output.startsWith(c.text, at)) continue;
      const found = search(at + c.text.length, [...program, c.piece]);
      if (found) return found;
    }
    const last = program[program.length - 1];
    const text = first.output[at];
    const literal: Piece = last?.kind === 'lit' ? { kind: 'lit', text: last.text + text } : { kind: 'lit', text };
    return search(at + 1, last?.kind === 'lit' ? [...program.slice(0, -1), literal] : [...program, literal]);
  };
  return search(0, []);
}

/** The recipe applied to one row's inputs; null when the row does not fit it. */
export const applyFlashFill = (program: Piece[], inputs: string[]): string | null => run(program, inputs);
