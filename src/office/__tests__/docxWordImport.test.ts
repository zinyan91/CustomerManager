import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { importDocument } from '../writer/services/docxImportService';
import { defaultPartPath, readHeaderFooter } from '../writer/utils/docxHeaderFooter';
import { hasHorizontalLine } from '../writer/utils/docxLines';
import { convertSymbolFonts, symbolCharacter } from '../writer/utils/docxSymbols';
import { applyParagraphMarkers, markParagraphFormat, paragraphFormat } from '../writer/utils/docxParagraphs';

describe('what a paragraph says about itself', () => {
  it('reads an indent in steps of half an inch and a line spacing as a multiple', () => {
    expect(paragraphFormat('<w:ind w:left="720"/>')).toMatchObject({ indent: 1, lineHeight: null });
    expect(paragraphFormat('<w:ind w:start="1440"/><w:spacing w:line="360" w:lineRule="auto"/>')).toMatchObject({ indent: 2, lineHeight: 1.5 });
    expect(paragraphFormat('<w:spacing w:line="480" w:lineRule="auto"/>')).toMatchObject({ indent: 0, lineHeight: 2 });
    expect(paragraphFormat('<w:spacing w:line="240" w:lineRule="auto"/>').lineHeight).toBe(1);
    // An exact or "at least" spacing is a height in points, not a multiple.
    expect(paragraphFormat('<w:spacing w:line="400" w:lineRule="exact"/>').lineHeight).toBeNull();
    // A list's indent is the list's own.
    expect(paragraphFormat('<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr><w:ind w:left="720"/>').indent).toBe(0);
  });

  it('carries it through the document as a marker run and out again as styles', () => {
    const xml = '<w:p><w:pPr><w:ind w:left="720"/><w:spacing w:line="360" w:lineRule="auto"/></w:pPr><w:r><w:t>a</w:t></w:r></w:p><w:p><w:r><w:t>b</w:t></w:r></w:p>';
    const marked = markParagraphFormat(xml);
    expect(marked.match(/⁣\[i=1;l=1\.5\]⁣/g)).toHaveLength(1);
    expect(marked).toContain('<w:r><w:t>b</w:t></w:r>');
    const html = applyParagraphMarkers('<p style="text-align: center">⁣[i=1;l=1.5]⁣a</p><ul><li>⁣[l=2]⁣x</li></ul>');
    expect(html).toBe('<p style="text-align: center; margin-left: 1.27cm; line-height: 1.5">a</p><ul><li>x</li></ul>');
  });

  it('keeps the font size of an empty paragraph mark, and only of an empty one', () => {
    const empty = '<w:p><w:pPr><w:rPr><w:sz w:val="12"/></w:rPr></w:pPr></w:p>';
    expect(paragraphFormat('<w:rPr><w:sz w:val="12"/></w:rPr>').markSize).toBe(6);
    const marked = markParagraphFormat(empty);
    expect(marked).toContain('[z=6]');
    expect(applyParagraphMarkers('<p>⁣[z=6]⁣</p>')).toBe('<p data-mark-size="6" style=""></p>');
    const filled = '<w:p><w:pPr><w:rPr><w:sz w:val="12"/></w:rPr></w:pPr><w:r><w:t>text</w:t></w:r></w:p>';
    expect(markParagraphFormat(filled)).toBe(filled);
  });

  it('writes symbol-font characters as the Unicode characters that look the same', () => {
    expect(symbolCharacter('Wingdings', 0xf0fc)).toBe('✓');
    expect(symbolCharacter('Symbol', 0xf0b7)).toBe('•');
    expect(symbolCharacter('Arial', 0xfc)).toBeNull();
    const sym = '<w:r><w:sym w:font="Wingdings" w:char="F0FC"/></w:r><w:r><w:sym w:font="Wingdings" w:char="F0FF"/></w:r>';
    expect(convertSymbolFonts(sym)).toBe('<w:r><w:t xml:space="preserve">✓</w:t></w:r><w:r><w:sym w:font="Wingdings" w:char="F0FF"/></w:r>');
    const run = '<w:r><w:rPr><w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings"/></w:rPr><w:t> x</w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Arial"/></w:rPr><w:t></w:t></w:r>';
    expect(convertSymbolFonts(run)).toBe('<w:r><w:rPr><w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings"/></w:rPr><w:t>➢ x</w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Arial"/></w:rPr><w:t></w:t></w:r>');
  });

  it('finds a long horizontal line shape in a paragraph, and nothing else', () => {
    const drawing = (cx: number, cy: number, prst = 'line') => `<w:p><w:r><w:drawing><wp:anchor><a:graphic><a:graphicData><wps:wsp><wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="${prst}"/></wps:spPr></wps:wsp></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r></w:p>`;
    expect(hasHorizontalLine(drawing(5_000_000, 0))).toBe(true);
    expect(hasHorizontalLine(drawing(500_000, 0))).toBe(false);
    expect(hasHorizontalLine(drawing(5_000_000, 3_000_000))).toBe(false);
    expect(hasHorizontalLine(drawing(5_000_000, 0, 'rect'))).toBe(false);
    expect(hasHorizontalLine('<w:p><w:pict><v:line from="0,0" to="400,0"/></w:pict></w:p>')).toBe(true);
    expect(hasHorizontalLine('<w:p><w:pict><v:line from="0,0" to="0,400"/></w:pict></w:p>')).toBe(false);
  });

  it('leaves a paragraph that holds a text box alone', () => {
    const xml = '<w:p><w:pPr><w:ind w:left="720"/></w:pPr><w:r><w:txbxContent><w:p><w:r><w:t>in</w:t></w:r></w:p></w:txbxContent></w:r></w:p>';
    expect(markParagraphFormat(xml)).toBe(xml);
  });
});

