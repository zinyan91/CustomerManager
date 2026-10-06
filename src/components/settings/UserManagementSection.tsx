import React, { useState } from 'react';
import { UserCog, User, Check, RefreshCw, AlertCircle } from 'lucide-react';
import { Panel } from '../ui/Panel';
import { useAuth } from '../../context/AuthContext';
import { useUserScope } from '../../context/UserScopeContext';
import { supabase } from '../../lib/supabase';
import { isAppRole, roleLabel, type AppRole } from '../../lib/permissions';

export const UserManagementSection: React.FC = () => {
  const { can, user } = useAuth();
  const canManageRoles = can('role.manage');
  const { managedUsers, refreshUsers, loading } = useUserScope();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    if (!canManageRoles) return;
    setUpdatingId(userId);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from('UserRoles')
        .update({ Role: newRole })
        .eq('UserId', userId)
        .select('UserId');

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Không có quyền đổi vai trò hoặc tài khoản không còn.');
      }

      setToastMsg(`Đã cập nhật vai trò tài khoản thành công!`);
      setTimeout(() => setToastMsg(null), 3000);
      await refreshUsers();
    } catch (err) {
      setErrorMsg(`Lỗi khi cập nhật vai trò: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <Panel className="space-y-4 col-span-1 lg:col-span-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-accent-soft text-accent">
            <UserCog className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-accent uppercase flex items-center gap-1.5">
              <span>Quản lý Tài Khoản & Phân Quyền Hệ Thống</span>
              {canManageRoles ? (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  Quyền Master Admin
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  Chỉ Xem
                </span>
              )}
            </h3>
            <p className="text-[11px] text-ink-faint">
              Tổng hợp dữ liệu theo tài khoản cán bộ và điều chỉnh cấp bậc quyền hạn (Master Admin, User Admin, User).
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => refreshUsers()}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-line bg-surface hover:bg-panel text-xs font-semibold text-ink-muted hover:text-ink cursor-pointer"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-accent' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {toastMsg && (
        <div className="p-2 rounded-lg bg-pos-soft border border-pos/30 text-pos text-xs font-medium flex items-center gap-2 animate-in fade-in">
          <Check className="w-3.5 h-3.5" />
          <span>{toastMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div role="alert" className="p-2 rounded-lg bg-neg-soft border border-neg/30 text-neg text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Bảng danh sách tài khoản */}
      <div className="border border-line rounded-xl overflow-hidden bg-panel">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-line bg-surface text-ink-muted font-semibold">
              <th className="py-2.5 px-3">Họ tên Cán bộ</th>
              <th className="py-2.5 px-3">Mã tài khoản (UUID)</th>
              <th className="py-2.5 px-3 text-right">Số KH phụ trách</th>
              <th className="py-2.5 px-3">Vai trò phân quyền</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {managedUsers.map((u) => {
              const isUpdating = updatingId === u.userId;
              const isUnassigned = u.userId === 'unassigned';

              return (
                <tr key={u.userId} className="hover:bg-surface/50">
                  <td className="py-2.5 px-3 font-semibold text-ink flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-ink-faint shrink-0" />
                    <span>{u.fullName}{u.userId === user?.id ? ' (bạn)' : ''}</span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-ink-faint truncate max-w-[150px]">
                    {u.userId}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-ink">
                    {u.customerCount} KH
                  </td>
                  <td className="py-2.5 px-3">
                    {isUnassigned ? (
                      <span className="text-ink-faint text-[11px] italic">Dữ liệu chưa phân công</span>
                    ) : canManageRoles ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={isAppRole(u.role) ? u.role : ''}
                          disabled={isUpdating}
                          onChange={(e) => handleRoleChange(u.userId, e.target.value as AppRole)}
                          className="px-2 py-1 rounded-lg bg-surface border border-line text-xs font-semibold text-ink focus:outline-none focus:border-accent cursor-pointer"
                        >
                          {!isAppRole(u.role) && <option value="" disabled>Chưa hợp lệ</option>}
                          <option value="master_admin">Master Admin (Toàn quyền)</option>
                          <option value="user_admin">User Admin (Gần đầy đủ)</option>
                          <option value="user">User (Chuyên viên tín dụng)</option>
                        </select>
                        {isUpdating && <RefreshCw className="w-3 h-3 animate-spin text-accent" />}
                      </div>
                    ) : (
                      <span className="font-semibold text-ink text-xs">
                        {roleLabel(u.role)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-[11px] text-ink-faint flex flex-col gap-1 pt-1">
        <div>• <strong>Master Admin:</strong> Toàn quyền phân quyền, cấu hình repo Hugging Face, xóa vĩnh viễn khách hàng.</div>
        <div>• <strong>User Admin:</strong> Quản lý xem toàn bộ khách hàng của mọi cán bộ, gán chuyển người phụ trách, nhưng không xóa vĩnh viễn và không phân quyền.</div>
        <div>• <strong>User thường:</strong> Chỉ quản lý danh sách khách hàng do chính mình phụ trách; tải lên và tải về tệp trong Kho lưu trữ.</div>
      </div>
    </Panel>
  );
};
