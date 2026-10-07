// @vitest-environment jsdom

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render as renderRaw, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { ReactElement } from 'react';

const h = vi.hoisted(() => ({
  auth: { role: 'master_admin' as string | null, id: 'me' },
  api: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    modules: vi.fn(),
  },
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: h.auth.id },
    role: h.auth.role,
    can: (c: string) => c === 'user.manage' && (h.auth.role === 'master_admin' || h.auth.role === 'user_admin'),
  }),
}));
vi.mock('../../context/UserScopeContext', () => ({
  useUserScope: () => ({ managedUsers: [{ userId: 'u1', customerCount: 7 }] }),
}));
vi.mock('../../lib/api/userModulesApi', () => ({
  fetchAllUserModules: h.api.modules,
  saveUserModules: vi.fn(),
  fetchOwnModules: vi.fn(),
}));
vi.mock('../../lib/api/userAdminApi', () => ({
  listAdminUsers: h.api.list,
  createAdminUser: h.api.create,
  updateAdminUser: h.api.update,
  deleteAdminUser: h.api.remove,
}));

import { UserManagementView } from '../views/UserManagementView';

const render = (ui: ReactElement) => renderRaw(<MemoryRouter>{ui}</MemoryRouter>);

const U = (p: Record<string, unknown>) => ({
  id: 'x', email: 'x@app.local', fullName: 'X', role: 'user', disabled: false, lastSignInAt: null, createdAt: '2026-01-01T00:00:00Z', ...p,
});

const USERS = [
  U({ id: 'me', email: 'me@app.local', fullName: 'Tôi', role: 'master_admin' }),
  U({ id: 'ua', email: 'ua@app.local', fullName: 'Quản trị viên', role: 'user_admin' }),
  U({ id: 'u1', email: 'u1@app.local', fullName: 'Nhân viên Một', role: 'user' }),
  U({ id: 'u2', email: 'u2@app.local', fullName: 'Nhân viên Hai', role: 'user', disabled: true }),
  U({ id: 'u3', email: 'u3@app.local', fullName: 'Chưa gán', role: null }),
];