describe('headers and footers', () => {
  const rels = '<Relationships><Relationship Id="rId7" Type="x/header" Target="header1.xml"/><Relationship Id="rId8" Type="x/footer" Target="footer1.xml"/></Relationships>';
  it('finds the default one through the relationships', () => {
    const doc = '<w:sectPr><w:headerReference w:type="default" r:id="rId7"/><w:footerReference w:type="first" r:id="rId9"/><w:footerReference w:type="default" r:id="rId8"/></w:sectPr>';
    expect(defaultPartPath(doc, rels, 'header')).toBe('word/header1.xml');
    expect(defaultPartPath(doc, rels, 'footer')).toBe('word/footer1.xml');
    expect(defaultPartPath('<w:sectPr/>', rels, 'footer')).toBeNull();
  });

  it('reads the text, and a PAGE field as a page number rather than as text', () => {
    const footer = '<w:p><w:r><w:t>Chân trang</w:t></w:r><w:r><w:tab/></w:r><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>3</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>';
    expect(readHeaderFooter(footer)).toEqual({ text: 'Chân trang', pageNumber: true });
    expect(readHeaderFooter('<w:p><w:fldSimple w:instr=" PAGE "><w:r><w:t>1</w:t></w:r></w:fldSimple></w:p>')).toEqual({ text: '', pageNumber: true });
    expect(readHeaderFooter('<w:p><w:r><w:t>A &amp; B</w:t></w:r></w:p>')).toEqual({ text: 'A & B', pageNumber: false });
  });
});

describe('a document Word made', () => {
  async function load() {
    const bytes = readFileSync('src/office/__tests__/fixtures/word-made.docx');
    return importDocument(new File([bytes], 'word-made.docx'));
  }

  it('keeps the indent of a paragraph, and its heading, alignment and run styles', async () => {
    const { html } = await load();
    expect(html).toContain('<h1>Tieu de lon</h1>');
    expect(html).toMatch(/<p style="text-align: justify; margin-left: 1\.27cm">/);
    expect(html).toContain('text-align: center');
    expect(html).toContain("font-family: 'Times New Roman'");
    expect(html).not.toContain('⁣');
  });

  it("reads the page's margins, header, footer and page number", async () => {
    const { pageDefaults } = await load();
    expect(pageDefaults.headerText).toBe('Dau trang');
    expect(pageDefaults.footerText).toBe('Chan trang');
    expect(pageDefaults.pageNumbers).toBe(true);
    expect(pageDefaults.margins?.left).toBeCloseTo(25, 0);
  });
});

