import { describe, expect, it } from 'vitest';
import { paginate, pageAt } from '../writer/utils/pagination';
import {
  DEFAULT_PAGE_SETUP,
  clampMargins,
  fillPageTemplate,
  marginPresetOf,
  mmToTwips,
  pageDimensionsMm,
  pageGeometryPx,
  parsePageSetup,
  splitPageTemplate,
} from '../writer/utils/pageSetup';
import { cellColumns, tableGridWidths } from '../writer/utils/docxTableGrid';
import { countWords, docHeadings, docStats, docToPlainText, firstLine, type DocNode } from '../writer/utils/docJson';
import { decodeDataUrlImage, fitWidth } from '../writer/utils/imageData';
import { fontSizePtOf, stepFontSize } from '../shared/formatOptions';
import { readDocxDefaults } from '../writer/utils/docxDefaults';

describe('paginate', () => {
  const block = (height: number, breakAfter = false) => ({ height, breakAfter });

  it('keeps blocks that fit on one page', () => {
    const result = paginate([block(100), block(200), block(300)], 1000);
    expect(result.breaks).toEqual([]);
    expect(result.pageCount).toBe(1);
  });

  it('moves a block that does not fit to the next page and reports the space left', () => {
    const result = paginate([block(600), block(500), block(100)], 1000);
    expect(result.breaks).toEqual([{ beforeIndex: 1, filler: 400 }]);
    expect(result.pageOfBlock).toEqual([0, 1, 1]);
    expect(result.pageCount).toBe(2);
  });

  it('honours a manual page break', () => {
    const result = paginate([block(100, true), block(100)], 1000);
    expect(result.breaks).toEqual([{ beforeIndex: 1, filler: 900 }]);
    expect(result.pageCount).toBe(2);
  });

  it('lets a block taller than a page start where it is and counts the pages it covers', () => {
    const result = paginate([block(200), block(2500), block(100)], 1000);
    expect(result.pageOfBlock[1]).toBe(0);
    expect(result.pageCount).toBe(4);
    expect(result.pageOfBlock[2]).toBe(3);
  });

  it('cuts a table between rows and tells where, with the columns to span', () => {
    const rows = [
      { height: 300, pos: 10 },
      { height: 300, pos: 21, row: { columns: 3 } },
      { height: 300, pos: 32, row: { columns: 3 } },
      { height: 300, pos: 43, row: { columns: 3 } },
      { height: 100, pos: 60 },
    ];
    const result = paginate(rows, 700);
    expect(result.breaks).toEqual([{ beforeIndex: 2, filler: 100, pos: 32, row: { columns: 3 } }]);
    expect(result.pageOfBlock).toEqual([0, 0, 1, 1, 1]);
  });

  it('finds the page a document position is on', () => {
    const result = paginate([{ height: 600, pos: 0 }, { height: 600, pos: 10 }, { height: 600, pos: 20 }], 700);
    expect(pageAt(result, 5)).toBe(1);
    expect(pageAt(result, 10)).toBe(2);
    expect(pageAt(result, 99)).toBe(3);
  });

  it('is one page for an empty document or a zero content height', () => {
    expect(paginate([], 1000).pageCount).toBe(1);
    expect(paginate([block(10)], 0).pageCount).toBe(1);
  });
});

