import type { Cell as ExcelCell, Workbook as ExcelWorkbook, Worksheet } from 'exceljs';
import { cellKey, cellName, columnName, parseCell, parseRange, rangeName, type RangePos } from '../engine/cellRef';
import type { CfRule, CfStyle } from '../engine/conditional';
import { isError, type Scalar } from '../engine/values';
import { mergeValidations, parseListItems, type NumberOp, type Validation, type ValidationRule } from '../engine/validation';
import { addChartsToXlsx, readChartsFromXlsx } from './xlsxCharts';
import { DEFAULT_COL_WIDTH, pageSetupOf, Workbook, constantValue, newSheet, type Cell, type CellStyle, type Sheet, type WorkbookData } from '../model/workbook';
import { parseCsv, toCsv } from '../utils/csv';
import { fromExcelPageSetup, toExcelPageSetup, type ExcelPageSetup } from './pageSetupXlsx';
import { fromFileFormula, toFileFormula } from './xlfn';

/** Excel's column width unit (characters of the default font) and pixels. */
const pxFromChars = (chars: number) => Math.round(chars * 7 + 5);
const charsFromPx = (px: number) => Math.max(1, (px - 5) / 7);

const UNIX_EPOCH_SERIAL = 25569;
const serialFromJsDate = (date: Date) => date.getTime() / 86_400_000 + UNIX_EPOCH_SERIAL;
const jsDateFromSerial = (serial: number) => new Date((serial - UNIX_EPOCH_SERIAL) * 86_400_000);

const argbToHex = (argb: string | undefined): string | undefined => {
  if (!argb || argb.length < 6) return undefined;
  const hex = argb.slice(-6).toLowerCase();
  return /^[0-9a-f]{6}$/.test(hex) ? `#${hex}` : undefined;
};
const hexToArgb = (hex: string) => `FF${hex.replace('#', '').toUpperCase()}`;

interface ExcelValueObject {
  formula?: string;
  sharedFormula?: string;
  result?: unknown;
  richText?: Array<{ text: string }>;
  text?: string;
  hyperlink?: string;
  error?: string;
}

