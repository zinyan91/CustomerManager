import { canManageTarget, type Role } from '../../supabase/functions/admin-users/rules';

export {
  assignableRoles,
  canManageTarget,
  checkAdminAction,
  isValidEmail,
  MIN_PASSWORD_LENGTH,
  passwordError,
  type Actor,
  type AdminAction,
  type Role,
} from '../../supabase/functions/admin-users/rules';

/** Một tài khoản đăng nhập kèm vai trò, do Edge Function admin-users trả về. */
export interface AdminUser {
  id: string;
  email: string | null;
  fullName: string | null;
  role: Role | null;
  disabled: boolean;
  lastSignInAt: string | null;
  createdAt: string;
}

export type UserStatus = 'active' | 'disabled' | 'unassigned';

/** Đã khóa thắng chưa phân quyền: tài khoản bị khóa thì trạng thái cần thấy trước hết là bị khóa. */
export function userStatus(user: Pick<AdminUser, 'disabled' | 'role'>): UserStatus {
  if (user.disabled) return 'disabled';
  return user.role ? 'active' : 'unassigned';
}

export const STATUS_LABELS: Record<UserStatus, string> = {
  active: 'Hoạt động',
  disabled: 'Đã khóa',
  unassigned: 'Chưa phân quyền',
};

/** Người thao tác có được sửa tài khoản này không. */
export const canEditUser = (actorRole: Role | null, user: Pick<AdminUser, 'role'>) => canManageTarget(actorRole, user.role);

/** Khóa/mở khóa và xóa: như sửa nhưng không tự thao tác trên chính mình. */
export function canLockOrDeleteUser(actor: { id: string; role: Role | null }, user: Pick<AdminUser, 'id' | 'role'>): boolean {
  return actor.id !== user.id && canManageTarget(actor.role, user.role);
}

// Bỏ ký tự dễ đọc nhầm (0/O, 1/l/I) vì mật khẩu tạm thường được đọc hoặc gõ lại bằng tay
const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

/** Mật khẩu tạm ngẫu nhiên, dùng bộ sinh số an toàn của trình duyệt. */
export function generateTempPassword(length = 12, random: (n: number) => Uint32Array = (n) => crypto.getRandomValues(new Uint32Array(n))): string {
  // Loại bỏ độ lệch modulo: bỏ số rơi vào phần dư cuối của dải 2^32
  const limit = 0x100000000 - (0x100000000 % PASSWORD_ALPHABET.length);
  let out = '';
  while (out.length < length) {
    for (const n of random(length)) {
      if (n < limit && out.length < length) out += PASSWORD_ALPHABET[n % PASSWORD_ALPHABET.length];
    }
  }
  return out;
}

/** Họ tên hiển thị: chưa có tên thì dùng phần trước @ của email. */
export function displayName(user: Pick<AdminUser, 'fullName' | 'email'>): string {
  return user.fullName?.trim() || user.email?.split('@')[0] || 'Chưa đặt tên';
}
