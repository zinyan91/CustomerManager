import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import {
  exportDocx,
  firstFontFamily,
  fontSizeHalfPoints,
  toHex,
} from '../writer/services/docxExportService';
import { DEFAULT_PAGE_SETUP, type PageSetup } from '../writer/utils/pageSetup';
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
