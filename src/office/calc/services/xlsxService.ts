import type { Cell as ExcelCell, Workbook as ExcelWorkbook, Worksheet } from 'exceljs';
import { cellKey, cellName, columnName, parseCell, parseRange, rangeName, type RangePos } from '../engine/cellRef';
import { isValidName } from '../engine/definedNames';
import type { CfRule, CfStyle, IconSet } from '../engine/conditional';
import { isError, type Scalar } from '../engine/values';
import { mergeValidations, parseListItems, type NumberOp, type Validation, type ValidationRule } from '../engine/validation';
import { addChartsToXlsx, readChartsFromXlsx } from './xlsxCharts';
import { addZeroHidingToXlsx, readZeroHidingSheets } from './xlsxZeros';
import { addSparklinesToXlsx, readSparklinesFromXlsx } from './xlsxSparklines';
import { DEFAULT_COL_WIDTH, pageSetupOf, Workbook, constantValue, newSheet, type BorderLine, type BorderLineStyle, type Borders, type Cell, type CellStyle, type Sheet, type WorkbookData } from '../model/workbook';
import { BORDER_STYLES, edgeLine, simpleEdge } from '../utils/borderLines';
import { parseCsv, toCsv } from '../utils/csv';
import { fromExcelPageSetup, toExcelPageSetup, type ExcelPageSetup } from './pageSetupXlsx';
import { fromFileFormula, toFileFormula } from './xlfn';

/** Excel's column width unit (characters of the default font) and pixels. */
/**
 * Excel's built-in codes as ExcelJS names them, written the way they show: the short date follows this
 * app's own date format (what a typed date gets), and two codes ExcelJS has misspelled are put right.
 */
const BUILT_IN_FORMATS: Record<string, string> = {
  'mm-dd-yy': 'dd/mm/yyyy',
  'm/d/yy "h":mm': 'dd/mm/yyyy hh:mm',
  'mmss.0': 'mm:ss.0',
};
const fromFileFormat = (code: string): string => BUILT_IN_FORMATS[code] ?? code;

const pxFromChars = (chars: number) => Math.round(chars * 7 + 5);
/** ExcelJS leaves out a row that has neither cells nor a height, hidden or not. */
const HIDDEN_ROW_POINTS = 15;
const charsFromPx = (px: number) => Math.max(1, (px - 5) / 7);

const UNIX_EPOCH_SERIAL = 25569;
const serialFromJsDate = (date: Date) => date.getTime() / 86_400_000 + UNIX_EPOCH_SERIAL;
const jsDateFromSerial = (serial: number) => new Date((serial - UNIX_EPOCH_SERIAL) * 86_400_000);

/** A dotted or hatched fill drawn as the single colour it averages to: the pattern's ink over its paper, by how much of the cell the ink covers. */
export function patternFill(pattern: string, ink: string | undefined, paper: string | undefined): string | null {
  const COVER: Record<string, number> = { gray0625: 0.0625, gray125: 0.125, lightGray: 0.25, mediumGray: 0.5, darkGray: 0.75 };
  const cover = COVER[pattern] ?? (pattern.startsWith('dark') ? 0.5 : pattern.startsWith('light') ? 0.25 : null);
  if (cover === null) return null;
  const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const fg = channels(ink ?? '#000000');
  const bg = channels(paper ?? '#ffffff');
  return `#${fg.map((c, i) => Math.round(bg[i] * (1 - cover) + c * cover).toString(16).padStart(2, '0')).join('')}`;
}

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

