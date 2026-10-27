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
  saveCardContractAPI: async () => ({}),
  deleteCardContractAPI: async () => {},
  fetchCardSupplementaryHoldersAPI: async () => [],
  replaceCardSupplementaryHoldersAPI: async () => {},
}));

import { useCreditContractController } from '../useCreditContractController';
import { useCardContractController } from '../useCardContractController';
import { useCustomerPortfolio } from '../useCustomerPortfolio';
import type { Customer } from '../../types';

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

const KH55 = { Id: 55, FullName: 'Trần Thị B', CifKh: '900055' } as Customer;
const KH77 = { Id: 77, FullName: 'Lê Văn C', CifKh: '900077' } as Customer;

describe('I5: phản hồi cũ không được đè lên khách mới', () => {
  it('useCreditContractController: nạp 77 xong trước, 55 xong sau (lỗi thời) vẫn không đè', async () => {
    fetchCustomers.mockResolvedValue([KH55, KH77]);
    fetchCollaterals.mockResolvedValue([]);
    fetchSchedules.mockResolvedValue([]);

    const cc55 = taoTriHoan<Array<Record<string, unknown>>>();
    const k55 = taoTriHoan<Array<Record<string, unknown>>>();
    fetchCreditContracts.mockImplementationOnce(() => cc55.hua);
    fetchContracts.mockImplementationOnce(() => k55.hua);
    fetchCreditContracts.mockResolvedValueOnce([{ Id: 2, CustomerId: 77, HdtdNumber: 'HDTD-77', IsClosed: false }]);
    fetchContracts.mockResolvedValueOnce([]);

    function Probe() {
      const { customer, contracts } = useCreditContractController();
      const navigate = useNavigate();
      return (
        <div>
          <span data-testid="ten">{customer?.FullName ?? '—'}</span>
          <span data-testid="hdtd">{contracts[0]?.HdtdNumber ?? '—'}</span>
          <button onClick={() => navigate('/customers/77/credit-contracts')}>chuyen-77</button>
        </div>
      );
    }

    render(
      <MemoryRouter initialEntries={['/customers/55/credit-contracts']}>
        <Routes>
          <Route path="/customers/:customerId/credit-contracts" element={<Probe />} />
        </Routes>
      </MemoryRouter>
    );

    await act(async () => { screen.getByText('chuyen-77').click(); });
    await waitFor(() => expect(screen.getByTestId('ten').textContent).toBe('Lê Văn C'));
    await waitFor(() => expect(screen.getByTestId('hdtd').textContent).toBe('HDTD-77'));

    await act(async () => {
      cc55.phatDong([{ Id: 1, CustomerId: 55, HdtdNumber: 'HDTD-55-CU', IsClosed: false }]);
      k55.phatDong([]);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId('ten').textContent).toBe('Lê Văn C');
    expect(screen.getByTestId('hdtd').textContent).toBe('HDTD-77');
  });

  it('useCardContractController: đổi khách khi đang nạp thì thẻ của khách cũ không đè lên', async () => {
    fetchCustomers.mockResolvedValue([KH55, KH77]);

    const cards55 = taoTriHoan<Array<Record<string, unknown>>>();
    const cols55 = taoTriHoan<Array<Record<string, unknown>>>();
    fetchCards.mockImplementationOnce(() => cards55.hua);
    fetchCollaterals.mockImplementationOnce(() => cols55.hua);
    fetchCards.mockResolvedValueOnce([{ Id: 2, CustomerId: 77, CardContractNumber: 'CARD-77' }]);
    fetchCollaterals.mockResolvedValueOnce([]);

    function Probe() {
      const { contracts } = useCardContractController();
      const navigate = useNavigate();
      return (
        <div>
          <span data-testid="the">{contracts[0]?.CardContractNumber ?? '—'}</span>
          <button onClick={() => navigate('/customers/77/credit-cards')}>chuyen-77</button>
        </div>
      );
    }

    render(
      <MemoryRouter initialEntries={['/customers/55/credit-cards']}>
        <Routes>
          <Route path="/customers/:customerId/credit-cards" element={<Probe />} />
        </Routes>
      </MemoryRouter>
    );

    await act(async () => { screen.getByText('chuyen-77').click(); });
    await waitFor(() => expect(screen.getByTestId('the').textContent).toBe('CARD-77'));

    await act(async () => {
      cards55.phatDong([{ Id: 1, CustomerId: 55, CardContractNumber: 'CARD-55-CU' }]);
      cols55.phatDong([]);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId('the').textContent).toBe('CARD-77');
  });

  it('useCustomerPortfolio: pickCustomer(55) rồi pickCustomer(77) trước khi 55 xong thì 55 không đè lên 77', async () => {
    fetchCustomers.mockResolvedValue([]);
    fetchCreditContracts.mockResolvedValue([]);
    fetchSchedules.mockResolvedValue([]);

    const cons55 = taoTriHoan<Array<Record<string, unknown>>>();
    fetchContracts.mockImplementationOnce(() => cons55.hua);
    fetchCollaterals.mockImplementationOnce(() => Promise.resolve([]));
    fetchCards.mockImplementationOnce(() => Promise.resolve([]));

    fetchContracts.mockResolvedValueOnce([{ Id: 913, CustomerId: 77, ContractNumber: 'KUNN-77' }]);
    fetchCollaterals.mockResolvedValueOnce([]);
    fetchCards.mockResolvedValueOnce([]);

    function Probe() {
      const portfolio = useCustomerPortfolio({
        selectedCustomerId: null,
        setSelectedCustomerId: () => {},
        onNotify: () => {},
        onCustomerChanged: () => {},
        onContractOpened: () => {},
        onContractClosed: () => {},
      });
      return (
        <div>
          <span data-testid="kunn">{portfolio.contracts[0]?.ContractNumber ?? '—'}</span>
          <button onClick={() => portfolio.pickCustomer(KH55)}>chon-55</button>
          <button onClick={() => portfolio.pickCustomer(KH77)}>chon-77</button>
        </div>
      );
    }

    render(<Probe />);

    await act(async () => {
      screen.getByText('chon-55').click();
      await Promise.resolve();
      screen.getByText('chon-77').click();
    });

    await waitFor(() => expect(screen.getByTestId('kunn').textContent).toBe('KUNN-77'));

    await act(async () => {
      cons55.phatDong([{ Id: 912, CustomerId: 55, ContractNumber: 'KUNN-55-CU' }]);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId('kunn').textContent).toBe('KUNN-77');
  });

  it('useCustomerPortfolio: lịch trả nợ của khách cũ không đè lên khách mới dù về sau', async () => {
    fetchCustomers.mockResolvedValue([]);
    fetchCreditContracts.mockResolvedValue([]);
    fetchCollaterals.mockResolvedValue([]);
    fetchCards.mockResolvedValue([]);

    fetchContracts.mockResolvedValueOnce([{ Id: 910, CustomerId: 55, ContractNumber: 'KUNN-55' }]);
    fetchContracts.mockResolvedValueOnce([{ Id: 920, CustomerId: 77, ContractNumber: 'KUNN-77' }]);

    const lich55 = taoTriHoan<Array<Record<string, unknown>>>();
    fetchSchedules.mockImplementationOnce(() => lich55.hua);
    fetchSchedules.mockResolvedValueOnce([{ Id: 1, LoanContractId: 920 }]);

    function Probe() {
      const portfolio = useCustomerPortfolio({
        selectedCustomerId: null,
        setSelectedCustomerId: () => {},
        onNotify: () => {},
        onCustomerChanged: () => {},
        onContractOpened: () => {},
        onContractClosed: () => {},
      });
      return (
        <div>
          <span data-testid="co-910">{portfolio.allSchedulesMap[910] ? 'co' : 'khong'}</span>
          <span data-testid="co-920">{portfolio.allSchedulesMap[920] ? 'co' : 'khong'}</span>
          <button onClick={() => portfolio.pickCustomer(KH55)}>chon-55</button>
          <button onClick={() => portfolio.pickCustomer(KH77)}>chon-77</button>
        </div>
      );
    }

    render(<Probe />);

    await act(async () => {
      screen.getByText('chon-55').click();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      screen.getByText('chon-77').click();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => expect(screen.getByTestId('co-920').textContent).toBe('co'));
    expect(screen.getByTestId('co-910').textContent).toBe('khong');

    await act(async () => {
      lich55.phatDong([{ Id: 2, LoanContractId: 910 }]);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId('co-910').textContent).toBe('khong');
    expect(screen.getByTestId('co-920').textContent).toBe('co');
  });
});
