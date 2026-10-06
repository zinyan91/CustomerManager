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

vi.mock('../../lib/customerPortfolioExport', () => ({
  downloadActiveCustomerPortfolioReport: (...args: unknown[]) => mockDownload(...args),
}));

vi.mock('../../lib/api', () => ({
  fetchCustomersAPI: async () => [{ Id: 1, FullName: 'Nguyễn Văn A', CifKh: '123456' }],
  saveCustomerAPI: async (c: unknown) => c,
  deleteCustomerAPI: async () => {},
  setCustomerArchivedAPI: async () => ({ Id: 1 }),
}));

import { CustomerListView } from '../views/CustomerListView';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CustomerListView - Nút xuất danh mục đang vay', () => {
  it('hiển thị nút Xuất danh mục đang vay và kích hoạt download khi bấm', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <CustomerListView />
      </MemoryRouter>
    );

    const btn = await screen.findByRole('button', { name: /XUẤT DANH MỤC ĐANG VAY/i });
    expect(btn).toBeTruthy();

    await user.click(btn);
    expect(mockDownload).toHaveBeenCalledTimes(1);
  });
});
