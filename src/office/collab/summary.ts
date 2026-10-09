import { cellName, keyCol, keyRow } from '../calc/engine/cellRef';
import type { WorkbookData } from '../calc/model/workbook';
import type { Patch } from './patch';

export interface SummaryCell {
  sheet: string;
  ref: string;
  /** Giá trị mới (công thức giữ nguyên dạng gõ); rỗng khi ô bị xóa. */
  value: string;
  /** Giá trị trước đó; rỗng nếu ô trống. Thiếu ở thao tác ghi bởi bản cũ. */
  old?: string;
}

export interface SummaryChange {
  kind: 'colWidths' | 'rowHeights' | 'comments' | 'prop' | 'addSheet' | 'removeSheet' | 'renameSheet' | 'order';
  /** Tên trang tính hoặc thuộc tính liên quan. */
  name: string;
  /** Tên mới khi đổi tên trang tính. */
  to?: string;
}

/** Mô tả một thao tác cho người đọc nhật ký, tính ở máy gửi từ thay đổi. */
export interface PatchSummary {
  cellCount: number;
  cells: SummaryCell[];
  changes: SummaryChange[];
}

const MAX_CELLS = 5;
const MAX_VALUE = 60;

/** `before` là bảng tính trước thay đổi; có thì mỗi ô kèm giá trị cũ. */
export function summarizePatch(patch: Patch, before?: WorkbookData): PatchSummary {
  const summary: PatchSummary = { cellCount: 0, cells: [], changes: [] };
  const oldValue = (sheet: string, key: number): Pick<SummaryCell, 'old'> => {
    if (!before) return {};
    const found = before.sheets.find((candidate) => candidate.name === sheet)?.cells.find(([cellKey]) => cellKey === key);
    return { old: (found?.[1] ?? '').slice(0, MAX_VALUE) };
  };
  for (const op of patch) {
    switch (op.t) {
      case 'cells':
        summary.cellCount += op.set.length + op.del.length;
        for (const [key, raw] of op.set) {
          if (summary.cells.length < MAX_CELLS) summary.cells.push({ sheet: op.sheet, ref: cellName(keyRow(key), keyCol(key)), value: raw.slice(0, MAX_VALUE), ...oldValue(op.sheet, key) });
        }
        for (const key of op.del) {
          if (summary.cells.length < MAX_CELLS) summary.cells.push({ sheet: op.sheet, ref: cellName(keyRow(key), keyCol(key)), value: '', ...oldValue(op.sheet, key) });
        }
        break;
      case 'keyed':
        summary.changes.push({ kind: op.prop, name: op.sheet });
        break;
      case 'prop':
        summary.changes.push({ kind: 'prop', name: op.prop });
        break;
      case 'addSheet':
        summary.changes.push({ kind: 'addSheet', name: op.sheet.name });
        break;
      case 'removeSheet':
        summary.changes.push({ kind: 'removeSheet', name: op.sheet });
        break;
      case 'renameSheet':
        summary.changes.push({ kind: 'renameSheet', name: op.from, to: op.to });
        break;
      case 'order':
        summary.changes.push({ kind: 'order', name: '' });
        break;
    }
  }
  return summary;
}

/** Đọc lại tóm tắt đã lưu ở máy chủ; dữ liệu lạ (thao tác cũ, thao tác reset) thì trả null. */
export function parseSummary(value: unknown): PatchSummary | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<PatchSummary>;
  if (typeof raw.cellCount !== 'number' || !Array.isArray(raw.cells) || !Array.isArray(raw.changes)) return null;
  return { cellCount: raw.cellCount, cells: raw.cells as SummaryCell[], changes: raw.changes as SummaryChange[] };
}
