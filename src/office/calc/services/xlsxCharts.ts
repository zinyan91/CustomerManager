import { chartLayout, readChartData, type ChartData, type ChartObject, type ChartType } from '../engine/chartData';
import { columnName, parseRange, type RangePos } from '../engine/cellRef';
import type { Workbook } from '../model/workbook';
import { DEFAULT_COL_WIDTH } from '../model/workbook';

/**
 * Charts in a .xlsx. ExcelJS has no charts, so they are written into the
 * finished package by hand (a drawing part holding one anchored chart frame
 * per chart, and a chart part per chart, with its numbers cached so viewers
 * that do not recalculate still draw it) and read back the same way.
 *
 * Only what Calc itself draws is written: column, bar, line and pie charts
 * over one range. On reading, a chart of another kind (area, scatter, stacked…)
 * is read as the nearest of those four, and anything it cannot place is skipped.
 */

const EMU_PER_PX = 9525;
const ROW_PX = 24;

const NS = {
  c: 'http://schemas.openxmlformats.org/drawingml/2006/chart',
  a: 'http://schemas.openxmlformats.org/drawingml/2006/main',
  r: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
  xdr: 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing',
};
const REL_DRAWING = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing';
const REL_CHART = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart';
const CT_DRAWING = 'application/vnd.openxmlformats-officedocument.drawing+xml';
const CT_CHART = 'application/vnd.openxmlformats-officedocument.drawingml.chart+xml';

const escapeXml = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const unescapeXml = (text: string): string => text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const attr = (tag: string, name: string): string | undefined => new RegExp(`\\b${name}="([^"]*)"`).exec(tag)?.[1];

// ----- References

/** `'My sheet'!$B$2:$B$7`. */
function reference(sheet: string, r1: number, c1: number, r2: number, c2: number): string {
  const quoted = /^[A-Za-z_][A-Za-z0-9_]*$/.test(sheet) ? sheet : `'${sheet.replace(/'/g, "''")}'`;
  const cell = (r: number, c: number) => `$${columnName(c)}$${r + 1}`;
  return r1 === r2 && c1 === c2 ? `${quoted}!${cell(r1, c1)}` : `${quoted}!${cell(r1, c1)}:${cell(r2, c2)}`;
}

/** The sheet name and range a formula such as `'My sheet'!$B$2:$B$7` points at. */
function parseReference(formula: string): { sheet: string; range: RangePos } | null {
  const match = /^(?:'((?:[^']|'')+)'|([^'!]+))!(.+)$/.exec(unescapeXml(formula).trim());
  if (!match) return null;
  const range = parseRange(match[3].replace(/\$/g, ''));
  return range ? { sheet: (match[1] ?? match[2]).replace(/''/g, "'"), range } : null;
}

// ----- Writing

function stringCache(values: string[]): string {
  return `<c:strCache><c:ptCount val="${values.length}"/>${values.map((v, i) => `<c:pt idx="${i}"><c:v>${escapeXml(v)}</c:v></c:pt>`).join('')}</c:strCache>`;
}

function numberCache(values: Array<number | null>): string {
  const points = values.map((v, i) => (v === null ? '' : `<c:pt idx="${i}"><c:v>${v}</c:v></c:pt>`)).join('');
  return `<c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${values.length}"/>${points}</c:numCache>`;
}

