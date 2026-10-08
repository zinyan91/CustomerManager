import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { columnName, keyCol, keyRow, type RangePos } from '../engine/cellRef';
import { readChartData } from '../engine/chartData';
import { isError } from '../engine/values';
import { useOfficeI18n } from '../../i18n';
import { ChartView } from './ChartView';
import { FilterMenu } from './FilterMenu';
import { ListMenu } from './ValidationDialog';
import type { CalcController } from '../controller';
import { DEFAULT_COL_WIDTH, ROW_HEIGHT, rowHeightOf, type CellStyle } from '../model/workbook';

const HEADER_HEIGHT = 24;
const ROW_HEADER_WIDTH = 52;
const MIN_ROWS = 1000;
const MIN_COLS = 52;
/** Rows or columns drawn beyond the edge of the window, so a fast scroll shows no blank strip. */
const OVERSCAN = 3;

interface Frame {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface CalcGridProps {
  controller: CalcController;
  zoom: number;
  gridlines: boolean;
  /** Hàng đầu và cột đầu có chữ cột, số hàng; mặc định có. */
  headings?: boolean;
  /** Hiện công thức thay cho giá trị. */
  showFormulas?: boolean;
}

/** First index whose start is beyond `x`, minus one: the column or row under a coordinate. */
function indexAt(starts: number[], x: number): number {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= x) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

function textStyle(style: CellStyle, z: number, hasFill: boolean): React.CSSProperties {
  return {
    fontFamily: style.fontFamily ? `'${style.fontFamily}', var(--font-sans)` : undefined,
    fontSize: (style.fontSize ?? 11) * (96 / 72) * z,
    fontWeight: style.bold ? 700 : undefined,
    fontStyle: style.italic ? 'italic' : undefined,
    textDecoration: [style.underline ? 'underline' : '', style.strike ? 'line-through' : ''].filter(Boolean).join(' ') || undefined,
    // A fill is a light colour from a spreadsheet, so default text on it stays dark in both themes.
    color: style.color ?? (hasFill ? '#1f2328' : undefined),
  };
}

export const CalcGrid: React.FC<CalcGridProps> = ({ controller, zoom, gridlines, headings = true, showFormulas = false }) => {
  useSyncExternalStore(controller.subscribe, controller.getVersion);
  const wb = controller.wb;
  // Read once per render: the memos below depend on it, since the workbook object itself never changes.
  const version = wb.version;
  const sheetIndex = controller.active;
  const sheet = wb.sheets[sheetIndex];
  const { m } = useOfficeI18n();
  const z = zoom / 100;
  const rowH = ROW_HEIGHT * z;
  const headH = headings ? HEADER_HEIGHT * z : 0;
  const rowHeadW = headings ? ROW_HEADER_WIDTH * z : 0;

  const scroller = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState<Frame>({ top: 0, left: 0, width: 900, height: 600 });
  const [filterMenu, setFilterMenu] = useState<{ col: number; left: number; bottom: number } | null>(null);
  const [listMenu, setListMenu] = useState<{ row: number; col: number; left: number; bottom: number } | null>(null);
  const [resizing, setResizing] = useState<{ col: number; width: number } | null>(null);
  const [resizingRow, setResizingRow] = useState<{ row: number; height: number } | null>(null);
  const [fillTarget, setFillTarget] = useState<{ row: number; col: number } | null>(null);
  /** A chart being moved or resized: its position and size in unzoomed pixels from the sheet's corner. */
  const [chartDrag, setChartDrag] = useState<{ id: string; x: number; y: number; width: number; height: number } | null>(null);
  const drag = useRef<
    | null
    | 'select'
    | 'fill'
    | { col: number; startX: number; startWidth: number }
    | { row: number; startY: number; startHeight: number }
    | { chart: string; mode: 'move' | 'size'; startX: number; startY: number; x: number; y: number; width: number; height: number }
  >(null);
  const chartDragRef = useRef<{ id: string; x: number; y: number; width: number; height: number } | null>(null);
  // What a drag has reached so far, kept in refs too so the mouse-up handler can act on it
  // without calling the controller from inside a state updater.
  const fillTargetRef = useRef<{ row: number; col: number } | null>(null);
  const resizingRef = useRef<{ col: number; width: number } | null>(null);
  const resizingRowRef = useRef<{ row: number; height: number } | null>(null);
  // Bấm tiêu đề hàng/cột/góc chọn cả hàng hay cột nên con trỏ nằm ở đầu xa; cuộn theo nó sẽ nhảy đi tuốt phía sau.
  const skipReveal = useRef<{ row: number; col: number } | null>(null);

  // `version` is not read inside: it is what tells these memos the workbook changed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const used = useMemo(() => wb.usedRange(sheetIndex), [wb, sheetIndex, version]);
  const { anchor, focus, editing } = controller;
  const selection = controller.selection;
  const rowCount = Math.max(MIN_ROWS, (used?.r2 ?? 0) + 200, Math.max(anchor.row, focus.row) + 100);
  const charts = sheet.charts;
  const images = sheet.images ?? [];
  /** Charts and pictures both float over the grid and move and resize the same way. */
  const floating = [...charts, ...images];
  const colCount = Math.max(MIN_COLS, (used?.c2 ?? 0) + 12, Math.max(anchor.col, focus.col) + 8, ...floating.map((c) => c.col + 8));

  const widthOf = useCallback(
    (col: number) => (resizing?.col === col ? resizing.width : (sheet.colWidths.get(col) ?? DEFAULT_COL_WIDTH)) * z,
    [sheet.colWidths, resizing, z],
  );
  const colX = useMemo(() => {
    const starts = [0];
    for (let c = 0; c < colCount; c += 1) starts.push(starts[c] + widthOf(c));
    return starts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colCount, widthOf, version]);
  // Rows a filter hides take no room: `rowY[r]` is where row r starts, in zoomed pixels from the first row.
  const hidden = wb.hiddenRows(sheetIndex);
  const heightOf = useCallback(
    (row: number) => (resizingRow?.row === row ? resizingRow.height : rowHeightOf(sheet, row)) * z,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sheet.rowHeights, resizingRow, z],
  );
  const rowY = useMemo(() => {
    const starts = [0];
    for (let r = 0; r < rowCount; r += 1) starts.push(starts[r] + (hidden.has(r) ? 0 : heightOf(r)));
    return starts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowCount, heightOf, hidden, version]);
  const rowStart = (row: number) => (row <= rowCount ? rowY[row] : rowY[rowCount] + (row - rowCount) * rowH);
  const totalW = rowHeadW + colX[colCount];
  const totalH = headH + rowY[rowCount];

