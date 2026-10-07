// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { LanguageProvider } from '../../context/LanguageContext';
import type { AdminUser } from '../../lib/userAdmin';

const h = vi.hoisted(() => ({
  role: 'user_admin' as string,
  session: true,
  users: [] as unknown[],
  usersError: null as string | null,
  byUser: {} as Record<string, string[]>,
  modulesError: null as string | null,
  save: vi.fn(async (_id: string, _modules: readonly string[]) => {}),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'me' },
    session: h.session ? { user: { id: 'me' } } : null,
    loading: false,
    signIn: async () => {},
    role: h.role,
    can: (c: string) =>
      (c === 'user.manage' && (h.role === 'master_admin' || h.role === 'user_admin')) || (c === 'storage.configure' && h.role === 'master_admin'),
  }),
}));
vi.mock('../../hooks/useAdminUsers', () => ({
  useAdminUsers: () => ({ users: h.users, loading: false, error: h.usersError, reload: async () => {} }),
}));
vi.mock('../../hooks/useUserModules', () => ({
  useUserModules: () => ({ byUser: h.byUser, loading: false, error: h.modulesError, reload: async () => {}, save: h.save }),
}));

import { UserModulesView } from '../views/UserModulesView';
import { AdminLayout } from '../admin/AdminLayout';

const user = (id: string, role: AdminUser['role'], name = id): AdminUser => ({
  id, email: `${id}@app.local`, fullName: name, role, disabled: false, lastSignInAt: null, createdAt: '2026-10-01T00:00:00Z',
});

beforeEach(() => {
  h.role = 'user_admin';
  h.session = true;
  h.users = [user('u1', 'user', 'Nguyễn Văn An'), user('m1', 'master_admin', 'Chủ hệ thống'), user('a1', 'user_admin', 'Quản lý')];
  h.usersError = null;
  h.byUser = {};
  h.modulesError = null;
  h.save.mockReset();
  h.save.mockResolvedValue(undefined);
});
afterEach(cleanup);

function dung(userId: string) {
  return render(
    <MemoryRouter initialEntries={[`/admin/users/${userId}`]}>
      <LanguageProvider>
        <Routes>
          <Route path="/admin/users/:userId" element={<UserModulesView />} />
          <Route path="/admin/users" element={<div>DANH-SACH</div>} />
        </Routes>
      </LanguageProvider>
    </MemoryRouter>,
  );
}

const hop = (name: string) => screen.getByRole('checkbox', { name }) as HTMLInputElement;

