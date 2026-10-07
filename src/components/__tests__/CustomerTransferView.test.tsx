// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const h = vi.hoisted(() => ({
  fetchCustomersOf: vi.fn(),
  previewTransfer: vi.fn(),
  transferCustomers: vi.fn(),
  fetchTransferHistory: vi.fn(),
  listAdminUsers: vi.fn(),
  fetchAllUserModules: vi.fn(),
  refreshUsers: vi.fn(async () => {}),
}));

vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'me' }, role: 'master_admin' }) }));
vi.mock('../../context/UserScopeContext', () => ({
  useUserScope: () => ({
    managedUsers: [{ userId: 'an', customerCount: 3 }, { userId: 'binh', customerCount: 1 }],
    refreshUsers: h.refreshUsers,
  }),
}));
vi.mock('../../lib/api/customerTransferApi', () => ({
  fetchCustomersOf: h.fetchCustomersOf,
  previewTransfer: h.previewTransfer,
  transferCustomers: h.transferCustomers,
  fetchTransferHistory: h.fetchTransferHistory,
}));
vi.mock('../../lib/api/userAdminApi', () => ({
  listAdminUsers: h.listAdminUsers,
  createAdminUser: vi.fn(),
  updateAdminUser: vi.fn(),
  deleteAdminUser: vi.fn(),
}));
vi.mock('../../lib/api/userModulesApi', () => ({
  fetchAllUserModules: h.fetchAllUserModules,
  saveUserModules: vi.fn(),
  fetchOwnModules: vi.fn(),
}));

import { CustomerTransferView } from '../views/CustomerTransferView';

const U = (p: Record<string, unknown>) => ({
  id: 'x', email: 'x@app.local', fullName: 'X', role: 'user', disabled: false, lastSignInAt: null, createdAt: '2026-01-01T00:00:00Z', ...p,
});
const COUNTS = { customers: 2, creditContracts: 3, loans: 4, collaterals: 1, mortgages: 0, cards: 0, postLoan: 0, dispatches: 1 };

