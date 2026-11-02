import type { Workbook } from '../model/workbook';

/** ExcelJS drops the sheet view's showZeros, so it is read from and written into the finished package. */

const attribute = (tag: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];

const unescapeXml = (value: string) => value.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

/** Names of the sheets whose view says not to show zeros. */
export async function readZeroHidingSheets(buffer: ArrayBuffer): Promise<Set<string>> {
  const hiding = new Set<string>();
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(buffer);
  const read = async (path: string) => (await zip.file(path)?.async('string')) ?? '';
  const workbook = await read('xl/workbook.xml');
  const rels = await read('xl/_rels/workbook.xml.rels');
  for (const m of workbook.matchAll(/<sheet\b[^>]*>/g)) {
    const id = attribute(m[0].replace('r:id', 'rid'), 'rid');
    const relation = [...rels.matchAll(/<Relationship\b[^>]*>/g)].map((t) => t[0]).find((t) => attribute(t, 'Id') === id);
    const target = relation && attribute(relation, 'Target');
    if (!target) continue;
    const path = target.startsWith('/') ? target.slice(1) : `xl/${target}`;
    const view = /<sheetView\b[^>]*>/.exec(await read(path))?.[0];
    if (view && attribute(view, 'showZeros') === '0') hiding.add(unescapeXml(attribute(m[0], 'name') ?? ''));
  }
  return hiding;
}

/** The package with showZeros="0" on the first view of every sheet that hides zeros. */
export async function addZeroHidingToXlsx(buffer: ArrayBuffer, wb: Workbook): Promise<ArrayBuffer> {
  if (!wb.sheets.some((sheet) => sheet.hideZeros)) return buffer;
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(buffer);
  for (let index = 0; index < wb.sheets.length; index += 1) {
    if (!wb.sheets[index].hideZeros) continue;
    // ExcelJS numbers the worksheets in order, from 1.
    const path = `xl/worksheets/sheet${index + 1}.xml`;
    const xml = await zip.file(path)?.async('string');
    if (!xml) continue;
    // ExcelJS writes no <sheetViews> for a plain view; it goes before the formatting and data parts.
    const patched = /<sheetView\b/.test(xml)
      ? xml.replace(/<sheetView\b/, '<sheetView showZeros="0"')
      : xml.replace(/(<sheetFormatPr\b|<cols\b|<sheetData\b)/, '<sheetViews><sheetView showZeros="0" workbookViewId="0"/></sheetViews>$1');
    zip.file(path, patched);
  }
  return zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' });
}
