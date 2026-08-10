import { utf8, escapeXml, zipStore, XML_DECL } from './ooxml';
import { PPTX_FONT, THEME_XML, SLIDE_MASTER_XML, SLIDE_LAYOUT_XML } from './pptxTheme';

export const MIME_PPTX =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation';

export const EMU_PER_INCH = 914400;
export const EMU_PER_PT = 12700;

export const SLIDE_WIDE = { cx: 12192000, cy: 6858000 };
export const SLIDE_CLASSIC = { cx: 9144000, cy: 6858000 };

export const MARGIN_X = 685800;
export const TITLE_TOP = 457200;
export const TITLE_HEIGHT = 1097280;
export const BODY_TOP = 1737360;

export const TITLE_SIZE = 32;
export const BODY_SIZE = 18;
export const TABLE_SIZE = 12;

export interface PptxBullet {
  text: string;
  level?: number;
  bold?: boolean;
}

export interface PptxTable {
  rows: string[][];
  headerRow?: boolean;
  colWidths?: number[];
}

export interface PptxSlide {
  title?: string;
  subtitle?: string;
  bullets?: PptxBullet[];
  table?: PptxTable;
}

export interface PptxDeck {
  slides: PptxSlide[];
  widescreen?: boolean;
}

const NS_SLIDE = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"'
  + ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'
  + ' xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';

function runXml(text: string, size: number, bold?: boolean): string {
  const props = `<a:rPr lang="vi-VN" sz="${size * 100}"${bold ? ' b="1"' : ''} dirty="0">`
    + `<a:latin typeface="${PPTX_FONT}"/><a:cs typeface="${PPTX_FONT}"/>`
    + '</a:rPr>';
  return `<a:r>${props}<a:t>${escapeXml(text)}</a:t></a:r>`;
}

export function paragraphXml(
  text: string,
  size: number,
  options?: { level?: number; bold?: boolean; align?: 'l' | 'ctr' | 'r'; bullet?: boolean }
): string {
  const parts: string[] = [];
  if (options?.level) parts.push(`lvl="${options.level}"`);
  if (options?.align) parts.push(`algn="${options.align}"`);

  const marker = options?.bullet
    ? '<a:buFont typeface="Arial"/><a:buChar char="•"/>'
    : '<a:buNone/>';

  const pPr = `<a:pPr ${parts.join(' ')}>${marker}</a:pPr>`;
  const run = text === '' ? '' : runXml(text, size, options?.bold);
  return `<a:p>${pPr}${run}</a:p>`;
}

function textBoxXml(
  id: number,
  name: string,
  box: { x: number; y: number; cx: number; cy: number },
  paragraphs: string[],
  anchor: 't' | 'ctr' = 't'
): string {
  return '<p:sp>'
    + `<p:nvSpPr><p:cNvPr id="${id}" name="${escapeXml(name)}"/>`
    + '<p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>'
    + '<p:spPr>'
    + `<a:xfrm><a:off x="${box.x}" y="${box.y}"/><a:ext cx="${box.cx}" cy="${box.cy}"/></a:xfrm>`
    + '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/>'
    + '</p:spPr>'
    + '<p:txBody>'
    + `<a:bodyPr wrap="square" anchor="${anchor}"><a:normAutofit/></a:bodyPr><a:lstStyle/>`
    + paragraphs.join('')
    + '</p:txBody>'
    + '</p:sp>';
}

function tableCellXml(text: string, bold: boolean): string {
  return '<a:tc><a:txBody><a:bodyPr/><a:lstStyle/>'
    + paragraphXml(text, TABLE_SIZE, { bold })
    + '</a:txBody>'
    + '<a:tcPr marL="45720" marR="45720" marT="27432" marB="27432" anchor="ctr">'
    + '<a:lnL w="12700"><a:solidFill><a:srgbClr val="000000"/></a:solidFill></a:lnL>'
    + '<a:lnR w="12700"><a:solidFill><a:srgbClr val="000000"/></a:solidFill></a:lnR>'
    + '<a:lnT w="12700"><a:solidFill><a:srgbClr val="000000"/></a:solidFill></a:lnT>'
    + '<a:lnB w="12700"><a:solidFill><a:srgbClr val="000000"/></a:solidFill></a:lnB>'
    + '</a:tcPr></a:tc>';
}

