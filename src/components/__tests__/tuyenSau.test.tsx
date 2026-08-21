// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useNavigate, useLocation } from 'react-router';

vi.mock('../../lib/api', () => ({
  fetchCustomersAPI: async () => ([{ Id: 55, FullName: 'Trần Thị B', CifKh: '900055' }]),
  fetchCreditContractsByCustomerAPI: async () => [],
  fetchContractsByCustomerAPI: async () => ([
    {
      Id: 912, CustomerId: 55, ContractNumber: 'KUNN-912',
      LoanAmount: 400_000_000, IsSettled: false,
    },
    {
      Id: 913, CustomerId: 55, ContractNumber: 'KUNN-913',
      LoanAmount: 200_000_000, IsSettled: false,
    },
  ]),
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
  saveCustomerAPI: async (payload: unknown) => (payload as Record<string, unknown>),
  deleteCustomerAPI: async () => {},
  setCustomerArchivedAPI: async (id: number) => ({ Id: id, ArchivedAt: null }),
}));

import { useLoanPortfolioController } from '../../hooks/useLoanPortfolioController';
import { CustomerListView } from '../views/CustomerListView';

function Probe() {
  const { mainTab, selectedContract } = useLoanPortfolioController();
  return (
    <div>
      <span data-testid="tab">{mainTab}</span>
      <span data-testid="kunn">{selectedContract?.ContractNumber ?? '—'}</span>
    </div>
  );
}

function ProbeNav() {
  const navigate = useNavigate();
  const { mainTab, selectedContract } = useLoanPortfolioController();
  return (
    <div>
      <button type="button" onClick={() => navigate('/customers/55/loans/913/schedule')}>
        chuyển sang KUNN-913
      </button>
      <span data-testid="tab">{mainTab}</span>
      <span data-testid="kunn">{selectedContract?.ContractNumber ?? '—'}</span>
    </div>
  );
}

function ProbeToggleThenReenter() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { mainTab, selectedContract } = useLoanPortfolioController();
  return (
    <div>
      <button type="button" onClick={() => navigate('/customers/55/loans')}>
        rời khỏi tuyến sâu
      </button>
      <button type="button" onClick={() => navigate('/customers/55/loans/912/schedule')}>
        quay lại tuyến sâu KUNN-912
      </button>
      <span data-testid="duong-dan">{pathname}</span>
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

  it('đổi sang KUNN khác qua URL vẫn áp được, không bị khoá bởi lần áp trước', async () => {
    render(
      <MemoryRouter initialEntries={['/customers/55/loans/912/schedule']}>
        <Routes>
          <Route path="/customers/:customerId/loans/:kunnId/schedule" element={<ProbeNav />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId('kunn').textContent).toBe('KUNN-912'));

    await userEvent.click(screen.getByText('chuyển sang KUNN-913'));

    await waitFor(() => expect(screen.getByTestId('kunn').textContent).toBe('KUNN-913'));
    expect(screen.getByTestId('tab').textContent).toBe('schedule');
  });

  it('KUNN đã được chọn sẵn thì quay lại tuyến sâu của chính nó không bị bỏ chọn', async () => {
    render(
      <MemoryRouter initialEntries={['/customers/55/loans/912/schedule']}>
        <Routes>
          <Route path="/customers/:customerId/loans" element={<ProbeToggleThenReenter />} />
          <Route path="/customers/:customerId/loans/:kunnId/schedule" element={<ProbeToggleThenReenter />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId('kunn').textContent).toBe('KUNN-912'));

    await userEvent.click(screen.getByText('rời khỏi tuyến sâu'));
    await waitFor(() => expect(screen.getByTestId('duong-dan').textContent).toBe('/customers/55/loans'));

    await userEvent.click(screen.getByText('quay lại tuyến sâu KUNN-912'));

    await waitFor(() => expect(screen.getByTestId('tab').textContent).toBe('schedule'));
    expect(screen.getByTestId('kunn').textContent).toBe('KUNN-912');
  });
});

describe('tuyến sâu hồ sơ khách hàng', () => {
  it('/customers/55/profile mở sẵn form Sửa cho đúng khách hàng đó', async () => {
    render(
      <MemoryRouter initialEntries={['/customers/55/profile']}>
        <Routes>
          <Route path="/customers" element={<CustomerListView />} />
          <Route path="/customers/:customerId/profile" element={<CustomerListView />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByTitle('Đóng (Esc)')).toBeTruthy());
  });

  it('đóng form rồi bấm Sửa lại cùng khách hàng thì form phải mở lại', async () => {
    render(
      <MemoryRouter initialEntries={['/customers/55/profile']}>
        <Routes>
          <Route path="/customers" element={<CustomerListView />} />
          <Route path="/customers/:customerId/profile" element={<CustomerListView />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByTitle('Đóng (Esc)')).toBeTruthy());

    await userEvent.click(screen.getByTitle('Đóng (Esc)'));
    await waitFor(() => expect(screen.queryByTitle('Đóng (Esc)')).toBeNull());

    const suaButtons = await screen.findAllByText('Sửa');
    await userEvent.click(suaButtons[0]);

    await waitFor(() => expect(screen.getByTitle('Đóng (Esc)')).toBeTruthy());
  });
});
