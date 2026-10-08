// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { downloadDriveBlob, listDriveFiles } from '../../lib/drive/driveClient';
import { entriesToDocuments } from '../../lib/drive/driveDocuments';
import { buildRepoEntries } from '../../lib/drive/driveTree';
import { createFakeDrive } from '../../lib/drive/__tests__/fakeDrive';
import { archiveFileName, hasExtension, openFromArchive, overwriteInArchive, saveNewToArchive, XLSX_MIME } from '../shared/archive/officeArchive';

const blobOf = (text: string) => new Blob([text], { type: XLSX_MIME });

describe('tên tệp và đuôi', () => {
  it('thêm đuôi một lần, dùng tên mặc định khi tên trống', () => {
    expect(archiveFileName('Báo cáo', 'x', '.xlsx')).toBe('Báo cáo.xlsx');
    expect(archiveFileName('So.XLSX', 'x', '.xlsx')).toBe('So.XLSX');
    expect(archiveFileName('  ', 'Bảng tính không tên', '.xlsx')).toBe('Bảng tính không tên.xlsx');
  });
  it('nhận đuôi không phân biệt hoa thường', () => {
    expect(hasExtension('A.XLSX', ['.xlsx', '.csv'])).toBe(true);
    expect(hasExtension('a.pdf', ['.xlsx', '.csv'])).toBe(false);
  });
});

describe('lưu vào và mở từ Kho lưu trữ', () => {
  it('lưu mới vào thư mục đã có, ghi lại mã và đường dẫn; lưu lần hai ghi đè đúng tệp, không sinh bản thứ hai', async () => {
    const s = createFakeDrive();
    const root = s.seedFolder('Kho');
    const sub = s.seedFolder('Báo cáo', root.id);
    const entries = buildRepoEntries(await listDriveFiles(s.ctx), root.id);
    const link = await saveNewToArchive(
      s.ctx,
      { rootId: root.id, folder: 'Báo cáo', name: 'so.xlsx', existingPaths: entries.map((e) => e.path), folderIds: new Map([['Báo cáo', sub.id]]) },
      blobOf('ban 1'),
    );
    expect(link.path).toBe('Báo cáo/so.xlsx');
    expect(await (await downloadDriveBlob(s.ctx, link.fileId)).text()).toBe('ban 1');

    await overwriteInArchive(s.ctx, link, blobOf('ban 2'));
    expect(await (await downloadDriveBlob(s.ctx, link.fileId)).text()).toBe('ban 2');
    expect(s.byName('so.xlsx')).toHaveLength(1);
  });

  it('trùng tên tệp có sẵn thì lưu thành tệp mới có hậu tố và trả đúng tệp mới', async () => {
    const s = createFakeDrive();
    const root = s.seedFolder('Kho');
    s.seedFile('so.xlsx', root.id, 'cu');
    const entries = buildRepoEntries(await listDriveFiles(s.ctx), root.id);
    const link = await saveNewToArchive(s.ctx, { rootId: root.id, folder: '', name: 'so.xlsx', existingPaths: entries.map((e) => e.path), folderIds: new Map() }, blobOf('moi'));
    expect(link.path).toBe('so-2.xlsx');
    expect(await (await downloadDriveBlob(s.ctx, link.fileId)).text()).toBe('moi');
  });

  it('lưu vào thư mục chưa có thì tạo thư mục', async () => {
    const s = createFakeDrive();
    const root = s.seedFolder('Kho');
    const link = await saveNewToArchive(s.ctx, { rootId: root.id, folder: 'Mới/Con', name: 'a.xlsx', existingPaths: [], folderIds: new Map() }, blobOf('x'));
    expect(link.path).toBe('Mới/Con/a.xlsx');
    expect(s.byName('Con')).toHaveLength(1);
  });

  it('mở tệp trong kho ra File đúng tên, nội dung và liên kết', async () => {
    const s = createFakeDrive();
    const root = s.seedFolder('Kho');
    const file = s.seedFile('thu.docx', root.id, 'noi dung docx', 'application/octet-stream');
    const entries = buildRepoEntries(await listDriveFiles(s.ctx), root.id);
    const doc = entriesToDocuments(entries, root.id, 'now').find((d) => d.fileId === file.id)!;
    const opened = await openFromArchive(s.ctx, doc);
    expect(opened.file.name).toBe('thu.docx');
    expect(await opened.file.text()).toBe('noi dung docx');
    expect(opened.link).toEqual({ rootId: root.id, fileId: file.id, path: 'thu.docx' });
  });

  it('mở tệp không còn thì báo lỗi, không trả File rỗng', async () => {
    const s = createFakeDrive();
    const root = s.seedFolder('Kho');
    const doc = entriesToDocuments(buildRepoEntries([], root.id), root.id, 'now')[0];
    expect(doc).toBeUndefined();
    await expect(openFromArchive(s.ctx, { fileId: 'khong-co', fileName: 'x.docx', repoId: root.id } as never)).rejects.toThrow();
  });
});

describe('liên kết lưu trong nháp', () => {
  it('đọc lại liên kết hợp lệ, bỏ liên kết thiếu mã hoặc sai kiểu', async () => {
    const { parseDriveLink } = await import('../shared/archive/officeArchive');
    expect(parseDriveLink({ rootId: 'r', fileId: 'f', path: 'a/b.xlsx' })).toEqual({ rootId: 'r', fileId: 'f', path: 'a/b.xlsx' });
    expect(parseDriveLink({ rootId: 'r', fileId: 'f' })).toEqual({ rootId: 'r', fileId: 'f', path: '' });
    expect(parseDriveLink({ rootId: '', fileId: 'f' })).toBeNull();
    expect(parseDriveLink({ rootId: 1, fileId: 'f' })).toBeNull();
    expect(parseDriveLink(null)).toBeNull();
    expect(parseDriveLink('x')).toBeNull();
  });
});
