import { describe, it, expect, vi, beforeEach } from 'vitest';

type Result = { data?: unknown; error?: { code?: string; message: string } | null };

function builder(result: Result) {
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'or', 'delete']) b[m] = vi.fn(() => b);
  b.then = (ok: (v: Result) => unknown, fail: (e: unknown) => unknown) =>
    Promise.resolve({ data: null, error: null, ...result }).then(ok, fail);
  return b;
}

const queue: Record<string, ReturnType<typeof builder>[]> = {};
const fromMock = vi.fn((table: string) => {
  const next = queue[table]?.shift();
  if (!next) throw new Error(`Không có builder giả cho bảng ${table}`);
  return next;
});

vi.mock('../../supabase', () => ({ supabase: { from: (t: string) => fromMock(t) } }));

import { deleteCollateralAPI } from '../collateralApi';
import { deleteCreditContractAPI } from '../creditContractApi';

const FK_TS = { code: '23503', message: 'update or delete on table "Collaterals" violates foreign key constraint "fk_mortgage_link_collateral" on table "MortgageContractCollaterals"' };
const FK_HDTD = { code: '23503', message: 'update or delete on table "CreditContracts" violates foreign key constraint "fk_mortgage_link_credit_contract" on table "MortgageContractCreditContracts"' };

beforeEach(() => {
  vi.clearAllMocks();
  for (const k of Object.keys(queue)) delete queue[k];
});

describe('xoá bản ghi đang nằm trong hợp đồng thế chấp', () => {
  it('xoá tài sản đang thế chấp: thông báo tiếng Việt, không lộ lỗi khoá ngoại', async () => {
    queue.LoanContracts = [builder({ data: [] })];
    queue.Collaterals = [builder({ error: FK_TS })];
    await expect(deleteCollateralAPI(3)).rejects.toThrow('Không thể xoá: tài sản đang nằm trong hợp đồng thế chấp. Gỡ tài sản khỏi HĐTC trước.');
  });

  it('xoá HĐTD đang được bảo đảm: không báo nhầm "còn KUNN"', async () => {
    queue.CreditContracts = [builder({ error: FK_HDTD })];
    const err = await deleteCreditContractAPI(9).catch(e => e);
    expect(err.message).toMatch(/đang được bảo đảm bởi hợp đồng thế chấp/);
    expect(fromMock).not.toHaveBeenCalledWith('LoanContracts');
  });
});
