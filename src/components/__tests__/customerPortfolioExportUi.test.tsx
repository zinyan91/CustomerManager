// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

const mockDownload = vi.fn();

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

vi.mock('../../lib/customerPortfolioExport', async importOriginal => ({
  ...await importOriginal<object>(),
  exportActiveCustomerPortfolioExcel: (...args: unknown[]) => mockDownload(...args),
}));
vi.mock('../../lib/reports/alertLoader',()=>({loadAlertSnapshot:async()=>({
  today:'2026-10-20',customers:[],contracts:[],collaterals:[],creditContracts:[],periods:[],paidPrincipalMap:{},
})}));

vi.mock('../../lib/api', () => ({
  fetchCustomersAPI: async () => [{ Id: 1, FullName: 'Nguyễn Văn A', CifKh: '123456' }],
  saveCustomerAPI: async (c: unknown) => c,
  deleteCustomerAPI: async () => {},
  setCustomerArchivedAPI: async () => ({ Id: 1 }),
}));

import { CustomerListView } from '../views/CustomerListView';
import { ReportCenterView } from '../views/ReportCenterView';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Nút xuất danh mục đang vay chuyển về báo cáo', () => {
  it('không còn nút xuất ở danh sách khách hàng', async () => {
    render(
      <MemoryRouter>
        <CustomerListView />
      </MemoryRouter>
    );

    expect((await screen.findAllByText('Nguyễn Văn A')).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /XUẤT DANH MỤC ĐANG VAY/i })).toBeNull();
    expect(mockDownload).not.toHaveBeenCalled();
  });
  it('nút tại trung tâm báo cáo gọi đúng mẫu danh mục đầy đủ',async()=>{
    const user=userEvent.setup();
    render(<ReportCenterView />);
    await user.click(screen.getByRole('tab',{name:'Danh mục & tổng hợp'}));
    await user.click(screen.getByRole('button',{name:'Xuất danh mục đang vay'}));
    expect(mockDownload).toHaveBeenCalledTimes(1);
    expect(mockDownload).toHaveBeenCalledWith(expect.objectContaining({todayStr:'2026-10-20',paidPrincipalMap:{}}));
  });
});