beforeEach(() => {
  Object.values(h).forEach((f) => f.mockReset());
  h.refreshUsers.mockResolvedValue(undefined);
  h.listAdminUsers.mockResolvedValue([
    U({ id: 'an', fullName: 'An' }),
    U({ id: 'binh', fullName: 'Bình' }),
    U({ id: 'khoa', fullName: 'Đã khóa', disabled: true }),
    U({ id: 'chua', fullName: 'Chưa gán', role: null }),
    U({ id: 'me', fullName: 'Tôi', role: 'master_admin' }),
  ]);
  h.fetchAllUserModules.mockResolvedValue({});
  h.fetchCustomersOf.mockResolvedValue([
    { id: 1, cif: 'C001', name: 'Khách Một' },
    { id: 2, cif: 'C002', name: 'Khách Hai' },
    { id: 3, cif: 'C003', name: 'Khách Ba' },
  ]);
  h.previewTransfer.mockResolvedValue(COUNTS);
  h.transferCustomers.mockResolvedValue(COUNTS);
  h.fetchTransferHistory.mockResolvedValue([]);
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const nguoiChuyen = () => screen.getByLabelText('Chuyển từ') as HTMLSelectElement;
const nguoiNhan = () => screen.getByLabelText('Chuyển sang') as HTMLSelectElement;
const nutChuyen = () => screen.getByRole('button', { name: 'Chuyển giao' }) as HTMLButtonElement;

async function chonAn() {
  render(<CustomerTransferView />);
  await waitFor(() => expect(within(nguoiChuyen()).queryByRole('option', { name: 'An (3 khách)' })).toBeTruthy());
  fireEvent.change(nguoiChuyen(), { target: { value: 'an' } });
  await screen.findByText('Khách Một');
}

describe('CustomerTransferView', () => {
  it('liệt kê tài khoản có vai trò kèm số khách; người nhận bỏ người chuyển, tài khoản khóa và chưa phân quyền', async () => {
    await chonAn();
    expect(within(nguoiChuyen()).getAllByRole('option').map((o) => o.textContent)).toEqual([
      '— Chọn người chuyển —', 'An (3 khách)', 'Bình (1 khách)', 'Đã khóa (0 khách)', 'Tôi (0 khách)',
    ]);
    expect(within(nguoiNhan()).getAllByRole('option').map((o) => o.textContent)).toEqual([
      '— Chọn người nhận —', 'Bình (1 khách)', 'Tôi (0 khách)',
    ]);
  });

  it('chọn người chuyển thì nạp khách của người đó và chưa cho chuyển', async () => {
    await chonAn();
    expect(h.fetchCustomersOf).toHaveBeenCalledWith('an');
    expect(screen.getByText('Đã chọn 0 / 3 khách')).toBeTruthy();
    expect(nutChuyen().disabled).toBe(true);
  });

  it('chọn tất cả thì xem trước đúng danh sách và hiện số hồ sơ sẽ chuyển', async () => {
    await chonAn();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Chọn tất cả khách hàng' }));
    await waitFor(() => expect(h.previewTransfer).toHaveBeenCalledWith('an', [1, 2, 3]));
    const dong = (await screen.findByText('Hợp đồng tín dụng')).closest('tr') as HTMLElement;
    expect(within(dong).getByText('3')).toBeTruthy();
    expect(within(screen.getByText('Khoản vay (KUNN)').closest('tr') as HTMLElement).getByText('4')).toBeTruthy();
    expect(screen.getByText('Đã chọn 3 / 3 khách')).toBeTruthy();
  });

  it('chọn lẻ từng khách', async () => {
    await chonAn();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Chọn Khách Hai' }));
    await waitFor(() => expect(h.previewTransfer).toHaveBeenCalledWith('an', [2]));
  });

  it('chọn đủ người nhận và khách thì chuyển sau khi xác nhận, rồi báo kết quả và nạp lại', async () => {
    await chonAn();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Chọn Khách Một' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Chọn Khách Hai' }));
    fireEvent.change(nguoiNhan(), { target: { value: 'binh' } });
    await waitFor(() => expect(nutChuyen().disabled).toBe(false));
    fireEvent.click(nutChuyen());
    await waitFor(() => expect(h.transferCustomers).toHaveBeenCalledWith('an', 'binh', [1, 2]));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('từ An sang Bình'));
    expect((await screen.findByRole('status')).textContent).toContain('Đã chuyển 2 khách hàng từ An sang Bình.');
    expect(h.refreshUsers).toHaveBeenCalled();
    expect(h.fetchCustomersOf.mock.calls.length).toBeGreaterThan(1);
    expect(h.fetchTransferHistory.mock.calls.length).toBeGreaterThan(1);
  });

  it('không xác nhận thì không chuyển', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await chonAn();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Chọn tất cả khách hàng' }));
    fireEvent.change(nguoiNhan(), { target: { value: 'binh' } });
    await waitFor(() => expect(nutChuyen().disabled).toBe(false));
    fireEvent.click(nutChuyen());
    expect(h.transferCustomers).not.toHaveBeenCalled();
  });

  it('lỗi từ máy chủ hiện nguyên thông điệp và giữ lựa chọn', async () => {
    h.transferCustomers.mockRejectedValue(new Error('Chưa áp migration 66_chuyen_giao_khach_hang.sql trên Supabase.'));
    await chonAn();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Chọn tất cả khách hàng' }));
    fireEvent.change(nguoiNhan(), { target: { value: 'binh' } });
    await waitFor(() => expect(nutChuyen().disabled).toBe(false));
    fireEvent.click(nutChuyen());
    expect((await screen.findByRole('alert')).textContent).toContain('Chưa áp migration 66');
    expect(screen.getByText('Đã chọn 3 / 3 khách')).toBeTruthy();
  });

  it('người nhận không có module Hồ sơ tín dụng thì cảnh báo nhưng vẫn cho chuyển', async () => {
    h.fetchAllUserModules.mockResolvedValue({ binh: ['dispatch'] });
    await chonAn();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Chọn tất cả khách hàng' }));
    fireEvent.change(nguoiNhan(), { target: { value: 'binh' } });
    expect((await screen.findByRole('note')).textContent).toContain('Hồ sơ tín dụng');
    await waitFor(() => expect(nutChuyen().disabled).toBe(false));
  });

  it('đổi người chuyển thì xóa lựa chọn cũ', async () => {
    await chonAn();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Chọn tất cả khách hàng' }));
    await screen.findByText('Đã chọn 3 / 3 khách');
    fireEvent.change(nguoiChuyen(), { target: { value: 'binh' } });
    await waitFor(() => expect(h.fetchCustomersOf).toHaveBeenLastCalledWith('binh'));
    await screen.findByText('Đã chọn 0 / 3 khách');
  });

  it('nhật ký hiện tên người chuyển, người nhận và người thực hiện', async () => {
    h.fetchTransferHistory.mockResolvedValue([
      { id: 1, fromUserId: 'an', toUserId: 'binh', customerCount: 2, counts: COUNTS, transferredBy: 'me', transferredAt: '2026-10-07T08:30:00Z' },
    ]);
    render(<CustomerTransferView />);
    const bang = (await screen.findByText('Nhật ký chuyển giao')).closest('div')!.parentElement as HTMLElement;
    await waitFor(() => expect(within(bang).getByText('Tôi')).toBeTruthy());
    const dong = within(bang).getByText('Tôi').closest('tr') as HTMLElement;
    expect(within(dong).getByText('An')).toBeTruthy();
    expect(within(dong).getByText('Bình')).toBeTruthy();
  });
});
