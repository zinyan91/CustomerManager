import { Node } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    footnote: {
      /** A numbered note at the cursor; the number follows the note's place among the others. */
      insertFootnote: (text: string) => ReturnType;
    };
  }
}

export interface FootnoteOptions {
  /** Asks for the text of a note, starting from the given one; null leaves it as it was. */
  ask: (current: string) => string | null;
}

/**
 * A footnote: a superscript number in the text whose note is kept in the node. The number is a CSS counter
 * (see contentCss.ts), so notes renumber themselves as they are added, moved or removed. A click edits the note.
 */
export const Footnote = Node.create<FootnoteOptions>({
  name: 'footnote',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addOptions() {
    return { ask: () => null };
  },

  addAttributes() {
    return {
      text: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-footnote') ?? '',
        renderHTML: (attributes) => ({ 'data-footnote': attributes.text, title: attributes.text }),
      },
    };
  },

  parseHTML() {
    // Ahead of the superscript mark, which would take the empty <sup> for its own and leave no note.
    return [{ tag: 'sup[data-footnote]', priority: 100 }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['sup', { ...HTMLAttributes, class: 'wr-footnote' }];
  },

  addCommands() {
    return {
      insertFootnote:
        (text) =>
        ({ commands }) =>
          text.trim() !== '' && commands.insertContent({ type: this.name, attrs: { text: text.trim() } }),
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleClickOn: (view, _pos, node, nodePos) => {
            if (node.type.name !== this.name) return false;
            const answer = this.options.ask(String(node.attrs.text ?? ''));
            if (answer === null) return true;
            const { tr } = view.state;
            if (answer.trim() === '') tr.delete(nodePos, nodePos + node.nodeSize);
            else tr.setNodeMarkup(nodePos, undefined, { ...node.attrs, text: answer.trim() });
            view.dispatch(tr);
            return true;
          },
        },
      }),
    ];
  },
});