export function chartXml(chart: ChartObject, data: ChartData, layout: ReturnType<typeof chartLayout>, sheetName: string): string {
  const { range } = chart;
  const first = range.r1 + layout.first;
  const last = range.r2;
  const categories = layout.categoryColumn
    ? `<c:cat><c:strRef><c:f>${escapeXml(reference(sheetName, first, range.c1, last, range.c1))}</c:f>${stringCache(data.categories)}</c:strRef></c:cat>`
    : '';
  const series = data.series
    .map((s, i) => {
      const col = range.c1 + layout.seriesColumns[i];
      const name = layout.headerRow
        ? `<c:tx><c:strRef><c:f>${escapeXml(reference(sheetName, range.r1, col, range.r1, col))}</c:f>${stringCache([s.name])}</c:strRef></c:tx>`
        : `<c:tx><c:v>${escapeXml(s.name)}</c:v></c:tx>`;
      const values = `<c:val><c:numRef><c:f>${escapeXml(reference(sheetName, first, col, last, col))}</c:f>${numberCache(s.values)}</c:numRef></c:val>`;
      const extra = chart.type === 'bar' || chart.type === 'column' ? '<c:invertIfNegative val="0"/>' : chart.type === 'line' ? '<c:marker><c:symbol val="circle"/><c:size val="5"/></c:marker>' : '';
      return `<c:ser><c:idx val="${i}"/><c:order val="${i}"/>${name}${extra}${categories}${values}${chart.type === 'line' ? '<c:smooth val="0"/>' : ''}</c:ser>`;
    })
    .join('');

  const horizontal = chart.type === 'bar';
  const axes = `<c:axId val="50010"/><c:axId val="50020"/>`;
  let plot: string;
  if (chart.type === 'pie') {
    plot = `<c:pieChart><c:varyColors val="1"/>${series}<c:firstSliceAng val="0"/></c:pieChart>`;
  } else {
    const body =
      chart.type === 'line'
        ? `<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>${series}<c:marker val="1"/>${axes}</c:lineChart>`
        : `<c:barChart><c:barDir val="${horizontal ? 'bar' : 'col'}"/><c:grouping val="clustered"/><c:varyColors val="0"/>${series}${axes}</c:barChart>`;
    plot =
      body +
      `<c:catAx><c:axId val="50010"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="${horizontal ? 'l' : 'b'}"/><c:numFmt formatCode="General" sourceLinked="0"/><c:tickLblPos val="nextTo"/><c:crossAx val="50020"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/></c:catAx>` +
      `<c:valAx><c:axId val="50020"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="${horizontal ? 'b' : 'l'}"/><c:majorGridlines/><c:numFmt formatCode="General" sourceLinked="1"/><c:tickLblPos val="nextTo"/><c:crossAx val="50010"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx>`;
  }
  const title = chart.title.trim()
    ? `<c:title><c:tx><c:rich><a:bodyPr/><a:p><a:r><a:t>${escapeXml(chart.title)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title><c:autoTitleDeleted val="0"/>`
    : '<c:autoTitleDeleted val="1"/>';
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<c:chartSpace xmlns:c="${NS.c}" xmlns:a="${NS.a}" xmlns:r="${NS.r}"><c:roundedCorners val="0"/><c:chart>${title}<c:plotArea><c:layout/>${plot}</c:plotArea>` +
    `<c:legend><c:legendPos val="b"/><c:overlay val="0"/></c:legend><c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart></c:chartSpace>`
  );
}

function anchorXml(chart: ChartObject, relId: string, shapeId: number, colWidth: number): string {
  const colOff = Math.min(Math.max(0, chart.dx), Math.max(0, colWidth - 1)) * EMU_PER_PX;
  return (
    `<xdr:oneCellAnchor><xdr:from><xdr:col>${chart.col}</xdr:col><xdr:colOff>${colOff}</xdr:colOff><xdr:row>${chart.row}</xdr:row><xdr:rowOff>${Math.max(0, Math.min(chart.dy, ROW_PX - 1)) * EMU_PER_PX}</xdr:rowOff></xdr:from>` +
    `<xdr:ext cx="${chart.width * EMU_PER_PX}" cy="${chart.height * EMU_PER_PX}"/>` +
    `<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${shapeId}" name="Chart ${shapeId}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>` +
    `<xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="${NS.c}"><c:chart xmlns:c="${NS.c}" xmlns:r="${NS.r}" r:id="${relId}"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:oneCellAnchor>`
  );
}

const nextNumber = (names: string[], pattern: RegExp): number => names.reduce((max, name) => Math.max(max, Number(pattern.exec(name)?.[1] ?? 0)), 0) + 1;

/** The package with every sheet's charts added. Sheets without charts are left as they are. */
export async function addChartsToXlsx(buffer: ArrayBuffer, wb: Workbook): Promise<ArrayBuffer> {
  if (!wb.sheets.some((sheet) => sheet.charts.length > 0)) return buffer;
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(buffer);
  const names = () => Object.keys(zip.files);
  const read = async (path: string) => (await zip.file(path)?.async('string')) ?? '';
  let contentTypes = await read('[Content_Types].xml');
  const override = (part: string, type: string) => {
    if (!contentTypes.includes(`PartName="${part}"`)) contentTypes = contentTypes.replace('</Types>', `<Override PartName="${part}" ContentType="${type}"/></Types>`);
  };

  for (let index = 0; index < wb.sheets.length; index += 1) {
    const sheet = wb.sheets[index];
    if (sheet.charts.length === 0) continue;
    // ExcelJS numbers the worksheets in order, from 1.
    const sheetPath = `xl/worksheets/sheet${index + 1}.xml`;
    const relsPath = `xl/worksheets/_rels/sheet${index + 1}.xml.rels`;
    let sheetXml = await read(sheetPath);
    if (!sheetXml) continue;
    let rels = (await read(relsPath)) || `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;

    // The drawing this sheet already has (for its pictures), or a new one.
    const drawingRel = [...rels.matchAll(/<Relationship\b[^>]*>/g)].map((m) => m[0]).find((tag) => attr(tag, 'Type') === REL_DRAWING);
    let drawingPath: string;
    let drawingXml: string;
    if (drawingRel) {
      drawingPath = `xl/${(attr(drawingRel, 'Target') ?? '').replace(/^\.\.\//, '').replace(/^\/xl\//, '')}`;
      drawingXml = await read(drawingPath);
    } else {
      drawingPath = `xl/drawings/drawing${nextNumber(names(), /^xl\/drawings\/drawing(\d+)\.xml$/)}.xml`;
      drawingXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="${NS.xdr}" xmlns:a="${NS.a}"></xdr:wsDr>`;
      const id = `rIdDrawing${index + 1}`;
      rels = rels.replace('</Relationships>', `<Relationship Id="${id}" Type="${REL_DRAWING}" Target="../drawings/${drawingPath.split('/').pop()}"/></Relationships>`);
      const tag = `<drawing r:id="${id}"/>`;
      const withNamespace = sheetXml.includes('xmlns:r=') ? sheetXml : sheetXml.replace('<worksheet ', `<worksheet xmlns:r="${NS.r}" `);
      // <drawing> goes after the page setup and before legacy drawings, tables and extensions.
      const before = /<(legacyDrawing|legacyDrawingHF|picture|oleObjects|controls|webPublishItems|tableParts|extLst)\b/.exec(withNamespace);
      sheetXml = before ? withNamespace.slice(0, before.index) + tag + withNamespace.slice(before.index) : withNamespace.replace('</worksheet>', `${tag}</worksheet>`);
      zip.file(sheetPath, sheetXml);
      override(`/${drawingPath}`, CT_DRAWING);
    }

    const drawingRelsPath = drawingPath.replace('drawings/', 'drawings/_rels/') + '.rels';
    let drawingRels = (await read(drawingRelsPath)) || `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;
    let shapeId = 100 + (drawingXml.match(/<xdr:cNvPr\b/g)?.length ?? 0);
    const anchors: string[] = [];
    for (const chart of sheet.charts) {
      const layout = chartLayout(chart.range, (r, c) => wb.valueAt(index, r, c));
      const data = readChartData(chart.range, (r, c) => wb.valueAt(index, r, c), (r, c) => wb.displayAt(index, r, c));
      if (data.series.length === 0) continue;
      const number = nextNumber(names(), /^xl\/charts\/chart(\d+)\.xml$/);
      const chartPath = `xl/charts/chart${number}.xml`;
      zip.file(chartPath, chartXml(chart, data, layout, sheet.name));
      override(`/${chartPath}`, CT_CHART);
      const relId = `rIdChart${number}`;
      drawingRels = drawingRels.replace('</Relationships>', `<Relationship Id="${relId}" Type="${REL_CHART}" Target="../charts/chart${number}.xml"/></Relationships>`);
      shapeId += 1;
      anchors.push(anchorXml(chart, relId, shapeId, sheet.colWidths.get(chart.col) ?? DEFAULT_COL_WIDTH));
    }
    if (anchors.length === 0) continue;
    zip.file(drawingPath, drawingXml.replace('</xdr:wsDr>', `${anchors.join('')}</xdr:wsDr>`));
    zip.file(drawingRelsPath, drawingRels);
    zip.file(relsPath, rels);
  }
  zip.file('[Content_Types].xml', contentTypes);
  return zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' });
}

