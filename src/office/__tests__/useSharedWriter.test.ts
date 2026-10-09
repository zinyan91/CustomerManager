// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, configure, renderHook, waitFor } from '@testing-library/react';

configure({ asyncUtilTimeout: 6000 });

const h = vi.hoisted(() => {
  class ConflictError extends Error {}
  return {
    ConflictError,
    serverSeq: 1,
    serverContent: { doc: 'v1' } as object,
    saves: [] as Array<{ base: number; title: string; content: object }>,
    failNext: null as null | Error,
    subs: new Set<(op: unknown) => void>(),
    onStatus: null as null | ((state: string) => void),
    missed: [] as unknown[],
    versions: [] as Array<{ seq: number; label: string; content: unknown }>,
    restores: [] as number[],
    gets: 0,
  };
});

vi.mock('../collab/collabApi', () => ({
  ConflictError: h.ConflictError,
  saveSharedWriter: async (_id: string, base: number, title: string, content: object) => {
    h.saves.push({ base, title, content });
    if (h.failNext) {
      const failure = h.failNext;
      h.failNext = null;
      throw failure;
    }
    if (base !== h.serverSeq) throw new h.ConflictError('Người khác đã lưu');
    h.serverSeq += 1;
    h.serverContent = content;
    return h.serverSeq;
  },
  getSharedWriter: async (id: string) => {
    h.gets += 1;
    return { id, title: 'Tên trên máy chủ', content: h.serverContent, role: 'editor', lastSeq: h.serverSeq };
  },
  listOps: async () => h.missed,
  subscribeOps: (_id: string, onOp: (op: unknown) => void, onStatus?: (s: string) => void) => {
    h.subs.add(onOp);
    h.onStatus = onStatus ?? null;
    return () => h.subs.delete(onOp);
  },
  saveVersion: async (_id: string, seq: number, label: string, content: unknown) => {
    h.versions.push({ seq, label, content });
    return h.versions.length;
  },
  restoreVersion: async (_id: string, versionId: number) => {
    h.restores.push(versionId);
    h.serverSeq += 1;
    h.serverContent = { doc: 'đã khôi phục' };
    return h.serverSeq;
  },
}));

import { useSharedWriter } from '../collab/useSharedWriter';

const remoteOp = (seq: number, userId = 'u2', summary: Record<string, unknown> = { kind: 'save' }) => ({ seq, userId, clientId: '', patch: [{ t: 'reset' }], summary, createdAt: '' });
const push = (op: ReturnType<typeof remoteOp>) => act(() => h.subs.forEach((sub) => sub(op)));

interface Screen {
  title: string;
  content: object;
}

function open(over: { canWrite?: boolean; id?: string | null } = {}) {
  const screen: Screen = { title: 'Công văn', content: { doc: 'v1' } };
  const loaded = vi.fn();
  const titled = vi.fn();
  const hook = renderHook(() =>
    useSharedWriter({
      id: over.id === undefined ? 'd1' : over.id,
      initialSeq: 1,
      userId: 'u1',
      canWrite: over.canWrite ?? true,
      snapshot: () => ({ title: screen.title, content: screen.content }),
      onLoaded: loaded,
      onTitle: titled,
      delayMs: 20,
    }),
  );
  const type = (content: object, title = screen.title) => {
    screen.content = content;
    screen.title = title;
    act(() => hook.result.current.edited());
  };
  return { screen, hook, loaded, titled, type };
}

beforeEach(() => {
  h.serverSeq = 1;
  h.serverContent = { doc: 'v1' };
  h.saves = [];
  h.failNext = null;
  h.subs.clear();
  h.onStatus = null;
  h.missed = [];
  h.versions = [];
  h.restores = [];
  h.gets = 0;
});
afterEach(cleanup);