  // ----- Window

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const read = () => setFrame({ top: el.scrollTop, left: el.scrollLeft, width: el.clientWidth, height: el.clientHeight });
    read();
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const c0 = Math.max(0, indexAt(colX, frame.left - rowHeadW) - OVERSCAN);
  const c1 = Math.min(colCount - 1, indexAt(colX, frame.left + frame.width - rowHeadW) + OVERSCAN);
  const r0 = Math.max(0, indexAt(rowY, frame.top - headH) - OVERSCAN);
  const r1 = Math.min(rowCount - 1, indexAt(rowY, frame.top + frame.height - headH) + OVERSCAN);

  const cellLeft = (col: number) => rowHeadW + colX[col];
  const cellTop = (row: number) => headH + rowStart(row);
  // Frozen rows and columns stay in view; the rest scrolls underneath.
  const fr = Math.min(sheet.freeze?.rows ?? 0, rowCount);
  const fc = Math.min(sheet.freeze?.cols ?? 0, colCount);
  const frozenW = colX[fc];
  const frozenH = rowY[fr];

  // Keep the cursor in view as it moves.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const { row, col } = controller.focus;
    const skip = skipReveal.current;
    skipReveal.current = null;
    if (skip && skip.row === row && skip.col === col) return;
    const left = cellLeft(col);
    const right = cellLeft(col + 1);
    const top = cellTop(row);
    const bottom = cellTop(row + 1);
    // A cursor in the frozen band is always in view; one beyond it must clear the band.
    if (col >= fc) {
      if (left - rowHeadW - frozenW < el.scrollLeft) el.scrollLeft = left - rowHeadW - frozenW;
      else if (right > el.scrollLeft + el.clientWidth) el.scrollLeft = right - el.clientWidth;
    }
    if (row >= fr) {
      if (top - headH - frozenH < el.scrollTop) el.scrollTop = top - headH - frozenH;
      else if (bottom > el.scrollTop + el.clientHeight) el.scrollTop = bottom - el.clientHeight;
    }
    // Only when the cursor moved, not on every repaint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller.focus.row, controller.focus.col, sheetIndex]);

