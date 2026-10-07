import { describe, expect, it } from 'vitest';
import { fileKindOf, isReadableByAi } from '../fileKinds';

describe('fileKindOf', () => {
  it.each([
    ['anh.PNG', 'image'], ['anh.jpg', 'image'], ['anh.jpeg', 'image'], ['anh.gif', 'image'], ['anh.webp', 'image'],
    ['anh.bmp', 'image'], ['logo.svg', 'image'], ['anh.avif', 'image'],
    ['bao-cao.pdf', 'pdf'], ['BAO-CAO.PDF', 'pdf'],
    ['ho-so.zip', 'archive'], ['ho-so.RAR', 'archive'], ['ho-so.7z', 'archive'], ['a.tar', 'archive'], ['a.gz', 'archive'], ['a.tgz', 'archive'],
    ['setup.exe', 'executable'], ['setup.MSI', 'executable'],
    ['to-trinh.docx', 'other'], ['bang.xlsx', 'other'], ['khong-duoi', 'other'], ['.gitignore', 'other'],
  ])('%s → %s', (name, kind) => expect(fileKindOf(name, '')).toBe(kind));

  it('đuôi không rõ thì dùng kiểu MIME của tệp', () => {
    expect(fileKindOf('chup-man-hinh', 'image/png')).toBe('image');
    expect(fileKindOf('tai-lieu', 'application/pdf')).toBe('pdf');
  });

  it('chỉ lấy đuôi cuối: ho-so.exe.zip là tệp nén', () => {
    expect(fileKindOf('ho-so.exe.zip')).toBe('archive');
  });
});

describe('isReadableByAi', () => {
  it('tệp nén và tệp chạy không đưa cho AI', () => {
    expect(isReadableByAi('archive')).toBe(false);
    expect(isReadableByAi('executable')).toBe(false);
  });
  it('ảnh, PDF và tài liệu khác vẫn đưa được', () => {
    for (const k of ['image', 'pdf', 'other'] as const) expect(isReadableByAi(k)).toBe(true);
  });
});