describe('space around a paragraph and a pushed-in first line', () => {
  it('reads space before and after in points and a first-line indent in centimetres', () => {
    expect(paragraphFormat('<w:spacing w:before="240" w:after="120"/><w:ind w:firstLine="720"/>')).toMatchObject({ before: 12, after: 6, firstLine: 1.27 });
    expect(paragraphFormat('<w:spacing w:after="0"/>')).toMatchObject({ before: null, after: 0 });
    expect(paragraphFormat('<w:jc w:val="left"/>')).toMatchObject({ before: null, after: null, firstLine: null });
  });

  it('carries them as styles', () => {
    const xml = '<w:p><w:pPr><w:spacing w:before="240" w:after="0"/><w:ind w:firstLine="720"/></w:pPr><w:r><w:t>a</w:t></w:r></w:p>';
    const html = applyParagraphMarkers(markParagraphFormat(xml).match(/⁣\[[^\]]*\]⁣/)![0].replace(/^/, '<p>') + 'a</p>');
    expect(html).toBe('<p style="margin-top: 12pt; margin-bottom: 0pt; text-indent: 1.27cm">a</p>');
  });
});

describe('shading of table cells', () => {
  it('reads the fill of each cell in the order of the cells', async () => {
    const { cellFills } = await import('../writer/utils/docxCellShading');
    const xml = '<w:tbl><w:tr><w:tc><w:tcPr><w:shd w:val="clear" w:fill="FF0000"/></w:tcPr><w:p><w:pPr><w:shd w:fill="00FF00"/></w:pPr></w:p></w:tc><w:tc><w:tcPr><w:vMerge/></w:tcPr></w:tc><w:tc><w:tcPr><w:shd w:fill="auto"/></w:tcPr></w:tc></w:tr></w:tbl>';
    expect(cellFills(xml)).toEqual([['#ff0000', null]]);
  });

  it('carries a Word-made fill into the cell, and back out to Word', async () => {
    const bytes = readFileSync('src/office/__tests__/fixtures/word-shaded.docx');
    const { html } = await importDocument(new File([bytes], 'word-shaded.docx'));
    expect(html.match(/data-background="#ff0000"/g)).toHaveLength(1);
    expect(html.match(/data-background="#00ff00"/g)).toHaveLength(1);
  });
});

