import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import {
  exportDocx,
  firstFontFamily,
  fontSizeHalfPoints,
  toHex,
} from '../writer/services/docxExportService';
import { DEFAULT_PAGE_SETUP, parsePageSetup, type PageSetup } from '../writer/utils/pageSetup';
import { readDocxDefaults } from '../writer/utils/docxDefaults';
import type { DocNode } from '../writer/utils/docJson';
import { classesToInlineStyle, extractRunStyles, runCss } from '../writer/utils/docxRunStyles';
import { docxToHtml, normaliseMammothHtml } from '../writer/services/docxImportService';

// 1×1 PNG.
const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

const text = (value: string, marks: DocNode['marks'] = []): DocNode => ({ type: 'text', text: value, marks });
const paragraph = (...content: DocNode[]): DocNode => ({ type: 'paragraph', content });

async function unzip(blob: Blob): Promise<JSZip> {
  return JSZip.loadAsync(await blob.arrayBuffer());
}

const baseOptions = {
  title: 'Bản thử',
  pageSetup: DEFAULT_PAGE_SETUP,
  pageTemplate: 'Trang {page} / {pages}',
  tocTitle: 'Mục lục',
};

describe('exportDocx', () => {
  const doc: DocNode = {
    type: 'doc',
    content: [
      { type: 'heading', attrs: { level: 1 }, content: [text('Tiêu đề')] },
      paragraph(
        text('đậm ', [{ type: 'bold' }]),
        text('đỏ', [{ type: 'textStyle', attrs: { color: '#ff0000', fontSize: '14pt', fontFamily: "'Times New Roman', serif" } }]),
        text('liên kết', [{ type: 'link', attrs: { href: 'https://example.com' } }]),
      ),
      { type: 'paragraph', attrs: { textAlign: 'center' }, content: [text('giữa')] },
      { type: 'bulletList', content: [{ type: 'listItem', content: [paragraph(text('một'))] }] },
      { type: 'orderedList', content: [{ type: 'listItem', content: [paragraph(text('hai'))] }] },
      {
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              { type: 'tableHeader', attrs: { colspan: 2, rowspan: 1 }, content: [paragraph(text('gộp'))] },
            ],
          },
          {
            type: 'tableRow',
            content: [
              { type: 'tableCell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph(text('a'))] },
              { type: 'tableCell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph(text('b'))] },
            ],
          },
        ],
      },
      { type: 'pageBreak' },
      { type: 'image', attrs: { src: PNG, width: 100 } },
      { type: 'tableOfContents' },
    ],
  };

  it('writes a real Word document with the formatting it was given', async () => {
    const zip = await unzip(await exportDocx(doc, baseOptions));
    const xml = await zip.file('word/document.xml')!.async('string');
    expect(xml).toContain('w:val="Heading1"');
    expect(xml).toContain('<w:b/>');
    expect(xml).toContain('w:color w:val="FF0000"');
    expect(xml).toContain('w:sz w:val="28"');
    expect(xml).toContain('Times New Roman');
    expect(xml).toContain('<w:hyperlink');
    expect(xml).toContain('w:jc w:val="center"');
    expect(xml).toContain('<w:numPr>');
    expect(xml).toContain('<w:gridSpan w:val="2"/>');
    expect(xml).toContain('w:type="page"');
    expect(xml).toContain('<w:drawing>');
    expect(xml).toMatch(/TOC \\/);
    expect(Object.keys(zip.files).some((name) => name.startsWith('word/media/'))).toBe(true);
  });

  it('writes the page size, orientation and margins in twips', async () => {
    const setup: PageSetup = { ...DEFAULT_PAGE_SETUP, paper: 'a4', orientation: 'landscape' };
    const zip = await unzip(await exportDocx(doc, { ...baseOptions, pageSetup: setup }));
    const xml = await zip.file('word/document.xml')!.async('string');
    expect(xml).toMatch(/<w:pgSz [^>]*w:w="16838"/);
    expect(xml).toMatch(/<w:pgSz [^>]*w:h="11906"/);
    expect(xml).toContain('w:orient="landscape"');
    expect(xml).toMatch(/<w:pgMar [^>]*w:top="1440"/);
  });

  it('puts the header, footer text and page-number fields in their parts', async () => {
    const setup: PageSetup = { ...DEFAULT_PAGE_SETUP, headerText: 'Đầu trang', footerText: 'Chân', pageNumbers: true };
    const zip = await unzip(await exportDocx(doc, { ...baseOptions, pageSetup: setup }));
    const parts = Object.keys(zip.files);
    const header = parts.find((name) => /word\/header\d*\.xml$/.test(name));
    const footer = parts.find((name) => /word\/footer\d*\.xml$/.test(name));
    expect(header && (await zip.file(header)!.async('string'))).toContain('Đầu trang');
    const footerXml = footer ? await zip.file(footer)!.async('string') : '';
    expect(footerXml).toContain('Chân');
    expect(footerXml).toContain('PAGE');
    expect(footerXml).toContain('NUMPAGES');
  });

  it('exports with a page setup saved before base font and size existed', async () => {
    const { baseFont: _font, baseSize: _size, ...older } = DEFAULT_PAGE_SETUP;
    const zip = await unzip(await exportDocx(doc, { ...baseOptions, pageSetup: older as unknown as PageSetup }));
    expect(await zip.file('word/styles.xml')!.async('string')).toContain('w:sz w:val="22"');
  });

  it('writes an empty document as one empty paragraph', async () => {
    const zip = await unzip(await exportDocx({ type: 'doc', content: [] }, baseOptions));
    expect(await zip.file('word/document.xml')!.async('string')).toContain('<w:p');
  });
});

