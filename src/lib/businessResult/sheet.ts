import type { KqkdColumn, KqkdDiffColumn, KqkdGapColumn, KqkdRow, KqkdSheet } from '../../types/businessResult';

const isNum = (v: number | null | undefined): v is number => typeof v === 'number' && Number.isFinite(v);

/** Id các cột đang làm kế hoạch cho một cột GAP. */
export function planColumnIds(sheet: KqkdSheet): Set<string> {
  return new Set(sheet.columns.filter((c): c is KqkdGapColumn => c.kind === 'gap').map(c => c.plan));
}

/** Các cột nhập số liệu theo mốc (bỏ cột kế hoạch), theo thứ tự trái sang phải. */
export function periodColumns(sheet: KqkdSheet): KqkdColumn[] {
  const plans = planColumnIds(sheet);
  return sheet.columns.filter(c => c.kind === 'value' && !plans.has(c.id));
}

function rawValue(row: KqkdRow, colId: string): number | null {
  const v = row.values[colId];
  return isNum(v) ? v : null;
}

/** Thực hiện của một dòng để so với kế hoạch. */
export function actualOf(sheet: KqkdSheet, row: KqkdRow): number | null {
  const values = periodColumns(sheet).map(c => rawValue(row, c.id)).filter(isNum);
  if (values.length === 0) return null;
  return row.cumulative ? values.reduce((a, b) => a + b, 0) : values[values.length - 1];
}

/** Giá trị hiển thị của một ô: số nhập, hoặc số tự tính với cột chênh lệch và GAP. */
export function cellValue(sheet: KqkdSheet, row: KqkdRow, col: KqkdColumn): number | null {
  if (col.kind === 'value') return rawValue(row, col.id);
  if (col.kind === 'diff') {
    const a = rawValue(row, col.minuend);
    const b = rawValue(row, col.subtrahend);
    return a === null || b === null ? null : roundTiny(a - b);
  }
  const plan = rawValue(row, col.plan);
  const actual = actualOf(sheet, row);
  return plan === null || actual === null ? null : roundTiny(plan - actual);
}

/** Bỏ sai số dấu phẩy động (6.3 − 1.3 = 4.999999…). */
function roundTiny(v: number): number {
  return Math.round(v * 1e6) / 1e6;
}

/** STT của dòng chính (1, 2, 3…); dòng chi tiết trả null. */
export function rowNumbers(sheet: KqkdSheet): Map<string, number | null> {
  const result = new Map<string, number | null>();
  let n = 0;
  for (const r of sheet.rows) result.set(r.id, r.sub ? null : ++n);
  return result;
}

/** Số đẹp kiểu kế toán: âm trong ngoặc, trống là "-", số lẻ giữ tối đa 2 chữ số thập phân. */
export function formatKqkdNumber(v: number | null, format: (n: number, digits: number) => string): string {
  if (!isNum(v)) return '-';
  const abs = Math.abs(v);
  const digits = Number.isInteger(abs) ? 0 : Number.isInteger(abs * 10) ? 1 : 2;
  const body = format(abs, digits);
  return v < 0 ? `(${body})` : body;
}

/**
 * Đọc chữ người dùng gõ vào ô: rỗng hoặc "-" là ô trống, "(212)" là số âm.
 * Trả undefined nếu không phải số.
 */
export function parseKqkdInput(text: string, parse: (s: string) => number): number | null | undefined {
  let s = text.trim();
  if (s === '' || s === '-') return null;
  let negative = false;
  const paren = /^\((.*)\)$/.exec(s);
  if (paren) {
    negative = true;
    s = paren[1].trim();
  }
  if (!/^[-+]?[\d\s.,]+$/.test(s) || !/\d/.test(s)) return undefined;
  const n = parse(s);
  if (!Number.isFinite(n)) return undefined;
  return negative ? -Math.abs(n) : n;
}

// ---------------------------------------------------------------------------
// Sửa bảng: mọi hàm trả bảng mới, không sửa bảng cũ.
// ---------------------------------------------------------------------------

