import { describe, it, expect, vi } from 'vitest';
import { BlobReader, BlobWriter, ZipReader } from '@zip.js/zip.js';
import type { FolderZipPlan } from '../dispatch/folderZipPlan';
import { downloadFolderZip, isAbortError, type OpenZipEntry, type ZipProgress } from '../folderZip';

const enc = (s: string) => new TextEncoder().encode(s);

const plan = (files: Record<string, string>): FolderZipPlan => {
  const entries = Object.entries(files).map(([filePath, body]) => ({
    filePath,
    zipPath: `Goc/${filePath.split('/').slice(1).join('/')}`,
    size: enc(body).byteLength,
    modifiedAt: '2026-10-01T00:00:00Z',
  }));
  return { fileName: 'Goc.zip', entries, totalBytes: entries.reduce((n, e) => n + e.size, 0) };
};

/** Đích ghi gom mọi chunk, ghi lại việc close/abort. */
function collector() {
  const chunks: Uint8Array[] = [];
  const events: string[] = [];
  const writable = new WritableStream<Uint8Array>({
    write: (c) => void chunks.push(c),
    close: () => void events.push('close'),
    abort: () => void events.push('abort'),
  });
  return { writable, chunks, events, blob: () => new Blob(chunks as BlobPart[]) };
}

async function readZip(blob: Blob): Promise<Record<string, string>> {
  const reader = new ZipReader(new BlobReader(blob));
  const out: Record<string, string> = {};
  for (const e of await reader.getEntries()) {
    if (!e.directory) out[e.filename] = await (await (e as unknown as { getData: (w: BlobWriter) => Promise<Blob> }).getData(new BlobWriter())).text();
  }
  await reader.close();
  return out;
}

/** Mở tệp qua một hàm fetch giả: đường dẫn tệp nằm trong URL. */
const via = (fetchFn: typeof fetch): OpenZipEntry => (entry, signal) =>
  fetchFn(`https://kho.test/datasets/own/repo/resolve/main/${entry.filePath.split("/").map(encodeURIComponent).join("/")}`, { signal });

const okFetch = (files: Record<string, string>) =>
  vi.fn(async (url: RequestInfo | URL) => {
    const path = decodeURIComponent(new URL(String(url)).pathname.replace('/datasets/own/repo/resolve/main/', ''));
    return new Response(enc(files[path]), { status: 200 });
  }) as unknown as typeof fetch;