describe('DOCX value parsing', () => {
  it('turns CSS colours into Word hex', () => {
    expect(toHex('#ff0000')).toBe('FF0000');
    expect(toHex('#abc')).toBe('AABBCC');
    expect(toHex('rgb(255, 128, 0)')).toBe('FF8000');
    expect(toHex('red')).toBeUndefined();
    expect(toHex(undefined)).toBeUndefined();
  });

  it('turns font sizes into half-points', () => {
    expect(fontSizeHalfPoints('14pt')).toBe(28);
    expect(fontSizeHalfPoints('16px')).toBe(24);
    expect(fontSizeHalfPoints('big')).toBeUndefined();
  });

  it('takes the first family of a CSS stack', () => {
    expect(firstFontFamily("'Times New Roman', Times, serif")).toBe('Times New Roman');
    expect(firstFontFamily('')).toBeUndefined();
  });
});

describe('import helpers', () => {
  it('turns alignment classes and check boxes into what the editor reads', () => {
    expect(normaliseMammothHtml('<p class="align-center">x</p><input type="checkbox" checked="checked" />')).toBe(
      '<p style="text-align: center">x</p>☒',
    );
  });
});

describe('export then import', () => {
  it('keeps headings, emphasis, alignment, lists and tables', async () => {
    const doc: DocNode = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [text('Chương một')] },
        { type: 'paragraph', attrs: { textAlign: 'center' }, content: [text('đậm', [{ type: 'bold' }]), text(' và '), text('nghiêng', [{ type: 'italic' }])] },
        { type: 'bulletList', content: [{ type: 'listItem', content: [paragraph(text('mục A'))] }, { type: 'listItem', content: [paragraph(text('mục B'))] }] },
        {
          type: 'table',
          content: [
            {
              type: 'tableRow',
              content: [
                { type: 'tableCell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph(text('ô 1'))] },
                { type: 'tableCell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph(text('ô 2'))] },
              ],
            },
          ],
        },
      ],
    };
    const blob = await exportDocx(doc, baseOptions);
    const html = await docxToHtml(await blob.arrayBuffer());
    expect(html).toContain('<h2>Chương một</h2>');
    expect(html).toContain('style="text-align: center"');
    expect(html).toContain('<strong>đậm</strong>');
    expect(html).toContain('<em>nghiêng</em>');
    expect(html).toMatch(/<ul>\s*<li>mục A<\/li>\s*<li>mục B<\/li>\s*<\/ul>/);
    expect(html).toMatch(/<table>[\s\S]*ô 1[\s\S]*ô 2[\s\S]*<\/table>/);
  });
});

