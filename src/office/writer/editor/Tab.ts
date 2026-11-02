import { Node } from '@tiptap/core';

/**
 * A tab character, which a form leans on to line things up. The editor's HTML parser folds a tab into a space, so
 * it is a node of its own: drawn as a gap of Word's default tab width and written to DOCX as a real tab.
 */
export const Tab = Node.create({
  name: 'tab',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: false,

  parseHTML() {
    return [{ tag: 'span[data-tab]' }];
  },

  renderHTML() {
    return ['span', { 'data-tab': '', class: 'writer-tab' }];
  },
});
