import { describe, it, expect } from 'vitest';
import type { DispatchDocument } from '../../../types/dispatch';
import {
  planFolderZip,
  sanitizeZipName,
  suggestedZipFileName,
  chooseSinkMode,
  FolderZipError,
  MAX_ZIP_ENTRIES,
  MAX_BUFFERED_ZIP_BYTES,
} from '../folderZipPlan';

const doc = (filePath: string, fileSize = 100, updatedAt = '2026-10-01T00:00:00Z'): DispatchDocument => ({
  id: filePath,
  documentNumber: '',
  title: filePath,
  documentType: 'khac',
  issuer: '',
  documentDate: '',
  receivedDate: '',
  customerId: null,
  fileName: filePath.split('/').pop()!,
  fileSize,
  fileType: 'application/pdf',
  fileUrl: '',
  filePath,
  folderPath: filePath.split('/').slice(0, -1).join('/'),
  storageProvider: 'huggingface',
  createdAt: '',
  updatedAt,
});

const DOCS = [
  doc('goc.pdf', 1),
  doc('MY HUE/a.pdf', 10),
  doc('MY HUE/2026/c.pdf', 30),
  doc('MY HUE-2/z.pdf', 99),
  doc('Tài Liệu/x.md', 5),
];

describe('sanitizeZipName', () => {
  it('thay ký tự cấm bằng gạch ngang và rút gọn khoảng trắng', () => {
    expect(sanitizeZipName('a/b\\c:d*e?f"g<h>i|j')).toBe('a-b-c-d-e-f-g-h-i-j');
    expect(sanitizeZipName('  nhiều   khoảng  trắng ')).toBe('nhiều khoảng trắng');
  });

  it('bỏ dấu chấm đầu và cuối, tên rỗng thì có tên mặc định', () => {
    expect(sanitizeZipName('..ẩn.')).toBe('ẩn');
    expect(sanitizeZipName('...')).toBe('tai-lieu');
    expect(sanitizeZipName('')).toBe('tai-lieu');
  });

  it('giới hạn độ dài', () => {
    expect(sanitizeZipName('a'.repeat(500)).length).toBeLessThanOrEqual(120);
  });

  it('thêm đuôi .zip', () => {
    expect(suggestedZipFileName('MY HUE')).toBe('MY HUE.zip');
  });
});

describe('planFolderZip', () => {
  it('chỉ lấy tệp ở mọi cấp bên dưới thư mục, giữ cấu trúc, gói trong thư mục gốc', () => {
    const plan = planFolderZip(DOCS, 'MY HUE', 'Kho');
    expect(plan.entries.map((e) => e.zipPath)).toEqual(['MY HUE/2026/c.pdf', 'MY HUE/a.pdf']);
    expect(plan.entries.map((e) => e.filePath)).toEqual(['MY HUE/2026/c.pdf', 'MY HUE/a.pdf']);
    expect(plan.totalBytes).toBe(40);
    expect(plan.fileName).toBe('MY HUE.zip');
  });

  it('không nhận nhầm thư mục có tên bắt đầu giống nhau', () => {
    const plan = planFolderZip(DOCS, 'MY HUE', 'Kho');
    expect(plan.entries.some((e) => e.filePath.startsWith('MY HUE-2'))).toBe(false);
  });

  it('thư mục lồng nhau: tên gốc trong zip là thư mục cuối cùng', () => {
    const plan = planFolderZip(DOCS, 'MY HUE/2026', 'Kho');
    expect(plan.entries.map((e) => e.zipPath)).toEqual(['2026/c.pdf']);
    expect(plan.fileName).toBe('2026.zip');
  });

  it('nén từ gốc repo: dùng nhãn gốc làm tên, lấy mọi tệp', () => {
    const plan = planFolderZip(DOCS, '', 'Kho chung');
    expect(plan.entries).toHaveLength(5);
    expect(plan.entries.every((e) => e.zipPath.startsWith('Kho chung/'))).toBe(true);
    expect(plan.fileName).toBe('Kho chung.zip');
  });

  it('thư mục gốc cấu hình: đường dẫn trong zip tính từ thư mục đang nén', () => {
    const plan = planFolderZip([doc('van-thu/hop-dong/a.pdf'), doc('van-thu/b.pdf')], 'van-thu', 'Văn thư');
    expect(plan.entries.map((e) => e.zipPath)).toEqual(['van-thu/b.pdf', 'van-thu/hop-dong/a.pdf']);
  });

  it('tên thư mục có ký tự cấm được làm sạch ở gốc zip', () => {
    const plan = planFolderZip([doc('a:b/x.pdf')], 'a:b', 'Kho');
    expect(plan.entries[0].zipPath).toBe('a-b/x.pdf');
  });

  it('giữ ngày sửa đổi để zip ghi lại', () => {
    expect(planFolderZip(DOCS, 'Tài Liệu', 'Kho').entries[0].modifiedAt).toBe('2026-10-01T00:00:00Z');
  });

  it('thư mục không có tệp thì báo lỗi rõ ràng', () => {
    expect(() => planFolderZip(DOCS, 'Rong', 'Kho')).toThrow(FolderZipError);
    expect(() => planFolderZip(DOCS, 'Rong', 'Kho')).toThrow(/chưa có tệp/);
    expect(() => planFolderZip([], '', 'Kho')).toThrow(/chưa có tệp/);
  });

  it('vượt giới hạn số tệp thì từ chối', () => {
    const many = Array.from({ length: MAX_ZIP_ENTRIES + 1 }, (_, i) => doc(`f/${i}.txt`, 1));
    expect(() => planFolderZip(many, 'f', 'Kho')).toThrow(/tối đa 5000/);
    expect(planFolderZip(many.slice(0, MAX_ZIP_ENTRIES), 'f', 'Kho').entries).toHaveLength(MAX_ZIP_ENTRIES);
  });

  it('kích thước tệp không hợp lệ thì từ chối thay vì nén sai', () => {
    expect(() => planFolderZip([doc('f/a.pdf', -1)], 'f', 'Kho')).toThrow(/không hợp lệ/);
    expect(() => planFolderZip([doc('f/a.pdf', Number.NaN)], 'f', 'Kho')).toThrow(/không hợp lệ/);
  });

  it('tệp 0 byte vẫn được nén', () => {
    expect(planFolderZip([doc('f/rong.txt', 0)], 'f', 'Kho').entries).toHaveLength(1);
  });
});

describe('chooseSinkMode', () => {
  it('có hộp Lưu thành thì ghi thẳng ra đĩa, bất kể dung lượng', () => {
    expect(chooseSinkMode(true, 10 * 1024 ** 3)).toBe('native');
  });

  it('không có thì gom bộ nhớ nếu nhỏ, từ chối nếu quá giới hạn', () => {
    expect(chooseSinkMode(false, 1024)).toBe('memory');
    expect(chooseSinkMode(false, MAX_BUFFERED_ZIP_BYTES)).toBe('memory');
    expect(chooseSinkMode(false, MAX_BUFFERED_ZIP_BYTES + 1)).toBe('too_large');
  });
});
