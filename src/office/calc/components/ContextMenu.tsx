import React, { useEffect, useRef } from 'react';
import { useOfficeI18n } from '../../i18n';
import type { CalcController } from '../controller';
import { DEFAULT_COL_WIDTH, ROW_HEIGHT } from '../model/workbook';
import { promptColumnWidth, promptRowHeight } from './layoutPrompts';
import { promptLink, promptNote } from './linkPrompts';
import { OPEN_FORMAT_EVENT } from '../shortcuts';

export type ContextKind = 'cell' | 'row' | 'col';

export interface ContextMenuProps {
  controller: CalcController;
  kind: ContextKind;
  x: number;
  y: number;
  onClose: () => void;
  onMessage: (text: string) => void;
}

type Item = { label: string; run: () => void } | 'separator';

/** What a right click offers: on a cell, on a row number or on a column letter. */
export const ContextMenu: React.FC<ContextMenuProps> = ({ controller, kind, x, y, onClose, onMessage }) => {
  const { m } = useOfficeI18n();
  const t = m.calc.cmd;
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const copy = (cut: boolean) => {
    const text = controller.copy(cut);
    void navigator.clipboard?.writeText(text).catch(() => {});
  };
  const paste = async () => {
    try {
      controller.paste(await navigator.clipboard.readText());
    } catch {
      onMessage(t.pasteBlocked);
    }
  };

  const clipboard: Item[] = [
    { label: t.cut, run: () => copy(true) },
    { label: t.copy, run: () => copy(false) },
    { label: t.paste, run: () => void paste() },
  ];
  const pasteSpecial: Item[] = [
    { label: t.pasteValues, run: () => controller.pasteSpecial('values') },
    { label: t.pasteFormulas, run: () => controller.pasteSpecial('formulas') },
    { label: t.pasteFormats, run: () => controller.pasteSpecial('formats') },
    { label: t.pasteTranspose, run: () => controller.pasteSpecial('transpose') },
  ];
  const clear: Item = { label: t.clearContents, run: () => controller.clearContents() };
  const rowSize: Item = { label: t.rowHeight, run: () => promptRowHeight(controller, t, ROW_HEIGHT) };
  const columnSize: Item = { label: t.columnWidth, run: () => promptColumnWidth(controller, t, DEFAULT_COL_WIDTH) };

  const formatCellsItem: Item = {
    label: m.calc.formatCells.open,
    run: () => window.dispatchEvent(new Event(OPEN_FORMAT_EVENT)),
  };

  const items: Item[] =
    kind === 'row'
      ? [
          ...clipboard,
          'separator',
          { label: t.insertRows, run: () => controller.insertRows() },
          { label: t.deleteRows, run: () => controller.deleteRows() },
          clear,
          'separator',
          formatCellsItem,
          rowSize,
          { label: t.hideRows, run: () => controller.hideRows() },
          { label: t.unhideRows, run: () => controller.unhideRows() },
        ]
      : kind === 'col'
        ? [
            ...clipboard,
            'separator',
            { label: t.insertColumns, run: () => controller.insertColumns() },
            { label: t.deleteColumns, run: () => controller.deleteColumns() },
            clear,
            'separator',
            formatCellsItem,
            columnSize,
            {
              label: t.autofit,
              run: () => {
                const { c1, c2 } = controller.selection;
                for (let c = c1; c <= c2; c += 1) controller.autofitColumn(c);
              },
            },
            { label: t.hideColumns, run: () => controller.hideColumns() },
            { label: t.unhideColumns, run: () => controller.unhideColumns() },
          ]
        : [
            ...clipboard,
            'separator',
            ...pasteSpecial,
            'separator',
            { label: t.insertRows, run: () => controller.insertRows() },
            { label: t.insertColumns, run: () => controller.insertColumns() },
            { label: t.deleteRows, run: () => controller.deleteRows() },
            { label: t.deleteColumns, run: () => controller.deleteColumns() },
            clear,
            'separator',
            formatCellsItem,
            { label: m.calc.links.edit, run: () => promptLink(controller, m.calc.links) },
            { label: m.calc.notes.edit, run: () => promptNote(controller, m.calc.notes) },
            'separator',
            rowSize,
            columnSize,
          ];

  // Keep the menu on screen near the edges.
  const left = Math.max(4, Math.min(x, window.innerWidth - 230));
  const top = Math.max(4, Math.min(y, window.innerHeight - items.length * 30 - 16));
  return (
    <div ref={root} className="calc-context-menu wr-menu" role="menu" style={{ left, top }} onContextMenu={(event) => event.preventDefault()}>
      {items.map((item, index) => {
        if (item === 'separator') {
          return <div key={`s${index}`} className="calc-context-separator" role="separator" />;
        }
        const match = item.label.match(/^(.*?)\s*(\((?:Ctrl|Shift|Alt)[^)]+\))$/);
        const mainLabel = match ? match[1] : item.label;
        const shortcut = match ? match[2].replace(/[()]/g, '') : null;
        return (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            className="wr-menu-item"
            onClick={() => {
              onClose();
              item.run();
            }}
          >
            <span className="calc-context-label">{mainLabel}</span>
            {shortcut && <span className="calc-context-shortcut">{shortcut}</span>}
          </button>
        );
      })}
    </div>
  );
};
