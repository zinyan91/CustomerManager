import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  rpc: vi.fn(),
  calls: [] as Array<{ table: string; op: string; args: unknown[] }>,
  result: { data: null as unknown, error: null as null | { code?: string; message: string } },
}));

vi.mock('../../supabase', () => ({
  supabase: {
    rpc: h.rpc,
    from: (table: string) => {
      const builder: Record<string, unknown> = {};
      for (const op of ['select', 'eq', 'in', 'is', 'order', 'insert', 'update', 'upsert']) {
        builder[op] = (...args: unknown[]) => (h.calls.push({ table, op, args }), builder);
      }
      builder.single = async () => h.result;
      builder.then = (resolve: (v: unknown) => unknown) => resolve(h.result);
      return builder;
    },
  },
}));

import { recordPledgeRepaymentAPI, savePledgeLoanAPI } from '../pledgeLoanApi';
import { saveSavingsBookAPI } from '../savingsBookApi';

beforeEach(() => {
  h.rpc.mockReset();
  h.calls = [];
  h.result = { data: null, error: null };
});

describe('savePledgeLoanAPI', () => {
  it('goi rpc save_pledge_loan voi khoan vay va lien ket', async () => {
    h.rpc.mockResolvedValue({ data: 42, error: null });
    const loan = { CustomerId: 1, ContractNumber: 'CC-1', Amount: 100, InterestRate: 6, DisbursementDate: '2026-10-01', DueDate: '2026-12-01' };
    const links = [{ SavingsBookId: 5, PrincipalCovered: 100 }];
    await expect(savePledgeLoanAPI(loan, links)).resolves.toBe(42);
    expect(h.rpc).toHaveBeenCalledWith('save_pledge_loan', { p_loan: loan, p_links: links });
  });

  it('trung so hop dong doi thanh cau tieng Viet', async () => {
    h.rpc.mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "PledgeLoans_ContractNumber_key"' } });
    await expect(savePledgeLoanAPI({ ContractNumber: ' CC-1 ' }, [])).rejects.toThrow('Số HĐ cầm cố "CC-1" đã tồn tại trên hệ thống.');
  });

  it('loi khac giu nguyen thong diep server', async () => {
    h.rpc.mockResolvedValue({ data: null, error: { code: 'P0001', message: 'Sổ STK-1 không thuộc khách hàng của khoản vay' } });
    await expect(savePledgeLoanAPI({ ContractNumber: 'CC-1' }, [])).rejects.toThrow('Sổ STK-1 không thuộc khách hàng của khoản vay');
  });
});

describe('recordPledgeRepaymentAPI', () => {
  it('goi rpc record_pledge_repayment', async () => {
    h.rpc.mockResolvedValue({ data: 7, error: null });
    const rep = { RepaymentDate: '2026-10-27', Kind: 'offset' as const, PrincipalPaid: 1, InterestPaid: 2, PenaltyPaid: 0, OffsetSavingsBookId: 5, Note: null };
    await expect(recordPledgeRepaymentAPI(9, rep, 534247)).resolves.toBe(7);
    expect(h.rpc).toHaveBeenCalledWith('record_pledge_repayment', { p_loan_id: 9, p_repayment: rep, p_book_closing_interest: 534247 });
  });

  it('loi giu nguyen thong diep', async () => {
    h.rpc.mockResolvedValue({ data: null, error: { code: 'P0001', message: 'Khoản vay đã tất toán' } });
    await expect(recordPledgeRepaymentAPI(9, { RepaymentDate: '2026-10-27', Kind: 'full', PrincipalPaid: 1, InterestPaid: 0, PenaltyPaid: 0, OffsetSavingsBookId: null, Note: null }, null))
      .rejects.toThrow('Khoản vay đã tất toán');
  });
});

describe('saveSavingsBookAPI', () => {
  it('tu tinh ngay dao han truoc khi luu', async () => {
    h.result = { data: { Id: 1 }, error: null };
    await saveSavingsBookAPI({ CustomerId: 1, BookNumber: 'STK-1', Amount: 1, OpenDate: '2026-04-15', Tenor: 12, TenorUnit: 'thang', InterestRate: 5 });
    const insert = h.calls.find((c) => c.op === 'insert');
    expect((insert?.args[0] as Record<string, unknown>).MaturityDate).toBe('2027-04-15');
  });

  it('sua so chi gui cot duoc sua va chi sua so chua tat toan', async () => {
    h.result = { data: { Id: 5 }, error: null };
    await saveSavingsBookAPI({
      Id: 5, CustomerId: 1, BookNumber: 'STK-1', Amount: 1, IsClosed: false, ClosedDate: null, ClosingInterest: null,
      MovedFromCollateralId: 11, CreatedAt: 'x',
    });
    const update = h.calls.find((c) => c.op === 'update')?.args[0] as Record<string, unknown>;
    for (const k of ['IsClosed', 'ClosedDate', 'ClosingInterest', 'MovedFromCollateralId', 'CreatedAt', 'CustomerId', 'Id']) {
      expect(update, k).not.toHaveProperty(k);
    }
    expect(h.calls.some((c) => c.op === 'eq' && c.args[0] === 'IsClosed' && c.args[1] === false)).toBe(true);
  });

  it('sua so da tat toan bao loi ro rang', async () => {
    h.result = { data: null, error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' } };
    await expect(saveSavingsBookAPI({ Id: 5, BookNumber: 'STK-1', Amount: 1 })).rejects.toThrow('Sổ STK-1 đã tất toán hoặc bạn không còn quyền sửa.');
  });

  it('trung so so doi thanh cau tieng Viet', async () => {
    h.result = { data: null, error: { code: '23505', message: 'duplicate key' } };
    await expect(saveSavingsBookAPI({ CustomerId: 1, BookNumber: 'STK-1', Amount: 1 })).rejects.toThrow('Số sổ "STK-1" đã tồn tại trên hệ thống.');
  });
});
