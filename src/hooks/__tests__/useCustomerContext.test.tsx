// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, act, fireEvent } from '@testing-library/react';

const fetchCustomerById = vi.fn();
const fetchCreditContracts = vi.fn();
const fetchContracts = vi.fn();
const fetchPaid = vi.fn();
const fetchOverdue = vi.fn();

vi.mock('../../lib/api', () => ({
  fetchCustomerByIdAPI: (...a: unknown[]) => fetchCustomerById(...a),
  fetchCreditContractsByCustomerAPI: (...a: unknown[]) => fetchCreditContracts(...a),
  fetchPledgeLoanBundleByCustomerAPI: async () => ({ loans: [], links: [], repayments: [] }),
  fetchContractsByCustomerAPI: (...a: unknown[]) => fetchContracts(...a),
  fetchPaidPrincipalForContractsAPI: (...a: unknown[]) => fetchPaid(...a),
  fetchOverdueSchedulesAPI: (...a: unknown[]) => fetchOverdue(...a),
}));

import { useCustomerContext } from '../useCustomerContext';

function taoTriHoan<T>() {
  let phatDong!: (gia: T) => void;
  const hua = new Promise<T>((res) => {
    phatDong = res;
  });
  return { hua, phatDong };
}

function Probe({ id }: { id: number | null }) {
  const { customer, summary, loading, error, reload } = useCustomerContext(id);
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="ten">{customer?.FullName ?? '—'}</span>
      <span data-testid="du-no">{summary ? String(summary.outstanding) : '—'}</span>
      <span data-testid="loi">{error ?? '—'}</span>
      <button data-testid="nap-lai" onClick={reload}>nạp lại</button>
    </div>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchCustomerById.mockResolvedValue({ Id: 55, FullName: 'Trần Thị B', CifKh: '900055', Phone: '0900000055' });
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
    expect(fetchCustomerById).not.toHaveBeenCalled();
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

  it('đổi khách khi đang nạp thì phản hồi cũ không được đè lên khách mới', async () => {
    const khach55 = taoTriHoan<{ Id: number; FullName: string; CifKh: string; Phone: string } | null>();
    const hdtd55 = taoTriHoan<Array<Record<string, unknown>>>();
    const kunn55 = taoTriHoan<Array<Record<string, unknown>>>();

    fetchCustomerById.mockImplementationOnce(() => khach55.hua);
    fetchCreditContracts.mockImplementationOnce(() => hdtd55.hua);
    fetchContracts.mockImplementationOnce(() => kunn55.hua);

    fetchCustomerById.mockResolvedValueOnce({ Id: 77, FullName: 'Lê Văn C', CifKh: '900077', Phone: '0900000077' });
    fetchCreditContracts.mockResolvedValueOnce([{
      Id: 2, CustomerId: 77, HdtdNumber: 'HDTD-02', LoanMethod: 'Hạn mức tín dụng',
      ContractAmount: 500_000_000, ContractStartDate: '2026-01-01',
      ContractEndDate: '2027-01-01', IsClosed: false,
    }]);
    fetchContracts.mockResolvedValueOnce([]);

    const { rerender } = render(<Probe id={55} />);
    await waitFor(() => expect(fetchCustomerById).toHaveBeenCalledTimes(1));

    rerender(<Probe id={77} />);
    await waitFor(() => expect(screen.getByTestId('ten').textContent).toBe('Lê Văn C'));
    expect(screen.getByTestId('du-no').textContent).toBe('0');

    await act(async () => {
      khach55.phatDong({ Id: 55, FullName: 'Trần Thị B', CifKh: '900055', Phone: '0900000055' });
      hdtd55.phatDong([{
        Id: 1, CustomerId: 55, HdtdNumber: 'HDTD-01', LoanMethod: 'Hạn mức tín dụng',
        ContractAmount: 1_000_000_000, ContractStartDate: '2026-01-01',
        ContractEndDate: '2027-01-01', IsClosed: false,
      }]);
      kunn55.phatDong([{
        Id: 100, CustomerId: 55, CreditContractId: 1,
        ContractNumber: 'KUNN-01', LoanAmount: 400_000_000, IsSettled: false,
      }]);
      await Promise.all([khach55.hua, hdtd55.hua, kunn55.hua]);
      await new Promise((res) => setTimeout(res, 0));
      await new Promise((res) => setTimeout(res, 0));
    });

    expect(screen.getByTestId('ten').textContent).toBe('Lê Văn C');
    expect(screen.getByTestId('du-no').textContent).toBe('0');
    expect(screen.getByTestId('loi').textContent).toBe('—');
  });

  it('reload() nạp lại và làm mới số liệu', async () => {
    render(<Probe id={55} />);
    await waitFor(() => expect(screen.getByTestId('du-no').textContent).toBe('250000000'));
    expect(fetchCustomerById).toHaveBeenCalledTimes(1);

    fetchPaid.mockResolvedValueOnce({ 100: 350_000_000 });

    fireEvent.click(screen.getByTestId('nap-lai'));

    await waitFor(() => expect(screen.getByTestId('du-no').textContent).toBe('50000000'));
    expect(fetchCustomerById).toHaveBeenCalledTimes(2);
  });

  it('khách không có trong danh sách (không quyền truy cập) thì báo lỗi, không dựng số 0', async () => {
    fetchCustomerById.mockResolvedValue(null);
    render(<Probe id={999} />);
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('loi').textContent).toBe('Không tìm thấy khách hàng hoặc bạn không có quyền truy cập.');
    expect(screen.getByTestId('du-no').textContent).toBe('—');
    expect(screen.getByTestId('ten').textContent).toBe('—');
  });
});
