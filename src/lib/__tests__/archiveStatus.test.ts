import { describe, it, expect } from 'vitest';
import { DriveApiError } from '../drive/driveErrors';
import { classifyArchiveError, archiveStatusMessage, type ArchiveStatus } from '../archiveStatus';

describe('classifyArchiveError', () => {
  it('lỗi Drive thành thông điệp tiếng Việt nêu việc đang làm', () => {
    const s = classifyArchiveError(new DriveApiError(403, '', 'x'));
    expect(s.kind).toBe('error');
    expect((s as { message: string }).message).toMatch(/^Nạp kho lưu trữ không được/);
  });

  it('TypeError (fetch hỏng) là lỗi mạng', () => {
    const s = classifyArchiveError(new TypeError('Failed to fetch'));
    expect(s.kind).toBe('error');
    expect((s as { message: string }).message).toMatch(/mạng/);
  });

  it('hết thời gian chờ là phản hồi quá chậm', () => {
    expect((classifyArchiveError(new DOMException('x', 'TimeoutError')) as { message: string }).message).toMatch(/quá chậm/);
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

  it('chưa có repo: Master Admin được chỉ cách tạo, user được bảo liên hệ', () => {
    const s: ArchiveStatus = { kind: 'no_repo' };
    expect(archiveStatusMessage(s, true)).toMatch(/tạo repo/);
    expect(archiveStatusMessage(s, false)).toMatch(/Liên hệ Master Admin/);
  });

  it('lỗi trả nguyên thông điệp', () => {
    expect(archiveStatusMessage({ kind: 'error', message: 'Hỏng' }, false)).toBe('Hỏng');
  });
});
