// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { UserScopeProvider, useUserScope } from '../UserScopeContext';
import { AuthProvider } from '../AuthContext';
import { getActiveOwnerScope } from '../../lib/ownerScopeStore';

const state = vi.hoisted(() => ({
  userId: 'admin-uuid-001',
  role: 'master_admin',
  rpc: vi.fn(),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({
        data: { session: { user: { id: state.userId, email: 'x@bank.vn' } } },
      }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    rpc: (...args: unknown[]) => state.rpc(...args),
    from: (table: string) => {
      if (table === 'UserRoles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { Role: state.role, FullName: 'Tên thử' }, error: null }),
            }),
            order: async () => ({
              data: [
                { UserId: 'admin-uuid-001', Role: 'master_admin', FullName: 'Quản trị viên Cấp cao' },
                { UserId: 'user-uuid-002', Role: 'user', FullName: 'Nguyễn Văn A' },
                { UserId: 'user-uuid-003', Role: 'user_admin', FullName: 'Trần Thị B' },
              ],
              error: null,
            }),
          }),
        };
      }
      return { select: () => ({}) };
    },
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>
    <UserScopeProvider>{children}</UserScopeProvider>
  </AuthProvider>
);

beforeEach(() => {
  localStorage.clear();
  state.userId = 'admin-uuid-001';
  state.role = 'master_admin';
  state.rpc.mockReset();
  state.rpc.mockResolvedValue({
    data: [
      { UserId: 'user-uuid-002', CustomerCount: '2' },
      { UserId: 'user-uuid-003', CustomerCount: 1 },
      { UserId: null, CustomerCount: 1 },
    ],
    error: null,
  });
});

describe('UserScopeContext - admin', () => {
  it('mặc định là tài khoản của chính admin, không phải Tất cả', async () => {
    const { result } = renderHook(() => useUserScope(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(result.current.selectedUserId).toBe('admin-uuid-001');
    expect(result.current.ownerScope).toEqual({ kind: 'user', userId: 'admin-uuid-001' });
    expect(getActiveOwnerScope()).toEqual({ kind: 'user', userId: 'admin-uuid-001' });
  });

  it('chưa sẵn sàng khi chưa tra xong danh sách tài khoản', async () => {
    let release: (v: unknown) => void = () => {};
    state.rpc.mockReturnValue(new Promise((r) => { release = r; }));
    const { result } = renderHook(() => useUserScope(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(true));
    expect(result.current.ready).toBe(false);

    await act(async () => { release({ data: [], error: null }); });
    await waitFor(() => expect(result.current.ready).toBe(true));
  });

  it('tổng hợp số KH theo tài khoản bằng RPC, thêm mục Chưa phân công', async () => {
    const { result } = renderHook(() => useUserScope(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(state.rpc).toHaveBeenCalledWith('get_user_customer_counts');
    expect(result.current.managedUsers.find((u) => u.userId === 'user-uuid-002')?.customerCount).toBe(2);
    expect(result.current.managedUsers.find((u) => u.userId === 'user-uuid-003')?.customerCount).toBe(1);
    expect(result.current.managedUsers.find((u) => u.userId === 'unassigned')?.customerCount).toBe(1);
    expect(result.current.managedUsers[0].userId).toBe('admin-uuid-001');
  });

  it('chọn tài khoản khác: đổi phạm vi, đổi scopeKey và nhớ theo user', async () => {
    const { result } = renderHook(() => useUserScope(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));
    const keyBefore = result.current.scopeKey;

    act(() => result.current.setSelectedUserId('user-uuid-002'));

    expect(result.current.selectedUserId).toBe('user-uuid-002');
    expect(result.current.selectedUser?.fullName).toBe('Nguyễn Văn A');
    expect(result.current.scopeKey).not.toBe(keyBefore);
    expect(getActiveOwnerScope()).toEqual({ kind: 'user', userId: 'user-uuid-002' });
    expect(localStorage.getItem('cm_scope_v2:admin-uuid-001')).toBe('user-uuid-002');
  });

  it('Tất cả tài khoản có hiệu lực trong phiên nhưng không được nhớ', async () => {
    localStorage.setItem('cm_scope_v2:admin-uuid-001', 'user-uuid-002');
    const { result } = renderHook(() => useUserScope(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.selectedUserId).toBe('user-uuid-002');

    act(() => result.current.setSelectedUserId('all'));

    expect(result.current.selectedUserId).toBe('all');
    expect(getActiveOwnerScope()).toEqual({ kind: 'all' });
    expect(localStorage.getItem('cm_scope_v2:admin-uuid-001')).toBeNull();
  });

  it('khôi phục lựa chọn đã lưu nếu tài khoản còn tồn tại', async () => {
    localStorage.setItem('cm_scope_v2:admin-uuid-001', 'user-uuid-003');
    const { result } = renderHook(() => useUserScope(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.selectedUserId).toBe('user-uuid-003');
  });

  it('lựa chọn đã lưu trỏ tới tài khoản không còn: rơi về chính mình', async () => {
    localStorage.setItem('cm_scope_v2:admin-uuid-001', 'da-bi-xoa');
    const { result } = renderHook(() => useUserScope(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.selectedUserId).toBe('admin-uuid-001');
  });

  it('lỗi RPC: vẫn sẵn sàng với tài khoản của mình và báo lỗi, không im lặng', async () => {
    state.rpc.mockResolvedValue({ data: null, error: { message: 'function does not exist' } });
    const { result } = renderHook(() => useUserScope(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(result.current.error).toMatch(/does not exist/);
    expect(result.current.selectedUserId).toBe('admin-uuid-001');
  });
});

describe('UserScopeContext - user thường', () => {
  beforeEach(() => {
    state.userId = 'user-uuid-002';
    state.role = 'user';
  });

  it('phạm vi cá nhân luôn là chính mình kể cả khi RLS cho Leader đọc thêm hồ sơ team', async () => {
    const { result } = renderHook(() => useUserScope(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(result.current.selectedUserId).toBe('user-uuid-002');
    expect(result.current.ownerScope).toEqual({ kind: 'user', userId: 'user-uuid-002' });
    expect(getActiveOwnerScope()).toEqual({ kind: 'user', userId: 'user-uuid-002' });
    expect(state.rpc).not.toHaveBeenCalled();
    expect(result.current.managedUsers).toEqual([]);
  });

  it('setSelectedUserId bị bỏ qua', async () => {
    const { result } = renderHook(() => useUserScope(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));

    act(() => result.current.setSelectedUserId('admin-uuid-001'));

    expect(result.current.selectedUserId).toBe('user-uuid-002');
    expect(localStorage.getItem('cm_scope_v2:user-uuid-002')).toBeNull();
  });
});
