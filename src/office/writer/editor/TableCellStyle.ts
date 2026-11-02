import { Extension } from '@tiptap/core';

const CELLS = ['tableCell', 'tableHeader'];

/** `#rrggbb` from what an element says: the attribute the importer writes, or a computed colour. */
function hexOf(element: HTMLElement): string | null {
  const given = element.getAttribute('data-background');
  if (given && /^#[0-9a-f]{6}$/i.test(given)) return given.toLowerCase();
  const rgb = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(element.style.backgroundColor);
  if (rgb) return `#${[rgb[1], rgb[2], rgb[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`;
  return /^#[0-9a-f]{6}$/i.test(element.style.backgroundColor) ? element.style.backgroundColor.toLowerCase() : null;
}

/** The lines of a table: `none`, or the colour they are drawn in; absent for the editor's own grey grid. */
export const TableBorders = Extension.create({
  name: 'tableBorders',

  addGlobalAttributes() {
    return [
      {
        types: ['table'],
        attributes: {
          borders: {
            default: null,
            parseHTML: (element) => {
              const given = element.getAttribute('data-borders');
              return given === 'none' || (given && /^#[0-9a-f]{6}$/i.test(given)) ? given.toLowerCase() : null;
            },
            renderHTML: (attributes) => {
              if (!attributes.borders) return {};
              return attributes.borders === 'none' ? { 'data-borders': 'none' } : { 'data-borders': attributes.borders, style: `--wr-border: ${attributes.borders}` };
            },
          },
        },
      },
    ];
  },
});

/**
 * What a form says about the shape of its tables: how tall a row is at least, and where the text sits in a cell.
 * Kept on the row and on the cell, drawn as the height and `vertical-align`, written to DOCX as the row's height
 * and the cell's vertical alignment.
 */
export const TableLayoutAttributes = Extension.create({
  name: 'tableLayoutAttributes',

  addGlobalAttributes() {
    return [
      {
        types: ['tableRow'],
        attributes: {
          rowHeight: {
            default: null,
            parseHTML: (element) => {
              const value = Number(element.getAttribute('data-row-height'));
              return Number.isFinite(value) && value > 0 ? value : null;
            },
            renderHTML: (attributes) => (attributes.rowHeight ? { 'data-row-height': String(attributes.rowHeight), style: `height: ${attributes.rowHeight}px` } : {}),
          },
        },
      },
      {
        types: CELLS,
        attributes: {
          valign: {
            default: null,
            parseHTML: (element) => {
              const value = element.getAttribute('data-valign');
              return value === 'center' || value === 'bottom' ? value : null;
            },
            renderHTML: (attributes) => (attributes.valign ? { 'data-valign': attributes.valign, style: `vertical-align: ${attributes.valign === 'center' ? 'middle' : 'bottom'}` } : {}),
          },
        },
      },
    ];
  },
});

/**
 * Shading of a table cell, as Word's Shading button gives it: a colour kept on the
 * cell, drawn as its background and written to DOCX as the cell's fill. Set with
 * the table extension's `setCellAttribute('background', colour)`.
 */
export const TableCellStyle = Extension.create({
  name: 'tableCellStyle',

  addGlobalAttributes() {
    return [
      {
        types: CELLS,
        attributes: {
          background: {
            default: null,
            parseHTML: (element) => hexOf(element),
            renderHTML: (attributes) =>
              attributes.background ? { 'data-background': attributes.background, style: `background-color: ${attributes.background}` } : {},
          },
        },
      },
    ];
  },
});
