import { cleanStyle, type CellStyle, type WorkbookData } from '../calc/model/workbook';

export type SheetData = WorkbookData['sheets'][number];

/** Thuộc tính của trang tính thay nguyên giá trị khi đổi (người sau thắng). */
export const WHOLE_PROPS = [
  'merges', 'cf', 'charts', 'images', 'filter', 'freeze', 'summary', 'validations', 'pageSetup', 'protected',
  'tabColor', 'hidden', 'rowsHidden', 'colsHidden', 'sparklines', 'hideZeros',
] as const;
export type WholeProp = (typeof WHOLE_PROPS)[number];

/** Thuộc tính dạng bảng khóa-giá trị, sửa từng khóa nên hai người đổi hai cột khác nhau không đè nhau. */
export const KEYED_PROPS = ['colWidths', 'rowHeights', 'comments', 'links', 'rowLevels', 'colLevels'] as const;
export type KeyedProp = (typeof KEYED_PROPS)[number];

/**
 * Một thay đổi. Mọi thay đổi là giá trị tuyệt đối (đặt ô này thành giá trị này), không phải "cộng thêm", nên áp lại theo
 * thứ tự mới sau khi có thay đổi của người khác vẫn cho kết quả xác định. Định dạng ô đi theo giá trị, không theo số hiệu
 * trong bảng định dạng riêng của từng máy.
 */
export type Op =
  | { t: 'cells'; sheet: string; set: Array<[number, string, CellStyle | null]>; del: number[] }
  | { t: 'keyed'; sheet: string; prop: KeyedProp; set: Array<[number, unknown]>; del: number[] }
  | { t: 'prop'; sheet: string; prop: WholeProp; value: unknown | null }
  | { t: 'addSheet'; index: number; sheet: SheetData; styles: CellStyle[] }
  | { t: 'removeSheet'; sheet: string }
  | { t: 'renameSheet'; from: string; to: string }
  | { t: 'order'; names: string[] }
  | { t: 'definedNames'; value: Array<[string, string]> | null };

export type Patch = Op[];

export const styleToken = (style: CellStyle | null | undefined): string => (style ? JSON.stringify(cleanStyle(style)) : '{}');

/** Tên vùng của bảng tính theo thứ tự chữ cái; rỗng khi không có. */
export const definedNamesOf = (data: WorkbookData): Array<[string, string]> =>
  [...(data.names ?? [])].sort((a, b) => a[0].localeCompare(b[0]));

/** Bản chuẩn để so sánh hai bảng tính: không phụ thuộc số hiệu định dạng, thứ tự ô hay thứ tự khóa. */
export function canonicalize(data: WorkbookData): unknown {
  return data.sheets.map((sheet) => {
    const resolved = sheet.cells
      .map(([key, raw, style]) => [key, raw, styleToken(data.styles[style])] as const)
      .filter(([, raw, style]) => raw !== '' || style !== '{}')
      .sort((a, b) => a[0] - b[0]);
    const keyed: Record<string, unknown> = {};
    for (const prop of KEYED_PROPS) keyed[prop] = [...((sheet[prop] as Array<[number, unknown]> | undefined) ?? [])].sort((a, b) => a[0] - b[0]);
    const rest: Record<string, unknown> = {};
    for (const prop of WHOLE_PROPS) {
      const value = sheet[prop];
      if (value === undefined || value === false || (Array.isArray(value) && value.length === 0)) continue;
      if (prop === 'freeze' && (value as { rows: number; cols: number }).rows === 0 && (value as { rows: number; cols: number }).cols === 0) continue;
      rest[prop] = value;
    }
    return { name: sheet.name, cells: resolved, ...keyed, ...rest };
  });
}

export const sameData = (a: WorkbookData, b: WorkbookData): boolean =>
  JSON.stringify([canonicalize(a), definedNamesOf(a)]) === JSON.stringify([canonicalize(b), definedNamesOf(b)]);
