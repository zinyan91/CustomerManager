// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, configure, renderHook, waitFor } from '@testing-library/react';
import { CalcController } from '../calc/controller';
import { cellKey } from '../calc/engine/cellRef';
import type { WorkbookData } from '../calc/model/workbook';
import type { SharedOp } from '../collab/collabApi';
import { sameData } from '../collab/patch';

const h = vi.hoisted(() => ({
  log: [] as Array<{ seq: number; userId: string; clientId: string; patch: unknown[]; summary: Record<string, unknown>; createdAt: string }>,
  subs: new Set<(op: unknown) => void>(),
  failAppend: 0,
  appended: 0,
  snapshots: [] as number[],
  summaries: [] as unknown[],
  calls: [] as string[],
  versions: [] as Array<{ seq: number; label: string; note: unknown }>,
}));

vi.mock('../collab/collabApi', () => ({
  appendOp: async (_id: string, clientId: string, patch: unknown[], summary: unknown) => {
    h.summaries.push(summary);
    if (h.failAppend > 0) {
      h.failAppend -= 1;
      throw new Error('mất mạng');
    }
    h.appended += 1;
    // Tài liệu tạo ra ở số thứ tự 1 (chưa có thao tác nào), nên thao tác đầu tiên mang số 2.
    const op = { seq: (h.log.at(-1)?.seq ?? 1) + 1, userId: 'u', clientId, patch, summary: {}, createdAt: '' };
    h.log.push(op);
    queueMicrotask(() => h.subs.forEach((sub) => sub(op)));
    return op.seq;
  },
  listOps: async (_id: string, after: number) => h.log.filter((op) => op.seq > after),
  saveVersion: async (_id: string, seq: number, label: string, data: { sheets: Array<{ cells: unknown[] }> }) => {
    h.calls.push('saveVersion');
    h.versions.push({ seq, label, note: data.sheets[0].cells.length });
    return h.versions.length;
  },
  restoreVersion: async (_id: string, versionId: number) => {
    h.calls.push(`restore:${versionId}`);
    return 99;
  },
  renameDocument: async (_id: string, title: string) => {
    h.calls.push(`rename:${title}`);
    return 98;
  },
  saveSnapshot: async (_id: string, seq: number) => {
    h.snapshots.push(seq);
  },
  subscribeOps: (_id: string, onOp: (op: unknown) => void, onStatus?: (s: string) => void) => {
    h.subs.add(onOp);
    queueMicrotask(() => onStatus?.('SUBSCRIBED'));
    return () => h.subs.delete(onOp);
  },
}));

import { useCollabSession } from '../collab/useCollabSession';

// Máy tải nặng (chạy cả bộ test song song) có thể làm trễ bộ đếm 300 ms; đừng để chờ ngắn gây lỗi giả.
configure({ asyncUtilTimeout: 6000 });

const blank = (): WorkbookData => new CalcController().wb.toData();

function edit(c: CalcController, row: number, col: number, text: string) {
  c.select(row, col);
  c.startEdit(text);
  c.commitEdit(null);
}
const raw = (c: CalcController, row: number, col: number) => c.wb.getCell(0, row, col)?.raw;

interface Client {
  ctrl: CalcController;
  hook: ReturnType<typeof renderHook<ReturnType<typeof useCollabSession>, unknown>>;
  onReset: ReturnType<typeof vi.fn>;
}

function join(initial: WorkbookData, seq: number, canWrite = true, onTitle?: (t: string) => void): Client {
  const ctrl = new CalcController();
  ctrl.load(initial);
  const onReset = vi.fn();
  const hook = renderHook(() => useCollabSession({ id: 'doc', controller: ctrl, initialData: initial, initialSeq: seq, canWrite, onReset, onTitle }));
  return { ctrl, hook, onReset };
}

beforeEach(() => {
  h.log = [];
  h.subs = new Set();
  h.failAppend = 0;
  h.appended = 0;
  h.snapshots = [];
  h.summaries = [];
  h.calls = [];
  h.versions = [];
});
afterEach(cleanup);

