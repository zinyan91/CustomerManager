// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { DriveEntry } from '../../lib/drive/driveTypes';
import type { UploadItem } from '../../lib/uploadItems';

const m = vi.hoisted(() => ({ upload: vi.fn() }));
vi.mock('../../lib/drive/driveUpload', () => ({ uploadItemsToDrive: m.upload }));

import { useArchiveUpload, type DriveUploadTarget } from '../useArchiveUpload';

const entry = (path: string, size: number): DriveEntry => ({
  id: `id-${path}`, name: path, path, isFolder: false, size, modifiedTime: '2026-10-08T01:00:00Z', mimeType: 'application/pdf', nativeMimeType: '',
});
const item = (relativePath: string, size: number): UploadItem => ({ file: new File(['x'.repeat(size)], relativePath, { lastModified: 5 }), relativePath });
const target = (entries: DriveEntry[] = []): DriveUploadTarget => ({ ctx: {} as never, rootId: 'ROOT', existingPaths: entries.map((e) => e.path), entries });

type OnFile = (e: Record<string, unknown>) => void;
type Options = { overwrite: ReadonlyMap<string, string>; signalFor: (path: string) => AbortSignal | undefined };
const callOf = (n: number) => ({ items: m.upload.mock.calls[n][3] as UploadItem[], existing: m.upload.mock.calls[n][4] as string[], onFile: m.upload.mock.calls[n][7] as OnFile, options: m.upload.mock.calls[n][8] as Options });

beforeEach(() => {
  m.upload.mockReset();
});

const setup = (entries: DriveEntry[] = [], onDone = vi.fn()) => ({ onDone, ...renderHook(() => useArchiveUpload(target(entries), onDone)) });

