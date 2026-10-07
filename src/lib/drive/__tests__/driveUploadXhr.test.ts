import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { uploadDriveFile } from '../driveClient';
import type { DriveContext } from '../driveTypes';

type Reply = { status?: number; headers?: Record<string, string>; body?: string; progress?: number[]; error?: boolean };

/** XMLHttpRequest giả đủ cho đường tải lên: ghi lại yêu cầu, phát sự kiện tiến độ rồi trả phản hồi theo kịch bản. */
class FakeXhr {
  static replies: Reply[] = [];
  static requests: Array<{ url: string; headers: Record<string, string>; size: number }> = [];
  upload: { onprogress: ((e: { loaded: number }) => void) | null } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  onabort: (() => void) | null = null;
  status = 0;
  responseText = '';
  private url = '';
  private sent: Record<string, string> = {};
  private resHeaders = '';
  open(_method: string, url: string) {
    this.url = url;
  }
  setRequestHeader(name: string, value: string) {
    this.sent[name] = value;
  }
  getAllResponseHeaders() {
    return this.resHeaders;
  }
  abort() {
    this.onabort?.();
  }
  send(body: Blob) {
    const reply = FakeXhr.replies.shift();
    if (!reply) throw new Error('Không còn phản hồi XHR giả');
    FakeXhr.requests.push({ url: this.url, headers: this.sent, size: body.size });
    queueMicrotask(() => {
      for (const loaded of reply.progress ?? []) this.upload.onprogress?.({ loaded });
      if (reply.error) {
        this.onerror?.();
        return;
      }
      this.status = reply.status ?? 200;
      this.responseText = reply.body ?? '';
      this.resHeaders = Object.entries(reply.headers ?? {}).map(([k, v]) => `${k}: ${v}`).join('\r\n');
      this.onload?.();
    });
  }
}

const RAW = { id: 'F1', name: 'a.pdf', mimeType: 'application/pdf', size: '1', parents: ['P'], modifiedTime: 't', createdTime: 't' };
const CH = 256 * 1024;
const bytes = (n: number) => new File([new Uint8Array(n)], 'a.pdf', { type: 'application/pdf' });
// Không có fetchFn: ctx.fetchFn là dấu hiệu "đang chạy test", nên đường XHR chỉ bật khi dùng fetch toàn cục của trình duyệt
const ctx = (): DriveContext => ({
  getAccess: async () => ({ accessToken: 't', expiresAt: Date.now() + 3_600_000, access: 'write', driveId: 'D' }),
  invalidate: () => {},
  sleep: async () => {},
});

let fetchCalls: Array<{ method: string; headers: Headers }>;

beforeEach(() => {
  FakeXhr.replies = [];
  FakeXhr.requests = [];
  fetchCalls = [];
  vi.stubGlobal('XMLHttpRequest', FakeXhr);
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit = {}) => {
    fetchCalls.push({ method: init.method ?? 'GET', headers: new Headers(init.headers) });
    // Mở phiên trả địa chỉ phiên; hỏi vị trí (Content-Range */…) trả 308 kèm Range
    if (new Headers(init.headers).get('Content-Range')?.startsWith('bytes */')) return new Response(null, { status: 308, headers: { Range: `bytes=0-${CH - 1}` } });
    return new Response('{}', { status: 200, headers: { Location: 'https://upload.test/session' } });
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('uploadDriveFile bằng XHR (khi cần tiến độ từng byte)', () => {
  it('báo tiến độ trong từng đoạn rồi theo số byte Google xác nhận, kết thúc đúng tổng', async () => {
    const total = CH + 100;
    FakeXhr.replies = [
      { status: 308, headers: { Range: `bytes=0-${CH - 1}` }, progress: [100 * 1024, CH] },
      { status: 200, body: JSON.stringify(RAW), progress: [60, 100] },
    ];
    const seen: number[] = [];
    const f = await uploadDriveFile(ctx(), 'P', bytes(total), { chunkBytes: CH, onProgress: (sent) => seen.push(sent) });

    expect(f.id).toBe('F1');
    expect(seen).toEqual([100 * 1024, CH, CH, CH + 60, CH + 100, total]);
    expect(FakeXhr.requests.map((r) => r.headers['Content-Range'])).toEqual([`bytes 0-${CH - 1}/${total}`, `bytes ${CH}-${total - 1}/${total}`]);
    expect(FakeXhr.requests.map((r) => r.size)).toEqual([CH, 100]);
  });

  it('không có onProgress thì dùng fetch như cũ, không đụng XHR', async () => {
    const real = vi.fn(async (_u: string, init: RequestInit = {}) => {
      if (init.method === 'PUT') return new Response(JSON.stringify(RAW), { status: 200 });
      return new Response('{}', { status: 200, headers: { Location: 'https://upload.test/session' } });
    });
    vi.stubGlobal('fetch', real);
    await uploadDriveFile(ctx(), 'P', bytes(100));
    expect(FakeXhr.requests).toHaveLength(0);
    expect(real).toHaveBeenCalledTimes(2);
  });

  it('không đọc được Range thì coi như Google nhận đủ đoạn vừa gửi', async () => {
    const total = CH + 10;
    FakeXhr.replies = [{ status: 308, progress: [CH] }, { status: 200, body: JSON.stringify(RAW), progress: [10] }];
    await uploadDriveFile(ctx(), 'P', bytes(total), { chunkBytes: CH, onProgress: () => {} });
    expect(FakeXhr.requests[1].headers['Content-Range']).toBe(`bytes ${CH}-${total - 1}/${total}`);
  });

  it('mất mạng giữa đoạn: hỏi Google đã nhận tới đâu (bằng fetch) rồi gửi tiếp, không gửi lại từ đầu', async () => {
    const total = CH + 50;
    FakeXhr.replies = [{ error: true, progress: [1000] }, { status: 200, body: JSON.stringify(RAW), progress: [50] }];
    await uploadDriveFile(ctx(), 'P', bytes(total), { chunkBytes: CH, onProgress: () => {} });
    expect(fetchCalls.some((c) => c.headers.get('Content-Range') === `bytes */${total}`)).toBe(true);
    expect(FakeXhr.requests[1].headers['Content-Range']).toBe(`bytes ${CH}-${total - 1}/${total}`);
  });

  it('Google trả lỗi 4xx kèm nội dung JSON: thành lỗi có mã và lý do, không thử lại', async () => {
    FakeXhr.replies = [{ status: 403, body: JSON.stringify({ error: { code: 403, message: 'x', errors: [{ reason: 'storageQuotaExceeded' }] } }) }];
    await expect(uploadDriveFile(ctx(), 'P', bytes(100), { onProgress: () => {} })).rejects.toMatchObject({ status: 403, reason: 'storageQuotaExceeded' });
    expect(FakeXhr.requests).toHaveLength(1);
  });

  it('hủy giữa chừng thì dừng bằng lỗi hủy, không gửi tiếp', async () => {
    const controller = new AbortController();
    FakeXhr.replies = [{ status: 308, headers: { Range: `bytes=0-${CH - 1}` }, progress: [CH] }, { status: 200, body: JSON.stringify(RAW) }];
    const p = uploadDriveFile(ctx(), 'P', bytes(CH * 2), { chunkBytes: CH, signal: controller.signal, onProgress: () => controller.abort() });
    await expect(p).rejects.toBeDefined();
    expect(FakeXhr.requests.length).toBeLessThan(3);
  });
});
