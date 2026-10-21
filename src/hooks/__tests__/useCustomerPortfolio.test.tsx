// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCustomerPortfolio } from '../useCustomerPortfolio';
import type { CreditContract, Customer, LoanContract, RepaymentSchedule } from '../../types';

const state = vi.hoisted(() => ({
  customers: vi.fn(), loans: vi.fn(), credits: vi.fn(), schedules: vi.fn(),
}));
vi.mock('../../lib/api', () => ({
  fetchCustomersAPI: state.customers, fetchContractsByCustomerAPI: state.loans,
  fetchCreditContractsByCustomerAPI: state.credits, fetchRepaymentSchedulesAPI: state.schedules,
  fetchCollateralsByCustomerAPI: async () => [], fetchCardContractsByCustomerAPI: async () => [],
}));
const customer = { Id: 1, CifKh: '001', FullName: 'Khách hàng thử' } as Customer;
const loan = (id: number) => ({ Id: id, CustomerId: 1, ContractNumber: `KUNN-${id}`, LoanAmount: 1000, InterestRate: 0.1 }) as LoanContract;
const deferred = () => {
  let resolve!: (rows: RepaymentSchedule[]) => void;
  const promise = new Promise<RepaymentSchedule[]>(done => { resolve = done; });
  return { promise, resolve };
};
function mount() {
  const notify = vi.fn();
  return { ...renderHook(() => useCustomerPortfolio({
    selectedCustomerId: null, setSelectedCustomerId: vi.fn(), onNotify: notify,
    onCustomerChanged: vi.fn(), onContractOpened: vi.fn(), onContractClosed: vi.fn(),
  })), notify };
}
beforeEach(() => {
  vi.clearAllMocks();
  state.customers.mockResolvedValue([customer]);
  state.loans.mockResolvedValue([loan(1)]);
  state.credits.mockResolvedValue([{ Id: 10, CustomerId: 1, HdtdNumber: 'HDTD-UNRELATED' } as CreditContract]);
  state.schedules.mockResolvedValue([]);
});
afterEach(cleanup);
describe('portfolio retrieval', () => {
  it('finds a customer through the real HĐTD number when KUNN numbering is different', async () => {
    const { result } = mount();
    act(() => result.current.setSearchContract('HDTD-UNRELATED'));
    await act(() => result.current.search({ preventDefault() {} } as React.FormEvent));
    expect(result.current.foundCustomer?.Id).toBe(1);
    expect(result.current.contracts[0].ContractNumber).toBe('KUNN-1');
  });
  it('ignores an earlier schedule request when another KUNN is selected', async () => {
    const { result } = mount();
    await waitFor(() => expect(result.current.allCustomers).toHaveLength(1));
    const first = deferred(), second = deferred();
    state.schedules.mockImplementation((id: number) => id === 1 ? first.promise : second.promise);
    let pendingFirst!: Promise<void>, pendingSecond!: Promise<void>;
    act(() => { pendingFirst = result.current.openContract(loan(1)); });
    act(() => { pendingSecond = result.current.openContract(loan(2)); });
    await act(async () => { second.resolve([{ Id: 2, ContractId: 2, PeriodNumber: 1, DueDate: '2026-01-01', IsPaid: false } as RepaymentSchedule]); await pendingSecond; });
    await act(async () => { first.resolve([{ Id: 1, ContractId: 1, PeriodNumber: 1, DueDate: '2026-01-01', IsPaid: false } as RepaymentSchedule]); await pendingFirst; });
    expect(result.current.selectedContract?.Id).toBe(2);
    expect(result.current.schedules.map(row => row.Id)).toEqual([2]);
  });
  it('keeps a schedule loading error separate from an empty result', async () => {
    const { result } = mount();
    state.schedules.mockRejectedValue(new Error('Không nạp được kỳ thu'));
    await act(() => result.current.openContract(loan(1)));
    expect(result.current.scheduleError).toBe('Không nạp được kỳ thu');
    expect(result.current.scheduleLoading).toBe(false);
  });
});
