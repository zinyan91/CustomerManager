import { useMemo, useState } from 'react';
import { Plus, Pencil, Lock, Unlock, Trash2, RefreshCw, AlertCircle, Check, X, Loader2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUserScope } from '../../context/UserScopeContext';
import { useAdminUsers } from '../../hooks/useAdminUsers';
import { roleLabel } from '../../lib/permissions';
import {
  canEditUser,
  canLockOrDeleteUser,
  displayName,
  STATUS_LABELS,
  userStatus,
  type AdminUser,
  type Role,
  type UserStatus,
} from '../../lib/userAdmin';
import { fmtDate } from '../../lib/utils';
import { UserFormModal, type UserFormValues } from '../users/UserFormModal';

type FormState = { user: AdminUser | null } | null;

const STATUS_STYLES: Record<UserStatus, string> = {
  active: 'border-emerald-600/40 text-emerald-800 dark:text-emerald-300',
  disabled: 'border-rose-600/40 text-rose-800 dark:text-rose-300',
  unassigned: 'border-amber-600/40 text-amber-800 dark:text-amber-300',
};

const iconBtn =
  'p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer';
const th = 'px-3 py-2.5 text-left border-r border-slate-300 dark:border-slate-700';
const td = 'px-3 py-2 border-r border-slate-200 dark:border-slate-800 align-middle';

