import { Extension, type CommandProps } from '@tiptap/core';

/** Indent steps a paragraph may take; one step is 1.27 cm, as in Word. */
export const MAX_INDENT = 8;
export const INDENT_STEP_CM = 1.27;
export const LINE_HEIGHTS = ['1', '1.15', '1.5', '2', '2.5', '3'] as const;

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    paragraphFormat: {
      /** Inside a list, sinks or lifts the item; elsewhere moves the paragraph one step. */
      indent: () => ReturnType;
      outdent: () => ReturnType;
      setLineHeight: (lineHeight: string | null) => ReturnType;
    };
  }
}

const TYPES = ['paragraph', 'heading'];

/**
 * Paragraph-level formatting Word has and the starter kit does not: left
 * indent in steps, and line spacing. Both are node attributes, so they stay
 * with the paragraph, render as inline styles, and the DOCX writer reads them
 * back as `indent` and `lineHeight`.
 */
export const ParagraphFormat = Extension.create({
  name: 'paragraphFormat',

  addGlobalAttributes() {
    return [
      {
        types: TYPES,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const margin = parseFloat(element.style.marginLeft || '0');
              const unit = element.style.marginLeft.endsWith('cm') ? 1 : 1 / 37.8;
              const steps = Math.round((margin * unit) / INDENT_STEP_CM);
              return Number.isFinite(steps) ? Math.min(MAX_INDENT, Math.max(0, steps)) : 0;
            },
            renderHTML: (attributes) =>
              attributes.indent > 0 ? { style: `margin-left: ${(attributes.indent * INDENT_STEP_CM).toFixed(2)}cm` } : {},
          },
          lineHeight: {
            default: null,
            parseHTML: (element) => {
              const value = parseFloat(element.style.lineHeight);
              return Number.isFinite(value) && value > 0 && value <= 5 ? String(value) : null;
            },
            renderHTML: (attributes) => (attributes.lineHeight ? { style: `line-height: ${attributes.lineHeight}` } : {}),
          },
        },
      },
    ];
  },

  addCommands() {
    const shift =
      (delta: number) =>
      () =>
      ({ editor, tr, state }: CommandProps) => {
        if (editor.isActive('listItem')) {
          return delta > 0 ? editor.commands.sinkListItem('listItem') : editor.commands.liftListItem('listItem');
        }
        if (editor.isActive('taskItem')) {
          return delta > 0 ? editor.commands.sinkListItem('taskItem') : editor.commands.liftListItem('taskItem');
        }
        let changed = false;
        const { from, to } = state.selection;
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (!TYPES.includes(node.type.name)) return true;
          const indent = Math.min(MAX_INDENT, Math.max(0, Number(node.attrs.indent ?? 0) + delta));
          if (indent !== node.attrs.indent) {
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent });
            changed = true;
          }
          return false;
        });
        // TipTap dispatches `tr` itself after a command that returns true.
        return changed;
      };

    return {
      indent: shift(1),
      outdent: shift(-1),
      setLineHeight:
        (lineHeight) =>
        ({ commands }) =>
          TYPES.map((type) => commands.updateAttributes(type, { lineHeight })).some(Boolean),
    };
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        // Inside a table Tab moves between cells (the table extension's binding).
        if (this.editor.isActive('table')) return false;
        this.editor.commands.indent();
        return true;
      },
      'Shift-Tab': () => {
        if (this.editor.isActive('table')) return false;
        this.editor.commands.outdent();
        return true;
      },
    };
  },
});
