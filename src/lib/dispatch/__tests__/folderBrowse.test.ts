import { describe, it, expect } from 'vitest';
import type { DispatchDocument } from '../../../types/dispatch';
import { browseFolder, stripBase } from '../folderBrowse';

const doc = (filePath: string, size = 100): DispatchDocument => {
  const i = filePath.lastIndexOf('/');
  return {
    id: filePath,
    documentNumber: '',
    title: filePath,
    documentType: 'khac',
    issuer: '',
    documentDate: '',
    receivedDate: '',
    customerId: null,
    fileName: filePath.slice(i + 1),
    fileSize: size,
    fileType: 'application/pdf',
    fileUrl: '',
    filePath,
    folderPath: i === -1 ? '' : filePath.slice(0, i),
    storageProvider: 'drive',
    createdAt: '',
    updatedAt: '',
  };
};

const DOCS = [
  doc('goc.pdf', 10),
  doc('MY HUE/a.pdf', 100),
  doc('MY HUE/b.pdf', 200),
  doc('MY HUE/2026/c.pdf', 300),
  doc('Tài Liệu/x.md', 5),
  doc('Tài Liệu/Sâu/Hơn/y.md', 7),
];

describe('browseFolder', () => {
  it('ở gốc: thư mục con hiện thành thư mục, chỉ tệp nằm trực tiếp hiện thành tệp', () => {
    const r = browseFolder(DOCS, [], '');
    expect(r.files.map((f) => f.fileName)).toEqual(['goc.pdf']);
    expect(r.folders.map((f) => f.name)).toEqual(['MY HUE', 'Tài Liệu']);
  });

  it('thư mục đếm tệp và dung lượng ở mọi cấp bên dưới', () => {
    const r = browseFolder(DOCS, [], '');
    const myHue = r.folders.find((f) => f.name === 'MY HUE')!;
    expect(myHue).toMatchObject({ path: 'MY HUE', fileCount: 3, totalBytes: 600 });
    const tl = r.folders.find((f) => f.name === 'Tài Liệu')!;
    expect(tl).toMatchObject({ fileCount: 2, totalBytes: 12 });
  });

  it('đi vào một thư mục: tệp trực tiếp và thư mục con của nó, không lẫn tệp cấp sâu', () => {
    const r = browseFolder(DOCS, [], 'MY HUE');
    expect(r.files.map((f) => f.fileName)).toEqual(['a.pdf', 'b.pdf']);
    expect(r.folders).toEqual([{ name: '2026', path: 'MY HUE/2026', fileCount: 1, totalBytes: 300 }]);
  });

  it('đi sâu nhiều cấp, đường dẫn thư mục con luôn đầy đủ', () => {
    const r = browseFolder(DOCS, [], 'Tài Liệu');
    expect(r.folders.map((f) => f.path)).toEqual(['Tài Liệu/Sâu']);
    expect(browseFolder(DOCS, [], 'Tài Liệu/Sâu').folders[0].path).toBe('Tài Liệu/Sâu/Hơn');
  });

  it('thư mục lá chỉ có tệp, không có thư mục con', () => {
    const r = browseFolder(DOCS, [], 'MY HUE/2026');
    expect(r.folders).toEqual([]);
    expect(r.files.map((f) => f.fileName)).toEqual(['c.pdf']);
  });

  it('thư mục rỗng (từ HF hoặc mới tạo) vẫn hiện, với 0 tệp', () => {
    const r = browseFolder(DOCS, ['Mới tạo', 'MY HUE/Rỗng', 'Mới tạo/con'], '');
    expect(r.folders.map((f) => f.name)).toEqual(['Mới tạo', 'MY HUE', 'Tài Liệu']);
    expect(r.folders.find((f) => f.name === 'Mới tạo')).toMatchObject({ fileCount: 0, totalBytes: 0 });
    expect(browseFolder(DOCS, ['MY HUE/Rỗng'], 'MY HUE').folders.map((f) => f.name)).toEqual(['2026', 'Rỗng']);
  });

  it('không nhận nhầm thư mục có tên bắt đầu giống nhau', () => {
    const docs = [doc('ab/x.pdf'), doc('abc/y.pdf')];
    expect(browseFolder(docs, [], 'ab').files.map((f) => f.fileName)).toEqual(['x.pdf']);
    expect(browseFolder(docs, [], 'ab').folders).toEqual([]);
  });

  it('tệp thiếu folderPath thì suy từ filePath', () => {
    const d = { ...doc('A/B/c.pdf'), folderPath: undefined };
    expect(browseFolder([d], [], 'A/B').files).toHaveLength(1);
    expect(browseFolder([d], [], 'A').folders[0].name).toBe('B');
  });

  it('sắp xếp tự nhiên theo tên tiếng Việt, số theo giá trị', () => {
    const docs = [doc('f10.pdf'), doc('f2.pdf'), doc('Ấ/x.pdf'), doc('B/x.pdf')];
    const r = browseFolder(docs, [], '');
    expect(r.files.map((f) => f.fileName)).toEqual(['f2.pdf', 'f10.pdf']);
    expect(r.folders.map((f) => f.name)).toEqual(['Ấ', 'B']);
  });

  it('thư mục trống hoặc không có gì thì trả rỗng', () => {
    expect(browseFolder([], [], '')).toEqual({ folders: [], files: [] });
    expect(browseFolder(DOCS, [], 'khong-co')).toEqual({ folders: [], files: [] });
  });

  it('chuẩn hóa gạch chéo thừa ở thư mục hiện tại', () => {
    expect(browseFolder(DOCS, [], '/MY HUE/').files).toHaveLength(2);
  });
});

describe('stripBase', () => {
  it('tính đường dẫn tương đối so với gốc', () => {
    expect(stripBase('van-thu/a/b.pdf', 'van-thu')).toBe('a/b.pdf');
    expect(stripBase('van-thu', 'van-thu')).toBe('');
    expect(stripBase('a/b', '')).toBe('a/b');
    expect(stripBase('/a/b/', '')).toBe('a/b');
  });

  it('nằm ngoài gốc hoặc chỉ trùng tiền tố thì null', () => {
    expect(stripBase('khac/a', 'van-thu')).toBeNull();
    expect(stripBase('van-thu-2/a', 'van-thu')).toBeNull();
  });
});