beforeEach(() => {
  h.auth.role = 'master_admin';
  h.auth.id = 'me';
  Object.values(h.api).forEach(f => f.mockReset());
  h.api.list.mockResolvedValue(USERS);
  h.api.create.mockResolvedValue({ id: 'new' });
  h.api.update.mockResolvedValue({ id: 'u1' });
  h.api.remove.mockResolvedValue({ id: 'u1' });
  h.api.modules.mockResolvedValue({});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('UserManagementView', () => {
  it('hiện danh sách với vai trò, trạng thái và số khách phụ trách', async () => {
    render(<UserManagementView />);
    expect(await screen.findByText('Nhân viên Một')).toBeTruthy();
    const row = screen.getByText('Nhân viên Một').closest('tr')!;
    expect(within(row).getByText('7')).toBeTruthy();
    expect(within(row).getByText('Hoạt động')).toBeTruthy();
    expect(within(screen.getByText('Nhân viên Hai').closest('tr')!).getByText('Đã khóa')).toBeTruthy();
    expect(within(screen.getByText('Chưa gán').closest('tr')!).getByText('Chưa phân quyền')).toBeTruthy();
    expect(screen.getByText('5 tài khoản')).toBeTruthy();
  });

  it('không có quyền thì chỉ hiện thông báo và không gọi máy chủ', () => {
    h.auth.role = 'user';
    render(<UserManagementView />);
    expect(screen.getByRole('alert').textContent).toMatch(/Chỉ Master Admin và User Admin/);
    expect(h.api.list).not.toHaveBeenCalled();
  });

  it('không cho khóa hay xóa chính mình', async () => {
    render(<UserManagementView />);
    await screen.findByText('Nhân viên Một');
    expect(screen.queryByLabelText(/^Khóa Tôi/)).toBeNull();
    expect(screen.queryByLabelText(/^Xóa Tôi/)).toBeNull();
    expect(screen.getByLabelText(/^Khóa Nhân viên Một/)).toBeTruthy();
  });

  it('User Admin không thấy nút thao tác trên Master Admin', async () => {
    h.auth.role = 'user_admin';
    h.auth.id = 'ua';
    render(<UserManagementView />);
    await screen.findByText('Nhân viên Một');
    expect(screen.queryByLabelText(/^Sửa Tôi/)).toBeNull();
    expect(screen.queryByLabelText(/^Xóa Tôi/)).toBeNull();
    expect(screen.getByLabelText(/^Sửa Nhân viên Một/)).toBeTruthy();
  });

  it('khóa đăng nhập sau khi xác nhận thì gọi update disabled và nạp lại', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<UserManagementView />);
    await screen.findByText('Nhân viên Một');
    fireEvent.click(screen.getByLabelText(/^Khóa Nhân viên Một/));
    await waitFor(() => expect(h.api.update).toHaveBeenCalledWith({ userId: 'u1', disabled: true }));
    await waitFor(() => expect(h.api.list).toHaveBeenCalledTimes(2));
    expect((await screen.findByRole('status')).textContent).toMatch(/Đã khóa Nhân viên Một/);
  });

  it('hủy xác nhận thì không gọi máy chủ', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<UserManagementView />);
    await screen.findByText('Nhân viên Một');
    fireEvent.click(screen.getByLabelText(/^Xóa Nhân viên Một/));
    expect(h.api.remove).not.toHaveBeenCalled();
  });

  it('mở khóa tài khoản đang bị khóa', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<UserManagementView />);
    await screen.findByText('Nhân viên Hai');
    fireEvent.click(screen.getByLabelText(/^Mở khóa Nhân viên Hai/));
    await waitFor(() => expect(h.api.update).toHaveBeenCalledWith({ userId: 'u2', disabled: false }));
  });

  it('xóa thất bại thì hiện nguyên thông điệp của máy chủ', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    h.api.remove.mockRejectedValue(new Error('Tài khoản còn dữ liệu, hãy khóa đăng nhập.'));
    render(<UserManagementView />);
    await screen.findByText('Nhân viên Một');
    fireEvent.click(screen.getByLabelText(/^Xóa Nhân viên Một/));
    expect((await screen.findByRole('alert')).textContent).toMatch(/còn dữ liệu/);
  });

  it('lỗi tải danh sách hiện thông điệp, không giả làm "chưa có tài khoản"', async () => {
    h.api.list.mockRejectedValue(new Error('Chưa triển khai Edge Function "admin-users" trên Supabase.'));
    render(<UserManagementView />);
    expect((await screen.findByRole('alert')).textContent).toMatch(/Chưa triển khai Edge Function/);
  });

  it('thêm người dùng: kiểm mật khẩu, rồi gọi create với email chuẩn hóa', async () => {
    render(<UserManagementView />);
    await screen.findByText('Nhân viên Một');
    fireEvent.click(screen.getByRole('button', { name: /Thêm người dùng/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Thêm người dùng' });
    fireEvent.change(within(dialog).getByLabelText('Email đăng nhập'), { target: { value: 'Moi@App.local' } });
    fireEvent.change(within(dialog).getByLabelText('Họ tên'), { target: { value: 'Người mới' } });
    fireEvent.change(within(dialog).getByLabelText('Mật khẩu tạm'), { target: { value: 'ngan' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tạo tài khoản' }));
    expect(within(dialog).getByRole('alert').textContent).toMatch(/8/);
    expect(h.api.create).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByLabelText('Mật khẩu tạm'), { target: { value: 'matkhau-dai-1' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tạo tài khoản' }));
    await waitFor(() =>
      expect(h.api.create).toHaveBeenCalledWith({ email: 'moi@app.local', fullName: 'Người mới', role: 'user', password: 'matkhau-dai-1' })
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('lỗi từ máy chủ khi tạo thì giữ form mở và hiện lỗi', async () => {
    h.api.create.mockRejectedValue(new Error('Email này đã được dùng cho một tài khoản khác.'));
    render(<UserManagementView />);
    await screen.findByText('Nhân viên Một');
    fireEvent.click(screen.getByRole('button', { name: /Thêm người dùng/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Email đăng nhập'), { target: { value: 'a@b.vn' } });
    fireEvent.change(within(dialog).getByLabelText('Họ tên'), { target: { value: 'A' } });
    fireEvent.change(within(dialog).getByLabelText('Mật khẩu tạm'), { target: { value: 'matkhau-dai-1' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tạo tài khoản' }));
    expect((await within(dialog).findByRole('alert')).textContent).toMatch(/đã được dùng/);
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('sửa vai trò gửi đúng role mới', async () => {
    render(<UserManagementView />);
    await screen.findByText('Nhân viên Một');
    fireEvent.click(screen.getByLabelText(/^Sửa Nhân viên Một/));
    const dialog = await screen.findByRole('dialog', { name: 'Sửa người dùng' });
    fireEvent.change(within(dialog).getByLabelText('Vai trò'), { target: { value: 'user_admin' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(h.api.update).toHaveBeenCalledWith({ userId: 'u1', fullName: 'Nhân viên Một', role: 'user_admin' }));
  });

  it('User Admin không có lựa chọn Master Admin khi gán vai trò', async () => {
    h.auth.role = 'user_admin';
    h.auth.id = 'ua';
    render(<UserManagementView />);
    await screen.findByText('Nhân viên Một');
    fireEvent.click(screen.getByRole('button', { name: /Thêm người dùng/ }));
    const select = (await screen.findByLabelText('Vai trò')) as HTMLSelectElement;
    expect([...select.options].map(o => o.value)).toEqual(['user_admin', 'user']);
  });
});

describe('UserManagementView: module của từng tài khoản', () => {
  it('cột Module: chưa có dòng cờ và quản trị ghi Đầy đủ, có dòng cờ thì gọi tên module', async () => {
    h.api.modules.mockResolvedValue({ u1: ['dispatch'], u2: ['credit', 'dispatch', 'quiz'], u3: [] });
    render(<UserManagementView />);
    await screen.findByText('Nhân viên Một');
    await waitFor(() => expect(within(screen.getByText('Nhân viên Một').closest('tr')!).getByText('Văn thư')).toBeTruthy());
    expect(within(screen.getByText('Nhân viên Hai').closest('tr')!).getByText('3/7 module')).toBeTruthy();
    expect(within(screen.getByText('Chưa gán').closest('tr')!).getByText('Không có')).toBeTruthy();
    expect(within(screen.getByText('Quản trị viên').closest('tr')!).getByText('Đầy đủ')).toBeTruthy();
  });

  it('quản trị có dòng cờ rỗng vẫn ghi Đầy đủ vì luôn đủ module', async () => {
    h.api.modules.mockResolvedValue({ ua: [] });
    render(<UserManagementView />);
    await screen.findByText('Quản trị viên');
    await waitFor(() => expect(h.api.modules).toHaveBeenCalled());
    expect(within(screen.getByText('Quản trị viên').closest('tr')!).getByText('Đầy đủ')).toBeTruthy();
  });

  it('nút chọn module chỉ có ở tài khoản cấp User và chưa phân quyền, trỏ đúng đường dẫn', async () => {
    render(<UserManagementView />);
    await screen.findByText('Nhân viên Một');
    const link = within(screen.getByText('Nhân viên Một').closest('tr')!).getByRole('link', { name: /Chọn module/ });
    expect(link.getAttribute('href')).toBe('/admin/users/u1');
    expect(within(screen.getByText('Chưa gán').closest('tr')!).getByRole('link', { name: /Chọn module/ })).toBeTruthy();
    expect(within(screen.getByText('Quản trị viên').closest('tr')!).queryByRole('link', { name: /Chọn module/ })).toBeNull();
    expect(within(screen.getByText(/Tôi/).closest('tr')!).queryByRole('link', { name: /Chọn module/ })).toBeNull();
  });

  it('lỗi nạp cờ module hiện nguyên thông điệp và cột Module không giả vờ là Đầy đủ', async () => {
    h.api.modules.mockRejectedValue(new Error('Chưa áp migration 65_user_modules.sql trên Supabase.'));
    render(<UserManagementView />);
    expect((await screen.findByText(/Chưa áp migration 65_user_modules\.sql/)).textContent).toContain('migration 65');
    const row = (await screen.findByText('Nhân viên Một')).closest('tr')!;
    expect(within(row).queryByText('Đầy đủ')).toBeNull();
  });
});
