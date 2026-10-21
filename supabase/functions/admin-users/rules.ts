// Luật phân quyền quản lý người dùng. THUẦN (không dùng API của Deno hay trình duyệt) để hai nơi dùng chung:
// Edge Function admin-users (kiểm lại ở máy chủ, đây mới là lớp bảo vệ thật) và giao diện (chỉ để ẩn nút).

import { isValidUsername, USERNAME_ERROR } from '../_shared/username.ts';

export const ROLES = ['master_admin', 'user_admin', 'user'] as const;
export type Role = (typeof ROLES)[number];

export const MIN_PASSWORD_LENGTH = 8;

export const isRole = (value: unknown): value is Role => typeof value === 'string' && (ROLES as readonly string[]).includes(value);
export const isAdminRole = (role: unknown): role is 'master_admin' | 'user_admin' => role === 'master_admin' || role === 'user_admin';

/** Vai trò mà người thao tác được phép gán cho tài khoản khác. */
export function assignableRoles(actor: Role | null): Role[] {
  if (actor === 'master_admin') return [...ROLES];
  if (actor === 'user_admin') return ['user_admin', 'user'];
  return [];
}

/** User Admin không đụng tới Master Admin; Master Admin thao tác được mọi tài khoản. */
export function canManageTarget(actor: Role | null, targetRole: Role | null): boolean {
  if (!isAdminRole(actor)) return false;
  return actor === 'master_admin' || targetRole !== 'master_admin';
}

export const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const passwordError = (password: string): string | null =>
  password.length >= MIN_PASSWORD_LENGTH ? null : `Mật khẩu tạm tối thiểu ${MIN_PASSWORD_LENGTH} ký tự.`;

export interface Actor {
  id: string;
  role: Role | null;
}

export type AdminAction =
  | { action: 'create'; username?: string; email?: string; fullName: string; role: Role; password: string }
  | { action: 'update'; userId: string; username?: string; fullName?: string; role?: Role; disabled?: boolean; newPassword?: string }
  | { action: 'delete'; userId: string };

const MSG_NOT_ADMIN = 'Chỉ Master Admin và User Admin được quản lý người dùng.';
const MSG_NO_TARGET = 'Không tìm thấy tài khoản.';
const MSG_MASTER_ONLY = 'User Admin không được thao tác trên Master Admin.';

/**
 * Kiểm một thao tác có được phép không. Trả thông điệp lỗi tiếng Việt, hoặc null nếu hợp lệ.
 * `target` là vai trò hiện tại của tài khoản đích (null = tài khoản chưa có vai trò); đối tượng null = không tồn tại.
 */
export function checkAdminAction(actor: Actor, req: AdminAction, target: { role: Role | null } | null): string | null {
  if (!isAdminRole(actor.role)) return MSG_NOT_ADMIN;

  if (req.action === 'create') {
    if (req.username !== undefined) {
      if (!isValidUsername(req.username)) return USERNAME_ERROR;
    } else if (typeof req.email !== 'string' || !isValidEmail(req.email)) return 'Email không hợp lệ.';
    if (!req.fullName.trim()) return 'Nhập họ tên.';
    const pw = passwordError(req.password);
    if (pw) return pw;
    if (!isRole(req.role) || !assignableRoles(actor.role).includes(req.role)) return 'Bạn không được tạo tài khoản với vai trò này.';
    return null;
  }

  if (!target) return MSG_NO_TARGET;
  if (!canManageTarget(actor.role, target.role)) return MSG_MASTER_ONLY;
  const isSelf = req.userId === actor.id;

  if (req.action === 'delete') return isSelf ? 'Không thể tự xóa tài khoản của mình.' : null;

  if (req.username !== undefined && !isValidUsername(req.username)) return USERNAME_ERROR;
  if (req.fullName !== undefined && !req.fullName.trim()) return 'Nhập họ tên.';
  if (req.newPassword !== undefined) {
    const pw = passwordError(req.newPassword);
    if (pw) return pw;
  }
  if (req.role !== undefined) {
    if (!isRole(req.role) || !assignableRoles(actor.role).includes(req.role)) return 'Bạn không được gán vai trò này.';
    if (isSelf && req.role !== actor.role) return 'Không thể tự đổi vai trò của chính mình.';
  }
  if (req.disabled === true && isSelf) return 'Không thể tự khóa tài khoản của mình.';
  if (target.role === null && req.role === undefined) return 'Chọn vai trò cho tài khoản này.';
  return null;
}
