import { describe, it, expect, beforeEach, vi } from 'vitest';

const h = vi.hoisted(() => ({
  pages: [] as unknown[][],
  ranges: [] as [number, number][],
  error: null as { message: string } | null,
  upsert: vi.fn(),
  deleteEq: vi.fn(),
}));

vi.mock('../supabase', () => {
  const query: any = {
    select: () => query,
    eq: () => query,
    order: () => query,
    range: (from: number, to: number) => {
      h.ranges.push([from, to]);
      return Promise.resolve({ data: h.error ? null : h.pages.shift() ?? [], error: h.error });
    },
  };
  return {
    supabase: {
      from: () => ({
        ...query,
        upsert: h.upsert,
        delete: () => ({ eq: h.deleteEq }),
      }),
    },
  };
});

import { debtToRow, deleteInventoryDebtDb, fetchInventoryDebtsDb, saveInventoryDebtDb } from '../inventoryDebtDb';
import { parseSortState } from '../tableSort';
import { DEBT_SORT_KEYS } from '../inventoryLedgerSort';

const row = (id: string, kind: string) => ({
  Id: id, Kind: kind, CategoryName: 'HTK', Code: id, Name: `Đối tác ${id}`,
  BeginningDebit: '0', BeginningCredit: '150000000', OccurredDebit: '0', OccurredCredit: '0',
});

beforeEach(() => {
  h.pages = [];
  h.ranges = [];
  h.error = null;
  h.upsert.mockReset();
  h.deleteEq.mockReset();
});

describe('lưu công nợ Hàng tồn kho', () => {
  it('đọc theo trang khi vượt 1000 dòng và tách phải thu / phải trả, số chuyển từ chuỗi', async () => {
    h.pages = [
      Array.from({ length: 1000 }, (_, i) => row(`p${i}`, 'payable')),
      [row('r1', 'receivable'), row('p1000', 'payable')],
    ];
    const result = await fetchInventoryDebtsDb('HTK');
    expect(h.ranges).toEqual([[0, 999], [1000, 1999]]);
    expect(result.payable).toHaveLength(1001);
    expect(result.receivable).toEqual([{
      id: 'r1', code: 'r1', name: 'Đối tác r1',
      beginningDebit: 0, beginningCredit: 150_000_000, occurredDebit: 0, occurredCredit: 0,
    }]);
  });

  it('lỗi đọc báo nguyên thông điệp của CSDL', async () => {
    h.error = { message: 'relation "public.InventoryDebtItems" does not exist' };
    await expect(fetchInventoryDebtsDb('HTK')).rejects.toThrow('relation "public.InventoryDebtItems" does not exist');
  });

  it('lưu ghi đủ loại, ngành hàng và số tiền; lỗi lưu, lỗi xóa không bị nuốt', async () => {
    const item = { id: 'x', code: 'NCC1', name: 'Xi măng', beginningDebit: 0, beginningCredit: 5, occurredDebit: 1, occurredCredit: 2 };
    expect(debtToRow(item, 'payable', 'HTK')).toMatchObject({ Id: 'x', Kind: 'payable', CategoryName: 'HTK', BeginningCredit: 5, OccurredCredit: 2 });
    h.upsert.mockResolvedValue({ error: { message: 'permission denied for table InventoryDebtItems' } });
    await expect(saveInventoryDebtDb(item, 'payable', 'HTK')).rejects.toThrow('permission denied');
    h.deleteEq.mockResolvedValue({ error: { message: 'mất kết nối' } });
    await expect(deleteInventoryDebtDb('x')).rejects.toThrow('mất kết nối');
  });
});

describe('nhớ kiểu sắp xếp', () => {
  it('chỉ nhận cột và chiều hợp lệ', () => {
    expect(parseSortState({ key: 'endingCredit', direction: 'desc' }, DEBT_SORT_KEYS)).toEqual({ key: 'endingCredit', direction: 'desc' });
    expect(parseSortState({ key: 'unitPrice', direction: 'asc' }, DEBT_SORT_KEYS)).toBeNull();
    expect(parseSortState({ key: 'name', direction: 'sideways' }, DEBT_SORT_KEYS)).toBeNull();
    expect(parseSortState('rác', DEBT_SORT_KEYS)).toBeNull();
    expect(parseSortState(null, DEBT_SORT_KEYS)).toBeNull();
  });
});
