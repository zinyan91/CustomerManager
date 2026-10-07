// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { MAX_WORD_CHARS, docxToText, documentXmlToText, fileToWordAttachment, isDocxFile, isLegacyDocFile } from '../wordText';

const p = (text: string) => `<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`;
const cell = (...paras: string[]) => `<w:tc><w:tcPr><w:tcW w:w="1"/></w:tcPr>${paras.map(p).join('')}</w:tc>`;
const row = (...cells: string[]) => `<w:tr><w:trPr/>${cells.join('')}</w:tr>`;
const body = (inner: string) => `<?xml version="1.0"?><w:document><w:body>${inner}</w:body></w:document>`;

async function buildDocx(documentXml: string | null, name = 'to-trinh.docx'): Promise<File> {
  const { ZipWriter, BlobWriter, TextReader } = await import('@zip.js/zip.js');
  const writer = new ZipWriter(new BlobWriter('application/zip'));
  await writer.add('[Content_Types].xml', new TextReader('<Types/>'));
  if (documentXml !== null) await writer.add('word/document.xml', new TextReader(documentXml));
  return new File([await writer.close()], name);
}

describe('isDocxFile / isLegacyDocFile', () => {
  it('phân biệt .docx và .doc cũ, không phân biệt hoa thường', () => {
    expect(isDocxFile({ name: 'a.DOCX' })).toBe(true);
    expect(isDocxFile({ name: 'a.doc' })).toBe(false);
    expect(isLegacyDocFile({ name: 'a.doc' })).toBe(true);
    expect(isLegacyDocFile({ name: 'a.docx' })).toBe(false);
    expect(isLegacyDocFile({ name: 'adoc' })).toBe(false);
  });
});

describe('documentXmlToText', () => {
  it('mỗi đoạn một dòng, gộp các đoạn chữ nhỏ trong cùng đoạn', () => {
    const xml = body('<w:p><w:r><w:t>TỜ TRÌNH </w:t></w:r><w:r><w:t xml:space="preserve">TÍN DỤNG</w:t></w:r></w:p>' + p('Kính gửi: Hội đồng tín dụng'));
    expect(documentXmlToText(xml)).toBe('TỜ TRÌNH TÍN DỤNG\nKính gửi: Hội đồng tín dụng');
  });

  it('bỏ đoạn trống, giải mã ký tự đặc biệt', () => {
    const xml = body(p('A &amp; B &lt;C&gt; &#8211; &quot;D&quot;') + '<w:p/>' + p('   ') + p('Hết'));
    expect(documentXmlToText(xml)).toBe('A & B <C> – "D"\nHết');
  });

  it('bảng thành mỗi hàng một dòng, các ô cách nhau bằng dấu gạch đứng', () => {
    const xml = body(p('Thông tin khách hàng') + `<w:tbl>${row(cell('Họ tên'), cell('Nguyễn Văn An'))}${row(cell('CIF'), cell('12345678'))}</w:tbl>` + p('Hết'));
    expect(documentXmlToText(xml)).toBe('Thông tin khách hàng\nHọ tên | Nguyễn Văn An\nCIF | 12345678\nHết');
  });

  it('nhiều đoạn trong một ô gộp thành một dòng; ô trống vẫn giữ vị trí cột', () => {
    const xml = body(`<w:tbl>${row(cell('Địa chỉ', '12 Lê Lợi'), cell(), cell('Q1'))}</w:tbl>`);
    expect(documentXmlToText(xml)).toBe('Địa chỉ 12 Lê Lợi |  | Q1');
  });

  it('bảng lồng nhau được gộp vào ô chứa nó, không làm vỡ các hàng ngoài', () => {
    const inner = `<w:tbl>${row(cell('a'), cell('b'))}</w:tbl>`;
    const xml = body(`<w:tbl>${row(`<w:tc>${inner}<w:p><w:r><w:t>sau</w:t></w:r></w:p></w:tc>`, cell('X'))}${row(cell('Y'), cell('Z'))}</w:tbl>`);
    expect(documentXmlToText(xml).split('\n')).toEqual(['a | b sau | X', 'Y | Z']);
  });

  it('hàng toàn ô trống bị bỏ', () => {
    expect(documentXmlToText(body(`<w:tbl>${row(cell(), cell())}</w:tbl>` + p('x')))).toBe('x');
  });

  it('tab và xuống dòng mềm không dính chữ vào nhau', () => {
    const xml = body('<w:p><w:r><w:t>Số</w:t><w:tab/><w:t>12</w:t><w:br/><w:t>dòng 2</w:t></w:r></w:p>');
    expect(documentXmlToText(xml)).toBe('Số\t12 dòng 2');
  });

  it('không nhầm các thẻ có tên bắt đầu giống (w:tbl, w:tblPr, w:tcPr, w:trPr)', () => {
    const xml = body(`<w:tbl><w:tblPr/><w:tblGrid/>${row(cell('1'), cell('2'))}</w:tbl>`);
    expect(documentXmlToText(xml)).toBe('1 | 2');
  });
});

