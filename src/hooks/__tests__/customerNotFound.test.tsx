// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

vi.mock('../../lib/api', () => ({
  fetchCustomersAPI: async () => ([{ Id: 55, FullName: 'Trần Thị B', CifKh: '900055' }]),
  fetchCreditContractsByCustomerAPI: async () => ([{
    Id: 1, CustomerId: 55, HdtdNumber: 'HDTD-01', LoanMethod: 'Hạn mức tín dụng',
    ContractAmount: 1_000_000_000, ContractStartDate: '2026-01-01',
    ContractEndDate: '2027-01-01', IsClosed: false,
  }]),
  fetchContractsByCustomerAPI: async () => ([{
    Id: 100, CustomerId: 55, CreditContractId: 1, ContractNumber: 'KUNN-01',
    LoanAmount: 400_000_000, IsSettled: false,
  }]),
  fetchCollateralsByCustomerAPI: async () => [],
  fetchCardContractsByCustomerAPI: async () => [],
  fetchRepaymentSchedulesAPI: async () => [],
  saveCreditContractAPI: async () => ({}),
  deleteCreditContractAPI: async () => {},
  countKunnOfCreditContractAPI: async () => 0,
}));

import { useCreditContractController } from '../useCreditContractController';
import { useCustomerPortfolio } from '../useCustomerPortfolio';
import { useSelectedCustomerId, useCustomerNavigate } from '../useSelectedCustomerId';

function ProbeCreditContract() {
  const { customer, contracts, notify } = useCreditContractController();
  return (
    <div>
      <span data-testid="ten">{customer?.FullName ?? '—'}</span>
      <span data-testid="so-hdtd">{contracts.length > 0 ? contracts[0].HdtdNumber : '—'}</span>
      <span data-testid="loi">{notify?.message ?? '—'}</span>
    </div>
  );
}

function ProbePortfolio() {
  const selectedCustomerId = useSelectedCustomerId();
  const setSelectedCustomerId = useCustomerNavigate();
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
    </div>
  );
}

let lastNotify: string | null = null;

afterEach(() => {
  cleanup();
  lastNotify = null;
});

describe('C1: khách hàng không có trong danh sách nạp được thì không giữ khách cũ', () => {
  it('useCreditContractController: /customers/999/credit-contracts trực tiếp thì không hiện HĐTD nào', async () => {
    render(
      <MemoryRouter initialEntries={['/customers/999/credit-contracts']}>
        <Routes>
          <Route path="/customers/:customerId/credit-contracts" element={<ProbeCreditContract />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId('loi').textContent).toContain('Không tìm thấy khách hàng'));
    expect(screen.getByTestId('ten').textContent).toBe('—');
    expect(screen.getByTestId('so-hdtd').textContent).toBe('—');
  });

  it('useCustomerPortfolio: /customers/999/loans trực tiếp thì không hiện HĐTD của khách khác', async () => {
    render(
      <MemoryRouter initialEntries={['/customers/999/loans']}>
        <Routes>
          <Route path="/customers/:customerId/loans" element={<ProbePortfolio />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(lastNotify).toContain('Không tìm thấy khách hàng'));
    expect(screen.getByTestId('ten').textContent).toBe('—');
    expect(screen.getByTestId('so-hdtd').textContent).toBe('—');
  });
});
