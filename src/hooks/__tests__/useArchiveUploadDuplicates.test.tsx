// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { DriveEntry } from '../../lib/drive/driveTypes';
import type { UploadItem } from '../../lib/uploadItems';

const m = vi.hoisted(() => ({ upload: vi.fn() }));
vi.mock('../../lib/drive/driveUpload', () => ({ uploadItemsToDrive: m.upload }));

import { useArchiveUpload, type DriveUploadTarget } from '../useArchiveUpload';

const entry = (path: string, size: number): DriveEntry => ({
  id: `id-${path}`, name: path.split('/').pop()!, path, isFolder: false, size, modifiedTime: '2026-10-08T01:00:00Z', mimeType: 'application/pdf', nativeMimeType: '',
});
const item = (relativePath: string, size: number): UploadItem => ({ file: new File(['x'.repeat(size)], relativePath, { lastModified: 5 }), relativePath });

const target = (entries?: DriveEntry[]): DriveUploadTarget => ({ ctx: {} as never, rootId: 'ROOT', existingPaths: (entries ?? []).map((e) => e.path), entries });

beforeEach(() => {
  m.upload.mockReset().mockImplementation(async (_c, _r, _t, items: UploadItem[]) => ({ uploaded: items.map((i) => i.relativePath), failed: [], files: [] }));
});

const setup = (entries?: DriveEntry[], onDone = vi.fn()) => ({ onDone, ...renderHook(() => useArchiveUpload(target(entries), onDone)) });

describe('useArchiveUpload - tệp trùng tên', () => {
  it('không có tệp trùng: tải ngay như cũ, không hỏi', async () => {
    const { result, onDone } = setup([entry('khac.pdf', 1)]);
    await act(() => result.current.upload([item('a.pdf', 10)], ''));
    expect(result.current.pending).toBeNull();
    expect(m.upload).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalled();
    expect(result.current.summary).toMatchObject({ uploaded: 1, skipped: [] });
  });

  it('có tệp trùng: dừng lại chờ quyết định, chưa tải gì, chưa nạp lại danh sách', async () => {
    const { result, onDone } = setup([entry('a.pdf', 10)]);
    await act(() => result.current.upload([item('a.pdf', 10), item('moi.pdf', 3)], ''));
    expect(m.upload).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
    expect(result.current.pending).toMatchObject({ total: 2 });
    expect(result.current.pending?.matches.map((x) => [x.path, x.sameSize])).toEqual([['a.pdf', true]]);
  });

  it('chọn bỏ qua: chỉ tải tệp còn lại, tóm tắt ghi đường dẫn đã bỏ qua', async () => {
    const { result } = setup([entry('a.pdf', 10)]);
    await act(() => result.current.upload([item('a.pdf', 10), item('moi.pdf', 3)], ''));
    await act(() => result.current.resolveDuplicates(new Map([[0, 'skip']])));
    expect(m.upload.mock.calls[0][3].map((i: UploadItem) => i.relativePath)).toEqual(['moi.pdf']);
    expect(result.current.pending).toBeNull();
    expect(result.current.summary).toMatchObject({ uploaded: 1, skipped: ['a.pdf'] });
  });

  it('chọn giữ cả hai: tải cả tệp trùng (tên được đổi ở bước lên kế hoạch)', async () => {
    const { result } = setup([entry('a.pdf', 10)]);
    await act(() => result.current.upload([item('a.pdf', 99)], ''));
    await act(() => result.current.resolveDuplicates(new Map([[0, 'keep']])));
    expect(m.upload.mock.calls[0][3].map((i: UploadItem) => i.relativePath)).toEqual(['a.pdf']);
  });

  it('bỏ qua hết thì không gọi tải lên và không nạp lại; hủy thì bỏ cả đợt', async () => {
    const { result, onDone } = setup([entry('a.pdf', 10)]);
    await act(() => result.current.upload([item('a.pdf', 10)], ''));
    await act(() => result.current.resolveDuplicates(new Map([[0, 'skip']])));
    expect(m.upload).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
    expect(result.current.summary).toMatchObject({ uploaded: 0, skipped: ['a.pdf'] });

    await act(() => result.current.upload([item('a.pdf', 10)], ''));
    act(() => result.current.cancelDuplicates());
    expect(result.current.pending).toBeNull();
    expect(m.upload).not.toHaveBeenCalled();
  });

  it('không truyền danh sách mục thì không kiểm tra trùng (đường dẫn cũ)', async () => {
    const { result } = setup(undefined);
    await act(() => result.current.upload([item('a.pdf', 10)], ''));
    expect(m.upload).toHaveBeenCalledTimes(1);
  });
});
