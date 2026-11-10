import { supabase } from '../supabase';
import type { KqkdRecord, KqkdSheet } from '../../types/businessResult';
import { assertKqkdSheet } from '../businessResult/sheet';
import { defaultKqkdSheet } from '../businessResult/seed';

const SHEET_ID = 'kqkd';

/** Người khác đã lưu bản mới hơn bản đang sửa. */
export class KqkdConflictError extends Error {
  constructor() {
    super('Người khác vừa lưu bảng này. Tải lại để xem bản mới nhất rồi nhập lại phần đang sửa.');
    this.name = 'KqkdConflictError';
  }
}

/** Đọc bảng đã lưu; chưa ai lưu thì trả bảng mẫu với version null. */
export async function fetchKqkdSheetAPI(): Promise<KqkdRecord> {
  const { data, error } = await supabase
    .from('BusinessResultSheets')
    .select('Data, Version, UpdatedAt')
    .eq('Id', SHEET_ID)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { sheet: defaultKqkdSheet(), version: null, updatedAt: null };
  return { sheet: assertKqkdSheet(data.Data), version: Number(data.Version), updatedAt: data.UpdatedAt as string };
}

/**
 * Lưu bảng. version là số phiên bản lúc mở; null nghĩa là bảng chưa từng được lưu.
 * Trả phiên bản mới. Ném KqkdConflictError nếu người khác đã lưu trước.
 */
export async function saveKqkdSheetAPI(sheet: KqkdSheet, version: number | null): Promise<KqkdRecord> {
  if (version === null) {
    const { data, error } = await supabase
      .from('BusinessResultSheets')
      .insert({ Id: SHEET_ID, Data: sheet, Version: 1 })
      .select('Version, UpdatedAt')
      .single();
    if (error) {
      if (error.code === '23505') throw new KqkdConflictError();
      throw new Error(error.message);
    }
    return { sheet, version: Number(data.Version), updatedAt: data.UpdatedAt as string };
  }
  const { data, error } = await supabase
    .from('BusinessResultSheets')
    .update({ Data: sheet, Version: version + 1 })
    .eq('Id', SHEET_ID)
    .eq('Version', version)
    .select('Version, UpdatedAt');
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new KqkdConflictError();
  return { sheet, version: Number(data[0].Version), updatedAt: data[0].UpdatedAt as string };
}

/** Tài khoản hiện tại có tên trong danh sách được sửa không (admin xét riêng ở giao diện). */
export async function fetchIsKqkdEditorAPI(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('BusinessResultEditors')
    .select('UserId')
    .eq('UserId', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}

/** Danh sách id tài khoản được sửa. Chỉ admin đọc được đủ danh sách. */
export async function fetchKqkdEditorIdsAPI(): Promise<string[]> {
  const { data, error } = await supabase.from('BusinessResultEditors').select('UserId').order('GrantedAt');
  if (error) throw new Error(error.message);
  return (data ?? []).map(r => r.UserId as string);
}

export async function addKqkdEditorAPI(userId: string, grantedBy: string): Promise<void> {
  const { error } = await supabase.from('BusinessResultEditors').insert({ UserId: userId, GrantedBy: grantedBy });
  if (error && error.code !== '23505') throw new Error(error.message);
}

export async function removeKqkdEditorAPI(userId: string): Promise<void> {
  const { error } = await supabase.from('BusinessResultEditors').delete().eq('UserId', userId);
  if (error) throw new Error(error.message);
}
