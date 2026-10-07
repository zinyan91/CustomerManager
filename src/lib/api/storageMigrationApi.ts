import { supabase } from '../supabase';

const MISSING_CODES = ['PGRST202', '42883'];

export interface SwitchFile {
  from: string;
  path: string;
  fileId: string;
}

export interface SwitchResult {
  documents: number;
  filesRemapped: number;
  filesUnmapped: number;
}

/**
 * Đổi một repo Hugging Face sang Google Drive và trỏ lại tệp của văn bản bằng mã Drive, trong một giao dịch của CSDL.
 * Chỉ Master Admin; repo cũ giữ ở LegacyRepoId.
 */
export async function switchRepoToDrive(repoId: number, destRootId: string, files: readonly SwitchFile[]): Promise<SwitchResult> {
  const { data, error } = await supabase.rpc('switch_storage_repo_to_drive', { p_id: repoId, p_drive_root: destRootId, p_files: [...files] });
  if (error) {
    if (error.code && MISSING_CODES.includes(error.code)) throw new Error('Chưa áp migration 69_chuyen_repo_sang_drive.sql trên Supabase.');
    throw new Error(`Không đổi được repo sang Google Drive: ${error.message}`);
  }
  const r = (data ?? {}) as { documents?: number; files_remapped?: number; files_unmapped?: number };
  return { documents: Number(r.documents ?? 0), filesRemapped: Number(r.files_remapped ?? 0), filesUnmapped: Number(r.files_unmapped ?? 0) };
}
