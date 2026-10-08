import type { CellStyle, WorkbookData } from '../calc/model/workbook';
import { KEYED_PROPS, WHOLE_PROPS, styleToken, type KeyedProp, type Op, type Patch, type SheetData } from './patch';

const json = (value: unknown): string => JSON.stringify(value ?? null);

/** Nội dung một trang tính không kể tên: để nhận ra đổi tên (cùng nội dung, khác tên) thay vì xóa rồi thêm. */
const contentOf = (sheet: SheetData, styles: CellStyle[]): string =>
  json({ ...sheet, name: '', cells: sheet.cells.map(([key, raw, style]) => [key, raw, styleToken(styles[style])]) });

const isEmptyWhole = (value: unknown): boolean => {
  if (value === undefined || value === false) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object' && value !== null && 'rows' in value && 'cols' in value) {
    const freeze = value as { rows: number; cols: number };
    return freeze.rows === 0 && freeze.cols === 0;
  }
  return false;
};

function diffCells(sheet: string, before: SheetData, beforeStyles: CellStyle[], after: SheetData, afterStyles: CellStyle[]): Op | null {
  const was = new Map(before.cells.map(([key, raw, style]) => [key, `${raw}\u0000${styleToken(beforeStyles[style])}`]));
  const set: Array<[number, string, CellStyle | null]> = [];
  const seen = new Set<number>();
  for (const [key, raw, style] of after.cells) {
    seen.add(key);
    const token = styleToken(afterStyles[style]);
    if (was.get(key) !== `${raw}\u0000${token}`) set.push([key, raw, token === '{}' ? null : afterStyles[style]]);
  }
  const del = [...was.keys()].filter((key) => !seen.has(key));
  return set.length || del.length ? { t: 'cells', sheet, set, del } : null;
}

function diffKeyed(sheet: string, prop: KeyedProp, before: SheetData, after: SheetData): Op | null {
  const was = new Map<number, string>((before[prop] ?? []).map(([key, value]) => [key, json(value)]));
  const set: Array<[number, unknown]> = [];
  const seen = new Set<number>();
  for (const [key, value] of after[prop] ?? []) {
    seen.add(key);
    if (was.get(key) !== json(value)) set.push([key, value]);
  }
  const del = [...was.keys()].filter((key) => !seen.has(key));
  return set.length || del.length ? { t: 'keyed', sheet, prop, set, del } : null;
}

function diffSheet(name: string, before: SheetData, beforeStyles: CellStyle[], after: SheetData, afterStyles: CellStyle[]): Op[] {
  const ops: Op[] = [];
  const cells = diffCells(name, before, beforeStyles, after, afterStyles);
  if (cells) ops.push(cells);
  for (const prop of KEYED_PROPS) {
    const op = diffKeyed(name, prop, before, after);
    if (op) ops.push(op);
  }
  for (const prop of WHOLE_PROPS) {
    const was = isEmptyWhole(before[prop]) ? null : before[prop];
    const now = isEmptyWhole(after[prop]) ? null : after[prop];
    if (json(was) !== json(now)) ops.push({ t: 'prop', sheet: name, prop, value: now });
  }
  return ops;
}

/** Trang tính mới đi kèm bảng định dạng riêng của nó (chỉ số ô trỏ vào bảng này), để không phụ thuộc bảng của máy nào. */
function portable(sheet: SheetData, styles: CellStyle[]): { sheet: SheetData; styles: CellStyle[] } {
  const own: CellStyle[] = [{}];
  const index = new Map<string, number>([['{}', 0]]);
  const cells = sheet.cells.map(([key, raw, style]) => {
    const token = styleToken(styles[style]);
    let at = index.get(token);
    if (at === undefined) {
      at = own.length;
      own.push(styles[style]);
      index.set(token, at);
    }
    return [key, raw, at] as [number, string, number];
  });
  return { sheet: { ...sheet, cells }, styles: own };
}

/**
 * Các thay đổi đưa `before` thành `after`. Trang tính nhận theo tên; một trang biến mất và một trang mới xuất hiện có cùng
 * nội dung được coi là đổi tên. Chèn hoặc xóa hàng cột sinh nhiều thay đổi ô nhưng đúng.
 */
export function diffWorkbooks(before: WorkbookData, after: WorkbookData): Patch {
  const ops: Op[] = [];
  const beforeNames = new Set(before.sheets.map((sheet) => sheet.name));
  const afterNames = new Set(after.sheets.map((sheet) => sheet.name));
  const removed = before.sheets.filter((sheet) => !afterNames.has(sheet.name));
  const added = after.sheets.filter((sheet) => !beforeNames.has(sheet.name));

  const renamedTo = new Map<string, string>();
  const stillAdded = [...added];
  const stillRemoved: SheetData[] = [];
  for (const gone of removed) {
    const key = contentOf(gone, before.styles);
    const at = stillAdded.findIndex((sheet) => contentOf(sheet, after.styles) === key);
    if (at >= 0) {
      renamedTo.set(gone.name, stillAdded[at].name);
      stillAdded.splice(at, 1);
    } else {
      stillRemoved.push(gone);
    }
  }
  const oldNameOf = new Map([...renamedTo].map(([from, to]) => [to, from]));

  for (const gone of stillRemoved) ops.push({ t: 'removeSheet', sheet: gone.name });
  for (const [from, to] of renamedTo) ops.push({ t: 'renameSheet', from, to });
  for (const sheet of stillAdded) {
    const own = portable(sheet, after.styles);
    ops.push({ t: 'addSheet', index: after.sheets.indexOf(sheet), sheet: own.sheet, styles: own.styles });
  }
  for (const sheet of after.sheets) {
    if (stillAdded.includes(sheet)) continue;
    const previous = before.sheets.find((candidate) => candidate.name === (oldNameOf.get(sheet.name) ?? sheet.name));
    if (previous) ops.push(...diffSheet(sheet.name, previous, before.styles, sheet, after.styles));
  }

  const order = after.sheets.map((sheet) => sheet.name);
  const gone = new Set(stillRemoved.map((sheet) => sheet.name));
  const predicted = before.sheets.filter((sheet) => !gone.has(sheet.name)).map((sheet) => renamedTo.get(sheet.name) ?? sheet.name);
  for (const sheet of stillAdded) predicted.splice(Math.min(after.sheets.indexOf(sheet), predicted.length), 0, sheet.name);
  if (json(order) !== json(predicted)) ops.push({ t: 'order', names: order });
  return ops;
}
