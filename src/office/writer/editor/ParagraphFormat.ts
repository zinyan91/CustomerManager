import { Extension, type CommandProps } from '@tiptap/core';

/** Indent steps a paragraph may take; one step is 1.27 cm, as in Word. */
export const MAX_INDENT = 8;
export const INDENT_STEP_CM = 1.27;
export const LINE_HEIGHTS = ['1', '1.15', '1.5', '2', '2.5', '3'] as const;
/** The gap Word's "Add space before paragraph" puts in, in points, and the first-line indent of a paragraph that has one, in centimetres. */
export const ADDED_SPACE_PT = 12;
export const FIRST_LINE_CM = 1.27;

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    paragraphFormat: {
      /** Inside a list, sinks or lifts the item; elsewhere moves the paragraph one step. */
      indent: () => ReturnType;
      outdent: () => ReturnType;
      setLineHeight: (lineHeight: string | null) => ReturnType;
      /** Space above and below the paragraph in points; null leaves the page view's own. */
      setParagraphSpacing: (spacing: { before?: number | null; after?: number | null }) => ReturnType;
      /** The first line of the paragraph pushed in, in centimetres; null or 0 takes it back. */
      setFirstLineIndent: (cm: number | null) => ReturnType;
    };
  }
}

const TYPES = ['paragraph', 'heading'];

/** A length in points from a CSS value, or null: only points are the editor's own. */
function points(value: string): number | null {
  const match = /^(-?[\d.]+)pt$/.exec(value.trim());
  const n = match ? Number(match[1]) : NaN;
  return Number.isFinite(n) && n >= 0 && n <= 200 ? n : null;
}

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
          spaceBefore: {
            default: null,
            parseHTML: (element) => points(element.style.marginTop),
            renderHTML: (attributes) => (attributes.spaceBefore !== null && attributes.spaceBefore !== undefined ? { style: `margin-top: ${attributes.spaceBefore}pt` } : {}),
          },
          spaceAfter: {
            default: null,
            parseHTML: (element) => points(element.style.marginBottom),
            renderHTML: (attributes) => (attributes.spaceAfter !== null && attributes.spaceAfter !== undefined ? { style: `margin-bottom: ${attributes.spaceAfter}pt` } : {}),
          },
          markSize: {
            default: null,
            parseHTML: (element) => {
              const value = Number(element.getAttribute('data-mark-size'));
              return Number.isFinite(value) && value >= 1 && value <= 200 ? value : null;
            },
            renderHTML: (attributes) => (attributes.markSize ? { 'data-mark-size': String(attributes.markSize), style: `--mark-size: ${attributes.markSize}pt` } : {}),
          },
          firstLine: {
            default: null,
            parseHTML: (element) => {
              const value = parseFloat(element.style.textIndent);
              if (!Number.isFinite(value) || value <= 0) return null;
              const unit = element.style.textIndent.replace(/[\d.\s-]/g, '');
              const cm = unit === 'pt' ? value * 0.03528 : unit === 'px' ? value / 37.8 : unit === 'cm' ? value : null;
              return cm === null ? null : Math.round(cm * 100) / 100;
            },
            renderHTML: (attributes) => (attributes.firstLine ? { style: `text-indent: ${attributes.firstLine}cm` } : {}),
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
      setParagraphSpacing:
        ({ before, after }) =>
        ({ commands }) => {
          const attrs: Record<string, number | null> = {};
          if (before !== undefined) attrs.spaceBefore = before;
          if (after !== undefined) attrs.spaceAfter = after;
          return TYPES.map((type) => commands.updateAttributes(type, attrs)).some(Boolean);
        },
      setFirstLineIndent:
        (cm) =>
        ({ commands }) =>
          TYPES.map((type) => commands.updateAttributes(type, { firstLine: cm ? cm : null })).some(Boolean),
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
