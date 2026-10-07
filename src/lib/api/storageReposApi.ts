import { supabase } from '../supabase';
import type { StorageRepo } from '../../types/storageRepo';
import { mapRepoRow, validateRepoInput, type RepoInput } from '../storageRepos';
import { createHfDataset } from '../huggingface/hfWrite';
import { HfApiError, listHfTree } from '../huggingface/hfClient';

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
    return 'Đã có repo cùng loại hoặc tài khoản này đã được gán repo cá nhân. Mỗi tài khoản chỉ có một repo cá nhân, hệ thống chỉ có một Kho chung, một repo Văn thư và một repo Biểu mẫu.';
  }
  return error.message;
}

export interface CreateRepoArgs extends RepoInput {
  folder?: string;
  token: string;
  /**
   * true: tạo mới ở nơi lưu (dataset private trên Hugging Face, hoặc thư mục tên `name` ở gốc Shared Drive);
   * false: chỉ đăng ký repo hay thư mục đã có (khi đó `repoId` là bắt buộc).
   */
  createRemote: boolean;
}

/** ID giả để kiểm tra các trường khác khi thư mục Drive chưa được tạo nên chưa có ID thật. */
const PENDING_DRIVE_FOLDER_ID = 'ChuaTaoThuMuc';

/** Tạo (hoặc đăng ký) repo rồi lưu vào danh sách. Ném lỗi tiếng Việt khi hỏng ở bước nào. */
export async function createStorageRepo(args: CreateRepoArgs): Promise<StorageRepo> {
  const newDriveFolder = args.provider === 'drive' && args.createRemote;
  const invalid = validateRepoInput(newDriveFolder ? { ...args, repoId: PENDING_DRIVE_FOLDER_ID } : args);
  if (invalid) throw new Error(invalid);

  let repoId = args.repoId;
  let createdWhere = '';
  if (newDriveFolder) {
    // Nạp trễ: lớp Drive kéo theo token và máy khách Supabase
    const [{ driveContext }, { createDriveFolder }, { describeDriveError }] = await Promise.all([
      import('../drive/driveToken'), import('../drive/driveClient'), import('../drive/driveErrors'),
    ]);
    try {
      repoId = (await createDriveFolder(driveContext, (await driveContext.getAccess()).driveId, args.name.trim())).id;
    } catch (err) {
      throw new Error(describeDriveError(err, 'Tạo thư mục trong Shared Drive'));
    }
    createdWhere = `Đã tạo thư mục "${args.name.trim()}" (ID ${repoId}) trong Shared Drive`;
  } else if (args.provider !== 'drive' && args.createRemote) {
    await createHfDataset(args.token, repoId);
    createdWhere = `Đã tạo repo ${repoId} trên Hugging Face`;
  }

  const { data, error } = await supabase
    .from('StorageRepos')
    .insert({
      Name: args.name.trim(),
      RepoId: repoId,
      Folder: args.folder?.trim() || null,
      Kind: args.kind,
      Provider: args.provider === 'drive' ? 'drive' : 'huggingface',
      AssignedUserId: args.kind === 'personal' ? args.assignedUserId : null,
    })
    .select()
    .single();

  if (error) {
    const reason = describeInsertError(error);
    throw new Error(createdWhere ? `${createdWhere} nhưng chưa đăng ký được vào hệ thống: ${reason}` : reason);
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

export interface RepoEdit {
  name: string;
  repoId: string;
  folder: string;
}

export interface RepoEditResult {
  /** Số văn bản đã cập nhật đường dẫn kho theo Repository ID mới. */
  documents: number;
  dispatches: number;
}

const MISSING_FUNCTION_CODES = ['PGRST202', '42883'];

/** Dataset phải có thật trên Hugging Face trước khi trỏ repo tới nó, kẻo gõ nhầm tiếp. */
async function assertDatasetExists(repoId: string, token: string): Promise<void> {
  try {
    await listHfTree(repoId, '', token, false);
  } catch (err) {
    if (err instanceof HfApiError && err.status === 404) {
      throw new Error(`Không tìm thấy dataset ${repoId} trên Hugging Face (hoặc token không có quyền xem). Kiểm tra lại Repository ID.`);
    }
    if (err instanceof HfApiError && (err.status === 401 || err.status === 403)) {
      throw new Error('Token kho lưu trữ không hợp lệ hoặc không đủ quyền xem dataset này.');
    }
    throw err;
  }
}

/**
 * Master Admin sửa tên hiển thị, Repository ID và thư mục gốc của repo. Đổi Repository ID thì đường dẫn kho
 * trong các văn bản đang trỏ tới repo cũ được cập nhật cùng lúc (một giao dịch ở CSDL). Không đổi tên dataset trên Hugging Face.
 */
export async function updateStorageRepo(repo: StorageRepo, edit: RepoEdit, token: string): Promise<RepoEditResult> {
  const invalid = validateRepoInput({ name: edit.name, repoId: edit.repoId, kind: repo.kind, assignedUserId: repo.assignedUserId, provider: repo.provider });
  if (invalid) throw new Error(invalid);
  // Chỉ Hugging Face kiểm dataset mới có thật; thư mục Drive được kiểm khi mở kho
  if (repo.provider === 'huggingface' && edit.repoId !== repo.repoId) await assertDatasetExists(edit.repoId, token);

  const { data, error } = await supabase.rpc('update_storage_repo', {
    p_id: repo.id,
    p_name: edit.name,
    p_repo_id: edit.repoId,
    p_folder: edit.folder,
  });
  if (error) {
    if (error.code && MISSING_FUNCTION_CODES.includes(error.code)) {
      throw new Error('Chưa áp migration 67_sua_repo_kho_luu_tru.sql trên Supabase.');
    }
    throw new Error(`Không sửa được repo: ${error.message}`);
  }
  const result = data as Partial<RepoEditResult> | null;
  if (typeof result?.documents !== 'number' || typeof result?.dispatches !== 'number') {
    throw new Error('Máy chủ trả về kết quả sửa repo không hợp lệ.');
  }
  return { documents: result.documents, dispatches: result.dispatches };
}
