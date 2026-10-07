import { describe, expect, it } from 'vitest';
import {
  confirmQuestion, parseTransferCounts, toggleAll, toggleSelected, transferBlocker, transferTargets, transferWarning,
  type TransferCounts, type TransferCustomer,
} from '../customerTransfer';
import type { AdminUser } from '../userAdmin';

const user = (id: string, role: AdminUser['role'], extra: Partial<AdminUser> = {}): AdminUser => ({
  id, email: `${id}@app.local`, fullName: id, role, disabled: false, lastSignInAt: null, createdAt: '2026-10-01T00:00:00Z', ...extra,
});

const COUNTS: TransferCounts = {
  customers: 2, creditContracts: 3, loans: 4, collaterals: 0, mortgages: 1, cards: 0, postLoan: 0, dispatches: 1,
};

describe('parseTransferCounts', () => {
  it('đọc đủ tám số liệu, bỏ trường thừa như transferId', () => {
    expect(parseTransferCounts({ ...COUNTS, transferId: 9 })).toEqual(COUNTS);
  });
  it('thiếu hoặc sai kiểu thì báo lỗi, không đoán thành 0', () => {
    expect(() => parseTransferCounts({ ...COUNTS, loans: undefined })).toThrow(/"loans"/);
    expect(() => parseTransferCounts({ ...COUNTS, cards: '3' })).toThrow(/"cards"/);
    expect(() => parseTransferCounts({ ...COUNTS, cards: -1 })).toThrow(/"cards"/);
    expect(() => parseTransferCounts(null)).toThrow(/không hợp lệ/);
  });
});

describe('transferTargets', () => {
  const users = [user('a', 'master_admin'), user('b', 'user'), user('c', 'user', { disabled: true }), user('d', null), user('e', 'user_admin')];
  it('bỏ người chuyển, tài khoản bị khóa và tài khoản chưa có vai trò', () => {
    expect(transferTargets(users, 'b').map((u) => u.id)).toEqual(['a', 'e']);
  });
  it('chưa chọn người chuyển thì giữ mọi tài khoản nhận được', () => {
    expect(transferTargets(users, null).map((u) => u.id)).toEqual(['a', 'b', 'e']);
  });
});

describe('transferBlocker', () => {
  it.each([
    [{ fromId: null, toId: 'b', selectedCount: 1 }, 'Chọn người chuyển.'],
    [{ fromId: 'a', toId: null, selectedCount: 1 }, 'Chọn người nhận.'],
    [{ fromId: 'a', toId: 'a', selectedCount: 1 }, 'Người chuyển và người nhận phải khác nhau.'],
    [{ fromId: 'a', toId: 'b', selectedCount: 0 }, 'Chọn ít nhất một khách hàng.'],
    [{ fromId: 'a', toId: 'b', selectedCount: 3 }, null],
  ])('%j', (input, expected) => expect(transferBlocker(input)).toBe(expected));
});

describe('transferWarning', () => {
  it('người nhận không có module Hồ sơ tín dụng thì cảnh báo', () => {
    expect(transferWarning(user('b', 'user'), ['dispatch'])).toMatch(/Hồ sơ tín dụng/);
    expect(transferWarning(user('b', 'user'), [])).toMatch(/Hồ sơ tín dụng/);
  });
  it('chưa có dòng cờ, có module credit, hoặc là quản trị thì không cảnh báo', () => {
    expect(transferWarning(user('b', 'user'), undefined)).toBeNull();
    expect(transferWarning(user('b', 'user'), ['credit'])).toBeNull();
    expect(transferWarning(user('a', 'user_admin'), [])).toBeNull();
  });
  it('chưa chọn người nhận thì không cảnh báo', () => {
    expect(transferWarning(null, [])).toBeNull();
  });
});

describe('chọn khách', () => {
  const customers: TransferCustomer[] = [1, 2, 3].map((id) => ({ id, cif: `C${id}`, name: `K${id}` }));

  it('toggleSelected bật tắt từng khách, không sửa tập cũ', () => {
    const base = new Set([1]);
    expect([...toggleSelected(base, 2)].sort()).toEqual([1, 2]);
    expect([...toggleSelected(base, 1)]).toEqual([]);
    expect([...base]).toEqual([1]);
  });
  it('toggleAll chọn hết khi chưa đủ, bỏ hết khi đã đủ', () => {
    expect([...toggleAll(customers, new Set([1]))].sort()).toEqual([1, 2, 3]);
    expect([...toggleAll(customers, new Set([1, 2, 3]))]).toEqual([]);
  });
  it('danh sách rỗng thì không chọn được gì', () => {
    expect([...toggleAll([], new Set())]).toEqual([]);
  });
});

describe('confirmQuestion', () => {
  it('nêu số khách, các loại hồ sơ có số lượng, người chuyển và người nhận; bỏ loại bằng 0', () => {
    const q = confirmQuestion(COUNTS, 'An', 'Bình');
    expect(q).toContain('2 khách hàng');
    expect(q).toContain('3 hợp đồng tín dụng');
    expect(q).toContain('4 khoản vay (kunn)');
    expect(q).toContain('1 hợp đồng thế chấp');
    expect(q).toContain('1 văn bản văn thư gắn khách');
    expect(q).not.toContain('tài sản bảo đảm');
    expect(q).toContain('từ An sang Bình');
  });
  it('khách chưa có hồ sơ nào thì không có đoạn "cùng"', () => {
    const q = confirmQuestion({ ...COUNTS, creditContracts: 0, loans: 0, mortgages: 0, dispatches: 0 }, 'An', 'Bình');
    expect(q).not.toContain('cùng');
  });
});
