import { cleanStyle, type CellStyle, type WorkbookData } from '../calc/model/workbook';

export type SheetData = WorkbookData['sheets'][number];

/** Thuộc tính của trang tính thay nguyên giá trị khi đổi (người sau thắng). */
export const WHOLE_PROPS = ['merges', 'cf', 'charts', 'images', 'filter', 'freeze', 'summary', 'validations', 'pageSetup', 'protected'] as const;
export type WholeProp = (typeof WHOLE_PROPS)[number];

/** Thuộc tính dạng bảng khóa-giá trị, sửa từng khóa nên hai người đổi hai cột khác nhau không đè nhau. */
export const KEYED_PROPS = ['colWidths', 'rowHeights', 'comments'] as const;
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
  | { t: 'order'; names: string[] };

export type Patch = Op[];

export const styleToken = (style: CellStyle | null | undefined): string => (style ? JSON.stringify(cleanStyle(style)) : '{}');

/** Bản chuẩn để so sánh hai bảng tính: không phụ thuộc số hiệu định dạng, thứ tự ô hay thứ tự khóa. */
export function canonicalize(data: WorkbookData): unknown {
  return data.sheets.map((sheet) => {
    const resolved = sheet.cells
      .map(([key, raw, style]) => [key, raw, styleToken(data.styles[style])] as const)
      .filter(([, raw, style]) => raw !== '' || style !== '{}')
      .sort((a, b) => a[0] - b[0]);
    const sorted = <T>(entries: Array<[number, T]> | undefined) => [...(entries ?? [])].sort((a, b) => a[0] - b[0]);
    const rest: Record<string, unknown> = {};
    for (const prop of WHOLE_PROPS) {
      const value = sheet[prop];
      if (value === undefined || value === false || (Array.isArray(value) && value.length === 0)) continue;
      if (prop === 'freeze' && (value as { rows: number; cols: number }).rows === 0 && (value as { rows: number; cols: number }).cols === 0) continue;
      rest[prop] = value;
    }
    return {
      name: sheet.name,
      cells: resolved,
      colWidths: sorted(sheet.colWidths),
      rowHeights: sorted(sheet.rowHeights),
      comments: sorted(sheet.comments),
      ...rest,
    };
  });
}

export const sameData = (a: WorkbookData, b: WorkbookData): boolean => JSON.stringify(canonicalize(a)) === JSON.stringify(canonicalize(b));
