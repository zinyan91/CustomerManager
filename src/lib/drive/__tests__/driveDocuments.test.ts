import { describe, expect, it, vi } from 'vitest';
import { entriesToDocuments, fetchDriveDocBlob, withDocumentType } from '../driveDocuments';
import { DriveApiError } from '../driveErrors';
import type { DriveContext, DriveEntry } from '../driveTypes';

const entry = (over: Partial<DriveEntry>): DriveEntry => ({
  id: 'F1', name: 'a.pdf', path: 'VB/a.pdf', isFolder: false, size: 1024, modifiedTime: '2026-10-07T01:00:00Z', mimeType: 'application/pdf', nativeMimeType: '', ...over,
});

describe('entriesToDocuments', () => {
  it('chỉ lấy tệp, bỏ thư mục; điền đủ vị trí, nhà cung cấp, mã tệp', () => {
    const docs = entriesToDocuments([entry({ id: 'D', isFolder: true, name: 'VB', path: 'VB' }), entry({})], 'ROOT', 'now');
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({
      id: 'drive_F1', title: 'a.pdf', documentNumber: 'a', fileName: 'a.pdf', fileSize: 1024, fileType: 'application/pdf', filePath: 'VB/a.pdf',
      folderPath: 'VB', repoId: 'ROOT', storageProvider: 'drive', fileId: 'F1', updatedAt: '2026-10-07T01:00:00Z', issuer: 'Kho lưu trữ',
    });
    expect(docs[0].nativeMimeType).toBeUndefined();
  });

  it('tệp ở gốc kho có thư mục rỗng', () => {
    expect(entriesToDocuments([entry({ path: 'goc.pdf' })], 'R', 'now')[0].folderPath).toBe('');
  });

  it('tệp Google Docs nhớ kiểu gốc để xuất khi tải', () => {
    const [d] = entriesToDocuments([entry({ nativeMimeType: 'application/vnd.google-apps.document', name: 'B.docx', path: 'B.docx' })], 'R', 'now');
    expect(d.nativeMimeType).toBe('application/vnd.google-apps.document');
  });

  it('thiếu ngày sửa thì dùng thời điểm nạp', () => {
    expect(entriesToDocuments([entry({ modifiedTime: '' })], 'R', 'NOW')[0].updatedAt).toBe('NOW');
  });
});

describe('withDocumentType', () => {
  it('giữ kiểu cụ thể Drive đã trả', () => {
    const b = new Blob(['x'], { type: 'application/pdf' });
    expect(withDocumentType(b, 'a.bin')).toBe(b);
  });
  it('octet-stream hay rỗng thì đoán theo đuôi', () => {
    expect(withDocumentType(new Blob(['x'], { type: 'application/octet-stream' }), 'a.pdf').type).toBe('application/pdf');
    expect(withDocumentType(new Blob(['x']), 'a.PNG').type).toBe('image/png');
  });
  it('đuôi lạ thì giữ nguyên', () => {
    const b = new Blob(['x']);
    expect(withDocumentType(b, 'a.xyz')).toBe(b);
  });
});

describe('fetchDriveDocBlob', () => {
  const ctxOf = (res: Response | Error): DriveContext => ({
    getAccess: async () => ({ accessToken: 't', expiresAt: Date.now() + 3_600_000, access: 'read', driveId: 'D' }),
    invalidate: () => {},
    fetchFn: vi.fn(async () => {
      if (res instanceof Error) throw res;
      return res;
    }) as unknown as typeof fetch,
    sleep: async () => {},
  });

  it('tải tệp và gắn kiểu theo đuôi', async () => {
    const blob = await fetchDriveDocBlob(ctxOf(new Response('abc', { headers: { 'Content-Type': 'application/octet-stream' } })), { fileId: 'F1', fileName: 'a.pdf' });
    expect(blob.type).toBe('application/pdf');
    expect(await blob.text()).toBe('abc');
  });

  it('thiếu mã tệp thì báo rõ, không gọi mạng', async () => {
    const ctx = ctxOf(new Response('x'));
    await expect(fetchDriveDocBlob(ctx, { fileName: 'a.pdf' })).rejects.toThrow(/thiếu mã tệp Google Drive/);
    expect(ctx.fetchFn).not.toHaveBeenCalled();
  });

  it('lỗi Drive thành thông điệp tiếng Việt nêu tên tệp', async () => {
    const body = JSON.stringify({ error: { code: 404, message: 'x', errors: [{ reason: 'notFound' }] } });
    await expect(fetchDriveDocBlob(ctxOf(new Response(body, { status: 404 })), { fileId: 'F1', fileName: 'a.pdf' })).rejects.toThrow(/Tải "a\.pdf" không được: không tìm thấy/);
    expect(new DriveApiError(404, 'notFound', 'x').status).toBe(404);
  });

  it('lỗi mạng cũng thành thông điệp tiếng Việt', async () => {
    await expect(fetchDriveDocBlob(ctxOf(new TypeError('Failed to fetch')), { fileId: 'F1', fileName: 'a.pdf' })).rejects.toThrow(/không kết nối được tới Google Drive/);
  });
});
