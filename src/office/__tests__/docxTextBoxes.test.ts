import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { importDocument } from '../writer/services/docxImportService';
import { boxTextBoxes, isFramed, markTextBoxes } from '../writer/utils/docxTextBoxes';

const NS =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:v="urn:schemas-microsoft-com:vml"';

const wsp = (spPr: string, text = 'Trong hộp') =>
  `<wps:wsp><wps:cNvSpPr txBox="1"/><wps:spPr>${spPr}</wps:spPr><wps:txbx><w:txbxContent><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:txbxContent></wps:txbx></wps:wsp>`;

describe('which text boxes have a frame', () => {
  it('has one when the shape draws a line or a fill', () => {
    expect(isFramed(wsp('<a:prstGeom prst="rect"/><a:ln w="9525"><a:solidFill><a:srgbClr val="000000"/></a:solidFill></a:ln>'))).toBe(true);
    expect(isFramed(wsp('<a:prstGeom prst="rect"/><a:solidFill><a:srgbClr val="FFFF00"/></a:solidFill><a:ln><a:noFill/></a:ln>'))).toBe(true);
    expect(isFramed(wsp('<a:prstGeom prst="rect"/><a:ln w="9525"/>'))).toBe(true);
  });

  it('has none when the line and the fill are off, as in a form laid out with text boxes', () => {
    expect(isFramed(wsp('<a:prstGeom prst="rect"/><a:noFill/><a:ln><a:noFill/></a:ln>'))).toBe(false);
    expect(isFramed(wsp('<a:prstGeom prst="rect"/>'))).toBe(false);
  });

  it('reads the same from a VML shape', () => {
    expect(isFramed('<v:shape id="a" type="#t"><v:textbox><w:txbxContent/></v:textbox></v:shape>')).toBe(true);
    expect(isFramed('<v:shape id="a" stroked="f"><v:textbox/></v:shape>')).toBe(false);
    expect(isFramed('<v:shape id="a" stroked="f" fillcolor="#ffff00"><v:textbox/></v:shape>')).toBe(true);
    expect(isFramed('<v:rect stroked="false" filled="f"><v:textbox/></v:rect>')).toBe(false);
  });
});

describe('marking and boxing', () => {
  const styles = '<w:styles xmlns:w="x"></w:styles>';

  it('marks the paragraphs of a framed box only, and defines the style', () => {
    const framed = wsp('<a:ln w="9525"/>');
    const plain = wsp('<a:noFill/><a:ln><a:noFill/></a:ln>', 'Không khung');
    const out = markTextBoxes(`<w:body>${framed}${plain}</w:body>`, styles);
    expect(out.documentXml.match(/w:pStyle w:val="fxbox"/g)).toHaveLength(1);
    expect(out.stylesXml).toContain('w:styleId="fxbox"');
  });

  it('puts the style first in a paragraph that already has properties, replacing its own', () => {
    const shape = `<wps:wsp><wps:spPr><a:ln w="1"/></wps:spPr><wps:txbx><w:txbxContent><w:p><w:pPr><w:pStyle w:val="Heading1"/><w:jc w:val="center"/></w:pPr><w:r><w:t>x</w:t></w:r></w:p></w:txbxContent></wps:txbx></wps:wsp>`;
    const out = markTextBoxes(shape, styles).documentXml;
    expect(out).toContain('<w:pPr><w:pStyle w:val="fxbox"/><w:jc w:val="center"/></w:pPr>');
    expect(out).not.toContain('Heading1');
  });

  it('changes nothing without a styles part to define the style in', () => {
    const doc = `<w:body>${wsp('<a:ln w="1"/>')}</w:body>`;
    expect(markTextBoxes(doc, '')).toEqual({ documentXml: doc, stylesXml: '' });
  });

  it('wraps each run of box paragraphs in a one-cell table and keeps their alignment', () => {
    const html = '<p>Trước</p><p class="fx-box">Một</p><p class="fx-box align-center">Hai</p><p>Sau</p>';
    expect(boxTextBoxes(html)).toBe('<p>Trước</p><table><tbody><tr><td><p>Một</p><p style="text-align: center">Hai</p></td></tr></tbody></table><p>Sau</p>');
    expect(boxTextBoxes('<p>Không có</p>')).toBe('<p>Không có</p>');
  });
});

describe('a .docx with a framed text box', () => {
  async function docxWith(body: string): Promise<File> {
    const zip = new JSZip();
    zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>');
    zip.file('_rels/.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
    zip.file('word/_rels/document.xml.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
    zip.file('word/styles.xml', `<?xml version="1.0" encoding="UTF-8"?><w:styles ${NS}></w:styles>`);
    zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8"?><w:document ${NS}><w:body>${body}</w:body></w:document>`);
    return new File([await zip.generateAsync({ type: 'arraybuffer' })], 'hop.docx');
  }

  // As Word writes it: the DrawingML shape in mc:Choice, a VML copy in mc:Fallback (which mammoth reads).
  const anchored = (shape: string, vmlAttributes = '') =>
    `<w:p><w:r><mc:AlternateContent><mc:Choice Requires="wps"><w:drawing><wp:anchor behindDoc="0"><wp:extent cx="1905000" cy="952500"/><wp:wrapSquare wrapText="bothSides"/><wp:docPr id="1" name="Box"/><a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">${shape}</a:graphicData></a:graphic></wp:anchor></w:drawing></mc:Choice><mc:Fallback><w:pict><v:shape id="b" ${vmlAttributes}><v:textbox><w:txbxContent><w:p><w:r><w:t>Trong hộp</w:t></w:r></w:p></w:txbxContent></v:textbox></v:shape></w:pict></mc:Fallback></mc:AlternateContent></w:r><w:r><w:t>Đoạn giữ hộp</w:t></w:r></w:p>`;

  it('imports a framed box as a one-cell table after the paragraph that holds it', async () => {
    const out = await importDocument(await docxWith(`<w:p><w:r><w:t>Trước</w:t></w:r></w:p>${anchored(wsp('<a:ln w="9525"/>'))}`));
    expect(out.html).toBe('<p>Trước</p><p>Đoạn giữ hộp</p><table><tbody><tr><td><p>Trong hộp</p></td></tr></tbody></table>');
  });

  it('leaves a box with no line and no fill as plain paragraphs', async () => {
    const out = await importDocument(await docxWith(anchored(wsp('<a:noFill/><a:ln><a:noFill/></a:ln>'), 'stroked="f"')));
    expect(out.html).toBe('<p>Đoạn giữ hộp</p><p>Trong hộp</p>');
  });
});
