import type { CellStyle, WorkbookData } from '../calc/model/workbook';
import { styleToken, type Op, type Patch, type SheetData } from './patch';

type Styles = CellStyle[];

/** Chỉ số của một định dạng trong bảng định dạng của bảng tính, thêm vào cuối nếu chưa có. Định dạng mặc định luôn là 0. */
function styleIndex(styles: Styles, style: CellStyle | null | undefined): number {
  const token = styleToken(style);
  if (token === '{}') return 0;
  const found = styles.findIndex((candidate) => styleToken(candidate) === token);
  if (found >= 0) return found;
  styles.push(structuredClone(style as CellStyle));
  return styles.length - 1;
}

const sheetOf = (data: WorkbookData, name: string): SheetData | undefined => data.sheets.find((sheet) => sheet.name === name);

function applyKeyed(sheet: SheetData, op: Extract<Op, { t: 'keyed' }>): void {
  const map = new Map<number, unknown>((sheet[op.prop] as Array<[number, unknown]> | undefined) ?? []);
  for (const key of op.del) map.delete(key);
  for (const [key, value] of op.set) map.set(key, structuredClone(value));
  const entries = [...map] as never;
  if (op.prop === 'colWidths') sheet.colWidths = entries;
  else if (map.size === 0) delete sheet[op.prop];
  else sheet[op.prop] = entries;
}

function applyOp(data: WorkbookData, op: Op): void {
  switch (op.t) {
    case 'cells': {
      const sheet = sheetOf(data, op.sheet);
      if (!sheet) return;
      const cells = new Map(sheet.cells.map(([key, raw, style]) => [key, [raw, style] as [string, number]]));
      for (const key of op.del) cells.delete(key);
      for (const [key, raw, style] of op.set) {
        if (raw === '' && !style) cells.delete(key);
        else cells.set(key, [raw, styleIndex(data.styles, style)]);
      }
      sheet.cells = [...cells].map(([key, [raw, style]]) => [key, raw, style]);
      return;
    }
    case 'keyed': {
      const sheet = sheetOf(data, op.sheet);
      if (sheet) applyKeyed(sheet, op);
      return;
    }
    case 'prop': {
      const sheet = sheetOf(data, op.sheet);
      if (!sheet) return;
      const target = sheet as unknown as Record<string, unknown>;
      if (op.value === null || op.value === undefined) {
        if (op.prop === 'merges' || op.prop === 'cf' || op.prop === 'charts') target[op.prop] = [];
        else delete target[op.prop];
      } else {
        target[op.prop] = structuredClone(op.value);
      }
      return;
    }
    case 'addSheet': {
      if (sheetOf(data, op.sheet.name)) return;
      const added: SheetData = structuredClone(op.sheet);
      added.cells = added.cells.map(([key, raw, style]) => [key, raw, styleIndex(data.styles, op.styles[style])] as [number, string, number]);
      data.sheets.splice(Math.min(Math.max(op.index, 0), data.sheets.length), 0, added);
      return;
    }
    case 'removeSheet': {
      const at = data.sheets.findIndex((sheet) => sheet.name === op.sheet);
      if (at >= 0 && data.sheets.length > 1) data.sheets.splice(at, 1);
      return;
    }
    case 'renameSheet': {
      const sheet = sheetOf(data, op.from);
      if (sheet && !sheetOf(data, op.to)) sheet.name = op.to;
      return;
    }
    case 'order': {
      const rank = new Map(op.names.map((name, index) => [name, index]));
      const original = new Map(data.sheets.map((sheet, index) => [sheet.name, index]));
      data.sheets.sort((a, b) => (rank.get(a.name) ?? op.names.length + original.get(a.name)!) - (rank.get(b.name) ?? op.names.length + original.get(b.name)!));
      return;
    }
  }
}

/**
 * Áp các thay đổi lên một bảng tính, trả bản mới (không sửa bản vào). Chịu lỗi theo thiết kế: thay đổi nhắm vào trang tính
 * không còn (người khác đã xóa) bị bỏ qua thay vì làm hỏng cả bảng, để mọi máy áp cùng một dãy đều ra cùng kết quả.
 */
export function applyPatch(data: WorkbookData, patch: Patch): WorkbookData {
  const next = structuredClone(data);
  if (next.styles.length === 0) next.styles = [{}];
  for (const op of patch) applyOp(next, op);
  return next;
}
