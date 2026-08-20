// @vitest-environment jsdom

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { LanguageProvider } from '../../context/LanguageContext';
import { ThemeProvider } from '../../context/ThemeContext';
import { WorkProvider } from '../../context/WorkContext';
import { ROUTE_OF, DEFAULT_ROUTE, screenIdOfPath } from '../../lib/routes';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    session: { user: { id: 'test' } },
    user: { id: 'test', email: 'test@nganhang.vn' },
    role: 'banker',
    fullName: 'Nguyễn Văn Thử',
    isAdmin: false,
    loading: false,
    signIn: async () => {},
    signOut: async () => {},
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { AppLayout as AppLayoutDuoiTest } from '../AppLayout';

afterEach(cleanup);

describe('bảng đường dẫn', () => {
  it('mọi đường dẫn tra ngược được ra màn', () => {
    for (const path of Object.values(ROUTE_OF)) {
      expect(screenIdOfPath(path), `${path} không tra ngược được`).toBeTruthy();
    }
  });

  it('màn mặc định là Tổng quan', () => {
    expect(DEFAULT_ROUTE).toBe('/dashboard');
  });
});

describe('AppLayout dựng được trong bộ định tuyến', () => {
  function dungLen(duongDan: string) {
    return render(
      <MemoryRouter initialEntries={[duongDan]}>
        <ThemeProvider>
          <LanguageProvider>
            <WorkProvider>
              <Routes>
                <Route element={<AppLayoutDuoiTest />}>
                  <Route path={ROUTE_OF.dashboard} element={<div>NOI DUNG MAN</div>} />
                  <Route path={ROUTE_OF.settings} element={<div>NOI DUNG MAN</div>} />
                </Route>
              </Routes>
            </WorkProvider>
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>
    );
  }

  it('render khung và nội dung màn con, không ném lỗi', () => {
    dungLen(ROUTE_OF.dashboard);
    expect(screen.getByRole('navigation')).toBeTruthy();
    expect(screen.getByText('NOI DUNG MAN')).toBeTruthy();
  });

  it('đổi đường dẫn thì thanh bên đánh dấu đúng mục', () => {
    const { container } = dungLen(ROUTE_OF.settings);
    const dangMo = container.querySelector('[aria-current="page"]');
    expect(dangMo).toBeTruthy();
  });
});
