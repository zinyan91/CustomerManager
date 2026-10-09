// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { cellKey } from '../calc/engine/cellRef';
import type { Patch } from '../collab/patch';
import { parseSummary, summarizePatch } from '../collab/summary';

const h = vi.hoisted(() => ({
  ops: [] as Array<{ seq: number; userId: string; clientId: string; patch: unknown[]; summary: unknown; createdAt: string }>,
  after: [] as number[],
  fail: null as null | Error,
}));

vi.mock('../collab/collabApi', () => ({
  listInvitableUsers: async () => [
    { id: 'u2', fullName: 'Bình' },
    { id: 'u3', fullName: '' },
  ],
  listOps: async (_id: string, after: number) => {
    h.after.push(after);
    if (h.fail) throw h.fail;
    return h.ops;
  },
}));

import { LanguageProvider } from '../../context/LanguageContext';
import { ActivityPanel } from '../collab/ActivityPanel';

describe('summarizePatch', () => {
  it('ô đặt và xóa: ghi tối đa 5 ô kèm vị trí, đếm đủ số ô, cắt giá trị dài', () => {
    const patch: Patch = [{ t: 'cells', sheet: 'Sheet1', set: [[cellKey(1, 1), 'x'.repeat(100), null], [cellKey(0, 0), '=A2+1', null], [cellKey(2, 0), '7', null], [cellKey(3, 0), '8', null], [cellKey(4, 0), '9', null], [cellKey(5, 0), '10', null]], del: [cellKey(9, 9)] }];
    const summary = summarizePatch(patch);
    expect(summary.cellCount).toBe(7);
    expect(summary.cells).toHaveLength(5);
    expect(summary.cells[0]).toEqual({ sheet: 'Sheet1', ref: 'B2', value: 'x'.repeat(60) });
    expect(summary.cells[1]).toEqual({ sheet: 'Sheet1', ref: 'A1', value: '=A2+1' });
  });

  it('xóa ô ghi giá trị rỗng; các thay đổi khác ghi theo loại và tên', () => {
    const summary = summarizePatch([
      { t: 'cells', sheet: 'S', set: [], del: [cellKey(0, 2)] },
      { t: 'keyed', sheet: 'S', prop: 'colWidths', set: [[0, 100]], del: [] },
      { t: 'prop', sheet: 'S', prop: 'protected', value: true },
      { t: 'renameSheet', from: 'A', to: 'B' },
      { t: 'removeSheet', sheet: 'C' },
      { t: 'order', names: ['B'] },
    ]);
    expect(summary.cells).toEqual([{ sheet: 'S', ref: 'C1', value: '' }]);
    expect(summary.changes).toEqual([
      { kind: 'colWidths', name: 'S' },
      { kind: 'prop', name: 'protected' },
      { kind: 'renameSheet', name: 'A', to: 'B' },
      { kind: 'removeSheet', name: 'C' },
      { kind: 'order', name: '' },
    ]);
  });

  it('đọc lại tóm tắt: chấp nhận đúng dạng, dữ liệu lạ trả null', () => {
    const summary = summarizePatch([{ t: 'order', names: [] }]);
    expect(parseSummary(JSON.parse(JSON.stringify(summary)))).toEqual(summary);
    expect(parseSummary({})).toBeNull();
    expect(parseSummary(null)).toBeNull();
    expect(parseSummary({ cellCount: 1, cells: 'x', changes: [] })).toBeNull();
  });
});

const op = (seq: number, userId: string, summary: unknown, patch: unknown[] = []) => ({ seq, userId, clientId: 'c', patch, summary, createdAt: '2026-10-09T01:00:00Z' });
const cellSummary = (ref: string, value: string) => ({ cellCount: 1, cells: [{ sheet: 'Sheet1', ref, value }], changes: [] });

const dung = (seq = 10) =>
  render(
    <LanguageProvider>
      <ActivityPanel docId="d1" seq={seq} me={{ id: 'u1', name: 'Lan' }} onClose={() => {}} />
    </LanguageProvider>,
  );