export function newKqkdId(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function insertAt<T>(list: T[], index: number, item: T): T[] {
  return [...list.slice(0, index), item, ...list.slice(index)];
}

/** Thêm cột số liệu ngay sau mốc cuối cùng (trước các cột tự tính và kế hoạch). */
export function addValueColumn(sheet: KqkdSheet, label: string, id = newKqkdId('c')): KqkdSheet {
  const periods = periodColumns(sheet);
  const last = periods[periods.length - 1];
  const index = last ? sheet.columns.findIndex(c => c.id === last.id) + 1 : 0;
  return { ...sheet, columns: insertAt(sheet.columns, index, { id, kind: 'value', label }) };
}

/** Thêm cột chênh lệch sau cột chênh lệch cuối cùng; chưa có thì sau mốc cuối cùng. */
export function addDiffColumn(
  sheet: KqkdSheet,
  label: string,
  minuend: string,
  subtrahend: string,
  id = newKqkdId('d')
): KqkdSheet {
  const col: KqkdDiffColumn = { id, kind: 'diff', label, minuend, subtrahend };
  let index = -1;
  sheet.columns.forEach((c, i) => { if (c.kind === 'diff') index = i; });
  if (index < 0) {
    const periods = periodColumns(sheet);
    const last = periods[periods.length - 1];
    index = last ? sheet.columns.findIndex(c => c.id === last.id) : -1;
  }
  return { ...sheet, columns: insertAt(sheet.columns, index + 1, col) };
}

/** Cột tự tính nào đang dùng cột này. */
export function columnDependents(sheet: KqkdSheet, colId: string): KqkdColumn[] {
  return sheet.columns.filter(c =>
    (c.kind === 'diff' && (c.minuend === colId || c.subtrahend === colId)) ||
    (c.kind === 'gap' && c.plan === colId)
  );
}

/** Xóa cột. Báo lỗi nếu cột tự tính khác còn dùng nó, để không có ô tính lỗi kiểu #REF!. */
export function removeColumn(sheet: KqkdSheet, colId: string): KqkdSheet {
  const deps = columnDependents(sheet, colId);
  if (deps.length > 0) {
    throw new Error(`Cột đang được dùng để tính: ${deps.map(d => d.label).join(', ')}. Đổi hoặc xóa các cột đó trước.`);
  }
  return {
    ...sheet,
    columns: sheet.columns.filter(c => c.id !== colId),
    rows: sheet.rows.map(r => {
      if (!(colId in r.values)) return r;
      const values = { ...r.values };
      delete values[colId];
      return { ...r, values };
    }),
  };
}

/** Thuộc tính sửa được của cột; khóa không thuộc loại cột đó bị bỏ qua khi hiển thị và tính. */
export type KqkdColumnPatch = Partial<Pick<KqkdDiffColumn, 'label' | 'minuend' | 'subtrahend'> & Pick<KqkdGapColumn, 'plan'>>;

export function updateColumn(sheet: KqkdSheet, colId: string, patch: KqkdColumnPatch): KqkdSheet {
  return {
    ...sheet,
    columns: sheet.columns.map(c => (c.id === colId ? ({ ...c, ...patch } as KqkdColumn) : c)),
  };
}

export function moveColumn(sheet: KqkdSheet, colId: string, step: -1 | 1): KqkdSheet {
  const i = sheet.columns.findIndex(c => c.id === colId);
  const j = i + step;
  if (i < 0 || j < 0 || j >= sheet.columns.length) return sheet;
  const columns = [...sheet.columns];
  [columns[i], columns[j]] = [columns[j], columns[i]];
  return { ...sheet, columns };
}

export function setCell(sheet: KqkdSheet, rowId: string, colId: string, value: number | null): KqkdSheet {
  return {
    ...sheet,
    rows: sheet.rows.map(r => (r.id === rowId ? { ...r, values: { ...r.values, [colId]: value } } : r)),
  };
}

export function addRow(sheet: KqkdSheet, afterRowId: string | null, id = newKqkdId('r')): KqkdSheet {
  const row: KqkdRow = { id, label: 'Chỉ tiêu mới', unit: 'Triệu đồng', sub: false, cumulative: false, values: {} };
  const i = afterRowId ? sheet.rows.findIndex(r => r.id === afterRowId) : -1;
  return { ...sheet, rows: i < 0 ? [...sheet.rows, row] : insertAt(sheet.rows, i + 1, row) };
}

export function updateRow(sheet: KqkdSheet, rowId: string, patch: Partial<Omit<KqkdRow, 'id' | 'values'>>): KqkdSheet {
  return { ...sheet, rows: sheet.rows.map(r => (r.id === rowId ? { ...r, ...patch } : r)) };
}

export function removeRow(sheet: KqkdSheet, rowId: string): KqkdSheet {
  return { ...sheet, rows: sheet.rows.filter(r => r.id !== rowId) };
}

export function moveRow(sheet: KqkdSheet, rowId: string, step: -1 | 1): KqkdSheet {
  const i = sheet.rows.findIndex(r => r.id === rowId);
  const j = i + step;
  if (i < 0 || j < 0 || j >= sheet.rows.length) return sheet;
  const rows = [...sheet.rows];
  [rows[i], rows[j]] = [rows[j], rows[i]];
  return { ...sheet, rows };
}

// ---------------------------------------------------------------------------
// Kiểm tra dữ liệu đọc từ CSDL trước khi dùng.
// ---------------------------------------------------------------------------

const isStr = (v: unknown): v is string => typeof v === 'string';

function isColumn(c: unknown): c is KqkdColumn {
  if (!c || typeof c !== 'object') return false;
  const o = c as Record<string, unknown>;
  if (!isStr(o.id) || !isStr(o.label)) return false;
  if (o.kind === 'value') return true;
  if (o.kind === 'diff') return isStr(o.minuend) && isStr(o.subtrahend);
  if (o.kind === 'gap') return isStr(o.plan);
  return false;
}

function isRow(r: unknown): r is KqkdRow {
  if (!r || typeof r !== 'object') return false;
  const o = r as Record<string, unknown>;
  if (!isStr(o.id) || !isStr(o.label) || !isStr(o.unit)) return false;
  if (typeof o.sub !== 'boolean' || typeof o.cumulative !== 'boolean') return false;
  if (!o.values || typeof o.values !== 'object') return false;
  return Object.values(o.values as Record<string, unknown>).every(v => v === null || isNum(v as number));
}

/** Ném lỗi nếu dữ liệu lưu không đúng khuôn, để không hiển thị một bảng hỏng. */
export function assertKqkdSheet(data: unknown): KqkdSheet {
  const o = (data ?? {}) as Record<string, unknown>;
  const ok = isStr(o.title) && isStr(o.subtitle) && isStr(o.unitNote)
    && Array.isArray(o.columns) && o.columns.every(isColumn)
    && Array.isArray(o.rows) && o.rows.every(isRow);
  if (!ok) throw new Error('Dữ liệu bảng kết quả kinh doanh đã lưu không đúng định dạng.');
  return data as KqkdSheet;
}
