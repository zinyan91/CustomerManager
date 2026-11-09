// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

const h = vi.hoisted(() => ({
  fetch: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
}));
vi.mock('../../lib/inventoryDebtDb', () => ({
  fetchInventoryDebtsDb: h.fetch,
  saveInventoryDebtDb: h.save,
  deleteInventoryDebtDb: h.remove,
}));

import { useInventoryDebts } from '../useInventoryDebts';

const debt = { id: 'p1', code: 'NCC01', name: 'Xi măng', beginningDebit: 0, beginningCredit: 150, occurredDebit: 0, occurredCredit: 0 };

beforeEach(() => {
  h.fetch.mockReset();
  h.save.mockReset().mockResolvedValue(undefined);
  h.remove.mockReset().mockResolvedValue(undefined);
});

describe('useInventoryDebts', () => {
  it('tải công nợ đã lưu theo ngành hàng', async () => {
    h.fetch.mockResolvedValue({ receivable: [], payable: [debt] });
    const { result } = renderHook(() => useInventoryDebts('HTK Lúa Gạo', vi.fn()));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(h.fetch).toHaveBeenCalledWith('HTK Lúa Gạo');
    expect(result.current.payables).toEqual([debt]);
    expect(result.current.error).toBeNull();
  });

  it('lỗi tải hiện nguyên thông điệp, không giả làm danh sách rỗng hợp lệ', async () => {
    h.fetch.mockRejectedValue(new Error('relation "public.InventoryDebtItems" does not exist'));
    const { result } = renderHook(() => useInventoryDebts('HTK', vi.fn()));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('relation "public.InventoryDebtItems" does not exist');
  });

  it('sửa một ô thì lưu đúng dòng đã cập nhật; lưu lỗi thì báo', async () => {
    h.fetch.mockResolvedValue({ receivable: [], payable: [debt] });
    h.save.mockRejectedValue(new Error('permission denied'));
    const notify = vi.fn();
    const { result } = renderHook(() => useInventoryDebts('HTK', notify));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.updateDebt('payable', 'p1', { occurredDebit: 50 }));
    expect(result.current.payables[0].occurredDebit).toBe(50);
    expect(h.save).toHaveBeenCalledWith({ ...debt, occurredDebit: 50 }, 'payable', 'HTK');
    await waitFor(() => expect(notify).toHaveBeenCalledWith('error', 'Chưa lưu được "Xi măng": permission denied'));
  });

  it('thêm lên đầu danh sách và xóa trên CSDL', async () => {
    h.fetch.mockResolvedValue({ receivable: [debt], payable: [] });
    const { result } = renderHook(() => useInventoryDebts('HTK', vi.fn()));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const added = { ...debt, id: 'r2', name: 'Mới' };
    act(() => result.current.addDebt('receivable', added));
    expect(result.current.receivables.map(d => d.id)).toEqual(['r2', 'p1']);
    act(() => result.current.removeDebt('receivable', 'p1'));
    expect(result.current.receivables.map(d => d.id)).toEqual(['r2']);
    expect(h.remove).toHaveBeenCalledWith('p1');
  });
});
