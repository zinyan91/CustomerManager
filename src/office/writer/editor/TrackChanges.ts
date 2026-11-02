import { Extension, Mark, mergeAttributes } from '@tiptap/core';
import type { Mark as PMMark, MarkType, Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, TextSelection, type EditorState, type Transaction } from '@tiptap/pm/state';
import { ReplaceStep } from '@tiptap/pm/transform';
import type { EditorView } from '@tiptap/pm/view';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    trackChanges: {
      toggleTrackChanges: () => ReturnType;
      /** Keeps the changes in the selection, or in the whole document when nothing is selected. */
      acceptChanges: () => ReturnType;
      /** Takes the changes in the selection (or the whole document) back. */
      rejectChanges: () => ReturnType;
    };
  }
}

export interface TrackChangesOptions {
  author: () => string;
}

const PLUGIN = new PluginKey('trackChanges');

const markAttributes = {
  author: { default: '', parseHTML: (element: HTMLElement) => element.getAttribute('data-author') ?? '' },
  date: { default: '', parseHTML: (element: HTMLElement) => element.getAttribute('data-date') ?? '' },
};

function changeMark(name: 'insertion' | 'deletion', tag: 'ins' | 'del') {
  return Mark.create({
    name,
    inclusive: false,
    addAttributes: () => markAttributes,
    // Ahead of the strike-through mark, which takes every <del> for its own.
    parseHTML: () => [{ tag: `${tag}[data-track]`, priority: 100 }],
    renderHTML: ({ HTMLAttributes }) => [
      tag,
      mergeAttributes({ 'data-track': name, 'data-author': HTMLAttributes.author, 'data-date': HTMLAttributes.date, title: `${HTMLAttributes.author} ${HTMLAttributes.date}` }),
      0,
    ],
  });
}

export const Insertion = changeMark('insertion', 'ins');
export const Deletion = changeMark('deletion', 'del');

/** A point in time written to the minute, so that text typed in one go is one change, not one per letter. */
const minute = (): string => new Date().toISOString().slice(0, 16);

interface Run {
  from: number;
  to: number;
  kind: 'insertion' | 'deletion';
}

/** The stretches of text in a range that carry a tracked change. */
function changesIn(doc: PMNode, from: number, to: number): Run[] {
  const runs: Run[] = [];
  doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isText) return true;
    const a = Math.max(from, pos);
    const b = Math.min(to, pos + node.nodeSize);
    for (const mark of node.marks) {
      if (mark.type.name === 'insertion' || mark.type.name === 'deletion') runs.push({ from: a, to: b, kind: mark.type.name });
    }
    return false;
  });
  return runs;
}

/**
 * Marks [from, to) as deleted: text another change had inserted goes for good (taking back one's own
 * insertion), the rest stays, struck through.
 */
function markDeleted(tr: Transaction, from: number, to: number, mark: PMMark, insertion: MarkType): void {
  const gone: Array<[number, number]> = [];
  const keep: Array<[number, number]> = [];
  tr.doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isText) return true;
    const a = Math.max(from, pos);
    const b = Math.min(to, pos + node.nodeSize);
    if (a >= b) return false;
    (node.marks.some((m) => m.type === insertion) ? gone : keep).push([a, b]);
    return false;
  });
  keep.forEach(([a, b]) => tr.addMark(a, b, mark));
  [...gone].reverse().forEach(([a, b]) => tr.delete(a, b));
}

/** Backspace and Delete in suggestion mode strike a character through instead of removing it. */
function handleDeletion(view: EditorView, key: 'Backspace' | 'Delete', state: EditorState, author: string): boolean {
  const { selection } = state;
  let { from, to } = selection;
  if (selection.empty) {
    const $pos = selection.$from;
    if (key === 'Backspace') {
      if ($pos.parentOffset === 0 || !$pos.parent.inlineContent) return false;
      from -= 1;
    } else {
      if ($pos.parentOffset >= $pos.parent.content.size || !$pos.parent.inlineContent) return false;
      to += 1;
    }
    if (!state.doc.textBetween(from, to).length) return false;
  }
  const { deletion, insertion } = state.schema.marks;
  const tr = state.tr.setMeta(PLUGIN, true);
  markDeleted(tr, from, to, deletion.create({ author, date: minute() }), insertion);
  const target = key === 'Backspace' || !selection.empty ? Math.min(from, tr.doc.content.size) : Math.min(to, tr.doc.content.size);
  tr.setSelection(TextSelection.near(tr.doc.resolve(target)));
  view.dispatch(tr);
  return true;
}