/** Text as Calc stores a constant: marked with an apostrophe when it would otherwise be read back as a number, TRUE/FALSE or a formula ("334,495.00" is text in the file). */
function textRaw(text: string): string {
  return /^[=']/.test(text) || constantValue(text) !== text ? `'${text}` : text;
}

const EXTERNAL_LINK = /\[\d+\]/;

/** The value Excel stored with a formula, as the text Calc stores a constant. */
function storedResult(result: unknown): string {
  if (typeof result === 'number') return String(result);
  if (typeof result === 'boolean') return result ? 'TRUE' : 'FALSE';
  if (result instanceof Date) return String(Number(serialFromJsDate(result).toFixed(6)));
  if (typeof result === 'string') return textRaw(result);
  if (result && typeof result === 'object' && 'error' in result) return `=${String((result as { error: string }).error)}`;
  return '';
}

/** What a loaded cell holds, as the text Calc stores. */
function rawOf(cell: ExcelCell): string {
  const value = cell.value as unknown;
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'string') return textRaw(value);
  if (value instanceof Date) return String(Number(serialFromJsDate(value).toFixed(6)));
  const object = value as ExcelValueObject;
  const formula = cell.formula || object.formula;
  // A formula that reaches into another workbook (`[1]Sheet'!A1`) cannot be worked out here: it keeps the value Excel stored for it.
  if (formula && EXTERNAL_LINK.test(formula)) return storedResult(object.result);
  if (formula) return `=${fromFileFormula(formula)}`;
  if (object.richText) return textRaw(object.richText.map((part) => part.text).join(''));
  if (object.text !== undefined) return textRaw(String(object.text));
  if (object.error) return `=${object.error}`;
  return '';
}

/** A note's text: ExcelJS gives a string, or the pieces of a rich text. */
function noteTextOf(note: ExcelCell['note']): string {
  if (!note) return '';
  if (typeof note === 'string') return note;
  return (note.texts ?? []).map((part) => part.text).join('');
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
  if (cell.protection?.locked === false) style.unlocked = true;
  const fill = cell.fill;
  if (fill && fill.type === 'pattern' && fill.pattern === 'solid') {
    const color = argbToHex(fill.fgColor?.argb);
    if (color && color !== '#ffffff') style.fill = color;
  } else if (fill && fill.type === 'pattern' && fill.pattern && fill.pattern !== 'none') {
    const mixed = patternFill(fill.pattern, argbToHex(fill.fgColor?.argb), argbToHex(fill.bgColor?.argb));
    if (mixed && mixed !== '#ffffff') style.fill = mixed;
  }
  const alignment = cell.alignment;
  if (alignment) {
    if (alignment.horizontal === 'left' || alignment.horizontal === 'center' || alignment.horizontal === 'right') style.hAlign = alignment.horizontal;
    if (alignment.vertical === 'top' || alignment.vertical === 'middle' || alignment.vertical === 'bottom') style.vAlign = alignment.vertical;
    if (alignment.wrapText) style.wrap = true;
    if (alignment.shrinkToFit) style.shrink = true;
    if (typeof alignment.indent === 'number' && alignment.indent > 0) style.indent = Math.min(15, Math.round(alignment.indent));
    const turn = alignment.textRotation;
    // ExcelJS already maps the file's 0 to 180 onto -90 to 90.
    if (typeof turn === 'number' && turn !== 0 && turn >= -90 && turn <= 90) style.rotation = turn;
  }
  if (cell.numFmt && cell.numFmt !== 'General') style.numFmt = fromFileFormat(cell.numFmt);
  else if (isDate) style.numFmt = 'dd/mm/yyyy';
  const border = cell.border;
  if (border) {
    const read = (edge: { style?: string; color?: { argb?: string } } | undefined): boolean | BorderLine | undefined => {
      if (!edge?.style) return undefined;
      const known = (BORDER_STYLES as string[]).includes(edge.style) ? (edge.style as BorderLineStyle) : edge.style === 'mediumDashed' || edge.style === 'slantDashDot' || edge.style === 'dashDot' || edge.style === 'dashDotDot' || edge.style === 'mediumDashDot' || edge.style === 'mediumDashDotDot' ? 'dashed' : 'thin';
      const color = argbToHex(edge.color?.argb);
      return simpleEdge({ style: known, ...(color && color !== '#000000' ? { color } : {}) });
    };
    const borders: Borders = { top: read(border.top), right: read(border.right), bottom: read(border.bottom), left: read(border.left) };
    const diagonal = border.diagonal as { style?: string; color?: { argb?: string }; up?: boolean; down?: boolean } | undefined;
    const diagonalLine = read(diagonal);
    if (diagonalLine && diagonal?.up) borders.diagonalUp = diagonalLine;
    if (diagonalLine && diagonal?.down) borders.diagonalDown = diagonalLine;
    for (const side of ['top', 'right', 'bottom', 'left'] as const) if (!borders[side]) delete borders[side];
    if (!borders.diagonalUp) delete borders.diagonalUp;
    if (!borders.diagonalDown) delete borders.diagonalDown;
    if (Object.keys(borders).length > 0) style.borders = borders;
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
      return { type: 'top10', priority, rank: rule.n, percent: !!rule.percent, bottom: rule.bottom, style: styleOut(rule.style) };
    case 'aboveAverage':
      return { type: 'aboveAverage', priority, aboveAverage: !rule.below, style: styleOut(rule.style) } as ExcelRule;
    case 'scale': {
      const colors = [rule.low, ...(rule.mid ? [rule.mid] : []), rule.high].map((c) => ({ argb: hexToArgb(c) }));
      const cfvo = rule.mid ? [{ type: 'min' }, { type: 'percentile', value: 50 }, { type: 'max' }] : [{ type: 'min' }, { type: 'max' }];
      return { type: 'colorScale', priority, cfvo, color: colors } as ExcelRule;
    }
    case 'icons': {
      const iconMap: Record<IconSet, string> = {
        arrows: '3Arrows',
        arrowsGray: '3ArrowsGray',
        triangles: '3Triangles',
        arrows4: '4Arrows',
        arrows4Gray: '4ArrowsGray',
        arrows5: '5Arrows',
        arrows5Gray: '5ArrowsGray',
        lights: '3TrafficLights1',
        lightsRim: '3TrafficLights2',
        shapes: '3Signs',
        signs: '3Signs',
        lights4: '4TrafficLights',
        dots4: '4TrafficLights',
        flags: '3Flags',
        symbolsCircled: '3SymbolsCircled',
        symbols: '3Symbols',
        stars: '3Stars',
        pies: '5Quarters',
        boxes: '5Boxes',
        bars4: '4Rating',
        bars5: '5Rating',
      };
      const name = iconMap[rule.set] ?? '3Arrows';
      const count = Number(name[0]) || 3;
      return { type: 'iconSet', priority, iconSet: name, cfvo: Array.from({ length: count }, (_, i) => ({ type: 'percent', value: Math.round((100 * i) / count) })) } as ExcelRule;
    }
    case 'bar':
      return { type: 'dataBar', priority, cfvo: [{ type: 'min' }, { type: 'max' }], color: { argb: hexToArgb(rule.color) } } as ExcelRule;
    default:
      return null;
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
      return rule.rank ? { id, range, kind: 'top', n: rule.rank, bottom: !!rule.bottom, percent: !!rule.percent, style } : null;
    case 'aboveAverage':
      return { id, range, kind: 'aboveAverage', below: !(rule as { aboveAverage?: boolean }).aboveAverage, style };
    case 'colorScale': {
      const colors = ((Array.isArray(rule.color) ? rule.color : []) as Array<{ argb?: string }>).map((c) => argbToHex(c.argb));
      if (colors.length < 2 || colors.some((c) => !c)) return null;
      return { id, range, kind: 'scale', low: colors[0] as string, mid: colors.length > 2 ? (colors[1] as string) : undefined, high: colors[colors.length - 1] as string };
    }
    case 'iconSet': {
      const name = String((rule as { iconSet?: string }).iconSet ?? '');
      const set: IconSet | null = /^3ArrowsGray/.test(name)
        ? 'arrowsGray'
        : /^3Triangles/.test(name)
        ? 'triangles'
        : /^4ArrowsGray/.test(name)
        ? 'arrows4Gray'
        : /^5ArrowsGray/.test(name)
        ? 'arrows5Gray'
        : /^4Arrows/.test(name)
        ? 'arrows4'
        : /^5Arrows/.test(name)
        ? 'arrows5'
        : /^4TrafficLights/.test(name)
        ? 'lights4'
        : /^3TrafficLights2/.test(name)
        ? 'lightsRim'
        : /^3SymbolsCircled/.test(name)
        ? 'symbolsCircled'
        : /^3Symbols/.test(name)
        ? 'symbols'
        : /^3Stars/.test(name)
        ? 'stars'
        : /^5Quarters/.test(name)
        ? 'pies'
        : /^5Boxes/.test(name)
        ? 'boxes'
        : /^4Rating/.test(name)
        ? 'bars4'
        : /^5Rating/.test(name)
        ? 'bars5'
        : /Arrows/.test(name)
        ? 'arrows'
        : /Flags/.test(name)
        ? 'flags'
        : /Signs|Symbols|Shapes/.test(name)
        ? 'signs'
        : /Traffic|Rating|Stars|Quarters|Boxes/.test(name)
        ? 'lights'
        : null;
      return set ? { id, range, kind: 'icons', set } : null;
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
  for (const { name, ranges } of book.definedNames.model as Array<{ name: string; ranges: string[] }>) {
    const [first] = ranges;
    // A name that points into another workbook (`'[1]Sheet'!$A$1`) has nothing here to point at; keeping it would write a file Excel calls corrupt.
    if (first && isValidName(name) && !EXTERNAL_LINK.test(first)) wb.names.set(name.toUpperCase(), { name, refersTo: first });
  }
  book.eachSheet((ws: Worksheet) => {
    const sheet = newSheet(ws.name.slice(0, 31));
    if ((ws as unknown as { sheetProtection?: unknown }).sheetProtection) sheet.protected = true;
    const tab = argbToHex(ws.properties?.tabColor?.argb);
    if (tab) sheet.tabColor = tab;
    if (ws.state === 'hidden' || ws.state === 'veryHidden') sheet.hidden = true;
    wb.sheets.push(sheet);
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        // A cell hidden inside a merge has nothing of its own.
        if (cell.isMerged && cell.master !== cell) return;
        const raw = rawOf(cell);
        const link = (cell.value as { hyperlink?: string } | null)?.hyperlink;
        if (link) (sheet.links ??= new Map()).set(cellKey(rowNumber - 1, colNumber - 1), link);
        const note = noteTextOf(cell.note);
        if (note) (sheet.comments ??= new Map()).set(cellKey(rowNumber - 1, colNumber - 1), { text: note, author: '', at: Date.now() });
        const isDate = (cell.value as unknown) instanceof Date;
        const style = styleOf(cell, isDate);
        if (raw === '' && Object.keys(style).length === 0) return;
        sheet.cells.set(cellKey(rowNumber - 1, colNumber - 1), { raw, style: wb.styleId(style) });
      });
    });
    for (const [index, column] of (ws.columns ?? []).entries()) {
      if (column.width) sheet.colWidths.set(index, pxFromChars(column.width));
      if (column.hidden) (sheet.colsHidden ??= new Set()).add(index);
      if (column.outlineLevel) (sheet.colLevels ??= new Map()).set(index, Math.min(7, column.outlineLevel));
    }
    ws.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      if (row.hidden) (sheet.rowsHidden ??= new Set()).add(rowNumber - 1);
      if (row.outlineLevel) (sheet.rowLevels ??= new Map()).set(rowNumber - 1, Math.min(7, row.outlineLevel));
      // A hidden row is written with the default height so that it survives; that is not a height anyone set.
      if (row.height && !(row.hidden && row.height === HIDDEN_ROW_POINTS)) (sheet.rowHeights ??= new Map()).set(rowNumber - 1, Math.round((row.height * 96) / 72));
    });
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
    // Rows hidden inside a filtered block were hidden by the filter, which SUBTOTAL leaves out and a hand-hidden row it does not.
    if (sheet.filter && sheet.rowsHidden) {
      const { r1, r2 } = sheet.filter.range;
      const inside = [...sheet.rowsHidden].filter((row) => row > r1 && row <= r2);
      if (inside.length > 0) {
        sheet.filter.imported = inside;
        for (const row of inside) sheet.rowsHidden.delete(row);
        if (sheet.rowsHidden.size === 0) delete sheet.rowsHidden;
      }
    }
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
  const zeroHiding = await readZeroHidingSheets(data);
  for (const sheet of wb.sheets) if (zeroHiding.has(sheet.name)) sheet.hideZeros = true;
  // ExcelJS drops charts, so they are read from the package itself.
  const charts = await readChartsFromXlsx(data, (name, col) => wb.sheets.find((sheet) => sheet.name === name)?.colWidths.get(col) ?? DEFAULT_COL_WIDTH);
  for (const sheet of wb.sheets) sheet.charts = charts.get(sheet.name) ?? [];
  const sparklines = await readSparklinesFromXlsx(data);
  for (const sheet of wb.sheets) {
    const found = sparklines.get(sheet.name);
    if (found) sheet.sparklines = found;
  }
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
  const protections: Array<Promise<void>> = [];
  const { default: ExcelJS } = await import('exceljs');
  const book: ExcelWorkbook = new ExcelJS.Workbook();
  book.creator = 'Felix Office';
  // Names that refer to cells go in the file; one holding a constant or a calculation has no place there yet.
  for (const { name, refersTo } of wb.names.values()) {
    const found = /^('[^']*(?:''[^']*)*'|[A-Za-z_][A-Za-z0-9_.]*)!\$?[A-Za-z]{1,3}\$?\d+(:\$?[A-Za-z]{1,3}\$?\d+)?$/.exec(refersTo);
    if (!found) continue;
    // A name whose sheet is gone would make the file unreadable.
    const sheetName = found[1].startsWith("'") ? found[1].slice(1, -1).replace(/''/g, "'") : found[1];
    if (wb.sheetIndex(sheetName) >= 0) book.definedNames.add(refersTo, name);
  }
  wb.sheets.forEach((sheet, sheetIndex) => {
    // Without a sheet view Excel reads every custom row height as four fifths of what is written.
    const ws = book.addWorksheet(sheet.name, { ...(sheet.hidden ? { state: 'hidden' as const } : {}), views: [{ state: 'normal' }], ...(sheet.tabColor ? { properties: { tabColor: { argb: `FF${sheet.tabColor.slice(1).toUpperCase()}` } } } : {}) });
    // No password: the protection is a guard against slips, as it is here.
    if (sheet.protected) protections.push(ws.protect('', { selectLockedCells: true, selectUnlockedCells: true }));
    for (const [col, width] of sheet.colWidths) ws.getColumn(col + 1).width = charsFromPx(width);
    for (const col of sheet.colsHidden ?? []) ws.getColumn(col + 1).hidden = true;
    for (const [col, level] of sheet.colLevels ?? []) ws.getColumn(col + 1).outlineLevel = level;
    for (const [row, level] of sheet.rowLevels ?? []) ws.getRow(row + 1).outlineLevel = level;
    for (const [row, height] of sheet.rowHeights ?? []) ws.getRow(row + 1).height = (height * 72) / 96;
    for (const row of sheet.rowsHidden ?? []) {
      const target = ws.getRow(row + 1);
      target.hidden = true;
      target.height ||= HIDDEN_ROW_POINTS;
    }
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
      const link = sheet.links?.get(key);
      // A formula cell cannot carry a link in this library; its value is what the file keeps.
      if (link && !(cell.raw.startsWith('=') && cell.raw.length > 1)) target.value = { text: String(target.value ?? cell.raw), hyperlink: link } as ExcelCell['value'];
      const note = sheet.comments?.get(key)?.text;
      if (note) target.note = note;
      if (style.unlocked) target.protection = { locked: false };
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
      if (style.hAlign || style.vAlign || style.wrap || style.indent || style.rotation || style.shrink) {
        target.alignment = {
          horizontal: style.hAlign ?? (style.indent ? 'left' : undefined),
          vertical: style.vAlign,
          wrapText: style.wrap,
          ...(style.shrink ? { shrinkToFit: true } : {}),
          ...(style.indent ? { indent: style.indent } : {}),
          ...(style.rotation ? { textRotation: style.rotation } : {}),
        };
      }
      if (style.borders) {
        const edge = (on: boolean | BorderLine | undefined) => {
          const line = edgeLine(on);
          return line ? { style: line.style, ...(line.color ? { color: { argb: hexToArgb(line.color) } } : {}) } : undefined;
        };
        const diagonal = edge(style.borders.diagonalUp ?? style.borders.diagonalDown);
        target.border = {
          top: edge(style.borders.top),
          right: edge(style.borders.right),
          bottom: edge(style.borders.bottom),
          left: edge(style.borders.left),
          ...(diagonal ? { diagonal: { ...diagonal, up: !!style.borders.diagonalUp, down: !!style.borders.diagonalDown } } : {}),
        };
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
  await Promise.all(protections);
  const buffer = await addSparklinesToXlsx(await addZeroHidingToXlsx(await addChartsToXlsx((await book.xlsx.writeBuffer()) as ArrayBuffer, wb), wb), wb);
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
  return new Blob(['\ufeff', toCsv(rows)], { type: 'text/csv;charset=utf-8' });
}

/** The active sheet as tab-delimited text, with a BOM so Excel reads Unicode. */
export function exportTsv(wb: Workbook, sheetIndex: number): Blob {
  const used = wb.usedRange(sheetIndex);
  const rows: string[] = [];
  if (used) {
    for (let r = 0; r <= used.r2; r += 1) {
      const line: string[] = [];
      for (let c = 0; c <= used.c2; c += 1) {
        line.push(wb.displayAt(sheetIndex, r, c).replace(/[\t\r\n]/g, ' '));
      }
      rows.push(line.join('\t'));
    }
  }
  return new Blob(['\ufeff', rows.join('\r\n')], { type: 'text/tab-separated-values;charset=utf-8' });
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