/** What a loaded cell holds, as the text Calc stores. */
function rawOf(cell: ExcelCell): string {
  const value = cell.value as unknown;
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'string') return /^[=']/.test(value) || !Number.isNaN(Number(value)) && value.trim() !== '' ? `'${value}` : value;
  if (value instanceof Date) return String(Number(serialFromJsDate(value).toFixed(6)));
  const object = value as ExcelValueObject;
  const formula = cell.formula || object.formula;
  if (formula) return `=${fromFileFormula(formula)}`;
  if (object.richText) return object.richText.map((part) => part.text).join('');
  if (object.text !== undefined) return String(object.text);
  if (object.error) return `=${object.error}`;
  return '';
}

function styleOf(cell: ExcelCell, isDate: boolean): CellStyle {
  const style: CellStyle = {};
  const font = cell.font;
  if (font) {
    if (font.bold) style.bold = true;
    if (font.italic) style.italic = true;
    if (font.underline) style.underline = true;
    if (font.strike) style.strike = true;
    if (font.name) style.fontFamily = font.name;
    if (font.size) style.fontSize = font.size;
    const color = argbToHex(font.color?.argb);
    if (color && color !== '#000000') style.color = color;
  }
  const fill = cell.fill;
  if (fill && fill.type === 'pattern' && fill.pattern === 'solid') {
    const color = argbToHex(fill.fgColor?.argb);
    if (color && color !== '#ffffff') style.fill = color;
  }
  const alignment = cell.alignment;
  if (alignment) {
    if (alignment.horizontal === 'left' || alignment.horizontal === 'center' || alignment.horizontal === 'right') style.hAlign = alignment.horizontal;
    if (alignment.vertical === 'top' || alignment.vertical === 'middle' || alignment.vertical === 'bottom') style.vAlign = alignment.vertical;
    if (alignment.wrapText) style.wrap = true;
  }
  if (cell.numFmt && cell.numFmt !== 'General') style.numFmt = cell.numFmt;
  else if (isDate) style.numFmt = 'dd/mm/yyyy';
  const border = cell.border;
  if (border) {
    const borders = { top: !!border.top?.style, right: !!border.right?.style, bottom: !!border.bottom?.style, left: !!border.left?.style };
    if (Object.values(borders).some(Boolean)) style.borders = borders;
  }
  return style;
}


// ----- Conditional formatting

const OPERATOR_OUT = {
  gt: 'greaterThan',
  lt: 'lessThan',
  gte: 'greaterThanOrEqual',
  lte: 'lessThanOrEqual',
  eq: 'equal',
  neq: 'notEqual',
  between: 'between',
} as const;
const OPERATOR_IN: Record<string, keyof typeof OPERATOR_OUT> = Object.fromEntries(Object.entries(OPERATOR_OUT).map(([k, v]) => [v, k as keyof typeof OPERATOR_OUT]));

interface ExcelRule {
  type: string;
  priority?: number;
  operator?: string;
  formulae?: unknown[];
  text?: string;
  rank?: number;
  bottom?: boolean;
  percent?: boolean;
  color?: { argb?: string } | Array<{ argb?: string }>;
  style?: { fill?: { bgColor?: { argb?: string }; fgColor?: { argb?: string } }; font?: { bold?: boolean; color?: { argb?: string } } };
}

function styleOut(style: CfStyle) {
  return {
    fill: style.fill ? { type: 'pattern' as const, pattern: 'solid' as const, bgColor: { argb: hexToArgb(style.fill) } } : undefined,
    font: style.color || style.bold ? { color: style.color ? { argb: hexToArgb(style.color) } : undefined, bold: style.bold } : undefined,
  };
}

function styleIn(style: ExcelRule['style']): CfStyle {
  const out: CfStyle = {};
  const fill = argbToHex(style?.fill?.bgColor?.argb ?? style?.fill?.fgColor?.argb);
  if (fill) out.fill = fill;
  const color = argbToHex(style?.font?.color?.argb);
  if (color) out.color = color;
  if (style?.font?.bold) out.bold = true;
  return out;
}

function ruleOut(rule: CfRule, priority: number): ExcelRule | null {
  switch (rule.kind) {
    case 'cell':
      return { type: 'cellIs', priority, operator: OPERATOR_OUT[rule.op], formulae: rule.op === 'between' ? [rule.a, rule.b ?? rule.a] : [rule.a], style: styleOut(rule.style) };
    case 'text':
      return rule.op === 'contains' ? { type: 'containsText', priority, operator: 'containsText', text: rule.text, style: styleOut(rule.style) } : null;
    case 'duplicate': {
      const { r1, c1, r2, c2 } = rule.range;
      return { type: 'expression', priority, formulae: [`COUNTIF($${columnName(c1)}$${r1 + 1}:$${columnName(c2)}$${r2 + 1},${cellName(r1, c1)})>1`], style: styleOut(rule.style) };
    }
    case 'top':
      return { type: 'top10', priority, rank: rule.n, percent: false, bottom: rule.bottom, style: styleOut(rule.style) };
    case 'scale': {
      const colors = [rule.low, ...(rule.mid ? [rule.mid] : []), rule.high].map((c) => ({ argb: hexToArgb(c) }));
      const cfvo = rule.mid ? [{ type: 'min' }, { type: 'percentile', value: 50 }, { type: 'max' }] : [{ type: 'min' }, { type: 'max' }];
      return { type: 'colorScale', priority, cfvo, color: colors } as ExcelRule;
    }
    case 'bar':
      return { type: 'dataBar', priority, cfvo: [{ type: 'min' }, { type: 'max' }], color: { argb: hexToArgb(rule.color) } } as ExcelRule;
  }
}

function ruleIn(rule: ExcelRule, id: string, range: RangePos): CfRule | null {
  const style = styleIn(rule.style);
  switch (rule.type) {
    case 'cellIs': {
      const op = OPERATOR_IN[rule.operator ?? 'equal'];
      const [a, b] = (rule.formulae ?? []).map((f) => Number(f));
      if (!op || !Number.isFinite(a)) return null;
      return { id, range, kind: 'cell', op, a, b: Number.isFinite(b) ? b : undefined, style };
    }
    case 'containsText': {
      // Read back, the text is only in the rule's formula: NOT(ISERROR(SEARCH("text",A1))).
      const formula = typeof rule.formulae?.[0] === 'string' ? rule.formulae[0] : '';
      const text = rule.text ?? /SEARCH\("((?:[^"]|"")*)"/i.exec(formula)?.[1]?.replace(/""/g, '"');
      return text ? { id, range, kind: 'text', op: 'contains', text, style } : null;
    }
    case 'expression':
      return typeof rule.formulae?.[0] === 'string' && /^COUNTIF\(/i.test(rule.formulae[0]) ? { id, range, kind: 'duplicate', style } : null;
    case 'top10':
      return rule.rank && !rule.percent ? { id, range, kind: 'top', n: rule.rank, bottom: !!rule.bottom, style } : null;
    case 'colorScale': {
      const colors = ((Array.isArray(rule.color) ? rule.color : []) as Array<{ argb?: string }>).map((c) => argbToHex(c.argb));
      if (colors.length < 2 || colors.some((c) => !c)) return null;
      return { id, range, kind: 'scale', low: colors[0] as string, mid: colors.length > 2 ? (colors[1] as string) : undefined, high: colors[colors.length - 1] as string };
    }
    case 'dataBar': {
      const color = argbToHex((rule.color as { argb?: string } | undefined)?.argb);
      return color ? { id, range, kind: 'bar', color } : null;
    }
    default:
      return null;
  }
}

const IMAGE_MIME: Record<string, string> = { png: 'image/png', jpeg: 'image/jpeg', jpg: 'image/jpeg', gif: 'image/gif' };
const IMAGE_ROW_PX = 24;

interface AnchorPoint {
  nativeCol?: number;
  nativeRow?: number;
  nativeColOff?: number;
  nativeRowOff?: number;
  col?: number;
  row?: number;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/** Pictures anchored in cells (PNG, JPEG, GIF), as floating pictures at the cell they start in. */
function readPictures(book: ExcelWorkbook, ws: Worksheet, sheet: Sheet): void {
  const widthOf = (col: number) => sheet.colWidths.get(col) ?? DEFAULT_COL_WIDTH;
  for (const placed of ws.getImages()) {
    const media = book.getImage(Number(placed.imageId)) as { buffer?: Uint8Array | ArrayBuffer; extension?: string } | undefined;
    const mime = IMAGE_MIME[(media?.extension ?? '').toLowerCase()];
    if (!media?.buffer || !mime) continue;
    const range = placed.range as unknown as { tl: AnchorPoint; br?: AnchorPoint; ext?: { width: number; height: number } };
    const col = Math.floor(range.tl.nativeCol ?? range.tl.col ?? 0);
    const row = Math.floor(range.tl.nativeRow ?? range.tl.row ?? 0);
    const dx = Math.round((range.tl.nativeColOff ?? 0) / 9525);
    const dy = Math.round((range.tl.nativeRowOff ?? 0) / 9525);
    let width = range.ext?.width;
    let height = range.ext?.height;
    if ((!width || !height) && range.br) {
      const endCol = Math.floor(range.br.nativeCol ?? range.br.col ?? col);
      const endRow = Math.floor(range.br.nativeRow ?? range.br.row ?? row);
      let span = -dx + Math.round((range.br.nativeColOff ?? 0) / 9525);
      for (let c = col; c < endCol; c += 1) span += widthOf(c);
      width = span;
      height = (endRow - row) * IMAGE_ROW_PX - dy + Math.round((range.br.nativeRowOff ?? 0) / 9525);
    }
    if (!width || !height || width < 1 || height < 1) continue;
    const bytes = media.buffer instanceof Uint8Array ? media.buffer : new Uint8Array(media.buffer);
    sheet.images = [
      ...(sheet.images ?? []),
      { id: `imx${sheet.name}${sheet.images?.length ?? 0}`, src: `data:${mime};base64,${toBase64(bytes)}`, alt: '', row, col, dx, dy, width: Math.round(width), height: Math.round(height) },
    ];
  }
}

function writePictures(book: ExcelWorkbook, ws: Worksheet, sheet: Sheet): void {
  for (const image of sheet.images ?? []) {
    const match = /^data:image\/(png|jpeg|gif);base64,(.*)$/.exec(image.src);
    if (!match) continue;
    const id = book.addImage({ base64: match[2], extension: match[1] as 'png' | 'jpeg' | 'gif' });
    const colWidth = sheet.colWidths.get(image.col) ?? DEFAULT_COL_WIDTH;
    ws.addImage(id, {
      tl: { col: image.col + image.dx / colWidth, row: image.row + image.dy / IMAGE_ROW_PX },
      ext: { width: image.width, height: image.height },
    } as unknown as Parameters<Worksheet['addImage']>[1]);
  }
}

/** Reads a .xlsx (ExcelJS loads on first use): values, formulas, formats, merges, column widths. */
/** Excel's name for each comparison, both ways. */
const EXCEL_OPERATORS: Record<NumberOp, string> = {
  between: 'between',
  eq: 'equal',
  neq: 'notEqual',
  gt: 'greaterThan',
  gte: 'greaterThanOrEqual',
  lt: 'lessThan',
  lte: 'lessThanOrEqual',
};
/** An inline list is limited to this many characters, quotes and commas included. */
const INLINE_LIST_LIMIT = 255;
/** A block larger than this is not written cell by cell. */
const MAX_VALIDATION_CELLS = 20_000;

interface ExcelValidation {
  type?: string;
  operator?: string;
  formulae?: Array<string | number>;
  error?: string;
}

/** The data validation rules of a worksheet: lists (typed or from a range) and whole or decimal limits. */
function readValidations(ws: Worksheet): Validation[] {
  const model = (ws as unknown as { dataValidations?: { model?: Record<string, ExcelValidation> } }).dataValidations?.model ?? {};
  const cells: Validation[] = [];
  for (const [address, found] of Object.entries(model)) {
    const pos = parseCell(address);
    if (!pos) continue;
    let rule: ValidationRule | null = null;
    const first = found.formulae?.[0];
    if (found.type === 'list' && typeof first === 'string') {
      if (first.startsWith('"')) {
        const items = parseListItems(first.replace(/^"|"$/g, '').replace(/""/g, '"'));
        if (items.length > 0) rule = { kind: 'items', items };
      } else if (first.trim()) rule = { kind: 'range', ref: first.trim() };
    } else if ((found.type === 'whole' || found.type === 'decimal') && first !== undefined) {
      const op = (Object.keys(EXCEL_OPERATORS) as NumberOp[]).find((name) => EXCEL_OPERATORS[name] === (found.operator ?? 'between'));
      const a = Number(first);
      const b = found.formulae?.[1] === undefined ? undefined : Number(found.formulae[1]);
      if (op && Number.isFinite(a) && (op !== 'between' || (b !== undefined && Number.isFinite(b)))) {
        rule = { kind: 'number', integer: found.type === 'whole', op, a, ...(op === 'between' && b !== undefined ? { b } : {}) };
      }
    }
    if (rule) cells.push({ range: { r1: pos.row, c1: pos.col, r2: pos.row, c2: pos.col }, rule, ...(found.error ? { error: found.error } : {}) });
  }
  return mergeValidations(cells);
}

function writeValidations(ws: Worksheet, validations: Validation[], sheetName: string): void {
  for (const validation of validations) {
    const { range, rule } = validation;
    if ((range.r2 - range.r1 + 1) * (range.c2 - range.c1 + 1) > MAX_VALIDATION_CELLS) continue;
    let model: Record<string, unknown> | null = null;
    if (rule.kind === 'items') {
      let text = '';
      const kept: string[] = [];
      for (const item of rule.items) {
        const next = [...kept, item].join(',');
        if (next.length + 2 > INLINE_LIST_LIMIT) break;
        kept.push(item);
        text = next;
      }
      if (kept.length > 0) model = { type: 'list', formulae: [`"${text.replace(/"/g, '""')}"`] };
    } else if (rule.kind === 'range') {
      // A range on this sheet is written bare, as Excel does; another sheet's keeps its name.
      model = { type: 'list', formulae: [rule.ref.startsWith(`'${sheetName}'!`) ? rule.ref.slice(sheetName.length + 3) : rule.ref] };
    } else {
      model = {
        type: rule.integer ? 'whole' : 'decimal',
        operator: EXCEL_OPERATORS[rule.op],
        formulae: rule.op === 'between' ? [rule.a, rule.b ?? rule.a] : [rule.a],
      };
    }
    if (!model) continue;
    const full = { ...model, allowBlank: true, showErrorMessage: true, ...(validation.error ? { error: validation.error } : {}) };
    for (let r = range.r1; r <= range.r2; r += 1)
      for (let c = range.c1; c <= range.c2; c += 1) {
        ws.getCell(r + 1, c + 1).dataValidation = full as unknown as ExcelCell['dataValidation'];
      }
  }
}

