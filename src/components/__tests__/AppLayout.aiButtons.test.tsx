// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router';
import { ThemeProvider } from '../../context/ThemeContext';
import { LanguageProvider } from '../../context/LanguageContext';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    session: { user: { id: 'fixture' } }, user: { id: 'fixture' }, loading: false,
    role: 'user', fullName: 'Kiểm thử', isAdmin: false, can: () => false, signOut: vi.fn(),
  }),
}));
vi.mock('../../context/UserScopeContext', () => ({
  useUserScope: () => ({ ready: true, scopeKey: 'fixture', managedUsers: [] }),
}));
vi.mock('../CustomerContextBar', () => ({ CustomerContextBar: () => null }));
vi.mock('../Sidebar', () => ({ Sidebar: () => null }));
vi.mock('../PrimaryRail', () => ({ PrimaryRail: () => null }));
vi.mock('../CommandPalette', () => ({ CommandPalette: () => null }));
vi.mock('../ModuleGate', () => ({ ModuleGate: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('../ai/AiChatDialog', () => ({
  FloatingAiAssistantButton: ({ onClick }: { onClick: () => void }) => <button onClick={onClick}>Trợ lý AI</button>,
  AiChatDialog: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? <aside aria-label="AI chung"><button onClick={onClose}>Đóng chat</button></aside> : null,
}));
import { AppLayout } from '../AppLayout';

afterEach(cleanup);

function mount(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider><LanguageProvider><Routes>
        <Route element={<AppLayout />}>
          <Route path="/collaterals" element={<Link to="/dispatches">Sang văn thư</Link>} />
          {['/dispatches', '/storage', '/tools/corporate-financial', '/hub/corporate-financial'].map(route =>
            <Route key={route} path={route} element={<><button>Trợ lý AI theo trang</button><Link to="/collaterals">Về tài sản</Link></>} />)}
        </Route>
      </Routes></LanguageProvider></ThemeProvider>
    </MemoryRouter>,
  );
}

describe('AppLayout chỉ có một lối mở chat AI', () => {
  it('trang thường chỉ có nút nổi, ẩn nút khi mở chat và hiện lại sau đóng', () => {
    mount('/collaterals');
    expect(screen.getAllByRole('button', { name: /Trợ lý AI/ })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Trợ lý AI' }));
    expect(screen.getByRole('complementary', { name: 'AI chung' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Trợ lý AI/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Đóng chat' }));
    expect(screen.getAllByRole('button', { name: /Trợ lý AI/ })).toHaveLength(1);
  });

  it.each(['/dispatches', '/storage', '/tools/corporate-financial', '/hub/corporate-financial'])(
    '%s chỉ giữ nút AI theo ngữ cảnh', path => {
      mount(path);
      expect(screen.getAllByRole('button', { name: /Trợ lý AI/ })).toHaveLength(1);
      expect(screen.getByRole('button', { name: 'Trợ lý AI theo trang' })).toBeTruthy();
    },
  );

  it('chuyển sang trang có AI riêng đóng chat chung, quay lại không tự mở chat cũ', () => {
    mount('/collaterals');
    fireEvent.click(screen.getByRole('button', { name: 'Trợ lý AI' }));
    fireEvent.click(screen.getByRole('link', { name: 'Sang văn thư' }));
    expect(screen.queryByRole('complementary', { name: 'AI chung' })).toBeNull();
    expect(screen.getAllByRole('button', { name: /Trợ lý AI/ })).toHaveLength(1);
    fireEvent.click(screen.getByRole('link', { name: 'Về tài sản' }));
    expect(screen.queryByRole('complementary', { name: 'AI chung' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Trợ lý AI' })).toBeTruthy();
  });
});
