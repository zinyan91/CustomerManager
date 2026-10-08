import React, { useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import {
  FileDigit,
  Image as ImageIcon,
  Link as LinkIcon,
  ListTree,
  Minus,
  Omega,
  Rows3,
  SeparatorHorizontal,
  Table as TableIcon,
  Trash2,
  TableCellsMerge,
  TableCellsSplit,
  Columns3,
  PanelTop,
} from 'lucide-react';
import { useOfficeI18n } from '../../../i18n';
import type { WriterFormatState } from '../../editor/useWriterState';
import { SPECIAL_CHARACTERS } from '../../../shared/formatOptions';
import { promptLink } from '../../editor/linkPrompt';
import { prepareImage } from '../../../shared/imageImport';
import { Btn, Group, Popover } from '../../../shared/ribbon/controls';

const GRID_ROWS = 8;
const GRID_COLS = 8;

/** The table-size grid: hover to size, click to insert. */
const TableGrid: React.FC<{ onPick: (rows: number, cols: number) => void; label: (rows: number, cols: number) => string }> = ({
  onPick,
  label,
}) => {
  const [hover, setHover] = useState({ rows: 0, cols: 0 });
  return (
    <div className="wr-table-grid">
      <div className="wr-table-grid-cells" onMouseLeave={() => setHover({ rows: 0, cols: 0 })}>
        {Array.from({ length: GRID_ROWS * GRID_COLS }, (_, i) => {
          const row = Math.floor(i / GRID_COLS) + 1;
          const col = (i % GRID_COLS) + 1;
          return (
            <button
              key={i}
              type="button"
              aria-label={label(row, col)}
              className={row <= hover.rows && col <= hover.cols ? 'is-on' : undefined}
              onMouseEnter={() => setHover({ rows: row, cols: col })}
              onFocus={() => setHover({ rows: row, cols: col })}
              onClick={() => onPick(row, col)}
            />
          );
        })}
      </div>
      <div className="wr-table-grid-label">{hover.rows ? label(hover.rows, hover.cols) : ' '}</div>
    </div>
  );
};

export const InsertTab: React.FC<{
  editor: Editor;
  state: WriterFormatState;
  contentWidthPx: number;
  onError: (message: string) => void;
}> = ({ editor, state, contentWidthPx, onError }) => {
  const { m } = useOfficeI18n();
  const t = m.writer;
  const run = () => editor.chain().focus();
  const imageInput = useRef<HTMLInputElement>(null);

  const insertImage = async (file: File) => {
    try {
      const image = await prepareImage(file);
      const width = Math.min(image.width, Math.round(contentWidthPx));
      run().setImage({ src: image.src, alt: image.alt, width } as { src: string; alt: string }).run();
    } catch (error) {
      onError(error instanceof Error ? error.message : t.errors.imageFailed);
    }
  };

  return (
    <div className="wr-tab-body">
      <Group label={t.groups.table}>
        <Popover
          button={({ toggle }) => (
            <Btn title={t.cmd.table} onClick={toggle}>
              <TableIcon size={16} />
            </Btn>
          )}
        >
          {(close) => (
            <TableGrid
              label={t.cmd.tableInsert}
              onPick={(rows, cols) => {
                run().insertTable({ rows, cols, withHeaderRow: false }).run();
                close();
              }}
            />
          )}
        </Popover>
        <Btn title={t.cmd.addRowBefore} disabled={!state.inTable} onClick={() => run().addRowBefore().run()}>
          <Rows3 size={16} className="wr-flip-v" />
        </Btn>
        <Btn title={t.cmd.addRowAfter} disabled={!state.inTable} onClick={() => run().addRowAfter().run()}>
          <Rows3 size={16} />
        </Btn>
        <Btn title={t.cmd.addColBefore} disabled={!state.inTable} onClick={() => run().addColumnBefore().run()}>
          <Columns3 size={16} className="wr-flip-h" />
        </Btn>
        <Btn title={t.cmd.addColAfter} disabled={!state.inTable} onClick={() => run().addColumnAfter().run()}>
          <Columns3 size={16} />
        </Btn>
        <Btn title={t.cmd.deleteRow} disabled={!state.inTable} onClick={() => run().deleteRow().run()}>
          <Minus size={16} />
        </Btn>
        <Btn title={t.cmd.deleteCol} disabled={!state.inTable} onClick={() => run().deleteColumn().run()}>
          <SeparatorHorizontal size={16} className="wr-rot" />
        </Btn>
        <Btn title={t.cmd.mergeCells} disabled={!state.canMergeCells} onClick={() => run().mergeCells().run()}>
          <TableCellsMerge size={16} />
        </Btn>
        <Btn title={t.cmd.splitCell} disabled={!state.canSplitCell} onClick={() => run().splitCell().run()}>
          <TableCellsSplit size={16} />
        </Btn>
        <Btn title={t.cmd.headerRow} disabled={!state.inTable} onClick={() => run().toggleHeaderRow().run()}>
          <PanelTop size={16} />
        </Btn>
        <Btn title={t.cmd.deleteTable} disabled={!state.inTable} onClick={() => run().deleteTable().run()}>
          <Trash2 size={16} />
        </Btn>
      </Group>

      <Group label={t.groups.media}>
        <Btn title={t.cmd.image} onClick={() => imageInput.current?.click()}>
          <ImageIcon size={16} />
        </Btn>
        <input
          ref={imageInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void insertImage(file);
          }}
        />
        {state.imageSelected && (
          <select
            className="wr-select"
            title={t.cmd.image}
            aria-label={t.cmd.image}
            value=""
            onChange={(event) => {
              const percent = Number(event.target.value);
              if (percent) run().updateAttributes('image', { width: Math.round((contentWidthPx * percent) / 100) }).run();
            }}
          >
            <option value="">{state.imageWidth ? `${Math.round((state.imageWidth / contentWidthPx) * 100)}%` : '…'}</option>
            {[25, 50, 75, 100].map((percent) => (
              <option key={percent} value={percent}>
                {percent}%
              </option>
            ))}
          </select>
        )}
        {state.imageSelected && (
          <select
            className="wr-select"
            title={t.cmd.imageWrap}
            aria-label={t.cmd.imageWrap}
            value={state.imageFloat ?? ''}
            onChange={(event) => run().updateAttributes('image', { float: event.target.value || null }).run()}
          >
            <option value="">{t.cmd.wrapNone}</option>
            <option value="left">{t.cmd.wrapLeft}</option>
            <option value="right">{t.cmd.wrapRight}</option>
          </select>
        )}
      </Group>

      <Group label={t.groups.links}>
        <Btn title={t.cmd.link} active={state.link} onClick={() => promptLink(editor, t.cmd.linkPrompt)}>
          <LinkIcon size={16} />
        </Btn>
      </Group>

      <Group label={t.groups.pages}>
        <Btn title={t.cmd.pageBreak} onClick={() => run().setPageBreak().run()}>
          <FileDigit size={16} />
        </Btn>
        <Btn title={t.cmd.horizontalRule} onClick={() => run().setHorizontalRule().run()}>
          <Minus size={16} />
        </Btn>
        <Btn title={t.cmd.toc} onClick={() => run().insertTableOfContents().run()}>
          <ListTree size={16} />
        </Btn>
      </Group>

      <Group label={t.groups.symbols}>
        <Popover
          button={({ toggle }) => (
            <Btn title={t.cmd.specialChar} onClick={toggle}>
              <Omega size={16} />
            </Btn>
          )}
        >
          {(close) => (
            <div className="wr-chars">
              {SPECIAL_CHARACTERS.map((char) => (
                <button
                  key={char}
                  type="button"
                  onClick={() => {
                    run().insertContent(char).run();
                    close();
                  }}
                >
                  {char}
                </button>
              ))}
            </div>
          )}
        </Popover>
      </Group>
    </div>
  );
};