export async function importXlsx(data: ArrayBuffer): Promise<WorkbookData> {
  const { default: ExcelJS } = await import('exceljs');
  const book: ExcelWorkbook = new ExcelJS.Workbook();
  await book.xlsx.load(data);
  const wb = new Workbook();
  wb.sheets = [];
  book.eachSheet((ws: Worksheet) => {
    const sheet = newSheet(ws.name.slice(0, 31));
    wb.sheets.push(sheet);
    // Chiều cao dòng trong tệp tính bằng point (1 point = 4/3 pixel); cả dòng không có ô nào cũng giữ chiều cao.
    ws.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      if (row.height && row.height > 0) sheet.rowHeights.set(rowNumber - 1, Math.max(8, Math.round((row.height * 4) / 3)));
    });
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        // A cell hidden inside a merge has nothing of its own.
        if (cell.isMerged && cell.master !== cell) return;
        const raw = rawOf(cell);
        const isDate = (cell.value as unknown) instanceof Date;
        const style = styleOf(cell, isDate);
        if (raw === '' && Object.keys(style).length === 0) return;
        sheet.cells.set(cellKey(rowNumber - 1, colNumber - 1), { raw, style: wb.styleId(style) });
      });
    });
    for (let c = 1; c <= ws.columnCount; c += 1) {
      const width = ws.getColumn(c).width;
      if (width) sheet.colWidths.set(c - 1, pxFromChars(width));
    }
    const formattings = (ws as unknown as { conditionalFormattings?: Array<{ ref?: string; rules?: ExcelRule[] }> }).conditionalFormattings ?? [];
    let counter = 0;
    for (const formatting of formattings) {
      const range = parseRange((formatting.ref ?? '').split(' ')[0]);
      if (!range) continue;
      for (const rule of [...(formatting.rules ?? [])].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))) {
        counter += 1;
        const converted = ruleIn(rule, `x${sheet.name}${counter}`, range);
        if (converted) sheet.cf.push(converted);
      }
    }
    readPictures(book, ws, sheet);
    // An AutoFilter: the range comes back, the criteria do not (Excel stores them as conditions this app has no equivalent for).
    const auto = ws.autoFilter as unknown;
    const autoRange = typeof auto === 'string' ? parseRange(auto) : auto && typeof auto === 'object' && 'from' in auto && 'to' in auto
      ? (() => {
          const { from, to } = auto as { from: { row: number; column: number }; to: { row: number; column: number } };
          return { r1: from.row - 1, c1: from.column - 1, r2: to.row - 1, c2: to.column - 1 };
        })()
      : null;
    if (autoRange && autoRange.r2 > autoRange.r1) sheet.filter = { range: autoRange, excluded: {} };
    // A frozen view: xSplit columns and ySplit rows stay put.
    const view = ws.views?.find((v) => v.state === 'frozen') as { xSplit?: number; ySplit?: number } | undefined;
    const validations = readValidations(ws);
    if (validations.length > 0) sheet.validations = validations;
    if (view && ((view.xSplit ?? 0) > 0 || (view.ySplit ?? 0) > 0)) sheet.freeze = { rows: Math.max(0, view.ySplit ?? 0), cols: Math.max(0, view.xSplit ?? 0) };
    const pageSetup = fromExcelPageSetup(ws.pageSetup as ExcelPageSetup | undefined);
    if (pageSetup) sheet.pageSetup = pageSetup;
    const merges = (ws.model as { merges?: string[] }).merges ?? [];
    for (const m of merges) {
      const range = parseRange(m);
      if (range) sheet.merges.push(range);
    }
  });
  if (wb.sheets.length === 0) wb.sheets.push(newSheet('Sheet1'));
  // ExcelJS drops charts, so they are read from the package itself.
  const charts = await readChartsFromXlsx(data, (name, col) => wb.sheets.find((sheet) => sheet.name === name)?.colWidths.get(col) ?? DEFAULT_COL_WIDTH);
  for (const sheet of wb.sheets) sheet.charts = charts.get(sheet.name) ?? [];
  return wb.toData();
}

