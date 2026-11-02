import { Mark, Node, getMarkRange } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    comment: {
      /** A comment on the selected text, or at the cursor when nothing is selected. */
      insertComment: (text: string) => ReturnType;
    };
  }
}

export interface CommentOptions {
  /** Asks for the text of a comment, starting from the given one; null leaves it as it was. */
  ask: (current: string) => string | null;
}

/**
 * A comment left in the text, kept in the node: a small marker whose text shows as its tooltip. A click edits it
 * (empty text removes it). It is written to DOCX as a Word comment, anchored at the same point.
 */
export const Comment = Node.create<CommentOptions>({
  name: 'comment',
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
        parseHTML: (element) => element.getAttribute('data-comment') ?? '',
        renderHTML: (attributes) => ({ 'data-comment': attributes.text, title: attributes.text }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-comment]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', { ...HTMLAttributes, class: 'wr-comment' }];
  },

  addCommands() {
    return {
      insertComment:
        (text) =>
        ({ commands, state }) => {
          if (text.trim() === '') return false;
          if (!state.selection.empty) return commands.setMark('commentRange', { text: text.trim() });
          return commands.insertContent({ type: this.name, attrs: { text: text.trim() } });
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          // A click in commented text edits its comment.
          handleClick: (view, pos) => {
            const { schema, doc } = view.state;
            const type = schema.marks.commentRange;
            const range = getMarkRange(doc.resolve(pos), type);
            if (!range) return false;
            const mark = doc.resolve(pos).marks().find((m) => m.type === type) ?? doc.nodeAt(range.from)?.marks.find((m) => m.type === type);
            const answer = this.options.ask(String(mark?.attrs.text ?? ''));
            if (answer === null) return true;
            const tr = view.state.tr.removeMark(range.from, range.to, type);
            if (answer.trim() !== '') tr.addMark(range.from, range.to, type.create({ text: answer.trim() }));
            view.dispatch(tr);
            return true;
          },
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

/** The text a comment is on: a mark carrying the comment, drawn highlighted. */
export const CommentRange = Mark.create({
  name: 'commentRange',
  inclusive: false,

  addAttributes() {
    return {
      text: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-comment-range') ?? '',
        renderHTML: (attributes) => ({ 'data-comment-range': attributes.text, title: attributes.text }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-comment-range]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', { ...HTMLAttributes, class: 'wr-comment-range' }, 0];
  },
});
