// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

vi.mock('../../lib/api', () => ({
  fetchCustomersAPI: async () => ([{ Id: 55, FullName: 'Trần Thị B', CifKh: '900055' }]),
  fetchCreditContractsByCustomerAPI: async () => [],
  fetchContractsByCustomerAPI: async () => ([{
    Id: 912, CustomerId: 55, ContractNumber: 'KUNN-912',
    LoanAmount: 400_000_000, IsSettled: false,
  }]),
  fetchCollateralsByCustomerAPI: async () => [],
  fetchCardContractsByCustomerAPI: async () => [],
  fetchRepaymentSchedulesAPI: async () => ([
    { Id: 1, ContractId: 912, PeriodNumber: 1, DueDate: '2026-09-05', PrincipalAmount: 10_000_000, InterestAmount: 500_000, IsPaid: false },
  ]),
  saveContractAPI: async () => ({}),
  deleteContractAPI: async () => {},
  bulkSaveRepaymentSchedulesAPI: async () => {},
  deleteRepaymentSchedulesByContractAPI: async () => {},
  deleteRepaymentSchedulesByIdsAPI: async () => {},
}));

import { useLoanPortfolioController } from '../../hooks/useLoanPortfolioController';

function Probe() {
  const { mainTab, selectedContract } = useLoanPortfolioController();
  return (
    <div>
      <span data-testid="tab">{mainTab}</span>
      <span data-testid="kunn">{selectedContract?.ContractNumber ?? '—'}</span>
    </div>
  );
}

afterEach(cleanup);

describe('tuyến sâu lịch trả nợ', () => {
  it('/customers/55/loans/912/schedule mở thẳng tab Lịch trả nợ của KUNN đó', async () => {
    render(
      <MemoryRouter initialEntries={['/customers/55/loans/912/schedule']}>
        <Routes>
          <Route path="/customers/:customerId/loans/:kunnId/schedule" element={<Probe />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId('kunn').textContent).toBe('KUNN-912'));
    expect(screen.getByTestId('tab').textContent).toBe('schedule');
  });
});
