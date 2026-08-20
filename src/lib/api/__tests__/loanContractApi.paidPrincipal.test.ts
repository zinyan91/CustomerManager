import { describe, it, expect, vi, beforeEach } from 'vitest';

const inMock = vi.fn();
const ltMock = vi.fn();
const selectMock = vi.fn();
const fromMock = vi.fn();

vi.mock('../../supabase', () => ({
  supabase: { from: (...a: unknown[]) => fromMock(...a) },
}));

import {
  fetchPaidPrincipalForContractsAPI, fetchOverdueSchedulesAPI, OVERDUE_COLUMNS,
} from '../loanContractApi';

const REQUIRED_OVERDUE_COLUMNS = [
  'ContractId', 'DueDate', 'IsPaid', 'PrincipalAmount', 'InterestAmount',
  'OverdueInterestAmount', 'ActualPaidPrincipal', 'ActualPaidInterest', 'PrepaidPrincipalAmount',
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('fetchPaidPrincipalForContractsAPI', () => {
  it('danh sách rỗng thì không gọi mạng', async () => {
    expect(await fetchPaidPrincipalForContractsAPI([])).toEqual({});
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('đọc view ContractPaidPrincipal, trả về bản đồ số', async () => {
    inMock.mockResolvedValue({
      data: [
        { ContractId: 1135, PaidPrincipal: '1500000' },
        { ContractId: 1136, PaidPrincipal: 0 },
      ],
      error: null,
    });
    selectMock.mockReturnValue({ in: inMock });
    fromMock.mockReturnValue({ select: selectMock });

    const map = await fetchPaidPrincipalForContractsAPI([1135, 1136]);

    expect(fromMock).toHaveBeenCalledWith('ContractPaidPrincipal');
    expect(selectMock).toHaveBeenCalledWith('ContractId, PaidPrincipal');
    expect(inMock).toHaveBeenCalledWith('ContractId', [1135, 1136]);
    expect(map).toEqual({ 1135: 1500000, 1136: 0 });
  });

  it('lỗi thì ném ra, không nuốt', async () => {
    inMock.mockResolvedValue({ data: null, error: { message: 'RLS chan' } });
    selectMock.mockReturnValue({ in: inMock });
    fromMock.mockReturnValue({ select: selectMock });

    await expect(fetchPaidPrincipalForContractsAPI([1])).rejects.toThrow('RLS chan');
  });
});

describe('fetchOverdueSchedulesAPI', () => {
  it('lọc đúng: chưa trả và đã quá ngày hôm nay', async () => {
    const orMock = vi.fn();
    ltMock.mockResolvedValue({ data: [{ ContractId: 1135, DueDate: '2026-07-01' }], error: null });
    orMock.mockReturnValue({ lt: ltMock });
    inMock.mockReturnValue({ or: orMock });
    selectMock.mockReturnValue({ in: inMock });
    fromMock.mockReturnValue({ select: selectMock });

    const rows = await fetchOverdueSchedulesAPI([1135], '2026-08-20');

    expect(fromMock).toHaveBeenCalledWith('RepaymentSchedules');
    expect(selectMock).toHaveBeenCalledWith(OVERDUE_COLUMNS);
    for (const column of REQUIRED_OVERDUE_COLUMNS) {
      expect(OVERDUE_COLUMNS.split(', ')).toContain(column);
    }
    expect(orMock).toHaveBeenCalledWith('IsPaid.is.null,IsPaid.eq.false');
    expect(ltMock).toHaveBeenCalledWith('DueDate', '2026-08-20');
    expect(rows).toHaveLength(1);
  });

  it('danh sách rỗng thì không gọi mạng', async () => {
    expect(await fetchOverdueSchedulesAPI([], '2026-08-20')).toEqual([]);
    expect(fromMock).not.toHaveBeenCalled();
  });
});
