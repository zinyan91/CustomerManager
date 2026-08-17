import { utf8, escapeXml, zipStore, XML_DECL } from './ooxml';

export { escapeXml, zipStore };

export type XlsxAlign = 'left' | 'center' | 'right';

export interface XlsxStyle {
  bold?: boolean;
  italic?: boolean;
  align?: XlsxAlign;
  vAlign?: 'top' | 'center';
  wrap?: boolean;
  numFmt?: string;
  fill?: string;
  border?: boolean;
}

export interface XlsxCell {
  value: string | number;
  numeric?: boolean;
  formula?: string;
  style?: XlsxStyle;
}

export interface XlsxSheet {
  name: string;
  rows: XlsxCell[][];
  colWidths?: number[];
  merges?: string[];
}

function mergeCellsXml(merges?: string[]): string {
  if (!merges || merges.length === 0) return '';
  const list = merges.map(m => `<mergeCell ref="${m}"/>`).join('');
  return `<mergeCells count="${merges.length}">${list}</mergeCells>`;
}

export function sheetXml(sheet: XlsxSheet, indexFor?: (style?: XlsxStyle) => number): string {
  const styleIndex = indexFor || (() => 0);

  const rows = sheet.rows.map((row, r) => {
    const cells = row
      .map((cell, c) => cellXml(cell, `${columnLetter(c)}${r + 1}`, styleIndex(cell.style)))
      .filter(Boolean)
      .join('');
    return `<row r="${r + 1}">${cells}</row>`;
  }).join('');

  return XML_DECL
    + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + colsXml(sheet.colWidths)
    + `<sheetData>${rows}</sheetData>`
    + mergeCellsXml(sheet.merges)
    + '</worksheet>';
}

export const BASE_FONT = 'Times New Roman';
export const BASE_FONT_SIZE = 11;
export const BORDER_COLOR = 'FF000000';