describe('UserModulesView', () => {
  it('tài khoản chưa có dòng cờ hiện đủ bảy module được tích', () => {
    dung('u1');
    expect(screen.getAllByRole('checkbox')).toHaveLength(7);
    for (const box of screen.getAllByRole('checkbox')) expect((box as HTMLInputElement).checked).toBe(true);
  });

  it('hiện đúng các module theo dòng cờ đã lưu', () => {
    h.byUser = { u1: ['dispatch'] };
    dung('u1');
    expect(hop('Văn thư').checked).toBe(true);
    expect(hop('Hồ sơ tín dụng').checked).toBe(false);
  });

  it('liệt kê màn hình thuộc module ở cột "Gồm"', () => {
    dung('u1');
    expect(screen.getAllByText(/Danh sách khách hàng/).length).toBeGreaterThan(0);
  });

  it('nút Lưu thay đổi bị khóa cho tới khi có thay đổi', () => {
    dung('u1');
    const luu = screen.getByRole('button', { name: /Lưu thay đổi/ }) as HTMLButtonElement;
    expect(luu.disabled).toBe(true);
    fireEvent.click(hop('Ôn tập nghiệp vụ'));
    expect(luu.disabled).toBe(false);
    fireEvent.click(hop('Ôn tập nghiệp vụ'));
    expect(luu.disabled).toBe(true);
  });

  it('bộ chọn nhanh "Chỉ Văn thư" rồi lưu gửi đúng danh sách module', async () => {
    dung('u1');
    fireEvent.click(screen.getByRole('button', { name: 'Chỉ Văn thư' }));
    expect(hop('Văn thư').checked).toBe(true);
    expect(hop('Hồ sơ tín dụng').checked).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/ }));
    await waitFor(() => expect(h.save).toHaveBeenCalledWith('u1', ['dispatch']));
    expect((await screen.findByRole('status')).textContent).toContain('Đã lưu module của Nguyễn Văn An');
  });

  it('bộ chọn nhanh "Đầy đủ" tích lại cả bảy', () => {
    h.byUser = { u1: [] };
    dung('u1');
    fireEvent.click(screen.getByRole('button', { name: 'Đầy đủ' }));
    for (const box of screen.getAllByRole('checkbox')) expect((box as HTMLInputElement).checked).toBe(true);
  });

  it('lưu lỗi thì hiện nguyên thông điệp lỗi và giữ lựa chọn đang sửa', async () => {
    h.save.mockRejectedValue(new Error('Chưa áp migration 65_user_modules.sql trên Supabase.'));
    dung('u1');
    fireEvent.click(hop('Kho lưu trữ'));
    fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/ }));
    expect((await screen.findByRole('alert')).textContent).toContain('Chưa áp migration 65_user_modules.sql trên Supabase.');
    expect(hop('Kho lưu trữ').checked).toBe(false);
  });

  it('Master Admin chỉ xem: không bộ chọn, không nút lưu, ô tích bị khóa', () => {
    dung('m1');
    expect(screen.getByText('Master Admin luôn dùng được mọi module.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Lưu thay đổi/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Chỉ Văn thư' })).toBeNull();
    for (const box of screen.getAllByRole('checkbox')) {
      expect((box as HTMLInputElement).disabled).toBe(true);
      expect((box as HTMLInputElement).checked).toBe(true);
    }
  });

  it('User Admin cũng luôn đủ module, kể cả khi có dòng cờ rỗng', () => {
    h.byUser = { a1: [] };
    dung('a1');
    for (const box of screen.getAllByRole('checkbox')) expect((box as HTMLInputElement).checked).toBe(true);
    expect(screen.queryByRole('button', { name: /Lưu thay đổi/ })).toBeNull();
  });

  it('không tìm thấy tài khoản thì báo rõ', () => {
    dung('khong-co');
    expect(screen.getByRole('alert').textContent).toContain('Không tìm thấy tài khoản này.');
  });

  it('lỗi nạp danh sách hiện nguyên thông điệp, không giả làm "không tìm thấy"', () => {
    h.usersError = 'Phiên đăng nhập hết hạn. Hãy đăng nhập lại.';
    dung('u1');
    expect(screen.getByRole('alert').textContent).toContain('Phiên đăng nhập hết hạn. Hãy đăng nhập lại.');
    expect(screen.queryByText('Không tìm thấy tài khoản này.')).toBeNull();
  });

  it('lỗi nạp cờ module (chưa áp migration) hiện nguyên thông điệp', () => {
    h.modulesError = 'Chưa áp migration 65_user_modules.sql trên Supabase.';
    dung('u1');
    expect(screen.getByRole('alert').textContent).toContain('Chưa áp migration 65_user_modules.sql trên Supabase.');
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  });

  it('cột "Chặn ở CSDL" ghi Không cho Công cụ tính và Có cho các module còn lại', () => {
    dung('u1');
    const dong = (ten: string) => screen.getByRole('checkbox', { name: ten }).closest('tr') as HTMLElement;
    expect(dong('Công cụ tính').textContent).toContain('Không');
    expect(dong('Văn thư').textContent).toContain('Có');
  });
});

describe('AdminLayout', () => {
  function dungLayout() {
    return render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<div>NOI-DUNG-TONG-QUAN</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
  }

  it('hai vai trò quản trị thấy sidebar quản trị và nội dung', () => {
    dungLayout();
    const nav = screen.getByRole('navigation', { name: 'Khu quản trị' });
    expect(within(nav).getByRole('link', { name: 'Tổng quan' }).getAttribute('href')).toBe('/admin');
    expect(within(nav).getByRole('link', { name: 'Người dùng' }).getAttribute('href')).toBe('/admin/users');
    expect(screen.getByText('NOI-DUNG-TONG-QUAN')).toBeTruthy();
  });

  it('mục Cấu hình kho lưu trữ chỉ hiện với Master Admin', () => {
    h.role = 'master_admin';
    const { unmount } = dungLayout();
    expect(within(screen.getByRole('navigation', { name: 'Khu quản trị' })).getByRole('link', { name: 'Cấu hình kho lưu trữ' }).getAttribute('href')).toBe('/admin/storage');
    unmount();

    h.role = 'user_admin';
    dungLayout();
    const nav = screen.getByRole('navigation', { name: 'Khu quản trị' });
    expect(within(nav).queryByRole('link', { name: 'Cấu hình kho lưu trữ' })).toBeNull();
    expect(within(nav).getByRole('link', { name: 'Người dùng' })).toBeTruthy();
  });

  it('có đường về ứng dụng, và không dựng sidebar của ứng dụng', () => {
    const { container } = dungLayout();
    expect(screen.getByRole('link', { name: 'Về ứng dụng' }).getAttribute('href')).toBe('/dashboard');
    expect(container.querySelector('[aria-label="Sidebar Navigation"]')).toBeNull();
  });

  it('chưa đăng nhập thì hiện màn đăng nhập, không lộ nội dung quản trị', () => {
    h.session = false;
    dungLayout();
    expect(screen.queryByText('NOI-DUNG-TONG-QUAN')).toBeNull();
    expect(screen.queryByRole('navigation', { name: 'Khu quản trị' })).toBeNull();
  });

  it('tài khoản cấp User không thấy nội dung quản trị', () => {
    h.role = 'user';
    dungLayout();
    expect(screen.getByRole('alert').textContent).toContain('Chỉ Master Admin và User Admin');
    expect(screen.queryByText('NOI-DUNG-TONG-QUAN')).toBeNull();
  });
});