describe('docxToText', () => {
  it('đọc chữ trong tệp .docx thật', async () => {
    const file = await buildDocx(body(p('Số hiệu: 2753/TTr') + `<w:tbl>${row(cell('Giá trị'), cell('2.500.000.000'))}</w:tbl>`));
    const out = await docxToText(file);
    expect(out.text).toBe('Số hiệu: 2753/TTr\nGiá trị | 2.500.000.000');
    expect(out.truncated).toBe(false);
  });

  it('quá dài thì cắt và báo đã cắt', async () => {
    const out = await docxToText(await buildDocx(body(p('x'.repeat(500)))), 100);
    expect(out.truncated).toBe(true);
    expect(out.text).toHaveLength(100);
  });

  it('tệp ZIP không có word/document.xml thì báo không phải Word', async () => {
    await expect(docxToText(await buildDocx(null))).rejects.toThrow(/không phải tệp Word/);
  });

  it('tài liệu chỉ có ảnh (không có chữ) thì báo rõ', async () => {
    await expect(docxToText(await buildDocx(body('<w:p><w:r><w:drawing/></w:r></w:p>')))).rejects.toThrow(/không có chữ/);
  });
});

describe('fileToWordAttachment', () => {
  it('thành tệp đính kèm dạng chữ, không có base64', async () => {
    const att = await fileToWordAttachment(await buildDocx(body(p('Nội dung'))));
    expect(att).toMatchObject({ name: 'to-trinh.docx', base64Data: '', textData: 'Nội dung' });
    expect(att.id).toMatch(/^word_/);
  });

  it('.doc cũ thì hướng dẫn lưu lại thành .docx hoặc PDF', async () => {
    await expect(fileToWordAttachment(new File(['x'], 'cu.doc'))).rejects.toThrow(/định dạng cũ \(\.doc\).*\.docx hoặc PDF/);
  });

  it('tệp hỏng thì báo lỗi nêu tên tệp', async () => {
    await expect(fileToWordAttachment(new File(['không phải zip'], 'hong.docx'))).rejects.toThrow(/Không đọc được tệp Word "hong\.docx"/);
  });

  it('quá cỡ thì báo giới hạn', async () => {
    const big = { name: 'to.docx', size: 999 * 1024 * 1024 } as unknown as File;
    await expect(fileToWordAttachment(big)).rejects.toThrow(/vượt quá dung lượng tối đa/);
  });

  it('có ghi chú cho AI khi bị cắt', async () => {
    const att = await fileToWordAttachment(await buildDocx(body(Array.from({ length: 4000 }, (_, i) => p(`đoạn số ${i} khá dài để vượt giới hạn ký tự`)).join(''))));
    expect(att.textData).toContain('Đã cắt bớt');
    expect((att.textData ?? '').length).toBeLessThan(MAX_WORD_CHARS + 300);
  });
});