export const MIME_XLSX =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export function columnLetter(index: number): string {
  let n = index + 1;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

export function sanitizeSheetName(name: string): string {
  const cleaned = (name || '').replace(/[[\]:*?/\\]/g, ' ').trim();
  if (!cleaned) return 'Sheet1';
  return cleaned.slice(0, 31);
}

export function styleKey(style?: XlsxStyle): string {
  if (!style) return '';
  return [
    style.bold ? 'b' : '',
    style.italic ? 'i' : '',
    style.align || '',
    style.vAlign || '',
    style.wrap ? 'w' : '',
    style.numFmt || '',
    style.fill || '',
    style.border === false ? 'n' : 'y',
  ].join('|');
}

export interface StyleSheetResult {
  xml: string;
  indexFor: (style?: XlsxStyle) => number;
}

export function buildStyleSheet(rows: XlsxCell[][]): StyleSheetResult {
  const fontKeys: string[] = ['|'];
  const fillKeys: string[] = ['', ''];
  const numFmtCodes: string[] = [];
  const xfKeys: string[] = [''];
  const xfXml: string[] = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'];

  const push = (list: string[], key: string): number => {
    const at = list.indexOf(key);
    if (at >= 0) return at;
    list.push(key);
    return list.length - 1;
  };

  for (const row of rows) {
    for (const cell of row) {
      const key = styleKey(cell.style);
      if (!key || xfKeys.includes(key)) continue;
      const s = cell.style as XlsxStyle;

      const fontId = push(fontKeys, `${s.bold ? 'b' : ''}|${s.italic ? 'i' : ''}`);
      const fillId = s.fill ? push(fillKeys, s.fill) : 0;
      const borderId = s.border === false ? 0 : 1;
      const numFmtId = s.numFmt ? 164 + push(numFmtCodes, s.numFmt) : 0;

      const alignParts: string[] = [];
      if (s.align) alignParts.push(`horizontal="${s.align}"`);
      if (s.vAlign) alignParts.push(`vertical="${s.vAlign === 'center' ? 'center' : 'top'}"`);
      if (s.wrap) alignParts.push('wrapText="1"');
      const alignment = alignParts.length > 0
        ? `<alignment ${alignParts.join(' ')}/>`
        : '';

      xfKeys.push(key);
      xfXml.push(
        `<xf numFmtId="${numFmtId}" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0"`
        + ` applyFont="1" applyBorder="1"`
        + (numFmtId ? ' applyNumberFormat="1"' : '')
        + (fillId ? ' applyFill="1"' : '')
        + (alignment ? ' applyAlignment="1"' : '')
        + (alignment ? `>${alignment}</xf>` : '/>')
      );
    }
  }

  const fontsXml = fontKeys.map(key => {
    const bold = key.startsWith('b') ? '<b/>' : '';
    const italic = key.includes('i') ? '<i/>' : '';
    return `<font>${bold}${italic}<sz val="${BASE_FONT_SIZE}"/>`
      + `<color theme="1"/><name val="${BASE_FONT}"/></font>`;
  }).join('');

  const fillsXml = fillKeys.map((hex, i) => {
    if (i === 0) return '<fill><patternFill patternType="none"/></fill>';
    if (i === 1) return '<fill><patternFill patternType="gray125"/></fill>';
    return `<fill><patternFill patternType="solid"><fgColor rgb="FF${hex}"/>`
      + '<bgColor indexed="64"/></patternFill></fill>';
  }).join('');

  const side = `<color rgb="${BORDER_COLOR}"/>`;
  const bordersXml =
    '<border><left/><right/><top/><bottom/><diagonal/></border>'
    + `<border><left style="thin">${side}</left><right style="thin">${side}</right>`
    + `<top style="thin">${side}</top><bottom style="thin">${side}</bottom><diagonal/></border>`;

  const numFmtsXml = numFmtCodes.length > 0
    ? `<numFmts count="${numFmtCodes.length}">`
      + numFmtCodes.map((code, i) => `<numFmt numFmtId="${164 + i}" formatCode="${escapeXml(code)}"/>`).join('')
      + '</numFmts>'
    : '';

  const xml = XML_DECL
    + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + numFmtsXml
    + `<fonts count="${fontKeys.length}">${fontsXml}</fonts>`
    + `<fills count="${fillKeys.length}">${fillsXml}</fills>`
    + '<borders count="2">' + bordersXml + '</borders>'
    + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
    + `<cellXfs count="${xfXml.length}">${xfXml.join('')}</cellXfs>`
    + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
    + '</styleSheet>';

  return {
    xml,
    indexFor: (style?: XlsxStyle) => {
      const at = xfKeys.indexOf(styleKey(style));
      return at > 0 ? at : 0;
    },
  };
}

function cellXml(cell: XlsxCell, ref: string, styleIndex: number): string {
  const s = styleIndex > 0 ? ` s="${styleIndex}"` : '';
  if (cell.formula) {
    const fEsc = escapeXml(cell.formula.replace(/^=/, ''));
    if (cell.numeric) {
      const n = typeof cell.value === 'number' ? cell.value : parseFloat(String(cell.value));
      const v = isFinite(n) ? `<v>${n}</v>` : '';
      return `<c r="${ref}"${s}><f>${fEsc}</f>${v}</c>`;
    }
    const valText = cell.value !== undefined && cell.value !== '' ? `<v>${escapeXml(String(cell.value))}</v>` : '';
    return `<c r="${ref}"${s}><f>${fEsc}</f>${valText}</c>`;
  }
  if (cell.numeric) {
    const n = typeof cell.value === 'number' ? cell.value : parseFloat(String(cell.value));
    if (!isFinite(n)) return '';
    return `<c r="${ref}"${s}><v>${n}</v></c>`;
  }
  const text = String(cell.value);
  if (text === '') return styleIndex > 0 ? `<c r="${ref}"${s}/>` : '';
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${escapeXml(text)}</t></is></c>`;
}

function colsXml(widths?: number[]): string {
  if (!widths || widths.length === 0) return '';
  const cols = widths
    .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
    .join('');
  return `<cols>${cols}</cols>`;
}



function workbookXml(sheetName: string): string {
  return XML_DECL
    + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
    + ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    + `<sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets>`
    + '</workbook>';
}

const CONTENT_TYPES =
  XML_DECL
  + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
  + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
  + '<Default Extension="xml" ContentType="application/xml"/>'
  + '<Override PartName="/xl/workbook.xml"'
  + ' ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
  + '<Override PartName="/xl/worksheets/sheet1.xml"'
  + ' ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
  + '<Override PartName="/xl/styles.xml"'
  + ' ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
  + '</Types>';

const ROOT_RELS =
  XML_DECL
  + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
  + '<Relationship Id="rId1"'
  + ' Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"'
  + ' Target="xl/workbook.xml"/>'
  + '</Relationships>';

const WORKBOOK_RELS =
  XML_DECL
  + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
  + '<Relationship Id="rId1"'
  + ' Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"'
  + ' Target="worksheets/sheet1.xml"/>'
  + '<Relationship Id="rId2"'
  + ' Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles"'
  + ' Target="styles.xml"/>'
  + '</Relationships>';

export function buildXlsx(sheet: XlsxSheet): Uint8Array {
  const name = sanitizeSheetName(sheet.name);
  const styles = buildStyleSheet(sheet.rows);
  return zipStore([
    { name: '[Content_Types].xml', data: utf8(CONTENT_TYPES) },
    { name: '_rels/.rels', data: utf8(ROOT_RELS) },
    { name: 'xl/workbook.xml', data: utf8(workbookXml(name)) },
    { name: 'xl/_rels/workbook.xml.rels', data: utf8(WORKBOOK_RELS) },
    { name: 'xl/styles.xml', data: utf8(styles.xml) },
    { name: 'xl/worksheets/sheet1.xml', data: utf8(sheetXml({ ...sheet, name }, styles.indexFor)) },
  ]);
}

export function buildMultiSheetXlsx(sheets: XlsxSheet[]): Uint8Array {
  if (sheets.length <= 1) {
    return buildXlsx(sheets[0] || { name: 'Sheet1', rows: [] });
  }

  const allRows = sheets.flatMap(s => s.rows);
  const styles = buildStyleSheet(allRows);

  const zipEntries: { name: string; data: Uint8Array }[] = [];

  let contentTypesXml = XML_DECL
    + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    + '<Default Extension="xml" ContentType="application/xml"/>'
    + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
    + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>';

  sheets.forEach((_, idx) => {
    contentTypesXml += `<Override PartName="/xl/worksheets/sheet${idx + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`;
  });
  contentTypesXml += '</Types>';
  zipEntries.push({ name: '[Content_Types].xml', data: utf8(contentTypesXml) });

  zipEntries.push({ name: '_rels/.rels', data: utf8(ROOT_RELS) });

  let wbXml = XML_DECL
    + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    + '<sheets>';
  sheets.forEach((s, idx) => {
    const sName = sanitizeSheetName(s.name);
    wbXml += `<sheet name="${escapeXml(sName)}" sheetId="${idx + 1}" r:id="rId${idx + 1}"/>`;
  });
  wbXml += '</sheets></workbook>';
  zipEntries.push({ name: 'xl/workbook.xml', data: utf8(wbXml) });

  let wbRelsXml = XML_DECL
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';
  sheets.forEach((_, idx) => {
    wbRelsXml += `<Relationship Id="rId${idx + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${idx + 1}.xml"/>`;
  });
  wbRelsXml += `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`;
  wbRelsXml += '</Relationships>';
  zipEntries.push({ name: 'xl/_rels/workbook.xml.rels', data: utf8(wbRelsXml) });

  zipEntries.push({ name: 'xl/styles.xml', data: utf8(styles.xml) });

  sheets.forEach((s, idx) => {
    const sName = sanitizeSheetName(s.name);
    zipEntries.push({
      name: `xl/worksheets/sheet${idx + 1}.xml`,
      data: utf8(sheetXml({ ...s, name: sName }, styles.indexFor)),
    });
  });

  return zipStore(zipEntries);
}
