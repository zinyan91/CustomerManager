import { supabase } from '../supabase';
import type { HfAuth, HfConfig } from '../../types/huggingface';

export const HF_CONFIG_KEY = 'hf_config';

// Khóa localStorage của phiên bản cũ. Chỉ còn dùng để điền sẵn token cho Master Admin
// lần đầu đưa cấu hình lên hệ thống; không còn là nguồn dữ liệu.
const LEGACY_LOCAL_KEY = 'cm_hf_config_v1';

/** Chuẩn hóa giá trị thô (từ DB hoặc form) thành HfAuth; null nếu không có token. */
export function parseHfAuth(value: unknown): HfAuth | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  const token = typeof v.token === 'string' ? v.token.trim() : '';
  if (!token) return null;
  return { token, username: typeof v.username === 'string' && v.username ? v.username : undefined };
}

/** Kết nối đủ dùng: có token và repo. */
export function isHfConfigComplete(config: HfConfig | null | undefined): config is HfConfig {
  return Boolean(config && config.token && config.repoId);
}

/** Đọc token dùng chung từ SystemConfig. Ném lỗi khi DB báo lỗi; null khi chưa có. */
export async function fetchHfAuth(): Promise<HfAuth | null> {
  const { data, error } = await supabase
    .from('SystemConfig')
    .select('Value')
    .eq('Key', HF_CONFIG_KEY)
    .maybeSingle();

  if (error) {
    throw new Error(`Không đọc được cấu hình kho lưu trữ: ${error.message}`);
  }
  return parseHfAuth(data?.Value);
}

/** Lưu token dùng chung (chỉ Master Admin qua RLS). Ném lỗi khi ghi hỏng. */
export async function saveHfAuth(auth: HfAuth, userId: string | null): Promise<HfAuth> {
  const parsed = parseHfAuth(auth);
  if (!parsed) {
    throw new Error('Cần nhập Access Token.');
  }

  const { error } = await supabase.from('SystemConfig').upsert({
    Key: HF_CONFIG_KEY,
    Value: parsed,
    UpdatedAt: new Date().toISOString(),
    UpdatedBy: userId,
  });

  if (error) {
    throw new Error(`Không lưu được cấu hình lên hệ thống: ${error.message}`);
  }
  return parsed;
}

/** Token cũ còn trong trình duyệt này (nếu có), dùng để điền sẵn form. */
export function readLegacyLocalHfAuth(): HfAuth | null {
  try {
    const raw = localStorage.getItem(LEGACY_LOCAL_KEY);
    return raw ? parseHfAuth(JSON.parse(raw)) : null;
  } catch {
    // localStorage bị chặn hoặc JSON hỏng: coi như không có cấu hình cũ.
    return null;
  }
}

/** Xóa cấu hình cũ sau khi đã lưu lên hệ thống. */
export function clearLegacyLocalHfConfig(): void {
  try {
    localStorage.removeItem(LEGACY_LOCAL_KEY);
  } catch {
    // Không xóa được thì bỏ qua: khóa này không còn được đọc làm nguồn chính.
  }
}
