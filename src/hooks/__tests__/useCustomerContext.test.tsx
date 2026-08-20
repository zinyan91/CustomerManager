// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';

const fetchCustomers = vi.fn();
const fetchCreditContracts = vi.fn();
const fetchContracts = vi.fn();
const fetchPaid = vi.fn();
const fetchOverdue = vi.fn();

vi.mock('../../lib/api', () => ({
  fetchCustomersAPI: (...a: unknown[]) => fetchCustomers(...a),
  fetchCreditContractsByCustomerAPI: (...a: unknown[]) => fetchCreditContracts(...a),
  fetchContractsByCustomerAPI: (...a: unknown[]) => fetchContracts(...a),
  fetchPaidPrincipalForContractsAPI: (...a: unknown[]) => fetchPaid(...a),
  fetchOverdueSchedulesAPI: (...a: unknown[]) => fetchOverdue(...a),
}));

import { useCustomerContext } from '../useCustomerContext';

function Probe({ id }: { id: number | null }) {
  const { customer, summary, loading, error } = useCustomerContext(id);
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="ten">{customer?.FullName ?? '—'}</span>
      <span data-testid="du-no">{summary ? String(summary.outstanding) : '—'}</span>
      <span data-testid="loi">{error ?? '—'}</span>
    </div>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchCustomers.mockResolvedValue([{ Id: 55, FullName: 'Trần Thị B', CifKh: '900055', Phone: '0900000055' }]);
  fetchCreditContracts.mockResolvedValue([{
    Id: 1, CustomerId: 55, HdtdNumber: 'HDTD-01', LoanMethod: 'Hạn mức tín dụng',
    ContractAmount: 1_000_000_000, ContractStartDate: '2026-01-01',
    ContractEndDate: '2027-01-01', IsClosed: false,
  }]);
  fetchContracts.mockResolvedValue([{
    Id: 100, CustomerId: 55, CreditContractId: 1,
    ContractNumber: 'KUNN-01', LoanAmount: 400_000_000, IsSettled: false,
  }]);
  fetchPaid.mockResolvedValue({ 100: 150_000_000 });
  fetchOverdue.mockResolvedValue([]);
});

afterEach(cleanup);

describe('useCustomerContext', () => {
  it('chưa có khách thì không gọi truy vấn nào', async () => {
    render(<Probe id={null} />);
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(fetchCustomers).not.toHaveBeenCalled();
    expect(fetchCreditContracts).not.toHaveBeenCalled();
    expect(screen.getByTestId('ten').textContent).toBe('—');
  });

  it('có khách thì nạp và tính ra dư nợ', async () => {
    render(<Probe id={55} />);
    await waitFor(() => expect(screen.getByTestId('du-no').textContent).toBe('250000000'));
    expect(screen.getByTestId('ten').textContent).toBe('Trần Thị B');
  });

  it('gốc đã trả và lịch quá hạn chỉ hỏi cho KUNN của khách này', async () => {
    render(<Probe id={55} />);
    await waitFor(() => expect(fetchPaid).toHaveBeenCalled());
    expect(fetchPaid).toHaveBeenCalledWith([100]);
    expect(fetchOverdue.mock.calls[0][0]).toEqual([100]);
  });

  it('khách không có KUNN thì bỏ hẳn hai truy vấn lượt hai', async () => {
    fetchContracts.mockResolvedValue([]);
    render(<Probe id={55} />);
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(fetchPaid).not.toHaveBeenCalled();
    expect(fetchOverdue).not.toHaveBeenCalled();
    expect(screen.getByTestId('du-no').textContent).toBe('0');
  });

  it('lỗi nạp thì báo ra, không nuốt', async () => {
    fetchCreditContracts.mockRejectedValue(new Error('RLS chan'));
    render(<Probe id={55} />);
    await waitFor(() => expect(screen.getByTestId('loi').textContent).toContain('RLS chan'));
    expect(screen.getByTestId('loading').textContent).toBe('false');
  });
});
