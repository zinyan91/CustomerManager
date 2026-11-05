import { describe, expect, it, vi } from 'vitest';

vi.mock('../../supabase', () => ({ supabase: { functions: { invoke: vi.fn() } } }));

import { DriveApiError } from '../driveErrors';
import { describeDriveError } from '../driveErrors';
import { createAccessCache, isAccessFresh, parseDriveAccess } from '../driveToken';
import type { DriveAccess } from '../driveTypes';

const access = (expiresAt: number, token = 't'): DriveAccess => ({ accessToken: token, expiresAt, access: 'write', rootFolderId: 'D' });

describe('parseDriveAccess', () => {
  it('đọc phản hồi hợp lệ', () => {
    expect(parseDriveAccess({ accessToken: 'a', expiresAt: 5, access: 'read', rootFolderId: 'D' })).toEqual({ accessToken: 'a', expiresAt: 5, access: 'read', rootFolderId: 'D' });
  });
  it.each([
    [null], [{}], [{ accessToken: '', expiresAt: 5, access: 'read', rootFolderId: 'D' }], [{ accessToken: 'a', expiresAt: 'x', access: 'read', rootFolderId: 'D' }],
    [{ accessToken: 'a', expiresAt: 5, access: 'admin', driveId: 'D' }], [{ accessToken: 'a', expiresAt: 5, access: 'read' }],
    [{ accessToken: 'a', expiresAt: Number.NaN, access: 'read', rootFolderId: 'D' }],
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
  it('xin token treo thì hết hạn chờ, lần sau xin lại được và bỏ kết quả trả muộn', async () => {
    vi.useFakeTimers();
    try {
      let release!: (a: DriveAccess) => void;
      const fetcher = vi.fn().mockImplementationOnce(() => new Promise<DriveAccess>(resolve => { release=resolve; }))
        .mockResolvedValue(access(10_000_000, 'new'));
      const cache = createAccessCache(fetcher, () => 0);
      const failed = expect(cache.getAccess()).rejects.toThrow(/cấp quyền Google Drive/);
      await vi.advanceTimersByTimeAsync(20_000);
      await failed;
      expect((await cache.getAccess()).accessToken).toBe('new');
      release(access(10_000_000, 'old'));
      await Promise.resolve();
      expect((await cache.getAccess()).accessToken).toBe('new');
    } finally {
      vi.useRealTimers();
    }
  });
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

  it('lưu token vào session store để lần mở trang sau dùng ngay không chờ Edge Function; invalidate thì xóa', async () => {
    const map = new Map<string, string>();
    const store = {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
      removeItem: (k: string) => void map.delete(k),
    };
    const fetcher1 = vi.fn(async () => access(10_000_000, 'persisted-tok'));
    const cache1 = createAccessCache(fetcher1, () => 0, store);
    expect((await cache1.getAccess()).accessToken).toBe('persisted-tok');
    expect(fetcher1).toHaveBeenCalledTimes(1);

    // Giả lập tải lại trang: tạo cache mới trên cùng store
    const fetcher2 = vi.fn(async () => access(10_000_000, 'new-tok'));
    const cache2 = createAccessCache(fetcher2, () => 1_000, store);
    expect((await cache2.getAccess()).accessToken).toBe('persisted-tok');
    expect(fetcher2).not.toHaveBeenCalled();

    // Khi invalidate thì xóa cả trong store
    cache2.invalidate();
    expect((await cache2.getAccess()).accessToken).toBe('new-tok');
    expect(fetcher2).toHaveBeenCalledTimes(1);
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
    [e(0), /trình duyệt không đọc được phản hồi/],
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