/** A value as the text a cell holds it as, for putting it in a cell. */
function rawFromValue(value: Scalar): string {
  if (value === null) return '';
  if (isError(value)) return `=${value.code}`;
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') return String(value);
  return /^[=']/.test(value) || constantValue(value) !== value ? `'${value}` : value;
}

/**
 * The cells to write for a sheet. A formula that spills a block of cells is
 * written as plain values (its own cell too): Excel needs dynamic-array
 * metadata a file from here does not carry, and would show only the first
 * value, or refuse the cells beside it.
 */
function cellsToWrite(wb: Workbook, sheetIndex: number): Map<number, Cell> {
  const cells = new Map(wb.sheets[sheetIndex].cells);
  for (const { row, col, range, style } of wb.spillRegions(sheetIndex)) {
    for (let r = 0; r < range.rows; r += 1)
      for (let c = 0; c < range.cols; c += 1) cells.set(cellKey(row + r, col + c), { raw: rawFromValue(range.values[r][c]), style });
  }
  return cells;
}

/** Writes the workbook as .xlsx with values, formulas (and their results), formats, merges and widths. */
export async function exportXlsx(wb: Workbook): Promise<Blob> {
  const { default: ExcelJS } = await import('exceljs');
  const book: ExcelWorkbook = new ExcelJS.Workbook();
  book.creator = 'Felix Office';
  wb.sheets.forEach((sheet, sheetIndex) => {
    const ws = book.addWorksheet(sheet.name);
    for (const [col, width] of sheet.colWidths) ws.getColumn(col + 1).width = charsFromPx(width);
    for (const [row, height] of sheet.rowHeights) ws.getRow(row + 1).height = (height * 3) / 4;
    for (const [key, cell] of cellsToWrite(wb, sheetIndex)) {
      const row = Math.floor(key / 16384);
      const col = key % 16384;
      const target = ws.getCell(row + 1, col + 1);
      const style = wb.styleOf(cell.style);
      if (cell.raw.startsWith('=') && cell.raw.length > 1) {
        const result = wb.valueAt(sheetIndex, row, col);
        target.value = {
          formula: toFileFormula(cell.raw.slice(1)),
          result: isError(result) ? { error: result.code } : (result ?? undefined),
        } as ExcelCell['value'];
      } else {
        const value = constantValue(cell.raw);
        if (value !== null && !isError(value)) {
          const dateFormat = style.numFmt !== undefined && /[dmy]/i.test(style.numFmt.replace(/"[^"]*"/g, '')) && !/[0#]/.test(style.numFmt);
          target.value = dateFormat && typeof value === 'number' ? jsDateFromSerial(value) : value;
        }
      }
      if (style.numFmt) target.numFmt = style.numFmt;
      if (style.bold || style.italic || style.underline || style.strike || style.fontFamily || style.fontSize || style.color) {
        target.font = {
          bold: style.bold,
          italic: style.italic,
          underline: style.underline,
          strike: style.strike,
          name: style.fontFamily,
          size: style.fontSize,
          color: style.color ? { argb: hexToArgb(style.color) } : undefined,
        };
      }
      if (style.fill) target.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: hexToArgb(style.fill) } };
      if (style.hAlign || style.vAlign || style.wrap) {
        target.alignment = { horizontal: style.hAlign, vertical: style.vAlign, wrapText: style.wrap };
      }
      if (style.borders) {
        const edge = (on: boolean | undefined) => (on ? { style: 'thin' as const } : undefined);
        target.border = { top: edge(style.borders.top), right: edge(style.borders.right), bottom: edge(style.borders.bottom), left: edge(style.borders.left) };
      }
    }
    for (const merge of sheet.merges) ws.mergeCells(rangeName(merge));
    if (sheet.filter) {
      const { range } = sheet.filter;
      ws.autoFilter = { from: { row: range.r1 + 1, column: range.c1 + 1 }, to: { row: range.r2 + 1, column: range.c2 + 1 } };
      // The rows the filter hides stay hidden in the file.
      for (const row of wb.hiddenRows(sheetIndex)) ws.getRow(row + 1).hidden = true;
    }
    writePictures(book, ws, sheet);
    writeValidations(ws, sheet.validations ?? [], wb.sheets[sheetIndex].name);
    if (sheet.freeze && (sheet.freeze.rows > 0 || sheet.freeze.cols > 0)) {
      ws.views = [{ state: 'frozen', xSplit: sheet.freeze.cols, ySplit: sheet.freeze.rows, topLeftCell: `${columnName(sheet.freeze.cols)}${sheet.freeze.rows + 1}` }];
    }
    if (sheet.pageSetup) ws.pageSetup = { ...ws.pageSetup, ...toExcelPageSetup(pageSetupOf(sheet)) } as Worksheet['pageSetup'];
    sheet.cf.forEach((rule, index) => {
      const converted = ruleOut(rule, index + 1);
      if (converted) ws.addConditionalFormatting({ ref: rangeName(rule.range), rules: [converted] } as unknown as Parameters<Worksheet['addConditionalFormatting']>[0]);
    });
  });
  const buffer = await addChartsToXlsx((await book.xlsx.writeBuffer()) as ArrayBuffer, wb);
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function importCsv(text: string): WorkbookData {
  const wb = new Workbook();
  parseCsv(text).forEach((row, r) =>
    row.forEach((value, c) => {
      if (value === '') return;
      // A number stays a number; text that merely looks like a formula is kept as text.
      const raw = value.startsWith('=') || value.startsWith("'") ? `'${value}` : value;
      wb.sheets[0].cells.set(cellKey(r, c), { raw, style: 0 });
    }),
  );
  return wb.toData();
}

/** The active sheet as CSV (what is shown, not the formulas), with a BOM so Excel reads Vietnamese. */
export function exportCsv(wb: Workbook, sheetIndex: number): Blob {
  const used = wb.usedRange(sheetIndex);
  const rows: string[][] = [];
  if (used) {
    for (let r = 0; r <= used.r2; r += 1) {
      const line: string[] = [];
      for (let c = 0; c <= used.c2; c += 1) line.push(wb.displayAt(sheetIndex, r, c));
      rows.push(line);
    }
  }
  return new Blob(['﻿', toCsv(rows)], { type: 'text/csv;charset=utf-8' });
}


/** Opens a spreadsheet file (by its extension) into workbook data, with the name to give the document. */
export async function importSpreadsheet(file: File, unsupported: string): Promise<{ data: WorkbookData; title: string }> {
  const dot = file.name.lastIndexOf('.');
  const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : '';
  const title = dot > 0 ? file.name.slice(0, dot) : file.name;
  if (ext === '.xlsx' || ext === '.xlsm') return { data: await importXlsx(await file.arrayBuffer()), title };
  if (ext === '.csv' || ext === '.tsv' || ext === '.txt') return { data: importCsv(await file.text()), title };
  throw new Error(unsupported);
}