/**
 * Word's Track Changes: with it on, typed and pasted text is marked as inserted and deleted text stays,
 * struck through; Accept and Reject settle the changes in the selection or the whole document.
 */
export const TrackChanges = Extension.create<TrackChangesOptions, { enabled: boolean }>({
  name: 'trackChanges',

  addOptions() {
    return { author: () => 'Felix Office' };
  },

  addStorage() {
    return { enabled: false };
  },

  addExtensions() {
    return [Insertion, Deletion];
  },

  addCommands() {
    const settle = (accept: boolean) =>
      () =>
      ({ tr, state, dispatch }: { tr: Transaction; state: EditorState; dispatch?: (tr: Transaction) => void }) => {
        const { from, to, empty } = state.selection;
        const [a, b] = empty ? [0, state.doc.content.size] : [from, to];
        const runs = changesIn(state.doc, a, b);
        if (runs.length === 0) return false;
        if (dispatch) {
          const { insertion, deletion } = state.schema.marks;
          const remove: Array<[number, number]> = [];
          for (const run of runs) {
            const dropsText = accept ? run.kind === 'deletion' : run.kind === 'insertion';
            if (dropsText) remove.push([run.from, run.to]);
            else tr.removeMark(run.from, run.to, run.kind === 'insertion' ? insertion : deletion);
          }
          [...remove].sort((x, y) => y[0] - x[0]).forEach(([x, y]) => tr.delete(x, y));
          tr.setMeta(PLUGIN, true);
        }
        return true;
      };
    return {
      toggleTrackChanges:
        () =>
        ({ tr, dispatch }) => {
          this.storage.enabled = !this.storage.enabled;
          if (dispatch) dispatch(tr.setMeta(PLUGIN, 'toggle'));
          return true;
        },
      acceptChanges: settle(true),
      rejectChanges: settle(false),
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: PLUGIN,
        props: {
          handleKeyDown: (view, event) => {
            if (!this.storage.enabled || (event.key !== 'Backspace' && event.key !== 'Delete') || event.ctrlKey || event.metaKey) return false;
            if (!handleDeletion(view, event.key, view.state, this.options.author())) return false;
            event.preventDefault();
            return true;
          },
          // Typing over a selection strikes the selected text through and writes the new text after it.
          handleTextInput: (view, from, to, text) => {
            if (!this.storage.enabled || from === to) return false;
            const { deletion, insertion } = view.state.schema.marks;
            const tr = view.state.tr.setMeta(PLUGIN, true);
            markDeleted(tr, from, to, deletion.create({ author: this.options.author(), date: minute() }), insertion);
            const at = tr.mapping.map(to);
            tr.insertText(text, at).removeMark(at, at + text.length, deletion);
            tr.addMark(at, at + text.length, insertion.create({ author: this.options.author(), date: minute() }));
            tr.setSelection(TextSelection.near(tr.doc.resolve(at + text.length)));
            view.dispatch(tr);
            return true;
          },
        },
        appendTransaction: (transactions, _old, state) => {
          if (!this.storage.enabled) return null;
          if (transactions.some((t) => t.getMeta(PLUGIN) || t.getMeta('history$') || !t.docChanged)) return null;
          const { insertion } = state.schema.marks;
          const tr = state.tr;
          let changed = false;
          for (const transaction of transactions) {
            transaction.steps.forEach((step, index) => {
              if (!(step instanceof ReplaceStep)) return;
              const { from, to, slice } = step as unknown as { from: number; to: number; slice: { size: number } };
              if (from !== to || slice.size === 0) return;
              const mapping = transaction.mapping.slice(index + 1);
              const start = mapping.map(from, -1);
              const end = mapping.map(from + slice.size, 1);
              if (end <= start || end > state.doc.content.size) return;
              tr.addMark(start, end, insertion.create({ author: this.options.author(), date: minute() }));
              changed = true;
            });
          }
          return changed ? tr.setMeta(PLUGIN, true) : null;
        },
      }),
    ];
  },
});
