import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { convertDocx } from '../writer/services/docxImportService';

async function pack(body: string): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file('_rels/.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file('word/document.xml', `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:wp="x" xmlns:a="y" xmlns:wps="z"><w:body>${body}</w:body></w:document>`);
  return zip.generateAsync({ type: 'arraybuffer' });
}

const line = (cx: number) => `<w:p><w:r><w:t>Tiêu đề</w:t></w:r><w:r><w:drawing><wp:anchor><a:graphic><a:graphicData><wps:wsp><wps:spPr><a:xfrm><a:ext cx="${cx}" cy="0"/></a:xfrm><a:prstGeom prst="line"/></wps:spPr></wps:wsp></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r></w:p><w:p><w:r><w:t>sau</w:t></w:r></w:p>`;

describe('a line drawn as a shape', () => {
  it('comes through as a horizontal rule after its paragraph', async () => {
    expect((await convertDocx(await pack(line(5_000_000)))).html).toMatch(/Tiêu đề<\/p><hr \/><p>sau/);
  });

  it('is not turned into one when it is short', async () => {
    expect((await convertDocx(await pack(line(500_000)))).html).not.toContain('<hr');
  });
});