describe('run styles', () => {
  it('reads colour, size, font and highlight from a run', () => {
    expect(runCss('<w:rFonts w:ascii="Cambria"/><w:color w:val="FF0000"/><w:sz w:val="28"/><w:highlight w:val="yellow"/>')).toBe(
      "color: #ff0000; font-size: 14pt; font-family: 'Cambria'; background-color: #ffff00",
    );
    expect(runCss('<w:b/><w:color w:val="000000"/>')).toBe('');
  });

  it('gives each distinct combination one style and leaves other runs alone', () => {
    const run = (props: string) => `<w:r><w:rPr>${props}</w:rPr><w:t>x</w:t></w:r>`;
    const xml = run('<w:color w:val="FF0000"/>') + run('<w:color w:val="FF0000"/>') + run('<w:b/>') + run('<w:rStyle w:val="Strong"/><w:color w:val="00FF00"/>');
    const result = extractRunStyles(xml, '<w:styles></w:styles>');
    expect(result.rules).toHaveLength(1);
    expect(result.documentXml.match(/fxrun1/g)).toHaveLength(2);
    expect(result.documentXml).toContain('<w:rStyle w:val="Strong"/>');
    expect(result.stylesXml).toContain('w:styleId="fxrun1"');
    expect(classesToInlineStyle('<span class="fxrun1">a</span>', result.css)).toBe('<span style="color: #ff0000">a</span>');
  });

  it('does nothing when there is no styles part to hold the styles', () => {
    const xml = '<w:r><w:rPr><w:color w:val="FF0000"/></w:rPr><w:t>x</w:t></w:r>';
    expect(extractRunStyles(xml, '').rules).toEqual([]);
  });

  it('survives export then import with colour, size and font', async () => {
    const doc: DocNode = {
      type: 'doc',
      content: [
        paragraph(text('đỏ', [{ type: 'textStyle', attrs: { color: '#ff0000', fontSize: '14pt', fontFamily: "'Times New Roman', serif" } }])),
      ],
    };
    const html = await docxToHtml(await (await exportDocx(doc, baseOptions)).arrayBuffer());
    expect(html).toContain('color: #ff0000');
    expect(html).toContain('font-size: 14pt');
    expect(html).toContain("font-family: 'Times New Roman'");
  });
});