describe('useSharedWriter', () => {
  it('nháp riêng (không có mã): không lưu, không nghe gì', () => {
    const { hook, type } = open({ id: null });
    type({ doc: 'x' });
    expect(hook.result.current.status).toBe('idle');
    expect(h.saves).toHaveLength(0);
    expect(h.subs.size).toBe(0);
  });

  it('sửa liên tiếp được gộp thành một lần lưu với số thứ tự đang giữ; xong thì về "saved" và giữ số mới', async () => {
    const { hook, type } = open();
    type({ doc: 'a' });
    type({ doc: 'ab' });
    type({ doc: 'abc' }, 'Tên mới');
    await waitFor(() => expect(hook.result.current.seq).toBe(2));
    expect(h.saves).toEqual([{ base: 1, title: 'Tên mới', content: { doc: 'abc' } }]);
    expect(hook.result.current.status).toBe('saved');
    type({ doc: 'abcd' });
    await waitFor(() => expect(hook.result.current.seq).toBe(3));
    expect(h.saves[1].base).toBe(2);
  });

  it('lưu bị người khác lưu trước: chuyển "conflict", dừng tự lưu, giữ nguyên nội dung đang soạn, không ghi đè', async () => {
    const { hook, type, loaded } = open();
    h.serverSeq = 2; // người khác đã lưu
    type({ doc: 'của tôi' });
    await waitFor(() => expect(hook.result.current.status).toBe('conflict'));
    expect(h.saves).toHaveLength(1);
    type({ doc: 'của tôi, thêm nữa' });
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(h.saves).toHaveLength(1);
    expect(loaded).not.toHaveBeenCalled();
    expect(h.serverContent).toEqual({ doc: 'v1' });
  });

  it('chọn tải bản mới sau xung đột: nạp bản máy chủ, bỏ phần chưa lưu, tự lưu chạy lại được', async () => {
    const { hook, type, loaded } = open();
    h.serverSeq = 2;
    h.serverContent = { doc: 'của người khác' };
    type({ doc: 'của tôi' });
    await waitFor(() => expect(hook.result.current.status).toBe('conflict'));
    await act(() => hook.result.current.reload());
    expect(loaded).toHaveBeenCalledWith(expect.objectContaining({ content: { doc: 'của người khác' }, lastSeq: 2 }));
    expect(hook.result.current.status).toBe('saved');
    expect(hook.result.current.seq).toBe(2);
    type({ doc: 'sau khi tải' });
    await waitFor(() => expect(hook.result.current.seq).toBe(3));
    expect(h.saves.at(-1)?.base).toBe(2);
  });

  it('người khác lưu khi mình chưa sửa gì: tự tải bản mới; khi mình đang sửa dở: báo xung đột, không tự tải', async () => {
    const clean = open();
    h.serverSeq = 2;
    h.serverContent = { doc: 'mới' };
    push(remoteOp(2));
    await waitFor(() => expect(clean.loaded).toHaveBeenCalledTimes(1));
    expect(clean.hook.result.current.seq).toBe(2);
    cleanup();

    h.serverSeq = 2;
    const dirty = open();
    dirty.screen.content = { doc: 'dở dang' };
    act(() => dirty.hook.result.current.edited());
    push(remoteOp(5));
    await waitFor(() => expect(dirty.hook.result.current.status).toBe('conflict'));
    expect(dirty.loaded).not.toHaveBeenCalled();
  });

  it('thao tác của chính mình quay về qua Realtime trong lúc đang lưu: không bị coi là của người khác', async () => {
    const { hook, type, loaded } = open();
    type({ doc: 'mình' });
    await waitFor(() => expect(h.saves).toHaveLength(1));
    push(remoteOp(2, 'u1'));
    await waitFor(() => expect(hook.result.current.seq).toBe(2));
    expect(hook.result.current.status).toBe('saved');
    expect(loaded).not.toHaveBeenCalled();
    push(remoteOp(2, 'u1'));
    expect(hook.result.current.status).toBe('saved');
  });

  it('người khác chỉ đổi tên (đúng thứ tự kế tiếp): nhận tên mới và số thứ tự, không xung đột kể cả khi đang sửa dở', async () => {
    const { hook, screen, titled } = open();
    screen.content = { doc: 'dở' };
    act(() => hook.result.current.edited());
    push(remoteOp(2, 'u2', { kind: 'rename', title: 'Tên do người khác' }));
    expect(titled).toHaveBeenCalledWith('Tên do người khác');
    expect(hook.result.current.status).not.toBe('conflict');
    h.serverSeq = 2;
    await waitFor(() => expect(hook.result.current.seq).toBe(3));
    expect(h.saves[0].base).toBe(2);
  });

  it('người chỉ xem: không bao giờ lưu; có bản mới thì tự tải', async () => {
    const { hook, type, loaded } = open({ canWrite: false });
    type({ doc: 'cố sửa' });
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(h.saves).toHaveLength(0);
    h.serverSeq = 2;
    push(remoteOp(2));
    await waitFor(() => expect(loaded).toHaveBeenCalled());
    expect(hook.result.current.seq).toBe(2);
  });

  it('lưu hỏng do mạng: báo "failed" kèm lý do, giữ phần chưa lưu, sửa tiếp thì thử lại và thành công', async () => {
    const { hook, type } = open();
    h.failNext = new Error('Không lưu được văn bản chung: mất mạng');
    type({ doc: 'a' });
    await waitFor(() => expect(hook.result.current.status).toBe('failed'));
    expect(hook.result.current.error).toContain('mất mạng');
    type({ doc: 'ab' });
    await waitFor(() => expect(hook.result.current.status).toBe('saved'));
    expect(h.saves.at(-1)).toMatchObject({ base: 1, content: { doc: 'ab' } });
    expect(hook.result.current.error).toBeNull();
  });

  it('nội dung vượt 5 MB: báo ngay lý do, không gửi lên máy chủ; bớt xuống thì lưu lại được', async () => {
    const { hook, type } = open();
    type({ doc: 'x'.repeat(5 * 1024 * 1024 + 100) });
    await waitFor(() => expect(hook.result.current.status).toBe('failed'));
    expect(hook.result.current.error).toContain('vượt giới hạn 5 MB');
    expect(h.saves).toHaveLength(0);
    type({ doc: 'đã bỏ bớt ảnh' });
    await waitFor(() => expect(hook.result.current.status).toBe('saved'));
    expect(h.saves).toEqual([{ base: 1, title: 'Công văn', content: { doc: 'đã bỏ bớt ảnh' } }]);
    expect(hook.result.current.error).toBeNull();
  });

  it('mở kênh xong mà đã có thao tác bị lỡ: xử lý như thao tác của người khác', async () => {
    const { hook, loaded } = open();
    h.serverSeq = 3;
    h.missed = [remoteOp(2), remoteOp(3)];
    act(() => h.onStatus?.('SUBSCRIBED'));
    await waitFor(() => expect(loaded).toHaveBeenCalled());
    expect(hook.result.current.seq).toBe(3);
  });

  it('lưu mốc: lưu phần đang chờ trước rồi ghi mốc ở số thứ tự mới; còn xung đột thì từ chối, không ghi mốc', async () => {
    const { hook, type } = open();
    type({ doc: 'chốt' });
    await act(() => hook.result.current.saveMilestone('Chốt quý 3'));
    expect(h.saves).toHaveLength(1);
    expect(h.versions).toEqual([{ seq: 2, label: 'Chốt quý 3', content: { doc: 'chốt' } }]);

    h.serverSeq = 9;
    type({ doc: 'lệch' });
    await expect(act(() => hook.result.current.saveMilestone('Không được'))).rejects.toThrow(/tải bản mới nhất/);
    expect(h.versions).toHaveLength(1);
  });

  it('khôi phục: lưu bản hiện tại thành mốc an toàn, khôi phục, rồi nạp bản vừa khôi phục', async () => {
    const { hook, loaded } = open();
    await act(() => hook.result.current.restore(7, 'Trước khi khôi phục'));
    expect(h.versions).toEqual([{ seq: 1, label: 'Trước khi khôi phục', content: { doc: 'v1' } }]);
    expect(h.restores).toEqual([7]);
    expect(loaded).toHaveBeenCalledWith(expect.objectContaining({ content: { doc: 'đã khôi phục' } }));
    expect(hook.result.current.seq).toBe(2);
  });
});
