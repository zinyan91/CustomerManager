// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { LanguageProvider } from '../../context/LanguageContext';
import { ThemeProvider } from '../../context/ThemeContext';
import { recordApiFailure, recordApiSuccess, resetApiHealth } from '../../lib/apiHealth';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u', email: 'a@b.vn' }, role: 'user', fullName: 'Thử',
    isAdmin: false, can: () => false, roleLoading: false, signOut: async () => {},
  }),
}));

import { Header } from '../Header';

function dungLen() {
  return render(
    <ThemeProvider><LanguageProvider><Header /></LanguageProvider></ThemeProvider>
  );
}

beforeEach(() => resetApiHealth());
afterEach(cleanup);

describe('Header — chấm trạng thái', () => {
  it('mọi thứ chạy thì Trực tuyến', () => {
    dungLen();
    expect(screen.getByText('Trực tuyến')).toBeTruthy();
  });

  it('máy có mạng nhưng máy chủ không trả lời thì KHÔNG được hiện Trực tuyến', () => {
    recordApiFailure();
    dungLen();
    expect(screen.queryByText('Trực tuyến')).toBeNull();
    expect(screen.getByText('Mất kết nối máy chủ')).toBeTruthy();
  });

  it('gọi lại thành công thì quay về Trực tuyến', () => {
    recordApiFailure();
    recordApiSuccess();
    dungLen();
    expect(screen.getByText('Trực tuyến')).toBeTruthy();
  });
});
