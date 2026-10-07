import { supabase } from '../supabase';
import type { AdminAction, AdminUser } from '../userAdmin';

const FUNCTION_NAME = 'admin-users';

const MSG_NOT_DEPLOYED =
  'Chưa triển khai Edge Function "admin-users" trên Supabase nên chưa quản lý được tài khoản. Liên hệ người phụ trách kỹ thuật để triển khai (xem docs/superpowers/specs/2026-10-07-quan-ly-nguoi-dung-design.md).';

interface InvokeError {
  message?: string;
  context?: { status?: number; json?: () => Promise<unknown> };
}

/** Lấy thông điệp lỗi do hàm trả về (nếu có), nếu không thì nói rõ nguyên nhân thường gặp. */
async function describeInvokeError(error: InvokeError): Promise<string> {
  const status = error.context?.status;
  if (status === 404) return MSG_NOT_DEPLOYED;
  try {
    const body = (await error.context?.json?.()) as { error?: string } | undefined;
    if (body?.error) return body.error;
  } catch {
    // Phản hồi không phải JSON: dùng thông điệp chung bên dưới
  }
  if (status === 401) return 'Phiên đăng nhập hết hạn. Hãy đăng nhập lại.';
  if (status === 403) return 'Bạn không có quyền thực hiện thao tác này.';
  return `Không gọi được máy chủ quản lý tài khoản: ${error.message ?? 'lỗi không rõ'}`;
}

async function call<T>(body: { action: string } & Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, { body });
  if (error) throw new Error(await describeInvokeError(error as InvokeError));
  const res = data as { ok?: boolean; error?: string; data?: T } | null;
  if (!res?.ok) throw new Error(res?.error ?? 'Máy chủ trả về phản hồi không hợp lệ.');
  return res.data as T;
}

export const listAdminUsers = () => call<AdminUser[]>({ action: 'list' });

export const createAdminUser = (input: Omit<Extract<AdminAction, { action: 'create' }>, 'action'>) =>
  call<{ id: string }>({ action: 'create', ...input });

export const updateAdminUser = (input: Omit<Extract<AdminAction, { action: 'update' }>, 'action'>) =>
  call<{ id: string }>({ action: 'update', ...input });

export const deleteAdminUser = (userId: string) => call<{ id: string }>({ action: 'delete', userId });