// ----- Reading

const CHART_KINDS: Array<{ tag: string; type: (xml: string) => ChartType }> = [
  { tag: 'pieChart', type: () => 'pie' },
  { tag: 'pie3DChart', type: () => 'pie' },
  { tag: 'doughnutChart', type: () => 'pie' },
  { tag: 'lineChart', type: () => 'line' },
  { tag: 'line3DChart', type: () => 'line' },
  { tag: 'areaChart', type: () => 'line' },
  { tag: 'barChart', type: (xml) => (/<c:barDir val="bar"/.test(xml) ? 'bar' : 'column') },
  { tag: 'bar3DChart', type: (xml) => (/<c:barDir val="bar"/.test(xml) ? 'bar' : 'column') },
];

/** The chart a chart part describes, placed at `anchor`; null when it has no data this app can draw. */
export function chartFromXml(xml: string, anchor: Pick<ChartObject, 'row' | 'col' | 'dx' | 'dy' | 'width' | 'height'>, id: string, sheetName: string): ChartObject | null {
  const kind = CHART_KINDS.find((k) => new RegExp(`<c:${k.tag}\\b`).test(xml));
  if (!kind) return null;
  // The range is the box around everything the series point at, on this sheet.
  let box: RangePos | null = null;
  for (const m of xml.matchAll(/<c:f>([^<]*)<\/c:f>/g)) {
    const ref = parseReference(m[1]);
    if (!ref || ref.sheet !== sheetName) continue;
    const r = ref.range;
    box = box ? { r1: Math.min(box.r1, r.r1), c1: Math.min(box.c1, r.c1), r2: Math.max(box.r2, r.r2), c2: Math.max(box.c2, r.c2) } : { ...r };
  }
  if (!box) return null;
  const titleBlock = /<c:title>([\s\S]*?)<\/c:title>/.exec(xml)?.[1] ?? '';
  const title = unescapeXml([...titleBlock.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]).join(''));
  return { id, type: kind.type(xml), range: box, title: title.slice(0, 120), ...anchor };
}

