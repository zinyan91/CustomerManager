import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({ calls: [] as Array<{ table: string; ids: number[]; from: number }>, rows: {} as Record<string, number[]>, error: null as null | string }));

vi.mock('../../supabase', () => ({
  supabase: {
    from: (table: string) => {
      const ctx = { table, ids: [] as number[], from: 0 };
      const builder: Record<string, unknown> = {
        select: () => builder,
        in: (_c: string, ids: number[]) => ((ctx.ids = ids), builder),
        order: () => builder,
        range: async (from: number, to: number) => {
          h.calls.push({ ...ctx, from });
          if (h.error) return { data: null, error: { message: h.error } };
          const all = (h.rows[table] ?? []).filter((id) => ctx.ids.includes(id));
          return { data: all.slice(from, to + 1).map((CustomerId) => ({ CustomerId })), error: null };
        },
      };
      return builder;
    },
  },
}));

import { fetchCustomerProgressAPI } from '../customerProgressApi';

beforeEach(() => {
  h.calls = [];
  h.rows = {};
  h.error = null;
});

describe('fetchCustomerProgressAPI', () => {
  it('không có khách hàng thì không gọi DB', async () => {
    expect((await fetchCustomerProgressAPI([])).size).toBe(0);
    expect(h.calls).toHaveLength(0);
  });

  it('đọc ba bảng và ghép đúng tiến độ từng khách hàng', async () => {
    h.rows = { CreditContracts: [1, 1], LoanContracts: [2], Collaterals: [1, 3] };
    const map = await fetchCustomerProgressAPI([1, 2, 3]);
    expect(new Set(h.calls.map((c) => c.table))).toEqual(new Set(['CreditContracts', 'LoanContracts', 'Collaterals']));
    expect(map.get(1)).toEqual({ hdtd: true, kunn: false, tsdb: true });
    expect(map.get(2)).toEqual({ hdtd: false, kunn: true, tsdb: false });
    expect(map.get(3)).toEqual({ hdtd: false, kunn: false, tsdb: true });
  });

  it('chia mã khách hàng thành nhóm nhỏ để URL không quá dài', async () => {
    const ids = Array.from({ length: 450 }, (_, i) => i + 1);
    await fetchCustomerProgressAPI(ids);
    const perTable = h.calls.filter((c) => c.table === 'Collaterals');
    expect(perTable.map((c) => c.ids.length)).toEqual([200, 200, 50]);
  });

  it('đọc hết nhiều trang khi một bảng có hơn 1.000 dòng', async () => {
    h.rows = { Collaterals: Array.from({ length: 2300 }, () => 1) };
    await fetchCustomerProgressAPI([1]);
    expect(h.calls.filter((c) => c.table === 'Collaterals').map((c) => c.from)).toEqual([0, 1000, 2000]);
  });

  it('DB báo lỗi thì ném lỗi, không trả "chưa có hồ sơ"', async () => {
    h.error = 'permission denied';
    await expect(fetchCustomerProgressAPI([1])).rejects.toThrow(/Không đọc được .*permission denied/);
  });
});
