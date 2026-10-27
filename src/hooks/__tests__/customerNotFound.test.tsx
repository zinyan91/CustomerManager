// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router';

function taoTriHoan<T>() {
  let phatDong!: (gia: T) => void;
  const hua = new Promise<T>((res) => { phatDong = res; });
  return { hua, phatDong };
}

const fetchCustomers = vi.fn();
const fetchCreditContracts = vi.fn();
const fetchContracts = vi.fn();
const fetchCollaterals = vi.fn();
const fetchCards = vi.fn();
const fetchSchedules = vi.fn();

vi.mock('../../lib/api', () => ({
  fetchCustomersAPI: (...a: unknown[]) => fetchCustomers(...a),
  fetchCreditContractsByCustomerAPI: (...a: unknown[]) => fetchCreditContracts(...a),
  fetchPledgeLoanBundleByCustomerAPI: async () => ({ loans: [], links: [], repayments: [] }),
  fetchContractsByCustomerAPI: (...a: unknown[]) => fetchContracts(...a),
  fetchCollateralsByCustomerAPI: (...a: unknown[]) => fetchCollaterals(...a),
  fetchMortgageContractsAPI: async () => [],
  fetchCardContractsByCustomerAPI: (...a: unknown[]) => fetchCards(...a),
  fetchRepaymentSchedulesAPI: (...a: unknown[]) => fetchSchedules(...a),
  saveCreditContractAPI: async () => ({}),
  deleteCreditContractAPI: async () => {},
  countKunnOfCreditContractAPI: async () => 0,
}));

import { useCreditContractController } from '../useCreditContractController';
import { useCustomerPortfolio } from '../useCustomerPortfolio';
import { useSelectedCustomerId, useCustomerNavigate } from '../useSelectedCustomerId';
import type { Customer } from '../../types';

function ProbeCreditContract() {
  const { customer, contracts, notify } = useCreditContractController();
  const navigate = useNavigate();
  return (
    <div>
      <span data-testid="ten">{customer?.FullName ?? '—'}</span>
      <span data-testid="so-hdtd">{contracts.length > 0 ? contracts[0].HdtdNumber : '—'}</span>
      <span data-testid="loi">{notify?.message ?? '—'}</span>
      <button onClick={() => navigate('/customers/999/credit-contracts')}>chuyen-999</button>
    </div>
  );
}

function ProbePortfolio() {
  const selectedCustomerId = useSelectedCustomerId();
  const setSelectedCustomerId = useCustomerNavigate();
  const navigate = useNavigate();
  const portfolio = useCustomerPortfolio({
    selectedCustomerId,
    setSelectedCustomerId,
    onNotify: (_type, message) => { lastNotify = message; },
    onCustomerChanged: () => {},
    onContractOpened: () => {},
    onContractClosed: () => {},
  });
  return (
    <div>
      <span data-testid="ten">{portfolio.foundCustomer?.FullName ?? '—'}</span>
      <span data-testid="so-hdtd">{portfolio.creditContracts.length > 0 ? portfolio.creditContracts[0].HdtdNumber : '—'}</span>
      <span data-testid="kunn">{portfolio.contracts.length > 0 ? portfolio.contracts[0].ContractNumber : '—'}</span>
      <span data-testid="tsbd">{portfolio.collaterals.length > 0 ? 'co' : '—'}</span>
      <span data-testid="the">{portfolio.cards.length > 0 ? 'co' : '—'}</span>
      <button onClick={() => navigate('/customers/999/loans')}>chuyen-999</button>
    </div>
  );
}

let lastNotify: string | null = null;

afterEach(() => {
  cleanup();
  lastNotify = null;
  vi.resetAllMocks();
});

const KH55 = { Id: 55, FullName: 'Trần Thị B', CifKh: '900055' } as Customer;

