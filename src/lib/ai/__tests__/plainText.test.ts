import { describe, it, expect } from 'vitest';
import { MAX_PLAIN_TEXT_CHARS, fileToPlainTextAttachment, isPlainTextFile } from '../plainText';

describe('isPlainTextFile', () => {
  it('nhận XML, TXT, JSON, MD, HTML, LOG, TSV; không nhận PDF, ZIP, Word', () => {
    for (const n of ['a.xml', 'A.TXT', 'b.json', 'c.md', 'd.html', 'd.htm', 'e.log', 'f.tsv']) expect(isPlainTextFile({ name: n }), n).toBe(true);
    for (const n of ['a.pdf', 'b.zip', 'c.docx', 'd.xlsx', 'xml']) expect(isPlainTextFile({ name: n }), n).toBe(false);
  });
});

describe('fileToPlainTextAttachment', () => {
  it('đọc nguyên văn thành textData, bỏ BOM', async () => {
    const f = new File(['\uFEFF<a>Xin chào</a>'], 'k.xml', { type: 'text/xml' });
    const att = await fileToPlainTextAttachment(f);
    expect(att.textData).toBe('<a>Xin chào</a>');
    expect(att).toMatchObject({ name: 'k.xml', mimeType: 'text/plain', base64Data: '' });
  });

  it('quá dài thì cắt và dặn AI nói rõ với người dùng', async () => {
    const att = await fileToPlainTextAttachment(new File(['x'.repeat(MAX_PLAIN_TEXT_CHARS + 10)], 'd.txt'));
    expect(att.textData).toContain('Đã cắt bớt');
    expect(att.textData!.startsWith('x'.repeat(MAX_PLAIN_TEXT_CHARS))).toBe(true);
  });

  it('tệp rỗng hoặc không phải UTF-8 thì báo lỗi tiếng Việt nêu tên tệp', async () => {
    await expect(fileToPlainTextAttachment(new File(['  '], 'r.txt'))).rejects.toThrow(/"r\.txt" không có nội dung/);
    await expect(fileToPlainTextAttachment(new File([new Uint8Array([0xff, 0xfe, 0xfa])], 'b.xml'))).rejects.toThrow(/"b\.xml".*UTF-8/);
  });
});
