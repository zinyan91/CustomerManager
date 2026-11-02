import { cellName, columnName, parseRange, type RangePos } from '../engine/cellRef';
import type { Sparkline, Workbook } from '../model/workbook';

/**
 * Sparklines are not in ExcelJS: they live in a worksheet extension (x14:sparklineGroups), so they are read
 * from and written into the finished package, as the charts are.
 */

const URI = '{05C60535-1F16-4fd2-B633-F4F36F0B64E0}';
const attribute = (tag: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];
const escapeXml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const unescapeXml = (text: string) => text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

const quoted = (name: string) => (/^[A-Za-z_][A-Za-z0-9_.]*$/.test(name) ? name : `'${name.replace(/'/g, "''")}'`);
const absolute = (range: RangePos) => `$${columnName(range.c1)}$${range.r1 + 1}:$${columnName(range.c2)}$${range.r2 + 1}`;

function sparklineXml(sheetName: string, list: readonly Sparkline[]): string {
  const groups = (['line', 'column'] as const)
    .map((type) => {
      const mine = list.filter((s) => s.type === type);
      if (mine.length === 0) return '';
      const items = mine
        .map((s) => `<x14:sparkline><xm:f>${escapeXml(`${quoted(sheetName)}!${absolute(s.source)}`)}</xm:f><xm:sqref>${cellName(s.row, s.col)}</xm:sqref></x14:sparkline>`)
        .join('');
      return `<x14:sparklineGroup${type === 'column' ? ' type="column"' : ''} displayEmptyCellsAs="gap"><x14:colorSeries rgb="FF376092"/><x14:sparklines>${items}</x14:sparklines></x14:sparklineGroup>`;
    })
    .join('');
  return `<ext uri="${URI}" xmlns:x14="http://schemas.microsoft.com/office/spreadsheetml/2009/9/main"><x14:sparklineGroups xmlns:xm="http://schemas.microsoft.com/office/excel/2006/main">${groups}</x14:sparklineGroups></ext>`;
}

/** The package with each sheet's sparklines added. */
export async function addSparklinesToXlsx(buffer: ArrayBuffer, wb: Workbook): Promise<ArrayBuffer> {
  if (!wb.sheets.some((sheet) => sheet.sparklines?.length)) return buffer;
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(buffer);
  for (let index = 0; index < wb.sheets.length; index += 1) {
    const list = wb.sheets[index].sparklines;
    if (!list?.length) continue;
    // ExcelJS numbers the worksheets in order, from 1.
    const path = `xl/worksheets/sheet${index + 1}.xml`;
    const xml = await zip.file(path)?.async('string');
    if (!xml) continue;
    const ext = sparklineXml(wb.sheets[index].name, list);
    const patched = xml.includes('</extLst>') ? xml.replace('</extLst>', `${ext}</extLst>`) : xml.replace('</worksheet>', `<extLst>${ext}</extLst></worksheet>`);
    zip.file(path, patched);
  }
  return zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' });
}

/** The sparklines of every sheet, by sheet name. Sources on another sheet are left out. */
export async function readSparklinesFromXlsx(buffer: ArrayBuffer): Promise<Map<string, Sparkline[]>> {
  const result = new Map<string, Sparkline[]>();
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(buffer);
  const read = async (path: string) => (await zip.file(path)?.async('string')) ?? '';
  const workbook = await read('xl/workbook.xml');
  const rels = await read('xl/_rels/workbook.xml.rels');
  for (const m of workbook.matchAll(/<sheet\b[^>]*>/g)) {
    const name = unescapeXml(attribute(m[0], 'name') ?? '');
    const id = /\sr:id="([^"]*)"/.exec(m[0])?.[1];
    const relation = [...rels.matchAll(/<Relationship\b[^>]*>/g)].map((t) => t[0]).find((t) => attribute(t, 'Id') === id);
    const target = relation && attribute(relation, 'Target');
    if (!target) continue;
    const xml = await read(target.startsWith('/') ? target.slice(1) : `xl/${target}`);
    const found: Sparkline[] = [];
    for (const group of xml.matchAll(/<x14:sparklineGroup\b([^>]*)>([\s\S]*?)<\/x14:sparklineGroup>/g)) {
      const type = attribute(group[1], 'type') === 'column' ? 'column' : 'line';
      for (const item of group[2].matchAll(/<x14:sparkline>([\s\S]*?)<\/x14:sparkline>/g)) {
        const formula = unescapeXml(/<xm:f>([^<]*)<\/xm:f>/.exec(item[1])?.[1] ?? '');
        const cell = /<xm:sqref>([^<]*)<\/xm:sqref>/.exec(item[1])?.[1];
        const bang = formula.lastIndexOf('!');
        const sheetOf = bang >= 0 ? formula.slice(0, bang).replace(/^'|'$/g, '').replace(/''/g, "'") : name;
        const source = parseRange(bang >= 0 ? formula.slice(bang + 1) : formula);
        const at = cell ? parseRange(cell) : null;
        if (!source || !at || sheetOf !== name) continue;
        found.push({ type, source, row: at.r1, col: at.c1 });
      }
    }
    if (found.length > 0) result.set(name, found);
  }
  return result;
}
