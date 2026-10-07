import { describe, it, expect } from 'vitest';
import { HfApiError } from '../hfClient';
import { classifyArchiveError, archiveStatusMessage, type ArchiveStatus } from '../hfStatus';

describe('classifyArchiveError', () => {
  it('401 và 403 là token bị từ chối', () => {
    expect(classifyArchiveError(new HfApiError(401, 'x'))).toEqual({ kind: 'unauthorized', status: 401 });
    expect(classifyArchiveError(new HfApiError(403, 'x'))).toEqual({ kind: 'unauthorized', status: 403 });
  });

  it('404 là repo hoặc thư mục chưa có', () => {
    expect(classifyArchiveError(new HfApiError(404, 'x'))).toEqual({ kind: 'not_found' });
  });

  it('lỗi HF khác giữ nguyên thông điệp', () => {
    expect(classifyArchiveError(new HfApiError(500, 'Máy chủ lỗi'))).toEqual({ kind: 'error', message: 'Máy chủ lỗi' });
  });

  it('TypeError (fetch hỏng) là lỗi mạng', () => {
    const s = classifyArchiveError(new TypeError('Failed to fetch'));
    expect(s.kind).toBe('error');
    expect((s as { message: string }).message).toMatch(/mạng/);
  });

  it('lỗi thường lấy message, giá trị lạ có thông điệp mặc định', () => {
    expect(classifyArchiveError(new Error('Không đọc được danh sách văn thư'))).toEqual({
      kind: 'error',
      message: 'Không đọc được danh sách văn thư',
    });
    expect((classifyArchiveError('xyz') as { message: string }).message).toMatch(/không xác định/);
  });
});

describe('archiveStatusMessage', () => {
  it('không cảnh báo khi đang nạp hoặc sẵn sàng', () => {
    expect(archiveStatusMessage({ kind: 'loading' }, true)).toBeNull();
    expect(archiveStatusMessage({ kind: 'ready' }, false)).toBeNull();
  });

  it('chưa cấu hình: Master Admin được chỉ cách cấu hình, user được bảo liên hệ', () => {
    const s: ArchiveStatus = { kind: 'not_configured' };
    expect(archiveStatusMessage(s, true)).toMatch(/bánh răng/);
    expect(archiveStatusMessage(s, false)).toMatch(/Liên hệ Master Admin/);
  });

  it('chưa có repo: Master Admin được chỉ cách tạo, user được bảo liên hệ', () => {
    const s: ArchiveStatus = { kind: 'no_repo' };
    expect(archiveStatusMessage(s, true)).toMatch(/tạo repo/);
    expect(archiveStatusMessage(s, false)).toMatch(/Liên hệ Master Admin/);
  });

  it('token bị từ chối kèm mã trạng thái', () => {
    const s: ArchiveStatus = { kind: 'unauthorized', status: 401 };
    expect(archiveStatusMessage(s, true)).toMatch(/401/);
    expect(archiveStatusMessage(s, false)).toMatch(/Master Admin/);
  });

  it('not_found và error trả thông điệp', () => {
    expect(archiveStatusMessage({ kind: 'not_found' }, false)).toMatch(/chưa có/);
    expect(archiveStatusMessage({ kind: 'error', message: 'Hỏng' }, false)).toBe('Hỏng');
  });
});

describe('classifyArchiveError - hết hạn chờ', () => {
  it('liệt kê quá lâu (TimeoutError) thì báo kho phản hồi chậm, không báo lỗi mạng', () => {
    expect(classifyArchiveError(new DOMException('signal timed out', 'TimeoutError'))).toEqual({
      kind: 'error',
      message: 'Kho lưu trữ phản hồi quá chậm. Thử tải lại sau ít phút.',
    });
  });
});