/** Thêm, sửa, khóa, xóa tài khoản và gán vai trò. Chỉ Master Admin và User Admin; luật thật nằm ở Edge Function. */
export function UserManagementView() {
  const { can, role, user: me } = useAuth();
  const allowed = can('user.manage');
  const { users, loading, error, reload, create, update, remove } = useAdminUsers(allowed);
  const { managedUsers } = useUserScope();

  const [form, setForm] = useState<FormState>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const counts = useMemo(() => new Map(managedUsers.map((u) => [u.userId, u.customerCount])), [managedUsers]);
  const actor = { id: me?.id ?? '', role: role === 'master_admin' || role === 'user_admin' || role === 'user' ? role : null };

  if (!allowed) {
    return (
      <div role="alert" className="p-6 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
        <ShieldAlert className="w-4 h-4 shrink-0" />
        <span>Chỉ Master Admin và User Admin được quản lý người dùng.</span>
      </div>
    );
  }

  const say = (message: string) => {
    setNotice(message);
    setTimeout(() => setNotice(null), 4000);
  };

  const submitForm = async (values: UserFormValues) => {
    const editing = form?.user ?? null;
    if (editing) {
      await update({
        userId: editing.id,
        fullName: values.fullName.trim(),
        ...(values.role && values.role !== editing.role ? { role: values.role } : {}),
        ...(values.password ? { newPassword: values.password } : {}),
        // Tài khoản chưa có vai trò bắt buộc gửi vai trò dù chưa đổi
        ...(editing.role === null && values.role ? { role: values.role } : {}),
      });
      say(`Đã cập nhật ${displayName(editing)}.`);
    } else {
      await create({ email: values.email.trim().toLowerCase(), fullName: values.fullName.trim(), role: values.role as Role, password: values.password });
      say(`Đã tạo tài khoản ${values.email.trim().toLowerCase()}. Hãy gửi mật khẩu tạm cho nhân viên.`);
    }
    setForm(null);
  };

  const run = async (target: AdminUser, action: () => Promise<void>, success: string) => {
    setActionError(null);
    setBusyId(target.id);
    try {
      await action();
      say(success);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Không thực hiện được thao tác.');
    } finally {
      setBusyId(null);
    }
  };

  const toggleLock = (u: AdminUser) => {
    const lock = !u.disabled;
    const question = lock
      ? `Khóa đăng nhập của ${displayName(u)}? Họ sẽ không đăng nhập được nữa, dữ liệu vẫn được giữ.`
      : `Mở khóa đăng nhập cho ${displayName(u)}?`;
    if (!window.confirm(question)) return;
    void run(u, () => update({ userId: u.id, disabled: lock }), lock ? `Đã khóa ${displayName(u)}.` : `Đã mở khóa ${displayName(u)}.`);
  };

  const removeUser = (u: AdminUser) => {
    if (!window.confirm(`Xóa hẳn tài khoản ${displayName(u)} (${u.email ?? 'không có email'})? Không thể hoàn tác. Nếu muốn giữ dữ liệu, hãy khóa đăng nhập thay vì xóa.`)) return;
    void run(u, () => remove(u.id), `Đã xóa ${displayName(u)}.`);
  };

  const shownError = actionError ?? error;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden divide-y divide-slate-200 dark:divide-slate-800">
      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Người dùng</h1>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => void reload()}
            disabled={loading}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
          <button
            type="button"
            onClick={() => setForm({ user: null })}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-sm font-semibold flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm người dùng</span>
          </button>
        </div>
      </div>

      {notice && (
        <div role="status" className="px-4 py-2.5 flex items-center gap-2 text-sm text-emerald-800 dark:text-emerald-300">
          <Check className="w-4 h-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}
      {shownError && (
        <div role="alert" className="px-4 py-2.5 flex items-start gap-2 text-sm text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="flex-1">{shownError}</span>
          {actionError && (
            <button type="button" onClick={() => setActionError(null)} aria-label="Đóng thông báo" className="p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-b border-slate-300 dark:border-slate-700 font-semibold">
              <th className={th}>Họ tên</th>
              <th className={th}>Email</th>
              <th className={th}>Vai trò</th>
              <th className={`${th} text-right`}>KH phụ trách</th>
              <th className={`${th} text-center`}>Trạng thái</th>
              <th className={`${th} text-center`}>Đăng nhập cuối</th>
              <th className="w-px whitespace-nowrap px-3 py-2.5 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {users.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-500 dark:text-slate-400">
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang tải danh sách...
                    </span>
                  ) : (
                    'Chưa có tài khoản nào.'
                  )}
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const status = userStatus(u);
                const busy = busyId === u.id;
                const isSelf = u.id === actor.id;
                return (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <td className={`${td} font-semibold text-slate-900 dark:text-slate-100`}>
                      {displayName(u)}
                      {isSelf ? ' (bạn)' : ''}
                    </td>
                    <td className={`${td} text-slate-700 dark:text-slate-300 break-all`}>{u.email ?? '—'}</td>
                    <td className={`${td} text-slate-700 dark:text-slate-300`}>{u.role ? roleLabel(u.role) : '—'}</td>
                    <td className={`${td} text-right font-mono`}>{counts.get(u.id) ?? 0}</td>
                    <td className={`${td} text-center`}>
                      <span className={`inline-block px-2 py-0.5 rounded border text-xs font-medium whitespace-nowrap ${STATUS_STYLES[status]}`}>{STATUS_LABELS[status]}</span>
                    </td>
                    <td className={`${td} text-center whitespace-nowrap`}>{u.lastSignInAt ? fmtDate(u.lastSignInAt) : '—'}</td>
                    <td className="w-px whitespace-nowrap px-3 py-2">
                      <div className="flex items-center justify-center gap-0.5">
                        {busy ? (
                          <Loader2 className="w-4 h-4 animate-spin text-slate-500" aria-label="Đang xử lý" />
                        ) : (
                          <>
                            {canEditUser(actor.role, u) && (
                              <button type="button" onClick={() => setForm({ user: u })} title="Sửa" aria-label={`Sửa ${displayName(u)}`} className={iconBtn}>
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            {canLockOrDeleteUser(actor, u) && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => toggleLock(u)}
                                  title={u.disabled ? 'Mở khóa đăng nhập' : 'Khóa đăng nhập'}
                                  aria-label={`${u.disabled ? 'Mở khóa' : 'Khóa'} ${displayName(u)}`}
                                  className={iconBtn}
                                >
                                  {u.disabled ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                                </button>
                                <button type="button" onClick={() => removeUser(u)} title="Xóa tài khoản" aria-label={`Xóa ${displayName(u)}`} className={iconBtn}>
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-600 dark:text-slate-300">{users.length} tài khoản</div>

      {form && <UserFormModal user={form.user} actor={actor} onSubmit={submitForm} onClose={() => setForm(null)} />}
    </div>
  );
}