describe('useArchiveUpload - tốc độ, hủy, thử lại, ghi đè', () => {
  it('đo tốc độ từ số byte đã gửi: dòng đang tải có speed, dòng xong thì không', async () => {
    vi.useFakeTimers();
    try {
      m.upload.mockImplementation(async (_c, _r, _t, items: UploadItem[], _e, _p, _f, onFile: OnFile) => {
        const i = items[0];
        onFile({ path: i.relativePath, size: 4_000_000, state: 'wait', item: i });
        onFile({ path: i.relativePath, size: 4_000_000, state: 'run', loaded: 0 });
        vi.setSystemTime(Date.now() + 1000);
        onFile({ path: i.relativePath, size: 4_000_000, state: 'run', loaded: 1_000_000 });
        vi.setSystemTime(Date.now() + 1000);
        onFile({ path: i.relativePath, size: 4_000_000, state: 'run', loaded: 3_000_000 });
        return new Promise(() => {});
      });
      const { result } = setup();
      void result.current.upload([item('a.pdf', 3)], '');
      await act(async () => {
        await Promise.resolve();
      });
      const row = result.current.files[0];
      expect(row.state).toBe('run');
      expect(row.loaded).toBe(3_000_000);
      expect(row.speed).toBeGreaterThan(1_000_000);
    } finally {
      vi.useRealTimers();
    }
  });

  it('hủy tệp đang chờ: đổi sang đã hủy ngay và bật tín hiệu hủy của đúng tệp đó; tệp khác không bị ảnh hưởng', async () => {
    let signals: Options['signalFor'] = () => undefined;
    m.upload.mockImplementation(async (_c, _r, _t, items: UploadItem[], _e, _p, _f, onFile: OnFile, options: Options) => {
      signals = options.signalFor;
      for (const i of items) onFile({ path: i.relativePath, size: i.file.size, state: 'wait', item: i });
      return new Promise(() => {});
    });
    const { result } = setup();
    void result.current.upload([item('a.pdf', 1), item('b.pdf', 2)], '');
    await act(async () => {
      await Promise.resolve();
    });
    act(() => result.current.cancelFile('b.pdf'));
    expect(signals('b.pdf')?.aborted).toBe(true);
    expect(signals('a.pdf')?.aborted).toBe(false);
    expect(result.current.files.map((f) => [f.path, f.state])).toEqual([['a.pdf', 'wait'], ['b.pdf', 'cancelled']]);
  });

  it('thử lại tệp lỗi: tải lại đúng tệp gốc, giữ các dòng khác, tóm tắt tính lại, nạp lại danh sách', async () => {
    m.upload.mockImplementationOnce(async (_c, _r, _t, items: UploadItem[], _e, _p, _f, onFile: OnFile) => {
      for (const i of items) onFile({ path: i.relativePath, size: i.file.size, state: 'wait', item: i });
      onFile({ path: 'a.pdf', size: 1, state: 'done' });
      onFile({ path: 'b.pdf', size: 2, state: 'failed', error: 'Mất mạng' });
      return { uploaded: ['a.pdf'], failed: [{ path: 'b.pdf', error: 'Mất mạng' }], files: [], cancelled: [] };
    });
    const a = item('a.pdf', 1);
    const b = item('b.pdf', 2);
    const { result, onDone } = setup();
    await act(() => result.current.upload([a, b], 'VB'));
    expect(result.current.retryable.has('b.pdf')).toBe(true);
    expect(result.current.retryable.has('a.pdf')).toBe(false);
    expect(result.current.summary).toMatchObject({ uploaded: 1, failed: [{ path: 'b.pdf', error: 'Mất mạng' }] });
    onDone.mockClear();

    m.upload.mockImplementationOnce(async (_c, _r, _t, items: UploadItem[], _e, _p, _f, onFile: OnFile) => {
      onFile({ path: 'b.pdf', size: 2, state: 'wait', item: items[0] });
      onFile({ path: 'b.pdf', size: 2, state: 'done' });
      return { uploaded: ['b.pdf'], failed: [], files: [], cancelled: [] };
    });
    await act(() => result.current.retryFile('b.pdf'));
    const second = callOf(1);
    expect(second.items).toEqual([b]);
    expect(m.upload.mock.calls[1][2]).toBe('VB');
    expect(result.current.files.map((f) => [f.path, f.state])).toEqual([['a.pdf', 'done'], ['b.pdf', 'done']]);
    expect(result.current.summary).toMatchObject({ uploaded: 2, failed: [] });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('thử lại bị bỏ qua khi tệp không lỗi, không có tệp gốc, hoặc đang chạy đợt khác', async () => {
    m.upload.mockImplementation(async (_c, _r, _t, items: UploadItem[], _e, _p, _f, onFile: OnFile) => {
      for (const i of items) onFile({ path: i.relativePath, size: i.file.size, state: 'wait', item: i });
      onFile({ path: 'a.pdf', size: 1, state: 'done' });
      return { uploaded: ['a.pdf'], failed: [], files: [], cancelled: [] };
    });
    const { result } = setup();
    await act(() => result.current.upload([item('a.pdf', 1)], ''));
    await act(() => result.current.retryFile('a.pdf'));
    await act(() => result.current.retryFile('khong-co.pdf'));
    expect(m.upload).toHaveBeenCalledTimes(1);
  });

  it('chọn ghi đè: truyền mã tệp cũ theo đường dẫn viết thường và bỏ đường dẫn đó khỏi danh sách tránh trùng; thử lại tệp ghi đè vẫn ghi đè', async () => {
    m.upload.mockImplementation(async (_c, _r, _t, items: UploadItem[], _e, _p, _f, onFile: OnFile) => {
      for (const i of items) onFile({ path: i.relativePath, size: i.file.size, state: 'wait', item: i });
      onFile({ path: 'a.pdf', size: 99, state: 'failed', error: 'Mất mạng' });
      return { uploaded: [], failed: [{ path: 'a.pdf', error: 'Mất mạng' }], files: [], cancelled: [] };
    });
    const { result } = setup([entry('a.pdf', 10), entry('khac.pdf', 1)]);
    await act(() => result.current.upload([item('a.pdf', 99)], ''));
    await act(() => result.current.resolveDuplicates(new Map([[0, 'over']])));
    const first = callOf(0);
    expect(first.options.overwrite.get('a.pdf')).toBe('id-a.pdf');
    expect(first.existing).toEqual(['khac.pdf']);

    await act(() => result.current.retryFile('a.pdf'));
    const again = callOf(1);
    expect(again.options.overwrite.get('a.pdf')).toBe('id-a.pdf');
    expect(again.existing).toEqual(['khac.pdf']);
  });

  it('đợt mới xóa tệp gốc và tín hiệu hủy của đợt trước', async () => {
    m.upload.mockImplementation(async (_c, _r, _t, items: UploadItem[], _e, _p, _f, onFile: OnFile) => {
      for (const i of items) {
        onFile({ path: i.relativePath, size: i.file.size, state: 'wait', item: i });
        onFile({ path: i.relativePath, size: i.file.size, state: 'failed', error: 'x' });
      }
      return { uploaded: [], failed: [], files: [], cancelled: [] };
    });
    const { result } = setup();
    await act(() => result.current.upload([item('a.pdf', 1)], ''));
    expect(result.current.retryable.has('a.pdf')).toBe(true);
    await act(() => result.current.upload([item('b.pdf', 1)], ''));
    expect(result.current.retryable.has('a.pdf')).toBe(false);
    expect(result.current.retryable.has('b.pdf')).toBe(true);
    act(() => result.current.dismiss());
    expect(result.current.retryable.size).toBe(0);
    expect(result.current.files).toEqual([]);
  });
});