  // ----- Charts

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const chartData = useMemo(
    () => charts.map((chart) => readChartData(chart.range, (r, c) => wb.valueAt(sheetIndex, r, c), (r, c) => wb.displayAt(sheetIndex, r, c))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [charts, version, sheetIndex],
  );
  /** Where a chart is, in unzoomed pixels from the sheet's top-left corner. */
  const chartOrigin = (chart: (typeof floating)[number]) => ({ x: colX[Math.min(chart.col, colCount)] / z + chart.dx, y: rowStart(chart.row) / z + chart.dy });
  /** The cell and offset a point in unzoomed pixels falls in. */
  const anchorAtPixel = (x: number, y: number) => {
    const col = Math.max(0, Math.min(colCount - 1, indexAt(colX, Math.max(0, x) * z)));
    const row = Math.max(0, Math.min(rowCount - 1, indexAt(rowY, Math.max(0, y) * z)));
    return { row, col, dx: Math.round(x - colX[col] / z), dy: Math.round(y - rowY[row] / z) };
  };

  // ----- Merges

  const merges = sheet.merges;
  const covered = useMemo(() => {
    const map = new Map<number, RangePos>();
    for (const m of merges) for (let r = m.r1; r <= m.r2; r += 1) for (let c = m.c1; c <= m.c2; c += 1) map.set(r * 16384 + c, m);
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merges, version]);

  // ----- Hit testing

  const cellAtPoint = (clientX: number, clientY: number) => {
    const el = scroller.current!;
    const rect = el.getBoundingClientRect();
    const sx = clientX - rect.left - rowHeadW;
    const sy = clientY - rect.top - headH;
    const x = sx < frozenW ? sx : sx + el.scrollLeft;
    const y = sy < frozenH ? sy : sy + el.scrollTop;
    const col = Math.max(0, Math.min(colCount - 1, indexAt(colX, x)));
    const row = Math.max(0, Math.min(rowCount - 1, indexAt(rowY, y)));
    return { row, col, onHeaderX: clientX - rect.left < rowHeadW, onHeaderY: clientY - rect.top < headH };
  };

  const focusGrid = () => scroller.current?.focus({ preventScroll: true });

  // ----- Mouse

  const onMouseDown = (event: React.MouseEvent) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('.calc-edit-input')) return;
    const filterButton = target.closest<HTMLElement>('[data-filter-col]');
    if (filterButton) {
      event.preventDefault();
      const rect = filterButton.getBoundingClientRect();
      setFilterMenu({ col: Number(filterButton.dataset.filterCol), left: rect.left, bottom: rect.bottom });
      return;
    }
    const listButton = target.closest<HTMLElement>('[data-list-cell]');
    if (listButton) {
      event.preventDefault();
      const rect = listButton.getBoundingClientRect();
      const [row, col] = (listButton.dataset.listCell ?? '').split(',').map(Number);
      setListMenu({ row, col, left: rect.left, bottom: rect.bottom });
      return;
    }
    const chartEl = target.closest<HTMLElement>('[data-chart]');
    if (chartEl) {
      const chart = floating.find((c) => c.id === chartEl.dataset.chart);
      if (chart) {
        controller.selectChart(chart.id);
        const origin = chartOrigin(chart);
        const sizing = !!target.closest('[data-chart-resize]');
        drag.current = { chart: chart.id, mode: sizing ? 'size' : 'move', startX: event.clientX, startY: event.clientY, ...origin, width: chart.width, height: chart.height };
        chartDragRef.current = { id: chart.id, ...origin, width: chart.width, height: chart.height };
        focusGrid();
        event.preventDefault();
        return;
      }
    }
    const rowHandle = target.closest<HTMLElement>('[data-resize-row]');
    if (rowHandle) {
      const row = Number(rowHandle.dataset.resizeRow);
      drag.current = { row, startY: event.clientY, startHeight: rowHeightOf(sheet, row) };
      resizingRowRef.current = { row, height: drag.current.startHeight };
      setResizingRow(resizingRowRef.current);
      event.preventDefault();
      return;
    }
    const handle = target.closest<HTMLElement>('[data-resize-col]');
    if (handle) {
      const col = Number(handle.dataset.resizeCol);
      drag.current = { col, startX: event.clientX, startWidth: sheet.colWidths.get(col) ?? DEFAULT_COL_WIDTH };
      resizingRef.current = { col, width: drag.current.startWidth };
      setResizing(resizingRef.current);
      event.preventDefault();
      return;
    }
    if (target.closest('[data-fill-handle]')) {
      drag.current = 'fill';
      event.preventDefault();
      return;
    }
    const col = target.closest<HTMLElement>('[data-col-head]');
    if (col) {
      const c = Number(col.dataset.colHead);
      if (event.shiftKey) controller.extendTo(rowCount - 1, c);
      else controller.selectRange({ r1: 0, c1: c, r2: rowCount - 1, c2: c });
      skipReveal.current = { ...controller.focus };
      focusGrid();
      return;
    }
    const rowHead = target.closest<HTMLElement>('[data-row-head]');
    if (rowHead) {
      const r = Number(rowHead.dataset.rowHead);
      controller.selectRange({ r1: r, c1: 0, r2: r, c2: colCount - 1 });
      skipReveal.current = { ...controller.focus };
      focusGrid();
      return;
    }
    if (target.closest('[data-corner]')) {
      controller.selectAll();
      skipReveal.current = { ...controller.focus };
      focusGrid();
      return;
    }
    const { row, col: c } = cellAtPoint(event.clientX, event.clientY);
    const m = covered.get(row * 16384 + c);
    if (event.shiftKey) controller.extendTo(row, c);
    else controller.select(m ? m.r1 : row, m ? m.c1 : c);
    drag.current = 'select';
    focusGrid();
    event.preventDefault();
  };

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      const d = drag.current;
      if (!d) return;
      if (d === 'select') {
        const { row, col } = cellAtPoint(event.clientX, event.clientY);
        if (row !== controller.focus.row || col !== controller.focus.col) controller.extendTo(row, col);
      } else if (d === 'fill') {
        const { row, col } = cellAtPoint(event.clientX, event.clientY);
        fillTargetRef.current = { row, col };
        setFillTarget(fillTargetRef.current);
      } else if ('chart' in d) {
        const dx = (event.clientX - d.startX) / z;
        const dy = (event.clientY - d.startY) / z;
        chartDragRef.current =
          d.mode === 'move'
            ? { id: d.chart, x: Math.max(0, d.x + dx), y: Math.max(0, d.y + dy), width: d.width, height: d.height }
            : images.some((i) => i.id === d.chart)
              ? (() => {
                  // A picture keeps its proportions.
                  const width = Math.max(16, d.width + dx);
                  return { id: d.chart, x: d.x, y: d.y, width, height: Math.max(16, (width * d.height) / d.width) };
                })()
              : { id: d.chart, x: d.x, y: d.y, width: Math.max(160, d.width + dx), height: Math.max(120, d.height + dy) };
        setChartDrag(chartDragRef.current);
      } else if ('row' in d) {
        resizingRowRef.current = { row: d.row, height: Math.max(8, d.startHeight + (event.clientY - d.startY) / z) };
        setResizingRow(resizingRowRef.current);
      } else {
        resizingRef.current = { col: d.col, width: Math.max(24, d.startWidth + (event.clientX - d.startX) / z) };
        setResizing(resizingRef.current);
      }
    };
    const onUp = () => {
      const d = drag.current;
      drag.current = null;
      if (d === 'select') controller.paintSelection();
      else if (d === 'fill') {
        const target = fillTargetRef.current;
        fillTargetRef.current = null;
        setFillTarget(null);
        if (target) {
          const sel = controller.selection;
          const below = target.row - sel.r2;
          const above = sel.r1 - target.row;
          const right = target.col - sel.c2;
          const left = sel.c1 - target.col;
          const best = Math.max(below, above, right, left);
          if (best > 0) {
            const next: RangePos =
              best === below ? { ...sel, r2: target.row } : best === above ? { ...sel, r1: target.row } : best === right ? { ...sel, c2: target.col } : { ...sel, c1: target.col };
            controller.fillSeries(sel, next);
          }
        }
      } else if (d && 'chart' in d) {
        const moved = chartDragRef.current;
        chartDragRef.current = null;
        setChartDrag(null);
        // A click without a drag only selects.
        if (moved && (Math.abs(moved.x - d.x) > 1 || Math.abs(moved.y - d.y) > 1 || moved.width !== d.width || moved.height !== d.height)) {
          if (d.mode === 'move') controller.moveChart(d.chart, anchorAtPixel(moved.x, moved.y));
          else controller.resizeChart(d.chart, moved.width, moved.height);
        }
      } else if (d && 'row' in d) {
        const resized = resizingRowRef.current;
        resizingRowRef.current = null;
        setResizingRow(null);
        if (resized) controller.setRowHeight(resized.row, resized.height);
      } else if (d) {
        const resized = resizingRef.current;
        resizingRef.current = null;
        setResizing(null);
        if (resized) controller.setColumnWidth(resized.col, resized.width);
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    // Reads the current layout through refs and the controller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller, z, colX, rowCount, colCount]);

  const onDoubleClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    const rowHandle = target.closest<HTMLElement>('[data-resize-row]');
    if (rowHandle) {
      controller.setRowHeight(Number(rowHandle.dataset.resizeRow), ROW_HEIGHT);
      return;
    }
    const handle = target.closest<HTMLElement>('[data-resize-col]');
    if (handle) {
      controller.autofitColumn(Number(handle.dataset.resizeCol));
      return;
    }
    const chartEl = target.closest<HTMLElement>('[data-chart]');
    if (chartEl) {
      const chart = charts.find((c) => c.id === chartEl.dataset.chart);
      const title = chart ? window.prompt(m.calc.charts.titlePrompt, chart.title) : null;
      if (chart && title !== null) controller.setChartTitle(chart.id, title);
      return;
    }
    if (target.closest('[data-col-head],[data-row-head],[data-corner],.calc-edit-input')) return;
    controller.startEdit();
  };

  // ----- Keyboard

  const onKeyDown = (event: React.KeyboardEvent) => {
    if ((event.target as HTMLElement).closest('.calc-edit-input')) return;
    const ctrl = event.ctrlKey || event.metaKey;
    const key = event.key;
    // Alt+Down opens the list of a cell that has one, as in Excel.
    if (key === 'ArrowDown' && event.altKey && !ctrl) {
      const arrow = document.querySelector<HTMLElement>('.calc-list-arrow');
      if (arrow) {
        event.preventDefault();
        const rect = arrow.getBoundingClientRect();
        const [row, col] = (arrow.dataset.listCell ?? '').split(',').map(Number);
        setListMenu({ row, col, left: rect.left, bottom: rect.bottom });
        return;
      }
    }
    if (controller.selectedChart && !ctrl) {
      if (key === 'Delete' || key === 'Backspace') {
        event.preventDefault();
        controller.deleteChart(controller.selectedChart);
        return;
      }
      if (key === 'Escape') {
        controller.selectChart(null);
        return;
      }
    }
    const arrows: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (ctrl) {
      const lower = key.toLowerCase();
      const run = (fn: () => void) => {
        event.preventDefault();
        fn();
      };
      if (lower === 'z') return run(() => (event.shiftKey ? controller.redo() : controller.undo()));
      if (lower === 'y') return run(() => controller.redo());
      if (lower === 'b') return run(() => controller.toggleStyle('bold'));
      if (lower === 'i') return run(() => controller.toggleStyle('italic'));
      if (lower === 'u') return run(() => controller.toggleStyle('underline'));
      if (lower === 'a') return run(() => controller.selectAll());
      if (lower === 'd') return run(() => controller.fillDown());
      if (lower === 'r') return run(() => controller.fillRight());
      if (key === 'Home') return run(() => controller.select(0, 0));
      if (key === 'End') return run(() => controller.select(used?.r2 ?? 0, used?.c2 ?? 0));
      if (arrows[key]) {
        // Jump to the edge of the data, as Excel does.
        const [dr, dc] = arrows[key];
        return run(() => {
          const from = event.shiftKey ? controller.focus : controller.anchor;
          let { row, col } = from;
          const filled = (r: number, c: number) => (wb.getCell(sheetIndex, r, c)?.raw ?? '') !== '';
          const step = () => {
            row += dr;
            col += dc;
          };
          const startFilled = filled(row, col);
          step();
          if (startFilled && filled(row, col)) {
            while (row >= 0 && col >= 0 && filled(row + dr, col + dc) && row < rowCount && col < colCount) step();
          } else {
            while (row > 0 && col > 0 && row < rowCount - 1 && col < colCount - 1 && !filled(row, col)) step();
          }
          row = Math.max(0, Math.min(rowCount - 1, row));
          col = Math.max(0, Math.min(colCount - 1, col));
          if (event.shiftKey) controller.extendTo(row, col);
          else controller.select(row, col);
        });
      }
      return;
    }
    if (arrows[key]) {
      event.preventDefault();
      controller.move(arrows[key][0], arrows[key][1], event.shiftKey);
      return;
    }
    switch (key) {
      case 'Enter':
        event.preventDefault();
        controller.move(event.shiftKey ? -1 : 1, 0);
        return;
      case 'Tab':
        event.preventDefault();
        controller.move(0, event.shiftKey ? -1 : 1);
        return;
      case 'F2':
        event.preventDefault();
        controller.startEdit();
        return;
      case 'Delete':
      case 'Backspace':
        event.preventDefault();
        controller.clearContents();
        return;
      case 'Escape':
        if (controller.painter) controller.togglePainter();
        return;
      case 'Home':
        event.preventDefault();
        controller.select(controller.anchor.row, 0);
        return;
      case 'PageDown':
      case 'PageUp': {
        event.preventDefault();
        const rows = Math.max(1, Math.floor(frame.height / rowH) - 1) * (key === 'PageDown' ? 1 : -1);
        controller.move(rows, 0, event.shiftKey);
        return;
      }
    }
    if (key.length === 1 && !event.altKey) {
      event.preventDefault();
      controller.startEdit(key);
    }
  };

  const onCopy = (event: React.ClipboardEvent, cut: boolean) => {
    if ((event.target as HTMLElement).closest('.calc-edit-input')) return;
    event.preventDefault();
    event.clipboardData.setData('text/plain', controller.copy(cut));
  };

  const onPaste = (event: React.ClipboardEvent) => {
    if ((event.target as HTMLElement).closest('.calc-edit-input')) return;
    event.preventDefault();
    controller.paste(event.clipboardData.getData('text/plain'));
  };

  // ----- Drawing

  const lines: React.ReactNode[] = [];
  if (gridlines) {
    for (let c = c0; c <= c1 + 1; c += 1)
      lines.push(<div key={`v${c}`} className="calc-gridline-v" style={{ left: cellLeft(c) - 1, top: headH, height: rowY[rowCount] }} />);
    for (let r = r0; r <= r1 + 1; r += 1)
      if (!hidden.has(r)) lines.push(<div key={`h${r}`} className="calc-gridline-h" style={{ top: cellTop(r) - 1, left: rowHeadW, width: colX[colCount] }} />);
  }

  type Bucket = { cells: React.ReactNode[]; texts: React.ReactNode[] };
  const newBucket = (): Bucket => ({ cells: [], texts: [] });
  const buckets = { main: newBucket(), top: newBucket(), left: newBucket(), corner: newBucket() };
  const regionOf = (row: number, col: number) => (row < fr ? (col < fc ? 'corner' : 'top') : col < fc ? 'left' : 'main') as keyof typeof buckets;

  const drawCell = (row: number, col: number, range: RangePos | null) => {
    let cell = wb.getCell(sheetIndex, row, col);
    // An empty cell a formula spills over shows the value it was given, in the formula's style.
    let spilled = false;
    if (!cell || cell.raw === '') {
      const over = wb.spillCellAt(sheetIndex, row, col);
      if (over) {
        cell = { raw: '', style: over.style };
        spilled = true;
      }
    }
    if (!cell) return;
    const bucket = buckets[regionOf(row, col)];
    const own = wb.styleOf(cell.style);
    // Conditional formatting paints over the cell's own look.
    const cf = wb.cfAt(sheetIndex, row, col);
    const style = cf ? { ...own, fill: cf.fill ?? own.fill, color: cf.color ?? own.color, bold: cf.bold || own.bold } : own;
    const r2 = range?.r2 ?? row;
    const c2 = range?.c2 ?? col;
    const left = cellLeft(col);
    const top = cellTop(row);
    const width = cellLeft(c2 + 1) - left;
    const height = cellTop(r2 + 1) - top;
    const key = `${row},${col}`;
    const b = style.borders;
    if (style.fill || b || range) {
      bucket.cells.push(
        <div
          key={`b${key}`}
          className="calc-cell-box"
          style={{
            left,
            top,
            width,
            height,
            background: style.fill ?? (range ? 'var(--bg-surface)' : undefined),
            borderTop: b?.top ? '1px solid var(--calc-ink)' : undefined,
            borderRight: b?.right ? '1px solid var(--calc-ink)' : undefined,
            borderBottom: b?.bottom ? '1px solid var(--calc-ink)' : undefined,
            borderLeft: b?.left ? '1px solid var(--calc-ink)' : undefined,
          }}
        />,
      );
    }
    if (cf?.bar) {
      bucket.cells.push(
        <div
          key={`d${key}`}
          className="calc-data-bar"
          style={{ left: left + 2, top: top + 3, width: Math.max(2, (width - 4) * cf.bar.fraction), height: height - 6, background: cf.bar.color }}
        />,
      );
    }
    if (cell.raw === '' && !spilled) return;
    if (editing && editing.row === row && editing.col === col) return;
    const value = wb.valueAt(sheetIndex, row, col);
    const formulaShown = showFormulas && cell.raw.startsWith('=');
    const text = formulaShown ? cell.raw : wb.displayAt(sheetIndex, row, col);
    if (text === '') return;
    const align = style.hAlign ?? (formulaShown ? 'left' : typeof value === 'number' ? 'right' : typeof value === 'string' ? 'left' : 'center');
    const wraps = !!style.wrap;
    let textWidth = width;
    // Left-aligned text runs on over empty cells to its right, as in Excel.
    if (align === 'left' && !wraps && (formulaShown || typeof value === 'string') && !range) {
      let next = col + 1;
      while (next < colCount && textWidth < frame.width && (wb.getCell(sheetIndex, row, next)?.raw ?? '') === '' && !covered.has(row * 16384 + next)) {
        textWidth += widthOf(next);
        next += 1;
      }
    }
    bucket.texts.push(
      <div
        key={`t${key}`}
        className={`calc-cell-text${wraps ? ' is-wrap' : ''}${isError(value) ? ' is-error' : ''}`}
        style={{
          left,
          top,
          width: textWidth,
          height,
          justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
          alignItems: style.vAlign === 'top' ? 'flex-start' : style.vAlign === 'middle' ? 'center' : 'flex-end',
          textAlign: align,
          ...textStyle(style, z, !!style.fill),
        }}
      >
        <span>{text}</span>
      </div>,
    );
  };

  const span = (from: number, to: number) => Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i);
  const rowsToDraw = [...span(0, fr - 1), ...span(Math.max(r0, fr), r1)].filter((r) => !hidden.has(r));
  const colsToDraw = [...span(0, fc - 1), ...span(Math.max(c0, fc), c1)];
  for (const r of rowsToDraw)
    for (const c of colsToDraw) {
      if (covered.has(r * 16384 + c)) continue;
      drawCell(r, c, null);
    }
  // The drop-down buttons in the header row of a filter.
  const filter = sheet.filter;
  if (filter && !hidden.has(filter.range.r1)) {
    const row = filter.range.r1;
    for (let c = filter.range.c1; c <= filter.range.c2; c += 1) {
      if (!(c < fc || (c >= c0 && c <= c1)) || !(row < fr || (row >= r0 && row <= r1))) continue;
      const active = (filter.excluded[c]?.length ?? 0) > 0 || !!filter.conditions?.[c];
      buckets[regionOf(row, c)].texts.push(
        <button
          key={`f${c}`}
          type="button"
          className={`calc-filter-btn${active ? ' is-active' : ''}`}
          data-filter-col={c}
          aria-label={m.calc.filter.open}
          style={{ left: cellLeft(c + 1) - 20 * z - 1, top: cellTop(row) + 2 * z, width: 18 * z, height: heightOf(row) - 4 * z, fontSize: 11 * z }}
        >
          ▾
        </button>,
      );
    }
  }

  // The arrow of the cell on show when it has a list rule.
  if (!editing && anchor.row === focus.row && anchor.col === focus.col) {
    const { row, col } = anchor;
    const rule = controller.validationOf(row, col);
    if (rule && rule.rule.kind !== 'number' && !hidden.has(row) && (col < fc || (col >= c0 && col <= c1)) && (row < fr || (row >= r0 && row <= r1))) {
      buckets[regionOf(row, col)].texts.push(
        <button
          key="list-arrow"
          type="button"
          className="calc-filter-btn calc-list-arrow"
          data-list-cell={`${row},${col}`}
          aria-label={m.calc.validation.dropdown}
          style={{ left: cellLeft(col + 1) - 20 * z - 1, top: cellTop(row) + 2 * z, width: 18 * z, height: heightOf(row) - 4 * z, fontSize: 11 * z }}
        >
          ▾
        </button>,
      );
    }
  }

  for (const m of merges) {
    if (hidden.has(m.r1) || !(m.r1 < fr || (m.r2 >= r0 && m.r1 <= r1)) || !(m.c1 < fc || (m.c2 >= c0 && m.c1 <= c1))) continue;
    drawCell(m.r1, m.c1, m);
    // A merge with nothing in it still hides the gridlines inside it.
    if (!wb.getCell(sheetIndex, m.r1, m.c1)) {
      buckets[regionOf(m.r1, m.c1)].cells.push(
        <div key={`m${m.r1},${m.c1}`} className="calc-cell-box" style={{ left: cellLeft(m.c1), top: cellTop(m.r1), width: cellLeft(m.c2 + 1) - cellLeft(m.c1), height: cellTop(m.r2 + 1) - cellTop(m.r1), background: 'var(--bg-surface)' }} />,
      );
    }
  }

  if (sheet.comments) {
    for (const [key, comment] of sheet.comments) {
      const row = keyRow(key);
      const col = keyCol(key);
      if (hidden.has(row) || !(row < fr || (row >= r0 && row <= r1)) || !(col < fc || (col >= c0 && col <= c1))) continue;
      buckets[regionOf(row, col)].texts.push(
        <div
          key={`n${key}`}
          className="calc-comment-mark"
          title={[comment.author, comment.text].filter(Boolean).join(': ')}
          style={{ left: cellLeft(col + 1) - 7, top: cellTop(row) }}
        />,
      );
    }
  }

  const selBox = (range: RangePos) => ({
    left: cellLeft(range.c1),
    top: cellTop(range.r1),
    width: cellLeft(range.c2 + 1) - cellLeft(range.c1),
    height: cellTop(range.r2 + 1) - cellTop(range.r1),
  });

  const copied = controller.copiedRange;
  const colHeads: React.ReactNode[] = [];
  for (let c = c0; c <= c1; c += 1) {
    const inSel = c >= selection.c1 && c <= selection.c2;
    colHeads.push(
      <div key={c} className={`calc-col-head${inSel ? ' is-selected' : ''}`} data-col-head={c} style={{ left: cellLeft(c), width: widthOf(c), height: headH, fontSize: 12 * z }}>
        {columnName(c)}
        <span className="calc-resize-handle" data-resize-col={c} />
      </div>,
    );
  }
  const rowHeads: React.ReactNode[] = [];
  for (let r = r0; r <= r1; r += 1) {
    if (hidden.has(r)) continue;
    const inSel = r >= selection.r1 && r <= selection.r2;
    rowHeads.push(
      <div key={r} className={`calc-row-head${inSel ? ' is-selected' : ''}`} data-row-head={r} style={{ top: rowY[r], height: heightOf(r), fontSize: 12 * z }}>
        {r + 1}
        <span className="calc-resize-handle is-row" data-resize-row={r} />
      </div>,
    );
  }

  // The input that edits the cell, over it.
  let editor: React.ReactNode = null;
  if (editing) {
    const m = covered.get(editing.row * 16384 + editing.col);
    const box = selBox(m ?? { r1: editing.row, c1: editing.col, r2: editing.row, c2: editing.col });
    const style = wb.styleOf(wb.getCell(sheetIndex, editing.row, editing.col)?.style ?? 0);
    editor = (
      <input
        className="calc-edit-input"
        style={{ left: box.left, top: box.top, minWidth: box.width, width: Math.max(box.width, editing.text.length * 8 * z + 24), height: box.height, ...textStyle(style, z, !!style.fill), background: style.fill ?? 'var(--bg-surface)' }}
        value={editing.text}
        spellCheck={false}
        ref={(el) => {
          if (el && document.activeElement !== el && !(document.activeElement as HTMLElement | null)?.closest('[data-formula-bar]')) {
            el.focus({ preventScroll: true });
            const end = el.value.length;
            el.setSelectionRange(end, end);
          }
        }}
        onChange={(event) => controller.setEditText(event.target.value)}
        onKeyDown={(event) => {
          const arrow = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' } as const;
          if (event.key === 'Enter') {
            event.preventDefault();
            controller.commitEdit(event.shiftKey ? 'up' : 'down');
            focusGrid();
          } else if (event.key === 'Tab') {
            event.preventDefault();
            controller.commitEdit(event.shiftKey ? 'left' : 'right');
            focusGrid();
          } else if (event.key === 'Escape') {
            event.preventDefault();
            controller.cancelEdit();
            focusGrid();
          } else if (event.key === 'F2') {
            event.preventDefault();
            controller.toggleEditMode();
          } else if (editing.enterMode && event.key in arrow && !event.shiftKey) {
            event.preventDefault();
            controller.commitEdit(arrow[event.key as keyof typeof arrow]);
            focusGrid();
          }
        }}
        onBlur={(event) => {
          // Clicking the formula bar keeps the edit going; leaving for anywhere else stores it.
          const next = event.relatedTarget as HTMLElement | null;
          if (next?.closest('[data-formula-bar]')) return;
          if (controller.editing) controller.commitEdit(null);
        }}
      />
    );
  }

  const fillRange =
    fillTarget &&
    (() => {
      const sel = selection;
      const dr = Math.max(fillTarget.row - sel.r2, sel.r1 - fillTarget.row);
      const dc = Math.max(fillTarget.col - sel.c2, sel.c1 - fillTarget.col);
      if (Math.max(dr, dc) <= 0) return null;
      if (dr >= dc) return fillTarget.row > sel.r2 ? { ...sel, r1: sel.r2 + 1, r2: fillTarget.row } : { ...sel, r2: sel.r1 - 1, r1: fillTarget.row };
      return fillTarget.col > sel.c2 ? { ...sel, c1: sel.c2 + 1, c2: fillTarget.col } : { ...sel, c2: sel.c1 - 1, c1: fillTarget.col };
    })();

  const regionGrid = (rowA: number, rowB: number, colA: number, colB: number, tag: string) => {
    if (!gridlines || rowB < rowA || colB < colA) return null;
    const out: React.ReactNode[] = [];
    for (let c = colA; c <= colB + 1; c += 1)
      out.push(<div key={`${tag}v${c}`} className="calc-gridline-v" style={{ left: cellLeft(c) - 1, top: cellTop(rowA), height: rowY[rowB + 1] - rowY[rowA] }} />);
    for (let r = rowA; r <= rowB + 1; r += 1)
      if (!hidden.has(r)) out.push(<div key={`${tag}h${r}`} className="calc-gridline-h" style={{ top: cellTop(r) - 1, left: cellLeft(colA), width: cellLeft(colB + 1) - cellLeft(colA) }} />);
    return out;
  };

  /** The selection and copy outlines, drawn in the main layer and again in each frozen band so none hides under one. */
  const overlay = (
    <>
      {copied && <div className="calc-copied" style={selBox(copied)} />}
      <div className="calc-selection" style={selBox(selection)}>
        <span className="calc-fill-handle" data-fill-handle />
      </div>
      {fillRange && <div className="calc-fill-preview" style={selBox(fillRange)} />}
    </>
  );
  const editRegion = editing ? regionOf(editing.row, editing.col) : null;

  /** A frozen band: a zero-size sticky box that keeps its clipped, opaque contents where the scroll cannot move them. */
  const band = (kind: 'top' | 'left' | 'corner') => {
    if (kind === 'top' ? fr === 0 : kind === 'left' ? fc === 0 : fr === 0 || fc === 0) return null;
    const bucket = buckets[kind];
    const width = kind === 'top' ? colX[colCount] : frozenW;
    const height = kind === 'left' ? rowY[rowCount] : frozenH;
    const grid =
      kind === 'top'
        ? regionGrid(0, fr - 1, Math.max(c0, fc), c1, 'ft')
        : kind === 'left'
          ? regionGrid(Math.max(r0, fr), r1, 0, fc - 1, 'fl')
          : regionGrid(0, fr - 1, 0, fc - 1, 'fc');
    return (
      <div
        className={`calc-frozen is-${kind}`}
        style={kind === 'top' ? { top: headH } : kind === 'left' ? { left: rowHeadW, marginLeft: rowHeadW } : { top: headH, left: rowHeadW, marginLeft: rowHeadW }}
      >
        <div className={`calc-frozen-band is-${kind}`} style={{ left: kind === 'top' ? rowHeadW : 0, top: 0, width, height }}>
          <div className="calc-frozen-content" style={{ left: -rowHeadW, top: -headH }}>
            {grid}
            {bucket.cells}
            {bucket.texts}
            {overlay}
            {editRegion === kind && editor}
          </div>
        </div>
      </div>
    );
  };

  const frozenColHeads: React.ReactNode[] = [];
  for (let c = 0; c < fc; c += 1) {
    const inSel = c >= selection.c1 && c <= selection.c2;
    frozenColHeads.push(
      <div key={c} className={`calc-col-head${inSel ? ' is-selected' : ''}`} data-col-head={c} style={{ left: colX[c], width: widthOf(c), height: headH, fontSize: 12 * z }}>
        {columnName(c)}
        <span className="calc-resize-handle" data-resize-col={c} />
      </div>,
    );
  }
  const frozenRowHeads: React.ReactNode[] = [];
  for (let r = 0; r < fr; r += 1) {
    if (hidden.has(r)) continue;
    const inSel = r >= selection.r1 && r <= selection.r2;
    frozenRowHeads.push(
      <div key={r} className={`calc-row-head${inSel ? ' is-selected' : ''}`} data-row-head={r} style={{ top: rowY[r], height: heightOf(r), fontSize: 12 * z }}>
        {r + 1}
        <span className="calc-resize-handle is-row" data-resize-row={r} />
      </div>,
    );
  }

  return (
    <>
    <div
      ref={scroller}
      className={`calc-grid${controller.painter ? ' is-painting' : ''}`}
      tabIndex={0}
      role="grid"
      aria-label={sheet.name}
      onScroll={(event) => {
        const el = event.currentTarget;
        setFrame((f) => (f.top === el.scrollTop && f.left === el.scrollLeft ? f : { ...f, top: el.scrollTop, left: el.scrollLeft }));
      }}
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
      onCopy={(event) => onCopy(event, false)}
      onCut={(event) => onCopy(event, true)}
      onPaste={onPaste}
    >
      <div className={`calc-canvas${headings ? '' : ' no-headings'}`} style={{ width: totalW, height: totalH }}>
        <div className="calc-head-bar" style={{ height: headH, width: totalW }}>
          {fc > 0 && (
            <div className="calc-frozen is-heads" style={{ left: rowHeadW, marginLeft: rowHeadW }}>
              <div className="calc-frozen-band is-heads" style={{ left: 0, top: 0, width: frozenW, height: headH }}>
                {frozenColHeads}
              </div>
            </div>
          )}
          <div className="calc-corner" data-corner style={{ width: rowHeadW, height: headH }} />
          {colHeads}
        </div>
        <div className="calc-body" style={{ height: rowY[rowCount], width: totalW }}>
          {band('top')}
          {band('left')}
          {band('corner')}
          {fr > 0 && (
            <div className="calc-frozen is-rowheads" style={{ top: headH, left: 0 }}>
              <div className="calc-frozen-band is-rowheads" style={{ left: 0, top: 0, width: rowHeadW, height: frozenH }}>
                {frozenRowHeads}
              </div>
            </div>
          )}
          <div className="calc-row-heads" style={{ width: rowHeadW, height: rowY[rowCount] }}>
            {rowHeads}
          </div>
          <div className="calc-layer" style={{ top: -headH }}>
            {lines}
            {buckets.main.cells}
            {buckets.main.texts}
            {charts.map((chart, i) => {
              const live = chartDrag && chartDrag.id === chart.id ? chartDrag : null;
              const origin = live ?? { ...chartOrigin(chart), width: chart.width, height: chart.height };
              return (
                <div
                  key={chart.id}
                  className={`calc-chart${controller.selectedChart === chart.id ? ' is-selected' : ''}`}
                  data-chart={chart.id}
                  style={{ left: rowHeadW + origin.x * z, top: headH + origin.y * z, width: origin.width * z, height: origin.height * z }}
                >
                  <ChartView type={chart.type} title={chart.title} data={chartData[i]} width={origin.width} height={origin.height} />
                  {controller.selectedChart === chart.id && <span className="calc-chart-resize" data-chart-resize />}
                </div>
              );
            })}
            {images.map((image) => {
              const live = chartDrag && chartDrag.id === image.id ? chartDrag : null;
              const origin = live ?? { ...chartOrigin(image), width: image.width, height: image.height };
              return (
                <div
                  key={image.id}
                  className={`calc-chart calc-image${controller.selectedChart === image.id ? ' is-selected' : ''}`}
                  data-chart={image.id}
                  style={{ left: rowHeadW + origin.x * z, top: headH + origin.y * z, width: origin.width * z, height: origin.height * z }}
                >
                  <img src={image.src} alt={image.alt} draggable={false} />
                  {controller.selectedChart === image.id && <span className="calc-chart-resize" data-chart-resize />}
                </div>
              );
            })}
            {overlay}
            {editRegion === 'main' && editor}
          </div>
        </div>
      </div>
    </div>
    {listMenu && (
      <ListMenu
        items={(() => {
          const rule = controller.validationOf(listMenu.row, listMenu.col);
          return rule ? controller.validationItems(rule) : [];
        })()}
        anchor={listMenu}
        current={wb.displayAt(sheetIndex, listMenu.row, listMenu.col)}
        onPick={(item) => controller.pickListItem(listMenu.row, listMenu.col, item)}
        onClose={() => setListMenu(null)}
      />
    )}
    {filterMenu && <FilterMenu controller={controller} col={filterMenu.col} anchor={filterMenu} onClose={() => setFilterMenu(null)} />}
    </>
  );
};
