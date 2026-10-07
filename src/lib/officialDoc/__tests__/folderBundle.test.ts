import { describe, expect, it } from 'vitest';
import { isAppendixName, pickMainFile, planFolderBundle, readableFiles, splitDroppedItems } from '../folderBundle';

const file = (name: string, type = 'application/pdf') => new File(['x'], name, { type });
const names = (files: File[]) => files.map((f) => f.name);

// Thư mục thật trong Kho: 1 văn bản + biểu mẫu BM + 6 phụ lục
const REAL = [
  '2097-2026-TB-TGĐ.pdf', 'BM - 2097-2026-TB-TGĐ.pdf', 'PL1 - 2097-2026-TB-TGĐ.pdf', 'PL2 - 2097-2026-TB-TGĐ.pdf',
  'PL3 - 2097-2026-TB-TGĐ.pdf', 'PL4 - 2097-2026-TB-TGĐ.pdf', 'PL5 - 2097-2026-TB-TGĐ.pdf', 'PL6 - 2097-2026-TB-TGĐ.pdf',
].map((n) => file(n));

describe('isAppendixName', () => {
  it.each([
    'PL1 - 2097-2026-TB-TGĐ.pdf', 'pl2.pdf', 'PL 3.pdf', 'BM - 2097-2026.pdf', 'BM.pdf', 'Phụ lục 1.pdf', 'PHU LUC.pdf',
    'Phụ lục số 1.pdf', 'Biểu mẫu 01.pdf', 'bieu mau.pdf', 'PL_1.pdf', 'PL10-abc.pdf',
  ])('%s là phụ lục', (n) => expect(isAppendixName(n)).toBe(true));

  it.each([
    '2097-2026-TB-TGĐ.pdf', 'Thông báo triển khai.pdf', 'Plan 2026.pdf', 'Blueprint.pdf', 'Placement.pdf', 'bmw.pdf', 'Quyết định 12.pdf',
  ])('%s không phải phụ lục', (n) => expect(isAppendixName(n)).toBe(false));
});

describe('pickMainFile', () => {
  it('thư mục thật: chọn tệp trùng số hiệu, không phải BM hay PL', () => {
    expect(pickMainFile(REAL)?.name).toBe('2097-2026-TB-TGĐ.pdf');
  });
  it('không phụ thuộc thứ tự tệp', () => {
    expect(pickMainFile([...REAL].reverse())?.name).toBe('2097-2026-TB-TGĐ.pdf');
  });
  it('nhiều tệp không phải phụ lục thì ưu tiên tên có số hiệu', () => {
    expect(pickMainFile([file('Tờ trình kèm theo.pdf'), file('1234-2026-QD.pdf')])?.name).toBe('1234-2026-QD.pdf');
  });
  it('không có số hiệu thì chọn tên ngắn nhất', () => {
    expect(pickMainFile([file('Thông báo triển khai mô hình.pdf'), file('Thông báo.pdf')])?.name).toBe('Thông báo.pdf');
  });
  it('chỉ toàn tên phụ lục thì vẫn chọn một tệp', () => {
    expect(pickMainFile([file('PL2.pdf'), file('PL1.pdf')])?.name).toBe('PL1.pdf');
  });
  it('không có tệp thì null', () => {
    expect(pickMainFile([])).toBeNull();
  });
});