export function tableXml(
  id: number,
  box: { x: number; y: number; cx: number; cy: number },
  table: PptxTable
): string {
  const columns = Math.max(1, ...table.rows.map(r => r.length));
  const widths = table.colWidths && table.colWidths.length === columns
    ? (() => {
      const sum = table.colWidths.reduce((s, w) => s + w, 0) || 1;
      return table.colWidths.map(w => Math.round((box.cx * w) / sum));
    })()
    : Array.from({ length: columns }, () => Math.round(box.cx / columns));

  const rowHeight = Math.max(
    Math.round(TABLE_SIZE * 2.2 * EMU_PER_PT),
    Math.round(box.cy / Math.max(1, table.rows.length))
  );

  const grid = `<a:tblGrid>${widths.map(w => `<a:gridCol w="${w}"/>`).join('')}</a:tblGrid>`;

  const rows = table.rows.map((row, r) => {
    const bold = !!table.headerRow && r === 0;
    const cells = Array.from({ length: columns }, (_, c) => tableCellXml(row[c] ?? '', bold));
    return `<a:tr h="${rowHeight}">${cells.join('')}</a:tr>`;
  }).join('');

  return '<p:graphicFrame>'
    + `<p:nvGraphicFramePr><p:cNvPr id="${id}" name="Bảng"/>`
    + '<p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr>'
    + '<p:nvPr/></p:nvGraphicFramePr>'
    + `<p:xfrm><a:off x="${box.x}" y="${box.y}"/><a:ext cx="${box.cx}" cy="${box.cy}"/></p:xfrm>`
    + '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table">'
    + '<a:tbl><a:tblPr firstRow="1" bandRow="0"/>'
    + grid
    + rows
    + '</a:tbl></a:graphicData></a:graphic>'
    + '</p:graphicFrame>';
}

export function slideXml(slide: PptxSlide, size: { cx: number; cy: number }): string {
  const contentWidth = size.cx - MARGIN_X * 2;
  const shapes: string[] = [];
  let id = 2;

  if (slide.title !== undefined) {
    const paragraphs = [paragraphXml(slide.title, TITLE_SIZE, { bold: true, align: 'ctr' })];
    if (slide.subtitle) {
      paragraphs.push(paragraphXml(slide.subtitle, BODY_SIZE, { align: 'ctr' }));
    }
    shapes.push(textBoxXml(
      id++,
      'Tiêu đề',
      { x: MARGIN_X, y: TITLE_TOP, cx: contentWidth, cy: TITLE_HEIGHT },
      paragraphs,
      'ctr'
    ));
  }

  const bodyTop = slide.title === undefined ? TITLE_TOP : BODY_TOP;
  const bodyHeight = size.cy - bodyTop - TITLE_TOP;

  if (slide.bullets && slide.bullets.length > 0) {
    shapes.push(textBoxXml(
      id++,
      'Nội dung',
      { x: MARGIN_X, y: bodyTop, cx: contentWidth, cy: bodyHeight },
      slide.bullets.map(b => paragraphXml(b.text, BODY_SIZE, {
        level: b.level,
        bold: b.bold,
        bullet: true,
      }))
    ));
  }

  if (slide.table && slide.table.rows.length > 0) {
    const tableTop = slide.bullets && slide.bullets.length > 0
      ? bodyTop + Math.round(bodyHeight / 2)
      : bodyTop;
    shapes.push(tableXml(
      id++,
      { x: MARGIN_X, y: tableTop, cx: contentWidth, cy: size.cy - tableTop - TITLE_TOP },
      slide.table
    ));
  }

  return XML_DECL
    + `<p:sld ${NS_SLIDE}>`
    + '<p:cSld><p:spTree>'
    + '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>'
    + '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/>'
    + '<a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>'
    + shapes.join('')
    + '</p:spTree></p:cSld>'
    + '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>'
    + '</p:sld>';
}