/** Charts of one sheet, from the package; `widthOf` gives column widths for anchors that run between two cells. */
export async function readChartsFromXlsx(buffer: ArrayBuffer, widthOf: (sheetName: string, col: number) => number): Promise<Map<string, ChartObject[]>> {
  const result = new Map<string, ChartObject[]>();
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(buffer);
  const read = async (path: string) => (await zip.file(path)?.async('string')) ?? '';
  const workbook = await read('xl/workbook.xml');
  const workbookRels = await read('xl/_rels/workbook.xml.rels');
  const targetOf = (rels: string, id: string) => {
    const tag = [...rels.matchAll(/<Relationship\b[^>]*>/g)].map((m) => m[0]).find((t) => attr(t, 'Id') === id);
    return tag ? attr(tag, 'Target') : undefined;
  };
  const resolve = (base: string, target: string) => {
    if (target.startsWith('/')) return target.slice(1);
    const parts = base.split('/').slice(0, -1);
    for (const part of target.split('/')) {
      if (part === '..') parts.pop();
      else if (part !== '.') parts.push(part);
    }
    return parts.join('/');
  };

  let counter = 0;
  for (const m of workbook.matchAll(/<sheet\b[^>]*>/g)) {
    const name = unescapeXml(attr(m[0], 'name') ?? '');
    const sheetId = attr(m[0], 'r:id');
    const sheetTarget = sheetId ? targetOf(workbookRels, sheetId) : undefined;
    if (!sheetTarget) continue;
    const sheetPath = resolve('xl/workbook.xml', sheetTarget);
    const sheetRelsPath = sheetPath.replace(/([^/]+)$/, '_rels/$1.rels');
    const sheetRels = await read(sheetRelsPath);
    const drawingRel = [...sheetRels.matchAll(/<Relationship\b[^>]*>/g)].map((t) => t[0]).find((t) => attr(t, 'Type') === REL_DRAWING);
    if (!drawingRel) continue;
    const drawingPath = resolve(sheetPath, attr(drawingRel, 'Target') ?? '');
    const drawing = await read(drawingPath);
    const drawingRels = await read(drawingPath.replace(/([^/]+)$/, '_rels/$1.rels'));
    const charts: ChartObject[] = [];
    for (const block of drawing.matchAll(/<xdr:(oneCellAnchor|twoCellAnchor|absoluteAnchor)\b[^>]*>([\s\S]*?)<\/xdr:\1>/g)) {
      const body = block[2];
      const relId = /<c:chart\b[^>]*\br:id="([^"]+)"/.exec(body)?.[1];
      const part = relId ? targetOf(drawingRels, relId) : undefined;
      const from = /<xdr:from>([\s\S]*?)<\/xdr:from>/.exec(body)?.[1];
      if (!part || !from) continue;
      const num = (source: string, tag: string) => Number(new RegExp(`<xdr:${tag}>(\\d+)</xdr:${tag}>`).exec(source)?.[1] ?? 0);
      const col = num(from, 'col');
      const row = num(from, 'row');
      const dx = Math.round(num(from, 'colOff') / EMU_PER_PX);
      const dy = Math.round(num(from, 'rowOff') / EMU_PER_PX);
      let width = 0;
      let height = 0;
      const ext = /<xdr:ext\b([^>]*)\/>/.exec(body)?.[1];
      const to = /<xdr:to>([\s\S]*?)<\/xdr:to>/.exec(body)?.[1];
      if (ext) {
        width = Number(attr(ext, 'cx') ?? 0) / EMU_PER_PX;
        height = Number(attr(ext, 'cy') ?? 0) / EMU_PER_PX;
      } else if (to) {
        let span = -dx + num(to, 'colOff') / EMU_PER_PX;
        for (let c = col; c < num(to, 'col'); c += 1) span += widthOf(name, c);
        width = span;
        height = (num(to, 'row') - row) * ROW_PX - dy + num(to, 'rowOff') / EMU_PER_PX;
      }
      const chart = chartFromXml(await read(resolve(drawingPath, part)), { row, col, dx, dy, width: Math.max(160, Math.round(width) || 420), height: Math.max(120, Math.round(height) || 270) }, `chx${(counter += 1).toString(36)}`, name);
      if (chart) charts.push(chart);
    }
    if (charts.length) result.set(name, charts);
  }
  return result;
}
