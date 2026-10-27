// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useNavigate, useLocation } from 'react-router';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    session: { user: { id: 'test' } },
    user: { id: 'test', email: 'test@nganhang.vn' },
    role: 'master_admin',
    fullName: 'Quản trị thử',
    isMasterAdmin: true,
    isUserAdmin: false,
    isAdmin: true,
    isUser: false,
    can: () => true,
    loading: false,
    signIn: async () => {},
    signOut: async () => {},
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('../../lib/api', () => ({
  fetchCustomersAPI: async () => ([
    { Id: 55, FullName: 'Trần Thị B', CifKh: '900055' },
    { Id: 56, FullName: 'Khách đã lưu trữ', CifKh: '900056', ArchivedAt: '2026-10-20T08:00:00Z' },
  ]),
  fetchCreditContractsByCustomerAPI: async () => [],
  fetchPledgeLoanBundleByCustomerAPI: async () => ({ loans: [], links: [], repayments: [] }),
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
  setCustomerArchivedAPI: vi.fn(async (id: number, archived: boolean) =>
    ({ Id: id, ArchivedAt: archived ? '2026-10-21T08:00:00Z' : null })),
}));

import { useLoanPortfolioController } from '../../hooks/useLoanPortfolioController';
import { CustomerListView } from '../views/CustomerListView';
import { setCustomerArchivedAPI } from '../../lib/api';

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

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('lưu trữ hồ sơ khách hàng', () => {
  function openProfile(id: number) {
    return render(
      <MemoryRouter initialEntries={[`/customers/${id}/profile`]}>
        <Routes>
          <Route path="/customers" element={<CustomerListView />} />
          <Route path="/customers/:customerId/profile" element={<CustomerListView />} />
        </Routes>
      </MemoryRouter>
    );
  }

  it('URL khách đã lưu trữ mở được hồ sơ và bỏ lưu trữ ngay trong form', async () => {
    openProfile(56);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/HỒ SƠ KHÁCH HÀNG: Khách đã lưu trữ/)).toBeTruthy();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Bỏ lưu trữ' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(setCustomerArchivedAPI).toHaveBeenCalledWith(56, false);
    await userEvent.click(screen.getByRole('button', { name: 'Đang làm việc (2)' }));
    expect(screen.getAllByText('Khách đã lưu trữ').length).toBeGreaterThan(0);
  });

  it('lưu trữ từ form đóng form và chuyển khách sang danh sách đã lưu trữ', async () => {
    openProfile(55);
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu trữ hồ sơ' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(setCustomerArchivedAPI).toHaveBeenCalledWith(55, true);
    await userEvent.click(screen.getByRole('button', { name: 'Đã lưu trữ (2)' }));
    expect(screen.getAllByText('Trần Thị B').length).toBeGreaterThan(0);
  });

  it('lỗi server giữ form mở và không đổi bộ đếm lưu trữ', async () => {
    vi.mocked(setCustomerArchivedAPI).mockRejectedValueOnce(new Error('RLS: không có quyền sửa hồ sơ'));
    openProfile(55);
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu trữ hồ sơ' }));
    expect(await screen.findByText('RLS: không có quyền sửa hồ sơ')).toBeTruthy();
    expect(screen.getByRole('dialog')).toBeTruthy();
    await userEvent.click(within(dialog).getByTitle('Đóng (Esc)'));
    expect(screen.getByRole('button', { name: 'Đã lưu trữ (1)' })).toBeTruthy();
  });
});

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
