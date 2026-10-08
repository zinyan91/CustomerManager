import { Node, mergeAttributes } from '@tiptap/core';
import type { Node as PmNode } from '@tiptap/pm/model';
import { TextSelection } from '@tiptap/pm/state';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tableOfContents: {
      insertTableOfContents: () => ReturnType;
    };
  }
}

export interface TableOfContentsOptions {
  title: () => string;
  empty: () => string;
}

interface Entry {
  level: number;
  text: string;
  pos: number;
}

function headingsOf(doc: PmNode): Entry[] {
  const entries: Entry[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name === 'heading') {
      const level = Number(node.attrs.level);
      const text = node.textContent.trim();
      if (level <= 3 && text) entries.push({ level, text, pos });
      return false;
    }
    return true;
  });
  return entries;
}

/**
 * A table of contents that keeps itself current: the node stores nothing, and
 * its view lists the document's level 1–3 headings on every change. Clicking
 * an entry moves the cursor there. The DOCX writer emits a Word TOC field
 * instead (Word fills in the page numbers when the file opens); print writes
 * the entries in (printService.fillTableOfContents).
 */
export const TableOfContents = Node.create<TableOfContentsOptions>({
  name: 'tableOfContents',
  group: 'block',
  atom: true,
  selectable: true,

  addOptions() {
    return { title: () => 'Table of contents', empty: () => '' };
  },

  parseHTML() {
    return [{ tag: 'nav[data-type="table-of-contents"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['nav', mergeAttributes(HTMLAttributes, { 'data-type': 'table-of-contents' })];
  },

  addCommands() {
    return {
      insertTableOfContents:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name }),
    };
  },

  addNodeView() {
    return ({ editor }) => {
      const dom = document.createElement('nav');
      dom.setAttribute('data-type', 'table-of-contents');
      dom.className = 'writer-toc';
      dom.contentEditable = 'false';

      let last = '';
      const render = () => {
        const entries = headingsOf(editor.state.doc);
        const key = JSON.stringify([this.options.title(), entries.map((e) => [e.level, e.text, e.pos])]);
        if (key === last) return;
        last = key;
        dom.replaceChildren();
        const title = document.createElement('p');
        title.className = 'toc-title';
        title.textContent = this.options.title();
        dom.append(title);
        if (entries.length === 0) {
          const empty = document.createElement('p');
          empty.className = 'toc-empty';
          empty.textContent = this.options.empty();
          dom.append(empty);
          return;
        }
        const list = document.createElement('ol');
        for (const entry of entries) {
          const item = document.createElement('li');
          item.dataset.level = String(entry.level);
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = entry.text;
          button.addEventListener('mousedown', (event) => {
            event.preventDefault();
            const { state, view } = editor;
            const target = Math.min(entry.pos + 1, state.doc.content.size);
            view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, target)).scrollIntoView());
            view.focus();
          });
          item.append(button);
          list.append(item);
        }
        dom.append(list);
      };

      render();
      editor.on('update', render);
      return {
        dom,
        ignoreMutation: () => true,
        stopEvent: (event) => event.type === 'mousedown' && (event.target as HTMLElement).tagName === 'BUTTON',
        destroy: () => editor.off('update', render),
      };
    };
  },
});
