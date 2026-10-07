import { describe, expect, it, vi } from 'vitest';
import { driveOpenEntry } from '../driveZip';
import type { DriveContext } from '../driveTypes';

const ctxOf = (res: Response | Error): DriveContext => ({
  getAccess: async () => ({ accessToken: 't', expiresAt: Date.now() + 3_600_000, access: 'read', driveId: 'D' }),
  invalidate: () => {},
  fetchFn: vi.fn(async () => {
    if (res instanceof Error) throw res;
    return res;
  }) as unknown as typeof fetch,
  sleep: async () => {},
});
const entry = (over = {}) => ({ filePath: 'VB/a.pdf', zipPath: 'Kho/VB/a.pdf', size: 3, modifiedAt: '', fileId: 'ID1', ...over });

describe('driveOpenEntry', () => {
  it('mở tệp theo mã và trả luồng đọc được', async () => {
    const res = await driveOpenEntry(ctxOf(new Response('abc')))(entry(), new AbortController().signal);
    expect(await res.text()).toBe('abc');
  });

  it('tệp Google Docs được xuất theo kiểu gốc', async () => {
    const ctx = ctxOf(new Response('x'));
    await driveOpenEntry(ctx)(entry({ nativeMimeType: 'application/vnd.google-apps.spreadsheet' }), new AbortController().signal);
    expect(String((ctx.fetchFn as ReturnType<typeof vi.fn>).mock.calls[0][0])).toContain('/export?');
  });

  it('thiếu mã tệp thì báo rõ tệp nào', async () => {
    await expect(driveOpenEntry(ctxOf(new Response('x')))(entry({ fileId: undefined }), new AbortController().signal)).rejects.toThrow('Tệp "Kho/VB/a.pdf" thiếu mã tệp Google Drive.');
  });

  it('Drive báo lỗi thì thành thông điệp tiếng Việt nêu đường dẫn trong ZIP', async () => {
    const body = JSON.stringify({ error: { code: 404, message: 'x', errors: [{ reason: 'notFound' }] } });
    await expect(driveOpenEntry(ctxOf(new Response(body, { status: 404 })))(entry(), new AbortController().signal)).rejects.toThrow(/Tải "Kho\/VB\/a\.pdf" không được: không tìm thấy/);
  });

  it('bị hủy thì ném nguyên lỗi hủy, không đổi thành thông điệp khác', async () => {
    const ac = new AbortController();
    ac.abort();
    const abort = new DOMException('Đã hủy', 'AbortError');
    await expect(driveOpenEntry(ctxOf(abort))(entry(), ac.signal)).rejects.toBe(abort);
  });
});
