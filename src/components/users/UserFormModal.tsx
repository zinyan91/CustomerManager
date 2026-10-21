import { useState } from 'react';
import { X, AlertCircle, Loader2, Wand2, Copy, Check } from 'lucide-react';
import { assignableRoles, checkAdminAction, displayName, generateTempPassword, type Actor, type AdminUser, type Role } from '../../lib/userAdmin';
import { roleLabel } from '../../lib/permissions';
import { primaryBtn, secondaryBtn } from '../admin/tableStyles';

export interface UserFormValues {
  username: string;
  fullName: string;
  role: Role | '';
  password: string;
}

interface UserFormModalProps {
  /** Tài khoản đang sửa; null khi thêm mới. */
  user: AdminUser | null;
  actor: Actor;
  /** Ném lỗi để form hiển thị; trả về bình thường thì form đóng. */
  onSubmit: (values: UserFormValues) => Promise<void>;
  onClose: () => void;
}

const control =
  'w-full px-3 py-2 rounded-lg border border-line bg-panel text-ink text-sm disabled:opacity-60';
const label = 'block text-xs font-semibold text-ink-muted mb-1';

/** Form thêm hoặc sửa người dùng. Kiểm bằng đúng luật của máy chủ trước khi gửi. */
export function UserFormModal({ user, actor, onSubmit, onClose }: UserFormModalProps) {
  const editing = user !== null;
  const roles = assignableRoles(actor.role);
  const isSelf = user?.id === actor.id;

  const [values, setValues] = useState<UserFormValues>({
    username: user?.username ?? user?.email?.split('@')[0] ?? '',
    fullName: user?.fullName ?? '',
    role: user?.role ?? (roles.includes('user') ? 'user' : ''),
    password: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const patch = (p: Partial<UserFormValues>) => setValues((v) => ({ ...v, ...p }));

  const validate = (): string | null => {
    if (!editing) {
      return checkAdminAction(actor, { action: 'create', username: values.username, fullName: values.fullName, role: values.role as Role, password: values.password }, null);
    }
    return checkAdminAction(
      actor,
      {
        action: 'update',
        userId: user.id,
        username: values.username,
        fullName: values.fullName,
        ...(values.role ? { role: values.role } : {}),
        ...(values.password ? { newPassword: values.password } : {}),
      },
      { role: user.role }
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalid = validate();
    if (invalid) {
      setError(invalid);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được người dùng.');
      setSubmitting(false);
    }
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(values.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Trình duyệt không cho sao chép tự động. Hãy bôi đen mật khẩu rồi sao chép thủ công.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto bg-slate-900/60">
      <form
        onSubmit={submit}
        role="dialog"
        aria-label={editing ? 'Sửa người dùng' : 'Thêm người dùng'}
        className="w-full max-w-lg my-8 bg-panel rounded-xl border border-line shadow-xl"
      >
        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">{editing ? `Sửa ${displayName(user)}` : 'Thêm người dùng'}</h2>
          <button type="button" onClick={onClose} aria-label="Đóng" className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="uf-username" className={label}>Tên đăng nhập</label>
            <input id="uf-username" type="text" value={values.username} onChange={(e) => patch({ username: e.target.value })} className={control} autoComplete="off" autoCapitalize="none" spellCheck={false} />
          </div>
          <div>
            <label htmlFor="uf-name" className={label}>Họ tên</label>
            <input id="uf-name" value={values.fullName} onChange={(e) => patch({ fullName: e.target.value })} className={control} />
          </div>
          <div>
            <label htmlFor="uf-role" className={label}>Vai trò</label>
            <select id="uf-role" value={values.role} disabled={isSelf} onChange={(e) => patch({ role: e.target.value as Role })} className={control}>
              {values.role === '' && <option value="">Chọn vai trò</option>}
              {/* Giữ vai trò hiện tại trong danh sách dù người sửa không gán được (vd User Admin xem Master Admin) */}
              {user?.role && !roles.includes(user.role) && <option value={user.role}>{roleLabel(user.role)}</option>}
              {roles.map((r) => (
                <option key={r} value={r}>{roleLabel(r)}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="uf-password" className={label}>{editing ? 'Đặt lại mật khẩu (bỏ trống nếu không đổi)' : 'Mật khẩu tạm'}</label>
            <div className="flex flex-wrap gap-2">
              <input
                id="uf-password"
                value={values.password}
                onChange={(e) => patch({ password: e.target.value })}
                className={`${control} min-w-0 flex-1 basis-full sm:basis-0`}
                autoComplete="new-password"
              />
              <button type="button" onClick={() => patch({ password: generateTempPassword() })} className="px-3 py-2 rounded-lg border border-line text-sm font-medium text-ink hover:bg-surface inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer">
                <Wand2 className="w-4 h-4" />
                Tạo mật khẩu
              </button>
              <button type="button" onClick={copyPassword} disabled={!values.password} aria-label="Sao chép mật khẩu" className="p-2 rounded-lg border border-line text-ink-muted hover:bg-surface disabled:opacity-40 cursor-pointer">
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div role="alert" className="mx-6 mb-4 flex items-start gap-2 text-sm text-neg">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="px-6 py-4 border-t border-line flex justify-end gap-2.5">
          <button type="button" onClick={onClose} className={secondaryBtn}>
            Hủy
          </button>
          <button type="submit" disabled={submitting} className={`${primaryBtn} inline-flex items-center gap-2`}>
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {editing ? 'Lưu thay đổi' : 'Tạo tài khoản'}
          </button>
        </div>
      </form>
    </div>
  );
}
