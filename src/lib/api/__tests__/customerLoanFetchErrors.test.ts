import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  ranges: [] as Array<[number, number]>,
  respond: (_table: string, _range: [number, number] | null): { data: unknown[] | null; error: { message: string } | null } => ({ data: [], error: null }),
}));

vi.mock('../../supabase', () => ({
  supabase: {
    from: (table: string) => {
      let range: [number, number] | null = null;
      const builder: Record<string, unknown> = {};
      for (const op of ['select', 'eq', 'is', 'order']) builder[op] = () => builder;
      builder.range = (from: number, to: number) => { range = [from, to]; h.ranges.push(range); return builder; };
      builder.then = (resolve: (v: unknown) => unknown) => resolve(h.respond(table, range));
      return builder;
    },
  },
}));
vi.mock('../customerApi', () => ({
  fetchCustomerIdsInScopeAPI: async () => null,
  unarchiveCustomer: async () => undefined,
}));

import { fetchContractsByCustomerAPI, fetchRepaymentSchedulesAPI } from '../loanContractApi';
import { fetchCreditContractsByCustomerAPI } from '../creditContractApi';

beforeEach(() => {
  h.ranges = [];
  h.respond = () => ({ data: [], error: null });
});

describe('API theo khách hàng không nuốt lỗi', () => {
  it.each([
    ['fetchContractsByCustomerAPI', () => fetchContractsByCustomerAPI(1), 'Không nạp được danh sách KUNN: permission denied'],
    ['fetchCreditContractsByCustomerAPI', () => fetchCreditContractsByCustomerAPI(1), 'Không nạp được danh sách HĐTD: permission denied'],
    ['fetchRepaymentSchedulesAPI', () => fetchRepaymentSchedulesAPI(1), 'Không nạp được lịch trả nợ: permission denied'],
  ])('%s ném lỗi kèm thông điệp của server', async (_name, run, message) => {
    h.respond = () => ({ data: null, error: { message: 'permission denied' } });
    await expect(run()).rejects.toThrow(message);
  });

  it('rỗng thật vẫn trả mảng rỗng', async () => {
    await expect(fetchContractsByCustomerAPI(1)).resolves.toEqual([]);
    await expect(fetchCreditContractsByCustomerAPI(1)).resolves.toEqual([]);
    await expect(fetchRepaymentSchedulesAPI(1)).resolves.toEqual([]);
  });
});

describe('fetchRepaymentSchedulesAPI đọc theo trang', () => {
  it('lịch hơn 1000 kỳ không bị cắt', async () => {
    h.respond = (_t, range) => {
      const [from] = range!;
      const n = from === 0 ? 1000 : from === 1000 ? 250 : 0;
      return { data: Array.from({ length: n }, (_, i) => ({ Id: from + i + 1 })), error: null };
    };
    const rows = await fetchRepaymentSchedulesAPI(1);
    expect(rows).toHaveLength(1250);
    expect(h.ranges).toEqual([[0, 999], [1000, 1999]]);
  });

  it('trang sau lỗi thì ném lỗi, không trả nửa lịch', async () => {
    h.respond = (_t, range) => range![0] === 0
      ? { data: Array.from({ length: 1000 }, (_, i) => ({ Id: i + 1 })), error: null }
      : { data: null, error: { message: 'timeout' } };
    await expect(fetchRepaymentSchedulesAPI(1)).rejects.toThrow('Không nạp được lịch trả nợ: timeout');
  });
});