describe('footnotes', () => {
  it('turns the notes of a Word-made file into references that hold their text', async () => {
    const bytes = readFileSync('src/office/__tests__/fixtures/word-footnotes.docx');
    const { html } = await importDocument(new File([bytes], 'word-footnotes.docx'));
    expect(html.match(/<sup data-footnote="[^"]+"/g)).toHaveLength(2);
    expect(html).toContain('data-footnote="Chu thich so mot"');
    expect(html).toContain('data-footnote="Chu thich so hai"');
    expect(html).not.toContain('footnote-ref');
    expect(html).not.toContain('<ol>');
  });
});

describe('comments', () => {
  it('puts a comment of a Word-made file on the text it covers', async () => {
    const bytes = readFileSync('src/office/__tests__/fixtures/word-comment.docx');
    const { html } = await importDocument(new File([bytes], 'word-comment.docx'));
    expect(html).toContain('<span data-comment-range="Binh luan cua toi" title="Binh luan cua toi">Doan</span>');
    expect(html).not.toContain('data-comment="');
    expect(html).not.toContain('comment-ref');
    expect(html).not.toContain('<dl>');
    expect(html).not.toContain('⁣');
  });

  it('keeps a range only where it fits inside one paragraph and its tags', async () => {
    const { wrapCommentRanges, isBalanced, markCommentRanges } = await import('../writer/utils/docxCommentRanges');
    const esc = (v: string): string => v;
    const notes = new Map([['3', 'ghi chu']]);
    const open = '⁣[c:3]⁣';
    const close = '⁣[/c:3]⁣';
    expect(wrapCommentRanges(`<p>a ${open}b <strong>c</strong>${close} d</p>`, notes, esc).html).toBe('<p>a <span data-comment-range="ghi chu" title="ghi chu">b <strong>c</strong></span> d</p>');
    // Across paragraphs, or cutting a tag, the comment stays at its reference.
    const across = wrapCommentRanges(`<p>a ${open}b</p><p>c${close} d</p>`, notes, esc);
    expect(across.html).toBe('<p>a b</p><p>c d</p>');
    expect(across.placed.size).toBe(0);
    expect(isBalanced('<strong>a</strong> b')).toBe(true);
    expect(isBalanced('<strong>a b')).toBe(false);
    expect(markCommentRanges('<w:commentRangeStart w:id="3"/><w:commentRangeEnd w:id="3"/>')).toContain('[c:3]');
  });
});

describe('tracked changes', () => {
  it('keeps what Word marked as inserted and as deleted, with who and when', async () => {
    const bytes = readFileSync('src/office/__tests__/fixtures/word-tracked.docx');
    const { html } = await importDocument(new File([bytes], 'word-tracked.docx'));
    expect(html).toMatch(/<ins data-track="insertion" data-author="[^"]*" data-date="[^"]*"> Them moi\.<\/ins>/);
    expect(html).toMatch(/<del data-track="deletion"[^>]*>Giu <\/del>/);
    expect(html).not.toContain('⁣');
  });

  it('is not disturbed in a document without any', async () => {
    const { markRevisions } = await import('../writer/utils/docxRevisions');
    const xml = '<w:p><w:r><w:t>a</w:t></w:r></w:p>';
    expect(markRevisions(xml)).toBe(xml);
  });
});

describe('how a Word list is numbered', () => {
  const numbering =
    '<w:numbering>' +
    '<w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="upperRoman"/></w:lvl><w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="decimal"/></w:lvl><w:lvl w:ilvl="2"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/></w:lvl></w:abstractNum>' +
    '<w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/></w:lvl></w:abstractNum>' +
    '<w:num w:numId="5"><w:abstractNumId w:val="0"/></w:num><w:num w:numId="6"><w:abstractNumId w:val="1"/></w:num>' +
    '<w:num w:numId="7"><w:abstractNumId w:val="0"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="4"/></w:lvlOverride></w:num>' +
    '</w:numbering>';
  const item = (numId: number, level: number, text: string): string => `<w:p><w:pPr><w:numPr><w:ilvl w:val="${level}"/><w:numId w:val="${numId}"/></w:numPr></w:pPr><w:r><w:t>${text}</w:t></w:r></w:p>`;

  it('reads the format of each level and the number a list starts from', async () => {
    const { readNumbering } = await import('../writer/utils/docxNumbering');
    const { levels } = readNumbering(numbering);
    expect(levels.get('5')?.get(0)).toEqual({ type: 'I', start: 1 });
    expect(levels.get('5')?.get(1)).toEqual({ type: '1', start: 1 });
    expect(levels.get('5')?.get(2)).toEqual({ type: 'a', start: 1 });
    expect(levels.get('6')?.get(0)).toEqual({ type: null, start: 1 });
    expect(levels.get('7')?.get(0)).toEqual({ type: 'I', start: 4 });
  });

  it('numbers each item as Word does: a level counts on, and restarts after an item above it', async () => {
    const { listMarkers, readNumbering } = await import('../writer/utils/docxNumbering');
    const xml = [item(5, 0, 'a'), item(5, 1, 'b'), item(5, 1, 'c'), item(5, 0, 'd'), item(5, 1, 'e'), '<w:p><w:r><w:t>between</w:t></w:r></w:p>', item(5, 0, 'f')].join('');
    const marks = listMarkers(xml, readNumbering(numbering));
    expect([...marks.values()].map((m) => [m.level, m.number])).toEqual([[0, 1], [1, 1], [1, 2], [0, 2], [1, 1], [0, 3]]);
    expect(marks.get(5)).toBeUndefined();
  });

  it('puts the format and first number on each list, and splits where the Word list changes', async () => {
    const { applyListMarkers } = await import('../writer/utils/docxNumbering');
    const mark = (parts: string): string => `⁣[${parts}]⁣`;
    const html = `<ol><li>${mark('n=5;o=I;s=1')}Heading<ol><li>${mark('n=5;o=1;s=1')}one</li><li>${mark('n=5;o=1;s=2')}two</li></ol></li><li>${mark('n=7;o=I;s=4')}Other</li></ol><ul><li>${mark('n=6')}dot</li></ul>`;
    expect(applyListMarkers(html)).toBe('<ol type="I"><li>Heading<ol type="1"><li>one</li><li>two</li></ol></li></ol><ol type="I" start="4"><li>Other</li></ol><ul><li>dot</li></ul>');
  });

  it('starts an interrupted list at the number it had reached', async () => {
    const { applyListMarkers } = await import('../writer/utils/docxNumbering');
    const html = `<ol><li>⁣[n=3;o=a;s=3]⁣third</li></ol>`;
    expect(applyListMarkers(html)).toBe('<ol type="a" start="3"><li>third</li></ol>');
  });

  it('writes the decimal format out, and drops the empty bullet mammoth opens around a list whose level has nothing above it', async () => {
    const { applyListMarkers } = await import('../writer/utils/docxNumbering');
    expect(applyListMarkers('<ol><li>⁣[n=1;o=1;s=1]⁣a</li></ol>')).toBe('<ol type="1"><li>a</li></ol>');
    expect(applyListMarkers('<ul><li><ol><li>⁣[n=1;o=1;s=2]⁣two</li></ol></li></ul>')).toBe('<ol type="1" start="2"><li>two</li></ol>');
    expect(applyListMarkers('<ul><li>text<ol><li>⁣[n=1;o=1;s=1]⁣x</li></ol></li></ul>')).toBe('<ul><li>text<ol type="1"><li>x</li></ol></li></ul>');
  });

  it('leaves a document without lists alone', async () => {
    const { applyListMarkers } = await import('../writer/utils/docxNumbering');
    expect(applyListMarkers('<p>x</p>')).toBe('<p>x</p>');
  });
});

describe('the borders of a table', () => {
  const grid = '<w:tblBorders><w:top w:val="single" w:sz="4" w:color="auto"/><w:insideH w:val="single" w:sz="4" w:color="auto"/></w:tblBorders>';
  const table = (properties: string, cell = ''): string => `<w:tbl><w:tblPr>${properties}</w:tblPr><w:tr><w:tc><w:tcPr>${cell}</w:tcPr><w:p/></w:tc></w:tr></w:tbl>`;

  it('reads lines as black when automatic, their colour when given, and none when every side is nil', async () => {
    const { tableBorders } = await import('../writer/utils/docxTableBorders');
    expect(tableBorders(table(grid))).toEqual(['#000000']);
    expect(tableBorders(table('<w:tblBorders><w:top w:val="single" w:color="4F81BD"/></w:tblBorders>'))).toEqual(['#4f81bd']);
    expect(tableBorders(table('<w:tblBorders><w:top w:val="nil"/><w:left w:val="none"/></w:tblBorders>'))).toEqual(['none']);
    expect(tableBorders(table(''))).toEqual(['none']);
  });

  it('takes them from the table style, through the style it is based on, and from a cell that draws its own', async () => {
    const { tableBorders } = await import('../writer/utils/docxTableBorders');
    const styles = `<w:styles><w:style w:type="table" w:styleId="Grid">${`<w:tblPr>${grid}</w:tblPr>`}</w:style><w:style w:type="table" w:styleId="Child"><w:basedOn w:val="Grid"/></w:style></w:styles>`;
    expect(tableBorders(table('<w:tblStyle w:val="Child"/>'), styles)).toEqual(['#000000']);
    expect(tableBorders(table('<w:tblStyle w:val="Unknown"/>'), styles)).toEqual(['none']);
    expect(tableBorders(table('', '<w:tcBorders><w:bottom w:val="single" w:color="FF0000"/></w:tcBorders>'))).toEqual(['#ff0000']);
  });

  it('keeps the tables in the order they open, the nested one after its parent', async () => {
    const { tableBorders } = await import('../writer/utils/docxTableBorders');
    const nested = `<w:tbl><w:tblPr>${grid}</w:tblPr><w:tr><w:tc>${table('')}</w:tc></w:tr></w:tbl>${table('<w:tblBorders><w:top w:val="single" w:color="00FF00"/></w:tblBorders>')}`;
    expect(tableBorders(nested)).toEqual(['#000000', 'none', '#00ff00']);
  });

  it('puts them on the tables of the HTML, and leaves it alone when the counts differ', async () => {
    const { applyTableBorders } = await import('../writer/utils/docxTableBorders');
    const xml = table(grid) + table('');
    expect(applyTableBorders('<table><tr><td>a</td></tr></table><table><tr><td>b</td></tr></table>', xml)).toBe('<table data-borders="#000000"><tr><td>a</td></tr></table><table data-borders="none"><tr><td>b</td></tr></table>');
    expect(applyTableBorders('<table></table>', xml)).toBe('<table></table>');
  });
});

describe('spacing a style gives a paragraph', () => {
  const styles =
    '<w:styles><w:docDefaults><w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="259" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>' +
    '<w:style w:type="paragraph" w:styleId="Tight"><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="60" w:after="0"/></w:pPr></w:style>' +
    '<w:style w:type="paragraph" w:styleId="Tighter"><w:basedOn w:val="Tight"/><w:pPr><w:spacing w:before="120"/></w:pPr></w:style>' +
    '<w:style w:type="paragraph" w:styleId="Heading1"><w:pPr><w:spacing w:before="480"/></w:pPr></w:style>' +
    '<w:style w:type="table" w:styleId="Grid"><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:tblPr/><w:tblStylePr w:type="firstRow"><w:pPr><w:spacing w:after="400"/></w:pPr></w:tblStylePr></w:style>' +
    '</w:styles>';

  it('reads the space and line a paragraph style and a table style set, through the style they are based on', async () => {
    const { readStyleSpacings } = await import('../writer/utils/docxStyleSpacing');
    const spacings = readStyleSpacings(styles);
    expect(spacings.defaults).toEqual({ before: 0, after: 8, lineHeight: 1.08 });
    expect(spacings.paragraph.get('Tight')).toEqual({ before: 3, after: 0, lineHeight: null });
    expect(spacings.paragraph.get('Tighter')).toEqual({ before: 6, after: 0, lineHeight: null });
    // The conditional formatting of a table style is not what every paragraph in it gets.
    expect(spacings.table.get('Grid')).toEqual({ before: null, after: 0, lineHeight: 1 });
  });

  it('gives a paragraph what its style or table says only where that differs from every other paragraph, and a heading nothing', async () => {
    const { inheritedSpacing, readStyleSpacings } = await import('../writer/utils/docxStyleSpacing');
    const spacings = readStyleSpacings(styles);
    expect(inheritedSpacing(spacings, null, 'Grid')).toEqual({ before: null, after: 0, lineHeight: 1 });
    expect(inheritedSpacing(spacings, 'Tight', null)).toEqual({ before: 3, after: 0, lineHeight: null });
    expect(inheritedSpacing(spacings, 'Tight', 'Grid')).toEqual({ before: 3, after: 0, lineHeight: 1 });
    expect(inheritedSpacing(spacings, 'Normal', null)).toEqual({ before: null, after: null, lineHeight: null });
    expect(inheritedSpacing(spacings, 'Heading1', 'Grid')).toEqual({ before: null, after: null, lineHeight: null });
  });

  it('marks the paragraphs of a table with the table style, those without properties too, and leaves the paragraph that sets its own', async () => {
    const { markParagraphFormat } = await import('../writer/utils/docxParagraphs');
    const { readStyleSpacings } = await import('../writer/utils/docxStyleSpacing');
    const xml =
      '<w:body><w:p><w:r><w:t>out</w:t></w:r></w:p>' +
      '<w:tbl><w:tblPr><w:tblStyle w:val="Grid"/></w:tblPr><w:tr><w:tc><w:p><w:r><w:t>plain</w:t></w:r></w:p><w:p><w:pPr><w:spacing w:after="120"/></w:pPr><w:r><w:t>own</w:t></w:r></w:p></w:tc></w:tr></w:tbl>' +
      '<w:p><w:r><w:t>after</w:t></w:r></w:p></w:body>';
    const marked = markParagraphFormat(xml, new Map(), readStyleSpacings(styles));
    expect(marked.match(/⁣\[[^\]]*\]⁣/g)).toEqual(['⁣[l=1;a=0]⁣', '⁣[l=1;a=6]⁣']);
    expect(marked).toContain('<w:p><w:r><w:t>out</w:t></w:r></w:p>');
    expect(marked).toContain('<w:p><w:r><w:t>after</w:t></w:r></w:p>');
  });
});

describe('column widths of a table from its cells', () => {
  it('takes each grid column from the cells that cover it, through spans, and gives up when one has none', async () => {
    const { columnWidthsOf } = await import('../writer/utils/docxTableGrid');
    const cell = (colspan: number, rowspan: number, ...widths: number[]) => ({ colspan, rowspan, widths });
    expect(columnWidthsOf([[cell(1, 1, 50), cell(2, 1, 100, 150)], [cell(1, 1, 50), cell(1, 1, 100), cell(1, 1, 150)]])).toEqual([50, 100, 150]);
    expect(columnWidthsOf([[cell(1, 2, 50), cell(1, 1, 100)], [cell(1, 1, 100)]])).toEqual([50, 100]);
    expect(columnWidthsOf([[cell(1, 1, 50), cell(1, 1)]])).toBeNull();
    expect(columnWidthsOf([])).toBeNull();
  });
});
