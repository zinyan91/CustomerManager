import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ rows: {} as Record<string, number>, ranges: [] as Array<{ table: string; from: number; to: number }> }));

vi.mock('../../supabase', () => ({
  supabase: {
    from: (table: string) => {
      let range: [number, number] | null = null;
      const builder: Record<string, unknown> = {};
      for (const op of ['select', 'eq', 'in', 'is', 'order']) builder[op] = () => builder;
      builder.range = (from: number, to: number) => { range = [from, to]; h.ranges.push({ table, from, to }); return builder; };
      builder.then = (resolve: (v: unknown) => unknown) => {
        const total = h.rows[table] ?? 0;
        const [from, to] = range ?? [0, Math.min(total, 1000) - 1];
        const data = Array.from({ length: Math.max(0, Math.min(to, total - 1) - from + 1) }, (_, i) => ({ Id: from + i + 1, PledgeLoanId: 1 }));
        return resolve({ data, error: null });
      };
      return builder;
    },
  },
}));

import { fetchAllPledgeLoanBundlesAPI } from '../pledgeLoanApi';

beforeEach(() => {
  h.ranges = [];
  h.rows = { PledgeLoans: 1005, SavingsBooks: 1200, PledgeLoanSavingsBooks: 3, PledgeLoanRepayments: 1001 };
});

describe('fetchAllPledgeLoanBundlesAPI đọc hết các trang', () => {
  it('không bị cắt ở 1000 dòng', async () => {
    const b = await fetchAllPledgeLoanBundlesAPI({ kind: 'all' });
    expect(b.loans).toHaveLength(1005);
    expect(b.books).toHaveLength(1200);
    expect(b.repayments.length).toBeGreaterThan(1000);
    expect(h.ranges.filter((r) => r.table === 'PledgeLoans').map((r) => r.from)).toEqual([0, 1000]);
  });
});
