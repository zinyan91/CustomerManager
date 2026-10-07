import { describe, it, expect } from 'vitest';
import {
  normalizeRelativePath,
  itemsFromFileList,
  itemsFromDataTransfer,
  topLevelNames,
} from '../uploadItems';

const file = (name: string, size = 1, rel?: string): File => {
  const f = new File([new Uint8Array(size)], name);
  if (rel !== undefined) Object.defineProperty(f, 'webkitRelativePath', { value: rel });
  return f;
};

describe('normalizeRelativePath', () => {
  it('đổi gạch ngược, bỏ đoạn rỗng, "." và ".."', () => {
    expect(normalizeRelativePath('a\\b//c.pdf')).toBe('a/b/c.pdf');
    expect(normalizeRelativePath('/../../etc/passwd')).toBe('etc/passwd');
    expect(normalizeRelativePath('./a/./b')).toBe('a/b');
    expect(normalizeRelativePath('  a / b ')).toBe('a/b');
    expect(normalizeRelativePath('..')).toBe('');
  });
});

describe('itemsFromFileList', () => {
  it('tệp rời dùng tên tệp, folder dùng webkitRelativePath', () => {
    const items = itemsFromFileList([file('a.zip'), file('b.pdf', 1, 'HoSo/2026/b.pdf')]);
    expect(items.map((i) => i.relativePath)).toEqual(['a.zip', 'HoSo/2026/b.pdf']);
  });

  it('không loại tệp nào theo định dạng: ảnh, tệp nén, exe đều được tải lên', () => {
    const names = ['a.png', 'b.gif', 'c.zip', 'd.rar', 'e.7z', 'f.exe', 'g.msi', 'h.iso', 'khong-duoi'];
    expect(itemsFromFileList(names.map((n) => file(n))).map((i) => i.relativePath)).toEqual(names);
  });

  it('bỏ tệp rác của hệ điều hành và thư mục .git', () => {
    const items = itemsFromFileList([
      file('.DS_Store'),
      file('Thumbs.db'),
      file('config', 1, 'proj/.git/config'),
      file('ok.txt', 1, 'proj/ok.txt'),
    ]);
    expect(items.map((i) => i.relativePath)).toEqual(['proj/ok.txt']);
  });

  it('chặn đường dẫn thoát thư mục đích', () => {
    const items = itemsFromFileList([file('x.txt', 1, '../../x.txt')]);
    expect(items[0].relativePath).toBe('x.txt');
  });
});

// ---- giả lập File System Access API ----
const fileEntry = (name: string, f: File) => ({
  isFile: true,
  isDirectory: false,
  name,
  file: (ok: (f: File) => void) => ok(f),
});

const dirEntry = (name: string, children: unknown[], pageSize = 2) => ({
  isFile: false,
  isDirectory: true,
  name,
  createReader: () => {
    let i = 0;
    return {
      readEntries: (ok: (e: unknown[]) => void) => {
        const page = children.slice(i, i + pageSize);
        i += pageSize;
        ok(page);
      },
    };
  },
});

const dtOf = (entries: unknown[], loose: File[] = []) =>
  ({
    items: [
      ...entries.map((e) => ({ kind: 'file', webkitGetAsEntry: () => e, getAsFile: () => null })),
      ...loose.map((f) => ({ kind: 'file', webkitGetAsEntry: () => null, getAsFile: () => f })),
    ],
    files: [],
  }) as unknown as DataTransfer;

describe('itemsFromDataTransfer', () => {
  it('duyệt đệ quy folder, đọc hết các đợt readEntries', async () => {
    const tree = dirEntry('HoSo', [
      fileEntry('a.pdf', file('a.pdf')),
      fileEntry('b.pdf', file('b.pdf')),
      fileEntry('c.pdf', file('c.pdf')),
      dirEntry('2026', [fileEntry('d.docx', file('d.docx')), fileEntry('.DS_Store', file('.DS_Store'))]),
    ]);
    const items = await itemsFromDataTransfer(dtOf([tree]));
    expect(items.map((i) => i.relativePath).sort()).toEqual([
      'HoSo/2026/d.docx',
      'HoSo/a.pdf',
      'HoSo/b.pdf',
      'HoSo/c.pdf',
    ]);
  });

  it('gộp tệp rời và folder trong cùng một lần thả', async () => {
    const items = await itemsFromDataTransfer(
      dtOf([dirEntry('F', [fileEntry('x.txt', file('x.txt'))])], [file('nen.zip')])
    );
    expect(items.map((i) => i.relativePath).sort()).toEqual(['F/x.txt', 'nen.zip']);
  });

  it('trình duyệt không có entry API: dùng danh sách files phẳng', async () => {
    const dt = { items: [], files: [file('a.zip')] } as unknown as DataTransfer;
    expect((await itemsFromDataTransfer(dt)).map((i) => i.relativePath)).toEqual(['a.zip']);
  });

  it('thả không có gì thì trả rỗng', async () => {
    expect(await itemsFromDataTransfer({ items: [], files: [] } as unknown as DataTransfer)).toEqual([]);
  });
});


describe('topLevelNames', () => {
  it('lấy đoạn đầu không trùng', () => {
    const its = [
      { file: file('a'), relativePath: 'F/a' },
      { file: file('b'), relativePath: 'F/x/b' },
      { file: file('c'), relativePath: 'c.zip' },
    ];
    expect(topLevelNames(its)).toEqual(['F', 'c.zip']);
  });
});