describe('C1: khách hàng không có trong danh sách nạp được thì không giữ khách cũ', () => {
  it('useCreditContractController: chuyển từ khách 55 sang id không tồn tại thì không giữ HĐTD của 55', async () => {
    fetchCustomers.mockResolvedValue([KH55]);
    fetchCreditContracts.mockResolvedValue([{
      Id: 1, CustomerId: 55, HdtdNumber: 'HDTD-01', LoanMethod: 'Hạn mức tín dụng',
      ContractAmount: 1_000_000_000, ContractStartDate: '2026-01-01',
      ContractEndDate: '2027-01-01', IsClosed: false,
    }]);
    fetchContracts.mockResolvedValue([]);
    fetchCollaterals.mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/customers/55/credit-contracts']}>
        <Routes>
          <Route path="/customers/:customerId/credit-contracts" element={<ProbeCreditContract />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByTestId('ten').textContent).toBe('Trần Thị B'));
    await waitFor(() => expect(screen.getByTestId('so-hdtd').textContent).toBe('HDTD-01'));

    await act(async () => { screen.getByText('chuyen-999').click(); });

    await waitFor(() => expect(screen.getByTestId('loi').textContent).toContain('Không tìm thấy khách hàng'));
    expect(screen.getByTestId('ten').textContent).toBe('—');
    expect(screen.getByTestId('so-hdtd').textContent).toBe('—');
  });

  it('useCustomerPortfolio: chuyển từ khách 55 sang id không tồn tại thì không giữ HĐTD của 55', async () => {
    fetchCustomers.mockResolvedValue([KH55]);
    fetchCreditContracts.mockResolvedValue([{
      Id: 1, CustomerId: 55, HdtdNumber: 'HDTD-01', IsClosed: false,
    }]);
    fetchContracts.mockResolvedValue([]);
    fetchCollaterals.mockResolvedValue([]);
    fetchCards.mockResolvedValue([]);
    fetchSchedules.mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/customers/55/loans']}>
        <Routes>
          <Route path="/customers/:customerId/loans" element={<ProbePortfolio />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByTestId('ten').textContent).toBe('Trần Thị B'));
    await waitFor(() => expect(screen.getByTestId('so-hdtd').textContent).toBe('HDTD-01'));

    await act(async () => { screen.getByText('chuyen-999').click(); });

    await waitFor(() => expect(lastNotify).toContain('Không tìm thấy khách hàng'));
    expect(screen.getByTestId('ten').textContent).toBe('—');
    expect(screen.getByTestId('so-hdtd').textContent).toBe('—');
  });

  it('useCustomerPortfolio: khách 55 đang nạp dở khi chuyển sang id không tồn tại thì dữ liệu 55 không bao giờ hiện lên', async () => {
    fetchCustomers.mockResolvedValue([KH55]);
    fetchCreditContracts.mockResolvedValue([{
      Id: 1, CustomerId: 55, HdtdNumber: 'HDTD-01', IsClosed: false,
    }]);
    fetchSchedules.mockResolvedValue([]);

    const cons55 = taoTriHoan<Array<Record<string, unknown>>>();
    const cols55 = taoTriHoan<Array<Record<string, unknown>>>();
    const crds55 = taoTriHoan<Array<Record<string, unknown>>>();
    fetchContracts.mockImplementationOnce(() => cons55.hua);
    fetchCollaterals.mockImplementationOnce(() => cols55.hua);
    fetchCards.mockImplementationOnce(() => crds55.hua);

    render(
      <MemoryRouter initialEntries={['/customers/55/loans']}>
        <Routes>
          <Route path="/customers/:customerId/loans" element={<ProbePortfolio />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(fetchContracts).toHaveBeenCalledWith(55));

    await act(async () => { screen.getByText('chuyen-999').click(); });
    await waitFor(() => expect(lastNotify).toContain('Không tìm thấy khách hàng'));
    expect(screen.getByTestId('ten').textContent).toBe('—');

    await act(async () => {
      cons55.phatDong([{ Id: 100, CustomerId: 55, CreditContractId: 1, ContractNumber: 'KUNN-01', LoanAmount: 1, IsSettled: false }]);
      cols55.phatDong([{ Id: 200, CustomerId: 55, AssetCode: 'TSBD-01' }]);
      crds55.phatDong([{ Id: 300, CustomerId: 55, CardContractNumber: 'CARD-01' }]);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId('ten').textContent).toBe('—');
    expect(screen.getByTestId('kunn').textContent).toBe('—');
    expect(screen.getByTestId('tsbd').textContent).toBe('—');
    expect(screen.getByTestId('the').textContent).toBe('—');
  });
});

let soLanBaoLoi = 0;

function ProbeThongBaoTrungLap() {
  const { customer, notify } = useCreditContractController();
  const navigate = useNavigate();
  if (notify?.message?.includes('Không tìm thấy khách hàng')) soLanBaoLoi++;
  return (
    <div>
      <span data-testid="ten">{customer?.FullName ?? '—'}</span>
      <span data-testid="loi">{notify?.message ?? '—'}</span>
      <button onClick={() => navigate('/customers/999/credit-contracts')}>chuyen-999</button>
    </div>
  );
}

describe('thông báo "không tìm thấy khách hàng" chỉ hiện một lần', () => {
  it('useCreditContractController: chuyển từ khách 55 sang id không tồn tại thì chỉ báo lỗi một lần', async () => {
    soLanBaoLoi = 0;
    fetchCustomers.mockResolvedValue([KH55]);
    fetchCreditContracts.mockResolvedValue([]);
    fetchContracts.mockResolvedValue([]);
    fetchCollaterals.mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/customers/55/credit-contracts']}>
        <Routes>
          <Route path="/customers/:customerId/credit-contracts" element={<ProbeThongBaoTrungLap />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByTestId('ten').textContent).toBe('Trần Thị B'));

    await act(async () => { screen.getByText('chuyen-999').click(); });

    await waitFor(() => expect(screen.getByTestId('loi').textContent).toContain('Không tìm thấy khách hàng'));
    expect(soLanBaoLoi).toBe(1);
  });
});
