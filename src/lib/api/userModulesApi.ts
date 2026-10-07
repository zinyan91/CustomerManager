import { supabase } from '../supabase';
import { normalizeModules, type ModuleId } from '../modules';

const MISSING_TABLE_CODES = ['PGRST205', '42P01'];

function failure(action: string, error: { code?: string; message: string }): Error {
  if (error.code && MISSING_TABLE_CODES.includes(error.code)) {
    return new Error('Chưa áp migration 65_user_modules.sql trên Supabase.');
  }
  return new Error(`${action}: ${error.message}`);
}

/** Cờ module của chính tài khoản; null = chưa có dòng, tức đủ mọi module. */
export async function fetchOwnModules(userId: string): Promise<ModuleId[] | null> {
  const { data, error } = await supabase.from('UserModules').select('Modules').eq('UserId', userId).maybeSingle();
  if (error) throw failure('Không nạp được quyền module', error);
  return data ? normalizeModules(data.Modules) : null;
}

/** Chỉ hai vai trò quản trị đọc được dòng của người khác (RLS). Khóa là UserId. */
export async function fetchAllUserModules(): Promise<Record<string, ModuleId[]>> {
  const { data, error } = await supabase.from('UserModules').select('UserId, Modules');
  if (error) throw failure('Không nạp được cờ module', error);
  return Object.fromEntries((data ?? []).map((r) => [r.UserId as string, normalizeModules(r.Modules)]));
}

export async function saveUserModules(userId: string, modules: readonly ModuleId[], updatedBy: string): Promise<void> {
  const { error } = await supabase.from('UserModules').upsert({
    UserId: userId,
    Modules: normalizeModules(modules),
    UpdatedAt: new Date().toISOString(),
    UpdatedBy: updatedBy,
  });
  if (error) throw failure('Không lưu được cờ module', error);
}