beforeEach(() => {
  h.after = [];
  h.fail = null;
  h.ops = [];
});
afterEach(cleanup);

describe('ngăn Nhật ký', () => {
  it('liệt kê mới nhất trước, ghi tên người (mình là tên của mình), vị trí ô và giá trị mới', async () => {
    h.ops = [op(8, 'u2', cellSummary('B2', 'xin chào')), op(9, 'u1', cellSummary('A1', '=SUM(B1:B3)')), op(10, 'u3', { cellCount: 0, cells: [], changes: [{ kind: 'renameSheet', name: 'A', to: 'B' }] })];
    dung();
    const items = within(await screen.findByRole('list')).getAllByRole('listitem');
    expect(items.map((i) => i.textContent)).toEqual([
      expect.stringContaining('Một người dùng'),
      expect.stringContaining('Lan'),
      expect.stringContaining('Bình'),
    ]);
    expect(items[0].textContent).toContain('Đổi tên trang tính: A → B');
    expect(items[1].textContent).toContain('Sheet1!A1: =SUM(B1:B3)');
    expect(items[2].textContent).toContain('Sheet1!B2: xin chào');
  });

  it('chỉ nạp phần đuôi: gọi từ số thứ tự (hiện hành − 200), không âm; nạp lại khi số thứ tự đổi', async () => {
    dung(10);
    await waitFor(() => expect(h.after).toEqual([0]));
    cleanup();
    h.after = [];
    const view = dung(500);
    await waitFor(() => expect(h.after).toEqual([300]));
    view.rerender(
      <LanguageProvider>
        <ActivityPanel docId="d1" seq={501} me={{ id: 'u1', name: 'Lan' }} onClose={() => {}} />
      </LanguageProvider>,
    );
    await waitFor(() => expect(h.after).toEqual([300, 301]));
  });

  it('thao tác khôi phục, thao tác không có tóm tắt, ô bị xóa và số ô còn lại đều có chữ rõ ràng', async () => {
    h.ops = [
      op(7, 'u2', { kind: 'reset' }, [{ t: 'reset' }]),
      op(8, 'u2', {}),
      op(9, 'u2', { cellCount: 8, cells: [{ sheet: 'S', ref: 'A1', value: '' }, { sheet: 'S', ref: 'A2', value: 'x' }], changes: [] }),
    ];
    dung();
    const text = (await screen.findByRole('list')).textContent!;
    expect(text).toContain('Khôi phục cả bảng tính');
    expect(text).toContain('Thay đổi');
    expect(text).toContain('S!A1: (đã xóa)');
    expect(text).toContain('và 6 ô khác');
  });

  it('lọc theo người chỉ hiện khi có từ hai người trở lên', async () => {
    h.ops = [op(8, 'u2', cellSummary('A1', 'a'))];
    dung();
    await screen.findByRole('list');
    expect(screen.queryByLabelText('Lọc theo người')).toBeNull();
    cleanup();
    h.ops = [op(8, 'u2', cellSummary('A1', 'a')), op(9, 'u1', cellSummary('A2', 'b'))];
    dung();
    const filter = (await screen.findByLabelText('Lọc theo người')) as HTMLSelectElement;
    fireEvent.change(filter, { target: { value: 'u2' } });
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items).toHaveLength(1);
    expect(items[0].textContent).toContain('Bình');
  });

  it('chưa có thay đổi thì nói rõ; lỗi tải hiện nguyên thông điệp, không nhầm với "chưa có"', async () => {
    dung();
    expect(await screen.findByText('Chưa có thay đổi nào.')).toBeTruthy();
    cleanup();
    h.fail = new Error('Không đọc được nhật ký thay đổi: mất mạng');
    dung();
    expect((await screen.findByRole('alert')).textContent).toContain('mất mạng');
    expect(screen.queryByText('Chưa có thay đổi nào.')).toBeNull();
  });
});