describe('planFolderBundle', () => {
  it('thư mục thật: 1 tệp chính, 7 phụ lục theo thứ tự tự nhiên', () => {
    const plan = planFolderBundle('2093-2026-tb-tgd', REAL)!;
    expect(plan.main.name).toBe('2097-2026-TB-TGĐ.pdf');
    expect(names(plan.appendices)).toEqual([
      'BM - 2097-2026-TB-TGĐ.pdf', 'PL1 - 2097-2026-TB-TGĐ.pdf', 'PL2 - 2097-2026-TB-TGĐ.pdf', 'PL3 - 2097-2026-TB-TGĐ.pdf',
      'PL4 - 2097-2026-TB-TGĐ.pdf', 'PL5 - 2097-2026-TB-TGĐ.pdf', 'PL6 - 2097-2026-TB-TGĐ.pdf',
    ]);
    expect(plan.others).toEqual([]);
  });

  it('PL10 đứng sau PL2 (sắp xếp theo số, không theo chữ)', () => {
    const plan = planFolderBundle('x', [file('1-2026-a.pdf'), file('PL10.pdf'), file('PL2.pdf'), file('PL1.pdf')])!;
    expect(names(plan.appendices)).toEqual(['PL1.pdf', 'PL2.pdf', 'PL10.pdf']);
  });

  it('ảnh cũng là tệp AI đọc được; Word, Excel, ZIP thành biểu mẫu đi kèm', () => {
    const docx = file('mau.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    const xlsx = file('bang.xlsx', 'application/vnd.ms-excel');
    const zip = file('bo.zip', 'application/zip');
    const scan = file('scan.jpg', 'image/jpeg');
    const plan = planFolderBundle('x', [file('12-2026-qd.pdf'), scan, docx, xlsx, zip])!;
    expect(plan.main.name).toBe('12-2026-qd.pdf');
    expect(names(plan.appendices)).toEqual(['scan.jpg']);
    expect(names(plan.others)).toEqual(['mau.docx', 'bang.xlsx', 'bo.zip']);
  });

  it('người dùng đổi tệp chính thì tệp cũ thành phụ lục', () => {
    const pl3 = REAL[4];
    const plan = planFolderBundle('x', REAL, pl3)!;
    expect(plan.main).toBe(pl3);
    expect(names(plan.appendices)).toContain('2097-2026-TB-TGĐ.pdf');
    expect(names(plan.appendices)).not.toContain('PL3 - 2097-2026-TB-TGĐ.pdf');
  });

  it('tệp chính chỉ định không thuộc thư mục thì tự chọn lại', () => {
    expect(planFolderBundle('x', REAL, file('la.pdf'))!.main.name).toBe('2097-2026-TB-TGĐ.pdf');
  });

  it('thư mục không có PDF hay ảnh thì không lập được', () => {
    expect(planFolderBundle('x', [file('a.docx', 'application/msword'), file('b.zip', 'application/zip')])).toBeNull();
    expect(planFolderBundle('x', [])).toBeNull();
  });

  it('thư mục chỉ một tệp thì không có phụ lục', () => {
    const plan = planFolderBundle('x', [file('a.pdf')])!;
    expect(plan.main.name).toBe('a.pdf');
    expect(plan.appendices).toEqual([]);
  });
});

describe('readableFiles', () => {
  it('lấy PDF và ảnh', () => {
    expect(names(readableFiles([file('a.pdf'), file('b.png', 'image/png'), file('c.docx', 'application/msword')]))).toEqual(['a.pdf', 'b.png']);
  });
});

describe('splitDroppedItems', () => {
  const item = (relativePath: string) => ({ file: file(relativePath.split('/').pop()!), relativePath });

  it('gom theo thư mục gốc, gồm cả thư mục con', () => {
    const { folders, loose } = splitDroppedItems([item('VB/a.pdf'), item('VB/phu-luc/b.pdf'), item('rieng.pdf')]);
    expect(folders).toHaveLength(1);
    expect(folders[0].name).toBe('VB');
    expect(names(folders[0].files)).toEqual(['a.pdf', 'b.pdf']);
    expect(names(loose)).toEqual(['rieng.pdf']);
  });

  it('nhiều thư mục thì tách riêng từng thư mục', () => {
    const { folders } = splitDroppedItems([item('A/1.pdf'), item('B/2.pdf'), item('A/3.pdf')]);
    expect(folders.map((f) => [f.name, names(f.files)])).toEqual([['A', ['1.pdf', '3.pdf']], ['B', ['2.pdf']]]);
  });

  it('chỉ có tệp rời thì không có thư mục', () => {
    expect(splitDroppedItems([item('a.pdf')]).folders).toEqual([]);
  });
});
