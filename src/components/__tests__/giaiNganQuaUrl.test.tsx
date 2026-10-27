// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { useCallback } from 'react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router';
import { useLoanPortfolioController } from '../../hooks/useLoanPortfolioController';

vi.mock('../../lib/api', () => ({
  fetchCustomersAPI: async () => ([{ Id: 55, FullName: 'Trần Thị B', CifKh: '900055' }]),
  fetchCreditContractsByCustomerAPI: async () => ([{
    Id: 9, CustomerId: 55, HdtdNumber: 'HDTD-09',
    LoanMethod: 'Hạn mức tín dụng', ContractAmount: 1_000_000_000,
    ContractStartDate: '2026-01-01', ContractEndDate: '2027-01-01', IsClosed: false,
  }]),
  fetchPledgeLoanBundleByCustomerAPI: async () => ({ loans: [], links: [], repayments: [] }),
  fetchContractsByCustomerAPI: async () => [],
  fetchCollateralsByCustomerAPI: async () => [],
  fetchCardContractsByCustomerAPI: async () => [],
  fetchRepaymentSchedulesAPI: async () => [],
  saveContractAPI: async () => ({}),
  deleteContractAPI: async () => {},
  bulkSaveRepaymentSchedulesAPI: async () => {},
  deleteRepaymentSchedulesByContractAPI: async () => {},
  deleteRepaymentSchedulesByIdsAPI: async () => {},
}));

const setSearchParamsCalls: Array<{ replace?: boolean } | undefined> = [];

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return {
    ...actual,
    useSearchParams: (...args: Parameters<typeof actual.useSearchParams>) => {
      const [params, setParams] = actual.useSearchParams(...args);
      const wrapped: typeof setParams = useCallback((next, options) => {
        setSearchParamsCalls.push(options);
        return setParams(next, options);
      }, [setParams]);
      return [params, wrapped] as const;
    },
  };
});

function Probe() {
  const { showForm, formHdtdNumber } = useLoanPortfolioController();
  const { search } = useLocation();
  return (
    <div>
      <span data-testid="mo-form">{String(showForm)}</span>
      <span data-testid="so-hdtd">{formHdtdNumber}</span>
      <span data-testid="query">{search}</span>
    </div>
  );
}

afterEach(() => {
  cleanup();
  setSearchParamsCalls.length = 0;
});

describe('giải ngân qua URL', () => {
  it('có ?disburse thì mở form KUNN điền sẵn HĐTD đó', async () => {
    render(
      <MemoryRouter initialEntries={['/customers/55/loans?disburse=9']}>
        <Routes>
          <Route path="/customers/:customerId/loans" element={<Probe />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId('so-hdtd').textContent).toBe('HDTD-09'));
    expect(screen.getByTestId('mo-form').textContent).toBe('true');
  });

  it('dùng xong thì xoá tham số khỏi URL, Back không kích lại', async () => {
    render(
      <MemoryRouter initialEntries={['/customers/55/loans?disburse=9']}>
        <Routes>
          <Route path="/customers/:customerId/loans" element={<Probe />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId('query').textContent).toBe(''));

    expect(setSearchParamsCalls.length).toBeGreaterThan(0);
    expect(setSearchParamsCalls[setSearchParamsCalls.length - 1]).toEqual({ replace: true });
  });

  it('?disburse không phải số thì bị dọn khỏi URL ngay, không đợi HĐTD nạp xong', async () => {
    render(
      <MemoryRouter initialEntries={['/customers/55/loans?disburse=abc']}>
        <Routes>
          <Route path="/customers/:customerId/loans" element={<Probe />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId('query').textContent).toBe(''));

    expect(setSearchParamsCalls.length).toBeGreaterThan(0);
    expect(setSearchParamsCalls[setSearchParamsCalls.length - 1]).toEqual({ replace: true });
    expect(screen.getByTestId('mo-form').textContent).toBe('false');
  });

});
