import { supabase } from '../supabase';
import type { StorageRepo } from '../../types/storageRepo';
import { mapRepoRow, validateRepoInput, type RepoInput } from '../storageRepos';
import { createHfDataset } from '../huggingface/hfWrite';

/** Danh sách repo được phép thấy (RLS lọc theo vai trò). Ném lỗi khi DB báo lỗi. */
export async function listStorageRepos(): Promise<StorageRepo[]> {
  const { data, error } = await supabase.from('StorageRepos').select('*').order('Id', { ascending: true });
  if (error) {
    throw new Error(`Không đọc được danh sách kho lưu trữ: ${error.message}`);
  }
  return (data ?? []).map(mapRepoRow);
}

function describeInsertError(error: { code?: string; message: string }): string {
  if (error.code === '23505') {
    return 'Đã có repo cùng loại hoặc tài khoản này đã được gán repo cá nhân. Mỗi tài khoản chỉ có một repo cá nhân, hệ thống chỉ có một Kho chung và một repo Văn thư.';
  }
  return error.message;
}

export interface CreateRepoArgs extends RepoInput {
  folder?: string;
  token: string;
  /** true: tạo dataset private mới trên Hugging Face; false: chỉ đăng ký repo đã có. */
  createOnHf: boolean;
}

/** Tạo (hoặc đăng ký) repo rồi lưu vào danh sách. Ném lỗi tiếng Việt khi hỏng ở bước nào. */
export async function createStorageRepo(args: CreateRepoArgs): Promise<StorageRepo> {
  const invalid = validateRepoInput(args);
  if (invalid) throw new Error(invalid);

  if (args.createOnHf) {
    await createHfDataset(args.token, args.repoId);
  }

  const { data, error } = await supabase
    .from('StorageRepos')
    .insert({
      Name: args.name.trim(),
      RepoId: args.repoId,
      Folder: args.folder?.trim() || null,
      Kind: args.kind,
      AssignedUserId: args.kind === 'personal' ? args.assignedUserId : null,
    })
    .select()
    .single();

  if (error) {
    const reason = describeInsertError(error);
    throw new Error(
      args.createOnHf
        ? `Đã tạo repo ${args.repoId} trên Hugging Face nhưng chưa đăng ký được vào hệ thống: ${reason}`
        : reason
    );
  }
  return mapRepoRow(data);
}

/** Gỡ repo khỏi danh sách (không xóa dataset trên Hugging Face). */
export async function removeStorageRepo(id: number): Promise<void> {
  const { data, error } = await supabase.from('StorageRepos').delete().eq('Id', id).select('Id');
  if (error) throw new Error(`Không gỡ được repo: ${error.message}`);
  if (!data || data.length === 0) throw new Error('Không gỡ được repo: không đủ quyền hoặc repo không còn.');
}

/** Đổi người được gán của repo cá nhân. */
export async function assignStorageRepo(id: number, userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('StorageRepos')
    .update({ AssignedUserId: userId })
    .eq('Id', id)
    .eq('Kind', 'personal')
    .select('Id');
  if (error) throw new Error(describeInsertError(error));
  if (!data || data.length === 0) throw new Error('Không gán được repo: không đủ quyền hoặc không phải repo cá nhân.');
}