export function presentationXml(slideCount: number, size: { cx: number; cy: number }): string {
  const ids = Array.from({ length: slideCount }, (_, i) =>
    `<p:sldId id="${256 + i}" r:id="rId${2 + i}"/>`).join('');

  return XML_DECL
    + `<p:presentation ${NS_SLIDE} saveSubsetFonts="1">`
    + '<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>'
    + `<p:sldIdLst>${ids}</p:sldIdLst>`
    + `<p:sldSz cx="${size.cx}" cy="${size.cy}"/>`
    + '<p:notesSz cx="6858000" cy="9144000"/>'
    + '</p:presentation>';
}

const REL_NS = 'xmlns="http://schemas.openxmlformats.org/package/2006/relationships"';
const REL_BASE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

function relationships(items: { id: string; type: string; target: string }[]): string {
  return XML_DECL
    + `<Relationships ${REL_NS}>`
    + items.map(r =>
      `<Relationship Id="${r.id}" Type="${REL_BASE}/${r.type}" Target="${r.target}"/>`).join('')
    + '</Relationships>';
}

export function contentTypesXml(slideCount: number): string {
  const slides = Array.from({ length: slideCount }, (_, i) =>
    `<Override PartName="/ppt/slides/slide${i + 1}.xml"`
    + ' ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>'
  ).join('');

  return XML_DECL
    + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    + '<Default Extension="xml" ContentType="application/xml"/>'
    + '<Override PartName="/ppt/presentation.xml"'
    + ' ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>'
    + '<Override PartName="/ppt/slideMasters/slideMaster1.xml"'
    + ' ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>'
    + '<Override PartName="/ppt/slideLayouts/slideLayout1.xml"'
    + ' ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>'
    + '<Override PartName="/ppt/theme/theme1.xml"'
    + ' ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>'
    + slides
    + '</Types>';
}

export function buildPptx(deck: PptxDeck): Uint8Array {
  const slides = deck.slides.length > 0 ? deck.slides : [{ title: '' }];
  const size = deck.widescreen === false ? SLIDE_CLASSIC : SLIDE_WIDE;

  const presentationRels = relationships([
    { id: 'rId1', type: 'slideMaster', target: 'slideMasters/slideMaster1.xml' },
    ...slides.map((_, i) => ({
      id: `rId${2 + i}`,
      type: 'slide',
      target: `slides/slide${i + 1}.xml`,
    })),
    { id: `rId${2 + slides.length}`, type: 'theme', target: 'theme/theme1.xml' },
  ]);

  return zipStore([
    { name: '[Content_Types].xml', data: utf8(contentTypesXml(slides.length)) },
    {
      name: '_rels/.rels',
      data: utf8(relationships([
        { id: 'rId1', type: 'officeDocument', target: 'ppt/presentation.xml' },
      ])),
    },
    { name: 'ppt/presentation.xml', data: utf8(presentationXml(slides.length, size)) },
    { name: 'ppt/_rels/presentation.xml.rels', data: utf8(presentationRels) },
    { name: 'ppt/theme/theme1.xml', data: utf8(THEME_XML) },
    { name: 'ppt/slideMasters/slideMaster1.xml', data: utf8(SLIDE_MASTER_XML) },
    {
      name: 'ppt/slideMasters/_rels/slideMaster1.xml.rels',
      data: utf8(relationships([
        { id: 'rId1', type: 'slideLayout', target: '../slideLayouts/slideLayout1.xml' },
        { id: 'rId2', type: 'theme', target: '../theme/theme1.xml' },
      ])),
    },
    { name: 'ppt/slideLayouts/slideLayout1.xml', data: utf8(SLIDE_LAYOUT_XML) },
    {
      name: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels',
      data: utf8(relationships([
        { id: 'rId1', type: 'slideMaster', target: '../slideMasters/slideMaster1.xml' },
      ])),
    },
    ...slides.flatMap((slide, i) => [
      { name: `ppt/slides/slide${i + 1}.xml`, data: utf8(slideXml(slide, size)) },
      {
        name: `ppt/slides/_rels/slide${i + 1}.xml.rels`,
        data: utf8(relationships([
          { id: 'rId1', type: 'slideLayout', target: '../slideLayouts/slideLayout1.xml' },
        ])),
      },
    ]),
  ]);
}