describe('exportDocx pictures that text wraps round', () => {
  const exportXml = async (content: DocNode[]) => {
    const zip = await unzip(await exportDocx({ type: 'doc', content }, baseOptions));
    return zip.file('word/document.xml')!.async('string');
  };

  it('anchors a floating picture in the paragraph after it, wrapped on the side it was on', async () => {
    const xml = await exportXml([
      { type: 'image', attrs: { src: PNG, width: 100, float: 'right' } },
      paragraph(text('Chữ chạy quanh ảnh')),
    ]);
    expect(xml).toContain('<wp:anchor');
    expect(xml).toContain('<wp:align>right</wp:align>');
    expect(xml).toContain('<wp:wrapSquare');
    // One paragraph holds both the anchor and the text.
    expect(xml.match(/<w:p>/g)?.length ?? xml.match(/<w:p[ >]/g)?.length).toBe(1);
    expect(xml.indexOf('<wp:anchor')).toBeLessThan(xml.indexOf('Chữ chạy quanh ảnh'));
  });

  it('writes a floating picture with no paragraph after it as a block of its own', async () => {
    const xml = await exportXml([paragraph(text('Trước')), { type: 'image', attrs: { src: PNG, width: 100, float: 'left' } }]);
    expect(xml).toContain('<wp:inline');
    expect(xml).not.toContain('<wp:anchor');
  });

  it('keeps an ordinary picture inline', async () => {
    const xml = await exportXml([{ type: 'image', attrs: { src: PNG, width: 100 } }, paragraph(text('Sau'))]);
    expect(xml).toContain('<wp:inline');
    expect(xml).not.toContain('<wp:anchor');
  });

  it('survives being read back: a wrapped picture keeps its size and side', async () => {
    const blob = await exportDocx(
      { type: 'doc', content: [{ type: 'image', attrs: { src: PNG, width: 120, float: 'right' } }, paragraph(text('Chữ'))] },
      baseOptions,
    );
    const html = (await docxToHtml(await blob.arrayBuffer())).replace(/data:[^"]{40,}/g, 'data:...');
    expect(html).toContain('data-float="right"');
    expect(html).toContain('width="120"');
  });
});

describe('a comment on a stretch of text', () => {
  const doc: DocNode = {
    type: 'doc',
    content: [
      paragraph(
        text('đầu '),
        text('đoạn ', [{ type: 'commentRange', attrs: { text: 'sửa chỗ này' } }]),
        text('được ', [{ type: 'bold' }, { type: 'commentRange', attrs: { text: 'sửa chỗ này' } }]),
        text('cuối'),
      ),
    ],
  };

  it('is written as one Word comment that starts and ends around the text', async () => {
    const zip = await unzip(await exportDocx(doc, baseOptions));
    const body = await zip.file('word/document.xml')!.async('string');
    expect(body.match(/<w:commentRangeStart /g)).toHaveLength(1);
    expect(body.match(/<w:commentRangeEnd /g)).toHaveLength(1);
    expect(body.indexOf('commentRangeStart')).toBeLessThan(body.indexOf('đoạn'));
    expect(body.indexOf('commentRangeEnd')).toBeGreaterThan(body.indexOf('được'));
    expect(body.indexOf('commentRangeEnd')).toBeLessThan(body.indexOf('cuối'));
    expect(await zip.file('word/comments.xml')!.async('string')).toContain('sửa chỗ này');
  });

  it('comes back from the file as a comment on the same text', async () => {
    const blob = await exportDocx(doc, baseOptions);
    const html = await docxToHtml(await blob.arrayBuffer());
    expect(html).toMatch(/<span data-comment-range="sửa chỗ này"[^>]*>đoạn <strong>được <\/strong><\/span>|<span data-comment-range="sửa chỗ này"[^>]*>đoạn được/);
  });
});

describe('the paragraph spacing a document sets', () => {
  it('is what the DOCX styles say, so a form with no space after stays that tight in Word', async () => {
    const setup = { ...DEFAULT_PAGE_SETUP, spaceAfter: 0, lineHeight: 1 };
    const zip = await unzip(await exportDocx({ type: 'doc', content: [paragraph(text('a'))] }, { ...baseOptions, pageSetup: setup }));
    const styles = await zip.file('word/styles.xml')!.async('string');
    expect(styles).toMatch(/<w:docDefaults>[\s\S]*<w:spacing [^>]*w:after="0"[^>]*w:line="240"/);
    const fallback = await unzip(await exportDocx({ type: 'doc', content: [paragraph(text('a'))] }, baseOptions));
    expect(await fallback.file('word/styles.xml')!.async('string')).toMatch(/<w:spacing [^>]*w:after="160"[^>]*w:line="276"/);
  });
});

describe('numbered lists set to a format and a first number', () => {
  const list = (attrs: Record<string, unknown>, ...items: DocNode[]): DocNode => ({ type: 'orderedList', attrs, content: items.map((item) => ({ type: 'listItem', content: [item] })) });

  it('writes each list with its own numbering, so two lists do not count on from each other', async () => {
    const doc: DocNode = {
      type: 'doc',
      content: [list({ type: 'I', start: 1 }, paragraph(text('Phần'))), paragraph(text('giữa')), list({ type: 'a', start: 3 }, paragraph(text('chữ'))), list({ start: 1 }, paragraph(text('số')))],
    };
    const zip = await unzip(await exportDocx(doc, baseOptions));
    const numbering = await zip.file('word/numbering.xml')!.async('string');
    expect(numbering).toMatch(/<w:lvl w:ilvl="0"[^>]*>\s*<w:start w:val="1"\/>\s*<w:numFmt w:val="upperRoman"/);
    expect(numbering).toMatch(/<w:lvl w:ilvl="0"[^>]*>\s*<w:start w:val="3"\/>\s*<w:numFmt w:val="lowerLetter"/);
    const body = await zip.file('word/document.xml')!.async('string');
    expect(new Set([...body.matchAll(/<w:numId w:val="(\d+)"/g)].map((m) => m[1])).size).toBe(3);
  });

  it('sets a nested list to its own format within its parent numbering', async () => {
    const inner = list({ type: 'a' }, paragraph(text('con')));
    const doc: DocNode = { type: 'doc', content: [{ type: 'orderedList', attrs: { type: 'I' }, content: [{ type: 'listItem', content: [paragraph(text('cha')), inner] }] }] };
    const zip = await unzip(await exportDocx(doc, baseOptions));
    const numbering = await zip.file('word/numbering.xml')!.async('string');
    expect(numbering).toMatch(/<w:lvl w:ilvl="1"[^>]*>\s*<w:start w:val="1"\/>\s*<w:numFmt w:val="lowerLetter"/);
  });

  it('comes back from the file with the same formats and first numbers', async () => {
    const doc: DocNode = { type: 'doc', content: [list({ type: 'I', start: 1 }, paragraph(text('Một'))), paragraph(text('giữa')), list({ type: 'a', start: 3 }, paragraph(text('ba')))] };
    const html = await docxToHtml(await (await exportDocx(doc, baseOptions)).arrayBuffer());
    expect(html).toContain('<ol type="I"');
    expect(html).toContain('<ol type="a" start="3"');
  });
});

describe('the borders of a table', () => {
  const cell = (value: string): DocNode => ({ type: 'tableCell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph(text(value))] });
  const table = (attrs: Record<string, unknown> | undefined): DocNode => ({ type: 'table', attrs, content: [{ type: 'tableRow', content: [cell('a')] }] });

  it('writes none, a colour, or the editor grey, as the table says', async () => {
    const body = async (doc: DocNode): Promise<string> => (await unzip(await exportDocx({ type: 'doc', content: [doc] }, baseOptions))).file('word/document.xml')!.async('string');
    expect(await body(table({ borders: 'none' }))).toMatch(/<w:tblBorders><w:top w:val="none"/);
    expect(await body(table({ borders: '#ff0000' }))).toMatch(/<w:top w:val="single" w:color="FF0000"/);
    expect(await body(table(undefined))).toMatch(/<w:top w:val="single" w:color="999999"/);
  });

  it('comes back from the file with the same borders', async () => {
    const html = await docxToHtml(await (await exportDocx({ type: 'doc', content: [table({ borders: 'none' }), table({ borders: '#00ff00' })] }, baseOptions)).arrayBuffer());
    expect(html).toContain('<table data-borders="none"');
    expect(html).toContain('<table data-borders="#00ff00"');
  });
});

describe('a header and footer kept from the imported file', () => {
  const HEADER = '<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:p><w:r><w:t>Logo ngân hàng</w:t></w:r><w:r><w:drawing><a:blip r:embed="rId1" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"/></w:drawing></w:r></w:p></w:hdr>';
  const FOOTER = '<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:r><w:t>Mã biểu mẫu BM11</w:t></w:r><w:r><w:tab/></w:r><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p></w:ftr>';
  const RELS = '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/kept-header-image1.png"/></Relationships>';
  const PIXEL = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  const kept = { header: { xml: HEADER, rels: RELS, media: { 'kept-header-image1.png': PIXEL } }, footer: { xml: FOOTER, rels: '', media: {} } };

  it('writes the page columns into the section and reads them back', async () => {
    const zip = await unzip(await exportDocx({ type: 'doc', content: [paragraph(text('a'))] }, { ...baseOptions, pageSetup: { ...DEFAULT_PAGE_SETUP, columns: 2, columnGap: 10 } }));
    const documentXml = await zip.file('word/document.xml')!.async('string');
    expect(documentXml).toMatch(/<w:cols[^>]*w:num="2"/);
    expect(readDocxDefaults(documentXml, '')).toMatchObject({ columns: 2, columnGap: 10 });
    const plain = await unzip(await exportDocx({ type: 'doc', content: [paragraph(text('a'))] }, { ...baseOptions, pageSetup: DEFAULT_PAGE_SETUP }));
    expect(readDocxDefaults(await plain.file('word/document.xml')!.async('string'), '').columns).toBeUndefined();
    expect(parsePageSetup({ columns: 9 }).columns).toBe(1);
    expect(parsePageSetup({ columns: 3 }).columns).toBe(3);
  });

  it('is written into the package, with its picture, relationships and content types', async () => {
    const setup = { ...DEFAULT_PAGE_SETUP, headerText: 'Logo ngân hàng', footerText: 'Mã biểu mẫu BM11', keptHeader: kept.header, keptFooter: kept.footer };
    const zip = await unzip(await exportDocx({ type: 'doc', content: [paragraph(text('nội dung'))] }, { ...baseOptions, pageSetup: setup }));
    expect(await zip.file('word/keptHeader.xml')!.async('string')).toBe(HEADER);
    expect(await zip.file('word/keptFooter.xml')!.async('string')).toBe(FOOTER);
    expect(await zip.file('word/_rels/keptHeader.xml.rels')!.async('string')).toContain('media/kept-header-image1.png');
    expect(await zip.file('word/media/kept-header-image1.png')!.async('base64')).toBe(PIXEL);
    const types = await zip.file('[Content_Types].xml')!.async('string');
    expect(types).toContain('/word/keptHeader.xml');
    expect(types).toContain('/word/keptFooter.xml');
    expect(types).toMatch(/<Default[^>]*Extension="png"/);
    const body = await zip.file('word/document.xml')!.async('string');
    expect(body).toMatch(/<w:sectPr[^>]*><w:headerReference w:type="default" r:id="rIdKeptHeader"\/><w:footerReference w:type="default" r:id="rIdKeptFooter"\/>/);
    expect(await zip.file('word/_rels/document.xml.rels')!.async('string')).toContain('Id="rIdKeptHeader"');
    // The writer makes no header or footer of its own besides them.
    expect(Object.keys(zip.files).filter((name) => /^word\/(header|footer)\d*\.xml$/.test(name))).toEqual([]);
  });

  it('is read back from the exported file as it was, and a file without any keeps none', async () => {
    const { default: JSZip } = await import('jszip');
    const { readKeptPart } = await import('../writer/utils/docxKeptParts');
    const setup = { ...DEFAULT_PAGE_SETUP, keptHeader: kept.header, keptFooter: kept.footer };
    const exported = await unzip(await exportDocx({ type: 'doc', content: [paragraph(text('a'))] }, { ...baseOptions, pageSetup: setup }));
    const back = await readKeptPart(exported as unknown as InstanceType<typeof JSZip>, 'word/keptHeader.xml', 'header');
    expect(back?.xml).toBe(HEADER);
    expect(back?.media['kept-header-kept-header-image1.png']).toBe(PIXEL);
    const plain = await unzip(await exportDocx({ type: 'doc', content: [paragraph(text('a'))] }, baseOptions));
    expect(await readKeptPart(plain as unknown as InstanceType<typeof JSZip>, null, 'header')).toBeNull();
  });

  it('is dropped by a stored setup that holds something else, and the writer makes the header again from its text', async () => {
    const { sanitiseKeptPart } = await import('../writer/utils/docxKeptParts');
    const { parsePageSetup } = await import('../writer/utils/pageSetup');
    expect(sanitiseKeptPart({ xml: '', rels: '', media: {} })).toBeNull();
    expect(sanitiseKeptPart('x')).toBeNull();
    expect(sanitiseKeptPart({ xml: '<w:hdr/>', rels: '', media: { '../evil.png': 'AAAA', 'ok.png': 'AAAA', 'bad.png': '<script>' } })?.media).toEqual({ 'ok.png': 'AAAA' });
    expect(parsePageSetup({ keptHeader: kept.header }).keptHeader?.xml).toBe(HEADER);
    const remade = await unzip(await exportDocx({ type: 'doc', content: [paragraph(text('a'))] }, { ...baseOptions, pageSetup: { ...DEFAULT_PAGE_SETUP, headerText: 'Chữ mới', keptHeader: null } }));
    expect(await remade.file('word/header1.xml')!.async('string')).toContain('Chữ mới');
    expect(remade.file('word/keptHeader.xml')).toBeNull();
  });

  it('keeps the distance of the header and footer from the paper edge', async () => {
    const body = async (setup: typeof DEFAULT_PAGE_SETUP): Promise<string> => (await unzip(await exportDocx({ type: 'doc', content: [paragraph(text('a'))] }, { ...baseOptions, pageSetup: setup }))).file('word/document.xml')!.async('string');
    expect(await body({ ...DEFAULT_PAGE_SETUP, headerDistance: 7.62, footerDistance: 12.7 })).toMatch(/w:header="432"[^>]*w:footer="720"/);
    expect(await body(DEFAULT_PAGE_SETUP)).toMatch(/w:header="709"/);
  });
});

describe('the column grid of a table with known widths', () => {
  const cell = (value: string, colwidth: number[] | null, colspan = 1): DocNode => ({ type: 'tableCell', attrs: { colspan, rowspan: 1, colwidth }, content: [paragraph(text(value))] });
  const body = async (doc: DocNode, pageSetup = DEFAULT_PAGE_SETUP): Promise<string> => (await unzip(await exportDocx({ type: 'doc', content: [doc] }, { ...baseOptions, pageSetup }))).file('word/document.xml')!.async('string');

  it('writes the grid and a fixed layout, so that Word does not size the columns by their text', async () => {
    const table: DocNode = { type: 'table', content: [{ type: 'tableRow', content: [cell('a', [60]), cell('b', [180])] }, { type: 'tableRow', content: [cell('c', [60, 180], 2)] }] };
    const xml = await body(table);
    expect(xml).toMatch(/<w:tblGrid><w:gridCol w:w="900"\/><w:gridCol w:w="2700"\/><\/w:tblGrid>/);
    expect(xml).toContain('<w:tblLayout w:type="fixed"/>');
    expect(xml).toMatch(/<w:tblW w:type="dxa" w:w="3600"\/>/);
  });

  it('shrinks a grid wider than the page to the page, and leaves a table without widths at the page width', async () => {
    const wide: DocNode = { type: 'table', content: [{ type: 'tableRow', content: [cell('a', [600]), cell('b', [600])] }] };
    const widths = [...(await body(wide)).matchAll(/<w:gridCol w:w="(\d+)"/g)].map((m) => Number(m[1]));
    expect(widths[0]).toBe(widths[1]);
    expect(widths[0] + widths[1]).toBeLessThanOrEqual(9100);
    const plain: DocNode = { type: 'table', content: [{ type: 'tableRow', content: [cell('a', null), cell('b', null)] }] };
    expect(await body(plain)).toMatch(/<w:tblW w:type="pct" w:w="5000"\/>/);
  });
});