describe('page setup', () => {
  it('swaps A4 for landscape', () => {
    expect(pageDimensionsMm({ paper: 'a4', orientation: 'landscape' })).toEqual({ width: 297, height: 210 });
  });

  it('converts millimetres to twips', () => {
    expect(mmToTwips(25.4)).toBe(1440);
  });

  it('computes the A4 content area in CSS pixels', () => {
    const geometry = pageGeometryPx(DEFAULT_PAGE_SETUP);
    expect(Math.round(geometry.width)).toBe(794);
    expect(Math.round(geometry.contentWidth)).toBe(602);
  });

  it('recognises presets and clamps absurd margins', () => {
    expect(marginPresetOf(DEFAULT_PAGE_SETUP.margins)).toBe('normal');
    expect(marginPresetOf({ top: 10, bottom: 10, left: 10, right: 10 })).toBe('custom');
    const clamped = clampMargins({ top: 500, bottom: 500, left: -3, right: Number.NaN }, { paper: 'a4', orientation: 'portrait' });
    expect(clamped.left).toBe(0);
    expect(clamped.right).toBe(0);
    expect(clamped.top + clamped.bottom).toBeLessThanOrEqual(297 - 30 + 0.001);
  });

  it('fills in a stored setup from an older version', () => {
    expect(parsePageSetup(null)).toEqual(DEFAULT_PAGE_SETUP);
    expect(parsePageSetup({ paper: 'nope', orientation: 'landscape' }).paper).toBe('a4');
  });

  it('splits and fills the page-number template', () => {
    expect(splitPageTemplate('Trang {page} / {pages}')).toEqual([
      { text: 'Trang ' },
      { field: 'page' },
      { text: ' / ' },
      { field: 'pages' },
    ]);
    expect(fillPageTemplate('Page {page} of {pages}', 2, 5)).toBe('Page 2 of 5');
  });
});

describe('docx table grid', () => {
  const xml =
    '<w:tbl><w:tblPr/><w:tblGrid><w:gridCol w:w="1500"/><w:gridCol w:w="3000"/></w:tblGrid>' +
    '<w:tr><w:tc><w:tbl><w:tblGrid><w:gridCol w:w="750"/></w:tblGrid></w:tbl></w:tc></w:tr></w:tbl>' +
    '<w:tbl><w:tblGrid><w:gridCol w:w="300"/></w:tblGrid></w:tbl>';

  it('lists each table, nested ones after their parent, in pixels', () => {
    expect(tableGridWidths(xml)).toEqual([[100, 200], [50], [20]]);
  });

  it('maps cells to grid columns, honouring column and row spans', () => {
    const columns = cellColumns([
      [
        { colspan: 1, rowspan: 2 },
        { colspan: 2, rowspan: 1 },
      ],
      [
        { colspan: 1, rowspan: 1 },
        { colspan: 1, rowspan: 1 },
      ],
    ]);
    expect(columns).toEqual([
      [[0], [1, 2]],
      [[1], [2]],
    ]);
  });
});

describe('document json', () => {
  const text = (value: string) => ({ type: 'text', text: value });
  const doc: DocNode = {
    type: 'doc',
    content: [
      { type: 'heading', attrs: { level: 1 }, content: [text('Giới thiệu')] },
      { type: 'paragraph', content: [text('Xin chào thế giới')] },
      { type: 'heading', attrs: { level: 4 }, content: [text('deep')] },
      {
        type: 'table',
        content: [
          { type: 'tableRow', content: [{ type: 'tableCell', content: [{ type: 'paragraph', content: [text('ô')] }] }] },
        ],
      },
    ],
  };

  it('reads plain text including table cells', () => {
    expect(docToPlainText(doc)).toBe('Giới thiệu\nXin chào thế giới\ndeep\nô');
  });

  it('counts words by whitespace and paragraphs that have text', () => {
    expect(countWords('  a  b\nc ')).toBe(3);
    expect(docStats(doc)).toMatchObject({ words: 8, paragraphs: 4 });
  });

  it('lists headings up to level 3 and names a draft from its first line', () => {
    expect(docHeadings(doc)).toEqual([{ level: 1, text: 'Giới thiệu', index: 0 }]);
    expect(firstLine(doc)).toBe('Giới thiệu');
  });
});

describe('image data', () => {
  // 1×1 transparent PNG.
  const png =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

  it('reads the type and size of a PNG data URL', () => {
    const image = decodeDataUrlImage(png);
    expect(image?.type).toBe('png');
    expect([image?.width, image?.height]).toEqual([1, 1]);
  });

  it('rejects what a DOCX cannot embed', () => {
    expect(decodeDataUrlImage('data:image/svg+xml;base64,PHN2Zy8+')).toBeNull();
    expect(decodeDataUrlImage('https://example.com/a.png')).toBeNull();
  });

  it('shrinks to the content width keeping the ratio', () => {
    expect(fitWidth(1200, 600, 600)).toEqual({ width: 600, height: 300 });
    expect(fitWidth(300, 600, 600)).toEqual({ width: 300, height: 600 });
  });
});

