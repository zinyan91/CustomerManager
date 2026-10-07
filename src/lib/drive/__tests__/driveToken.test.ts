import { describe, expect, it, vi } from 'vitest';

vi.mock('../../supabase', () => ({ supabase: { functions: { invoke: vi.fn() } } }));

import { DriveApiError } from '../driveErrors';
import { describeDriveError } from '../driveErrors';
import { createAccessCache, isAccessFresh, parseDriveAccess } from '../driveToken';
import type { DriveAccess } from '../driveTypes';

const access = (expiresAt: number, token = 't'): DriveAccess => ({ accessToken: token, expiresAt, access: 'write', driveId: 'D' });

describe('parseDriveAccess', () => {
  it('đọc phản hồi hợp lệ', () => {
    expect(parseDriveAccess({ accessToken: 'a', expiresAt: 5, access: 'read', driveId: 'D' })).toEqual({ accessToken: 'a', expiresAt: 5, access: 'read', driveId: 'D' });
  });
  it.each([
    [null], [{}], [{ accessToken: '', expiresAt: 5, access: 'read', driveId: 'D' }], [{ accessToken: 'a', expiresAt: 'x', access: 'read', driveId: 'D' }],
    [{ accessToken: 'a', expiresAt: 5, access: 'admin', driveId: 'D' }], [{ accessToken: 'a', expiresAt: 5, access: 'read' }],
    [{ accessToken: 'a', expiresAt: Number.NaN, access: 'read', driveId: 'D' }],
  ])('phản hồi sai dạng %j bị từ chối', (raw) => {
    expect(() => parseDriveAccess(raw)).toThrow(/không hợp lệ/);
  });
});

describe('isAccessFresh', () => {
  it('còn trên 5 phút thì dùng được', () => {
    expect(isAccessFresh(access(1_000_000 + 5 * 60_000 + 1), 1_000_000)).toBe(true);
    expect(isAccessFresh(access(1_000_000 + 5 * 60_000), 1_000_000)).toBe(false);
  });
});

describe('createAccessCache', () => {
  it('dùng lại token còn hạn, không hỏi lại', async () => {
    const fetcher = vi.fn(async () => access(10_000_000));
    const cache = createAccessCache(fetcher, () => 0);
    await cache.getAccess();
    await cache.getAccess();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('nhiều lời gọi cùng lúc chỉ xin một lần', async () => {
    let resolve!: (a: DriveAccess) => void;
    const fetcher = vi.fn(() => new Promise<DriveAccess>((r) => (resolve = r)));
    const cache = createAccessCache(fetcher, () => 0);
    const all = Promise.all([cache.getAccess(), cache.getAccess(), cache.getAccess()]);
    resolve(access(10_000_000));
    expect((await all).every((a) => a.accessToken === 't')).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('gần hết hạn thì xin lại', async () => {
    let now = 0;
    const fetcher = vi.fn(async () => access(now + 3_600_000, `t${fetcher.mock.calls.length}`));
    const cache = createAccessCache(fetcher, () => now);
    expect((await cache.getAccess()).accessToken).toBe('t1');
    now = 3_600_000 - 60_000;
    expect((await cache.getAccess()).accessToken).toBe('t2');
  });

  it('invalidate bắt buộc xin lại', async () => {
    const fetcher = vi.fn(async () => access(10_000_000));
    const cache = createAccessCache(fetcher, () => 0);
    await cache.getAccess();
    cache.invalidate();
    await cache.getAccess();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('xin lỗi thì lần sau thử lại được, không kẹt ở lỗi cũ', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('Chưa đặt secret')).mockResolvedValueOnce(access(10_000_000));
    const cache = createAccessCache(fetcher, () => 0);
    await expect(cache.getAccess()).rejects.toThrow('Chưa đặt secret');
    await expect(cache.getAccess()).resolves.toBeDefined();
  });
});

describe('describeDriveError', () => {
  const e = (status: number, reason = '') => new DriveApiError(status, reason, 'goc');
  it.each([
    [e(403, 'storageQuotaExceeded'), /hết dung lượng/],
    [e(403, 'rateLimitExceeded'), /giới hạn tốc độ/],
    [e(429), /giới hạn tốc độ/],
    [e(401), /hết hạn/],
    [e(403, 'forbidden'), /Quản lý nội dung/],
    [e(404), /không tìm thấy/],
    [e(503), /đang lỗi \(503\)/],
    [e(400), /goc/],
  ])('%#', (err, pattern) => expect(describeDriveError(err, 'Tải tệp lên')).toMatch(pattern));

  it('nêu việc đang làm', () => {
    expect(describeDriveError(e(404), 'Đổi tên')).toMatch(/^Đổi tên không được/);
  });
  it('lỗi mạng, hủy, lỗi thường', () => {
    expect(describeDriveError(new TypeError('x'))).toMatch(/không kết nối được/);
    expect(describeDriveError(new DOMException('x', 'AbortError'))).toMatch(/bị hủy/);
    expect(describeDriveError(new Error('Chưa đặt secret'))).toBe('Chưa đặt secret');
    expect(describeDriveError('lạ')).toMatch(/không xác định/);
  });
});
