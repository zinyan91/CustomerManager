// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { WorkbookData } from '../calc/model/workbook';

const h = vi.hoisted(() => ({
  calls: [] as Array<{ id: string; seq: number; title: string; data: unknown }>,
  next: [] as Array<{ seq: number } | { error: Error }>,
  gate: null as null | Promise<void>,
}));

vi.mock('../collab/collabApi', async () => {
  class ConflictError extends Error {}
  return {
    ConflictError,
    saveSharedDocument: async (id: string, seq: number, title: string, data: unknown) => {
      h.calls.push({ id, seq, title, data });
      if (h.gate) await h.gate;
      const reply = h.next.shift() ?? { seq: seq + 1 };
      if ('error' in reply) throw reply.error;
      return reply.seq;
    },
  };
});

import { ConflictError } from '../collab/collabApi';
import { useSharedPersistence } from '../collab/useSharedPersistence';

const data = (note: string) => ({ sheets: [], note }) as unknown as WorkbookData;

beforeEach(() => {
  h.calls = [];
  h.next = [];
  h.gate = null;
});

describe('useSharedPersistence', () => {
  it('nháp riêng (không có mã): không gọi mạng, coi như đã xong', async () => {
    const { result } = renderHook(() => useSharedPersistence({ id: null, initialSeq: 0, getTitle: () => 'T', getData: () => data('a') }));
    expect(await act(() => result.current.save())).toBe('saved');
    expect(h.calls).toHaveLength(0);
  });

  it('lưu với số thứ tự đã tải, lần sau dùng số máy chủ trả về', async () => {
    const { result } = renderHook(() => useSharedPersistence({ id: 'd1', initialSeq: 4, getTitle: () => 'Sổ', getData: () => data('a') }));
    await act(() => result.current.save());
    await act(() => result.current.save());
    expect(h.calls.map((c) => c.seq)).toEqual([4, 5]);
    expect(result.current.state).toBe('saved');
    expect(h.calls[0]).toMatchObject({ id: 'd1', title: 'Sổ' });
  });

  it('hai lần lưu chồng nhau chạy lần lượt và lần sau gửi bản mới nhất, không tự xung đột với chính mình', async () => {
    let note = 'v1';
    let release!: () => void;
    h.gate = new Promise<void>((resolve) => (release = resolve));
    const { result } = renderHook(() => useSharedPersistence({ id: 'd1', initialSeq: 1, getTitle: () => 'T', getData: () => data(note) }));
    let first!: Promise<string>;
    let second!: Promise<string>;
    await act(async () => {
      first = result.current.save();
      note = 'v2';
      second = result.current.save();
      release();
      await Promise.all([first, second]);
    });
    expect(h.calls.map((c) => c.seq)).toEqual([1, 2]);
    expect((h.calls[1].data as { note: string }).note).toBe('v2');
    expect(result.current.state).toBe('saved');
  });

  it('xung đột: báo trạng thái conflict, dừng hẳn các lần lưu sau (không ghi đè bản của người kia)', async () => {
    h.next = [{ error: new ConflictError('Người khác đã lưu') }];
    const { result } = renderHook(() => useSharedPersistence({ id: 'd1', initialSeq: 1, getTitle: () => 'T', getData: () => data('a') }));
    expect(await act(() => result.current.save())).toBe('conflict');
    expect(result.current.state).toBe('conflict');
    expect(result.current.error).toBe('Người khác đã lưu');
    expect(await act(() => result.current.save())).toBe('conflict');
    expect(h.calls).toHaveLength(1);
  });

  it('lỗi khác (mất mạng): báo failed nhưng lần lưu sau vẫn thử lại với đúng số thứ tự cũ', async () => {
    h.next = [{ error: new Error('mất mạng') }];
    const { result } = renderHook(() => useSharedPersistence({ id: 'd1', initialSeq: 3, getTitle: () => 'T', getData: () => data('a') }));
    expect(await act(() => result.current.save())).toBe('failed');
    expect(result.current.state).toBe('failed');
    expect(result.current.error).toBe('mất mạng');
    expect(await act(() => result.current.save())).toBe('saved');
    expect(h.calls.map((c) => c.seq)).toEqual([3, 3]);
    expect(result.current.state).toBe('saved');
    expect(result.current.error).toBeNull();
  });
});
