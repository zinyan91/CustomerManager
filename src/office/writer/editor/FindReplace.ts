import { Extension } from '@tiptap/core';
import type { Node as PmNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, TextSelection, type EditorState, type Transaction } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface Match {
  from: number;
  to: number;
}

interface SearchState {
  query: string;
  matchCase: boolean;
  matches: Match[];
  current: number;
  decorations: DecorationSet;
}

export const findReplaceKey = new PluginKey<SearchState>('felixFindReplace');

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    findReplace: {
      setSearch: (query: string, matchCase: boolean) => ReturnType;
      clearSearch: () => ReturnType;
      findNext: () => ReturnType;
      findPrevious: () => ReturnType;
      replaceCurrent: (replacement: string) => ReturnType;
      replaceAll: (replacement: string) => ReturnType;
    };
  }
}

/**
 * Every occurrence of `query` in the document. A match may cross formatting
 * (half bold, half not) but not a paragraph boundary, as in Word.
 */
export function findMatches(doc: PmNode, query: string, matchCase: boolean): Match[] {
  if (!query) return [];
  const needle = matchCase ? query : query.toLocaleLowerCase();
  const matches: Match[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    // Text of the block, with the document position of each character.
    let text = '';
    const positions: number[] = [];
    node.forEach((child, offset) => {
      if (child.isText && child.text) {
        for (let i = 0; i < child.text.length; i += 1) positions.push(pos + 1 + offset + i);
        text += child.text;
      } else {
        // An inline image or a hard break interrupts a match.
        positions.push(-1);
        text += '\u0000';
      }
    });
    const haystack = matchCase ? text : text.toLocaleLowerCase();
    let index = haystack.indexOf(needle);
    while (index !== -1) {
      const from = positions[index];
      const to = positions[index + needle.length - 1];
      if (from >= 0 && to >= 0) matches.push({ from, to: to + 1 });
      index = haystack.indexOf(needle, index + needle.length);
    }
    return false;
  });
  return matches;
}

function decorate(doc: PmNode, matches: Match[], current: number): DecorationSet {
  return DecorationSet.create(
    doc,
    matches.map((match, i) =>
      Decoration.inline(match.from, match.to, { class: i === current ? 'writer-find-current' : 'writer-find-match' }),
    ),
  );
}

function computeState(doc: PmNode, query: string, matchCase: boolean, near: number): SearchState {
  const matches = findMatches(doc, query, matchCase);
  let current = matches.findIndex((m) => m.from >= near);
  if (current === -1) current = matches.length ? 0 : -1;
  return { query, matchCase, matches, current, decorations: decorate(doc, matches, current) };
}

const EMPTY: SearchState = { query: '', matchCase: false, matches: [], current: -1, decorations: DecorationSet.empty };

type Meta = { type: 'set'; query: string; matchCase: boolean } | { type: 'move'; current: number } | { type: 'clear' };

export function searchState(state: EditorState): SearchState {
  return findReplaceKey.getState(state) ?? EMPTY;
}

function select(tr: Transaction, match: Match | undefined): Transaction {
  if (!match) return tr;
  return tr.setSelection(TextSelection.create(tr.doc, match.from, match.to)).scrollIntoView();
}

/** Highlights matches as decorations; the panel (FindReplacePanel) drives it through the commands. */
export const FindReplace = Extension.create({
  name: 'findReplace',

  addProseMirrorPlugins() {
    return [
      new Plugin<SearchState>({
        key: findReplaceKey,
        state: {
          init: () => EMPTY,
          apply(tr, value) {
            const meta = tr.getMeta(findReplaceKey) as Meta | undefined;
            if (meta?.type === 'clear') return EMPTY;
            if (meta?.type === 'set') return computeState(tr.doc, meta.query, meta.matchCase, tr.selection.from);
            if (meta?.type === 'move') {
              return { ...value, current: meta.current, decorations: decorate(tr.doc, value.matches, meta.current) };
            }
            if (tr.docChanged && value.query) {
              return computeState(tr.doc, value.query, value.matchCase, tr.selection.from);
            }
            return value;
          },
        },
        props: {
          decorations: (state) => searchState(state).decorations,
        },
      }),
    ];
  },

  addCommands() {
    const move =
      (step: number) =>
      () =>
      ({ state, tr }: { state: EditorState; tr: Transaction }) => {
        const { matches, current } = searchState(state);
        if (!matches.length) return false;
        const next = (current + step + matches.length) % matches.length;
        select(tr.setMeta(findReplaceKey, { type: 'move', current: next } satisfies Meta), matches[next]);
        return true;
      };

    return {
      setSearch:
        (query, matchCase) =>
        ({ tr }) => {
          tr.setMeta(findReplaceKey, { type: 'set', query, matchCase } satisfies Meta);
          return true;
        },
      clearSearch:
        () =>
        ({ tr }) => {
          tr.setMeta(findReplaceKey, { type: 'clear' } satisfies Meta);
          return true;
        },
      findNext: move(1),
      findPrevious: move(-1),
      replaceCurrent:
        (replacement) =>
        ({ state, tr }) => {
          const { matches, current } = searchState(state);
          const match = matches[current];
          if (!match) return false;
          if (replacement) tr.insertText(replacement, match.from, match.to);
          else tr.delete(match.from, match.to);
          // The plugin recomputes the matches from the changed document.
          tr.setSelection(TextSelection.create(tr.doc, match.from + replacement.length));
          return true;
        },
      replaceAll:
        (replacement) =>
        ({ state, tr }) => {
          const { matches } = searchState(state);
          if (!matches.length) return false;
          // From the end, so earlier positions stay valid.
          for (const match of [...matches].reverse()) {
            if (replacement) tr.insertText(replacement, match.from, match.to);
            else tr.delete(match.from, match.to);
          }
          return true;
        },
    };
  },
});