describe('format options', () => {
  it('reads sizes in pt and px and steps through the list', () => {
    expect(fontSizePtOf('12pt')).toBe(12);
    expect(fontSizePtOf('16px')).toBe(12);
    expect(fontSizePtOf(null)).toBeNull();
    expect(stepFontSize(11, 1)).toBe(12);
    expect(stepFontSize(11, -1)).toBe(10.5);
  });
});

describe('docx defaults', () => {
  const doc =
    '<w:body><w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="1701"/></w:sectPr></w:body>';
  const styles =
    '<w:styles><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:asciiTheme="minorHAnsi"/><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults>' +
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:rPr><w:sz w:val="26"/></w:rPr></w:style></w:styles>';
  const theme = '<a:minorFont><a:latin typeface="Calibri"/></a:minorFont><a:majorFont><a:latin typeface="Cambria"/></a:majorFont>';

  it('reads paper, margins, the theme font and the default style size', () => {
    const defaults = readDocxDefaults(doc, styles, theme);
    expect(defaults.paper).toBe('a4');
    expect(defaults.orientation).toBe('portrait');
    expect(defaults.margins?.left).toBeCloseTo(30, 0);
    expect(defaults.margins?.top).toBeCloseTo(20, 0);
    expect(defaults.baseFont).toBe('Calibri');
    expect(defaults.baseSize).toBe(13);
  });

  it('recognises landscape Letter and leaves an unknown paper unset', () => {
    expect(readDocxDefaults('<w:pgSz w:w="15840" w:h="12240" w:orient="landscape"/>', '').paper).toBe('letter');
    expect(readDocxDefaults('<w:pgSz w:w="5000" w:h="5000"/>', '').paper).toBeUndefined();
  });
});

describe('repeated table header', () => {
  const header = { columns: 3, repeat: 100, tablePos: 5 };
  it('starts each new page of a table with the header: it takes room and is passed on with the break', () => {
    const rows = [
      { height: 100, pos: 5 },
      { height: 300, pos: 21, row: header },
      { height: 300, pos: 32, row: header },
      { height: 300, pos: 43, row: header },
    ];
    const result = paginate(rows, 700);
    // Page 1 holds 100 + 300 + 300; the third row starts page 2, which already holds the 100px header.
    expect(result.breaks).toHaveLength(1);
    expect(result.breaks[0]).toMatchObject({ beforeIndex: 3, row: header });
    expect(result.pageOfBlock).toEqual([0, 0, 0, 1]);
    const longer = paginate([...rows, { height: 300, pos: 54, row: header }, { height: 300, pos: 65, row: header }], 700);
    // Page 2: header 100 + 300 + 300 = 700, so the next row breaks again.
    expect(longer.breaks.map((b) => b.beforeIndex)).toEqual([3, 5]);
  });
});

describe('print header rows', () => {
  it('moves leading all-header rows into a thead and leaves other tables alone', async () => {
    const { headerRowsToThead } = await import('../writer/services/printService');
    const html = '<table><tbody><tr><th colspan="1"><p>A</p></th><th><p>B</p></th></tr><tr><td><p>1</p></td><td><p>2</p></td></tr></tbody></table>';
    expect(headerRowsToThead(html)).toBe(
      '<table><thead><tr><th colspan="1"><p>A</p></th><th><p>B</p></th></tr></thead><tbody><tr><td><p>1</p></td><td><p>2</p></td></tr></tbody></table>',
    );
    const plain = '<table><tbody><tr><th><p>A</p></th><td><p>x</p></td></tr></tbody></table>';
    expect(headerRowsToThead(plain)).toBe(plain);
  });
});
