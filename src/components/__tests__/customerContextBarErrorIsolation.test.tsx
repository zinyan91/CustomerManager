// @vitest-environment jsdom

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { ThemeProvider } from '../../context/ThemeContext';
import { LanguageProvider } from '../../context/LanguageContext';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    session: { user: { id: 'test' } },
    user: { id: 'test', email: 'test@nganhang.vn' },
    role: 'user',
    fullName: 'Nguyễn Văn Thử',
    isAdmin: false,
    can: () => false,
    roleLoading: false,
    loading: false,
    signIn: async () => {},
    signOut: async () => {},
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('../../context/ModulesContext', async () => {
  const { MODULE_IDS } = await import('../../lib/modules');
  const value = { allowed: [...MODULE_IDS], ready: true, error: null, reload: () => {} };
  return { useModules: () => value, ModulesProvider: ({ children }: { children: React.ReactNode }) => children };
});

vi.mock('../../hooks/useCustomerContext', () => ({
  useCustomerContext: () => { throw new Error('lỗi giả lập trong thanh ngữ cảnh'); },
}));

import { AppLayout as AppLayoutDuoiTest } from '../AppLayout';

afterEach(cleanup);

describe('M1: lỗi trong CustomerContextBar không làm trắng cả ứng dụng', () => {
  it('sidebar và header vẫn còn, chỉ vùng nội dung báo lỗi', () => {
    render(
      <MemoryRouter initialEntries={['/customers/55/loans']}>
        <ThemeProvider>
          <LanguageProvider>
            <Routes>
              <Route element={<AppLayoutDuoiTest />}>
                <Route path="/customers/:customerId/loans" element={<div>NOI DUNG MAN</div>} />
              </Route>
            </Routes>
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole('navigation')).toBeTruthy();
    expect(screen.queryByText('NOI DUNG MAN')).toBeNull();
    expect(screen.getByText(/Lỗi khi tải giao diện màn hình/)).toBeTruthy();
  });
});