describe('downloadFolderZip', () => {
  it('nén đủ tệp, giữ cấu trúc và nội dung (đọc lại bằng zip.js)', async () => {
    const files = { 'f/a.txt': 'xin chào', 'f/sub/b.txt': 'nội dung B', 'f/rong.txt': '' };
    const sink = collector();
    await downloadFolderZip({ plan: plan(files), writable: sink.writable, openEntry: via(okFetch(files)) });

    expect(sink.events).toEqual(['close']);
    expect(await readZip(sink.blob())).toEqual({
      'Goc/a.txt': 'xin chào',
      'Goc/sub/b.txt': 'nội dung B',
      'Goc/rong.txt': '',
    });
  });

  it('báo tiến độ từ 0 tới đủ và gọi onCommitting đúng một lần, trước khi đóng đích', async () => {
    const files = { 'f/a.txt': 'aaaa', 'f/b.txt': 'bb' };
    const sink = collector();
    const seen: ZipProgress[] = [];
    const order: string[] = [];
    await downloadFolderZip({
      plan: plan(files), writable: sink.writable, openEntry: via(okFetch(files)),
      onProgress: (p) => seen.push({ ...p }),
      onCommitting: () => order.push(`committing(events=${sink.events.join(',')})`),
    });

    expect(seen[0]).toMatchObject({ completed: 0, total: 2, loadedBytes: 0, totalBytes: 6 });
    expect(seen[seen.length - 1]).toMatchObject({ completed: 2, loadedBytes: 6 });
    expect(order).toEqual(['committing(events=)']);
  });

  it('tệp không còn trên HF (404): báo tên tệp và hủy đích ghi, không chốt tệp dở', async () => {
    const sink = collector();
    const fetchFn = vi.fn(async () => new Response('', { status: 404 })) as unknown as typeof fetch;
    await expect(
      downloadFolderZip({ plan: plan({ 'f/a.txt': 'x' }), writable: sink.writable, openEntry: via(fetchFn) })
    ).rejects.toThrow(/Không tìm thấy tệp "Goc\/a.txt"/);
    expect(sink.events).toEqual(['abort']);
  });

  it('bị từ chối (403) thì nói rõ là kho từ chối', async () => {
    const fetchFn = vi.fn(async () => new Response('', { status: 403 })) as unknown as typeof fetch;
    await expect(
      downloadFolderZip({ plan: plan({ 'f/a.txt': 'x' }), writable: collector().writable, openEntry: via(fetchFn) })
    ).rejects.toThrow(/Kho lưu trữ từ chối khi tải/);
  });

  it('tải thiếu byte so với kích thước đã biết thì báo lỗi và hủy đích', async () => {
    const sink = collector();
    const p = plan({ 'f/a.txt': 'đủ mười byte...' });
    const fetchFn = vi.fn(async () => new Response(enc('ngắn'), { status: 200 })) as unknown as typeof fetch;
    await expect(downloadFolderZip({ plan: p, writable: sink.writable, openEntry: via(fetchFn) })).rejects.toThrow(/chưa đủ/);
    expect(sink.events).toEqual(['abort']);
  });

  it('người dùng hủy giữa chừng: ném AbortError và hủy đích', async () => {
    const files = { 'f/a.txt': 'aaaa', 'f/b.txt': 'bbbb', 'f/c.txt': 'cccc' };
    const controller = new AbortController();
    const sink = collector();
    const fetchFn = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).endsWith('/b.txt')) controller.abort();
      return new Response(enc('xxxx'), { status: 200 });
    }) as unknown as typeof fetch;

    const err = await downloadFolderZip({
      plan: plan(files), writable: sink.writable, signal: controller.signal, openEntry: via(fetchFn),
    }).catch((e) => e);

    expect(isAbortError(err)).toBe(true);
    expect(sink.events).toEqual(['abort']);
  });

  it('đã hủy từ trước khi bắt đầu thì không gọi mạng', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchFn = vi.fn() as unknown as typeof fetch;
    const err = await downloadFolderZip({
      plan: plan({ 'f/a.txt': 'x' }), writable: collector().writable, signal: controller.signal, openEntry: via(fetchFn),
    }).catch((e) => e);
    expect(isAbortError(err)).toBe(true);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('lỗi mạng giữa chừng giữ nguyên thông điệp lỗi, không bị đổi thành "đã hủy"', async () => {
    const fetchFn = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    const err = await downloadFolderZip({
      plan: plan({ 'f/a.txt': 'x' }), writable: collector().writable, openEntry: via(fetchFn),
    }).catch((e) => e);
    expect(isAbortError(err)).toBe(false);
    expect((err as Error).message).toMatch(/Failed to fetch/);
  });
});

describe('downloadFolderZip với hàm mở tệp theo mã tệp', () => {
  it('đọc từng tệp bằng openEntry, nội dung và cấu trúc đúng', async () => {
    const files = { 'f/a.txt': 'xin chào', 'f/sub/b.txt': 'B' };
    const p = plan(files);
    const withIds: FolderZipPlan = { ...p, entries: p.entries.map((e, i) => ({ ...e, fileId: `ID${i}` })) };
    const openEntry = vi.fn(async (entry: FolderZipPlan['entries'][number]) => new Response(enc(files[entry.filePath as keyof typeof files])));
    const sink = collector();
    await downloadFolderZip({ plan: withIds, openEntry, writable: sink.writable });
    expect(openEntry.mock.calls.map((c) => c[0].fileId)).toEqual(['ID0', 'ID1']);
    expect(await readZip(sink.blob())).toEqual({ 'Goc/a.txt': 'xin chào', 'Goc/sub/b.txt': 'B' });
  });

  it('openEntry ném lỗi thì dừng, hủy đích ghi và nêu lỗi gốc', async () => {
    const sink = collector();
    await expect(
      downloadFolderZip({ plan: plan({ 'f/a.txt': 'x' }), openEntry: async () => { throw new Error('Tải "a.txt" không được: không tìm thấy tệp'); }, writable: sink.writable }),
    ).rejects.toThrow(/không tìm thấy tệp/);
    expect(sink.events).toContain('abort');
  });
});