describe('useCollabSession', () => {
  it('nháp riêng (không có mã): không gửi gì, không nghe gì', async () => {
    const ctrl = new CalcController();
    renderHook(() => useCollabSession({ id: null, controller: ctrl, initialData: null, initialSeq: 0, canWrite: true, onReset: () => {} }));
    edit(ctrl, 0, 0, 'x');
    await new Promise((r) => setTimeout(r, 450));
    expect(h.appended).toBe(0);
    expect(h.subs.size).toBe(0);
  });

  it('sửa ở máy A: gộp trong 300 ms rồi gửi một thao tác; máy B thấy ngay, nhãn trạng thái về "saved"', async () => {
    const base = blank();
    const a = join(base, 1);
    const b = join(base, 1);
    act(() => {
      edit(a.ctrl, 0, 0, 'một');
      edit(a.ctrl, 1, 0, 'hai');
      edit(a.ctrl, 2, 0, 'ba');
    });
    expect(h.appended).toBe(0);
    await waitFor(() => expect(raw(b.ctrl, 2, 0)).toBe('ba'), { timeout: 6000 });
    expect(h.appended).toBe(1);
    expect([raw(b.ctrl, 0, 0), raw(b.ctrl, 1, 0)]).toEqual(['một', 'hai']);
    await waitFor(() => expect(a.hook.result.current.status).toBe('saved'));
    expect(a.hook.result.current.live).toBe(true);
  });

  it('mỗi thao tác gửi kèm tóm tắt cho nhật ký, và số thứ tự hiện hành tăng theo', async () => {
    const a = join(blank(), 1);
    act(() => edit(a.ctrl, 2, 1, 'ghi nhật ký'));
    await waitFor(() => expect(h.log).toHaveLength(1));
    expect(h.summaries[0]).toMatchObject({ cellCount: 1, cells: [{ sheet: 'Sheet1', ref: 'B3', value: 'ghi nhật ký' }] });
    await waitFor(() => expect(a.hook.result.current.seq).toBe(2));
  });

  it('sửa lại một ô đã có giá trị: tóm tắt ghi cả giá trị cũ', async () => {
    const a = join(blank(), 1);
    act(() => edit(a.ctrl, 0, 0, 'lần một'));
    await waitFor(() => expect(h.log).toHaveLength(1));
    await waitFor(() => expect(a.hook.result.current.status).toBe('saved'));
    act(() => edit(a.ctrl, 0, 0, 'lần hai'));
    await waitFor(() => expect(h.log).toHaveLength(2));
    expect(h.summaries[0]).toMatchObject({ cells: [{ ref: 'A1', value: 'lần một', old: '' }] });
    expect(h.summaries[1]).toMatchObject({ cells: [{ ref: 'A1', value: 'lần hai', old: 'lần một' }] });
  });

  it('hai máy sửa hai ô khác nhau cùng lúc: cả hai ô có ở cả hai máy, hai máy giống nhau', async () => {
    const base = blank();
    const a = join(base, 1);
    const b = join(base, 1);
    act(() => {
      edit(a.ctrl, 0, 0, 'của A');
      edit(b.ctrl, 5, 5, 'của B');
    });
    await waitFor(() => expect([raw(a.ctrl, 5, 5), raw(b.ctrl, 0, 0)]).toEqual(['của B', 'của A']), { timeout: 6000 });
    await waitFor(() => expect(sameData(a.ctrl.wb.toData(), b.ctrl.wb.toData())).toBe(true));
    expect(h.log).toHaveLength(2);
  });

  it('hai máy sửa cùng một ô: hội tụ về cùng giá trị (thao tác có số thứ tự lớn hơn thắng)', async () => {
    const base = blank();
    const a = join(base, 1);
    const b = join(base, 1);
    act(() => {
      edit(a.ctrl, 3, 3, 'A');
      edit(b.ctrl, 3, 3, 'B');
    });
    await waitFor(() => expect(h.log).toHaveLength(2), { timeout: 6000 });
    const winner = (h.log[1].patch[0] as { set: Array<[number, string]> }).set.find(([k]) => k === cellKey(3, 3))![1];
    await waitFor(() => expect([raw(a.ctrl, 3, 3), raw(b.ctrl, 3, 3)]).toEqual([winner, winner]));
  });

  it('người chỉ xem vẫn nhận thay đổi của người khác nhưng không bao giờ gửi', async () => {
    const base = blank();
    const writer = join(base, 1);
    const viewer = join(base, 1, false);
    act(() => edit(writer.ctrl, 0, 0, 'cho người xem'));
    await waitFor(() => expect(raw(viewer.ctrl, 0, 0)).toBe('cho người xem'), { timeout: 6000 });
    act(() => edit(viewer.ctrl, 9, 9, 'lén'));
    await new Promise((r) => setTimeout(r, 450));
    expect(h.log).toHaveLength(1);
  });

  it('thay đổi từ xa đến khi mình có sửa chưa gửi: sửa của mình không bị ghi đè và vẫn được gửi', async () => {
    const base = blank();
    const a = join(base, 1);
    const b = join(base, 1);
    act(() => {
      edit(b.ctrl, 0, 0, 'của B');
    });
    await waitFor(() => expect(raw(a.ctrl, 0, 0)).toBe('của B'), { timeout: 6000 });
    // A sửa rồi ngay lập tức B gửi thêm: thay đổi từ xa chen vào trong khoảng gộp 300 ms của A
    act(() => {
      edit(a.ctrl, 7, 7, 'chưa gửi của A');
      edit(b.ctrl, 1, 1, 'B thêm');
    });
    await waitFor(() => expect(raw(a.ctrl, 1, 1)).toBe('B thêm'), { timeout: 6000 });
    expect(raw(a.ctrl, 7, 7)).toBe('chưa gửi của A');
    await waitFor(() => expect(raw(b.ctrl, 7, 7)).toBe('chưa gửi của A'), { timeout: 6000 });
  });

  it('khi nối (SUBSCRIBED) tải bù các thao tác đã có sau số thứ tự lúc mở', async () => {
    const base = blank();
    const other = join(base, 1);
    act(() => edit(other.ctrl, 0, 0, 'đã có từ trước'));
    await waitFor(() => expect(h.log).toHaveLength(1), { timeout: 6000 });
    const late = join(base, 1); // mở với bản cũ ở số thứ tự 1; nhật ký đã có thao tác số 2
    await waitFor(() => expect(raw(late.ctrl, 0, 0)).toBe('đã có từ trước'));
  });

  it('gửi thất bại: báo failed kèm lỗi, tự thử lại và cuối cùng gửi được đúng một lần', async () => {
    const a = join(blank(), 1);
    h.failAppend = 1;
    act(() => edit(a.ctrl, 0, 0, 'thử lại'));
    await waitFor(() => expect(a.hook.result.current.status).toBe('failed'), { timeout: 6000 });
    expect(a.hook.result.current.error).toBe('mất mạng');
    await waitFor(() => expect(a.hook.result.current.status).toBe('saved'), { timeout: 5000 });
    expect(h.log).toHaveLength(1);
    expect(a.hook.result.current.error).toBeNull();
  }, 10_000);

  it('flush gửi ngay những gì đang chờ, không đợi hết 300 ms', async () => {
    const a = join(blank(), 1);
    act(() => edit(a.ctrl, 0, 0, 'gửi ngay'));
    expect(h.log).toHaveLength(0);
    let done = false;
    await act(async () => {
      done = await a.hook.result.current.flush();
    });
    expect(done).toBe(true);
    expect(h.log).toHaveLength(1);
  });

  it('người khác khôi phục cả bảng tính (thao tác reset): gọi onReset, không áp thao tác đó', async () => {
    const a = join(blank(), 1);
    await waitFor(() => expect(h.subs.size).toBe(1));
    const reset = { seq: 2, userId: 'u', clientId: 'người-khác', patch: [{ t: 'reset' }], summary: {}, createdAt: '' } as unknown as SharedOp;
    h.log.push(reset);
    act(() => h.subs.forEach((sub) => sub(reset)));
    expect(a.onReset).toHaveBeenCalledTimes(1);
  });

  it('lưu mốc: gửi hết thay đổi chưa gửi trước, rồi lưu bản máy chủ ở đúng số thứ tự', async () => {
    const a = join(blank(), 1);
    act(() => edit(a.ctrl, 0, 0, 'có trong mốc'));
    await act(async () => {
      await a.hook.result.current.saveMilestone('Chốt');
    });
    expect(h.log).toHaveLength(1);
    expect(h.versions).toEqual([{ seq: 2, label: 'Chốt', note: 1 }]);
  });

  it('khôi phục: tự lưu bản hiện tại thành mốc an toàn trước, rồi mới khôi phục, rồi báo màn tải lại', async () => {
    const a = join(blank(), 1);
    act(() => edit(a.ctrl, 0, 0, 'hiện tại'));
    await act(async () => {
      await a.hook.result.current.restore(7, 'Trước khi khôi phục');
    });
    expect(h.calls).toEqual(['saveVersion', 'restore:7']);
    expect(h.versions[0]).toMatchObject({ label: 'Trước khi khôi phục', seq: 2 });
    expect(a.onReset).toHaveBeenCalledTimes(1);
  });

  it('khôi phục bị hủy khi không lưu được mốc an toàn: không khôi phục, không tải lại', async () => {
    const a = join(blank(), 1);
    h.failAppend = 99;
    act(() => edit(a.ctrl, 0, 0, 'chưa gửi được'));
    await act(async () => {
      await expect(a.hook.result.current.restore(7, 'x')).rejects.toThrow(/chưa gửi được/);
    });
    expect(h.calls).toEqual([]);
    expect(a.onReset).not.toHaveBeenCalled();
  });

  it('đổi tên: gọi hàm đổi tên; người khác đổi tên thì nhận tên mới, còn tên do chính mình đổi không làm dựng lại bảng', async () => {
    const titles: string[] = [];
    const a = join(blank(), 1, true, (t) => titles.push(t));
    await waitFor(() => expect(h.subs.size).toBe(1));
    await act(async () => {
      await a.hook.result.current.rename('Tên mới');
    });
    expect(h.calls).toEqual(['rename:Tên mới']);
    act(() => edit(a.ctrl, 0, 0, 'đang gõ'));
    const rename = { seq: 2, userId: 'u', clientId: '', patch: [], summary: { kind: 'rename', title: 'Tên do người khác' }, createdAt: '' } as unknown as SharedOp;
    h.log.push(rename);
    act(() => h.subs.forEach((sub) => sub(rename)));
    expect(titles).toEqual(['Tên do người khác']);
    expect(raw(a.ctrl, 0, 0)).toBe('đang gõ');
  });

  it('dọn: rời màn thì hủy nghe Realtime và gửi nốt phần chưa gửi', async () => {
    const a = join(blank(), 1);
    await waitFor(() => expect(h.subs.size).toBe(1));
    act(() => edit(a.ctrl, 0, 0, 'trước khi rời'));
    a.hook.unmount();
    await waitFor(() => expect(h.log).toHaveLength(1));
    expect(h.subs.size).toBe(0);
  });
});
