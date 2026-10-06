import { joinArchivePath } from '../archivePath';
import { batchUploadItems, type UploadItem } from '../uploadItems';

// Thư viện được nạp động để không đưa ~vài trăm KB vào gói chính; chỉ tải khi thật sự ghi.
const loadHub = () => import('@huggingface/hub');

export interface HfTarget {
  repoId: string;
  token: string;
}

export interface UploadFailure {
  path: string;
  error: string;
}

export interface UploadProgress {
  totalFiles: number;
  uploadedFiles: number;
  failedFiles: number;
  batchIndex: number;
  batchCount: number;
}

export interface UploadResult {
  /** Đường dẫn đầy đủ trong repo của các tệp đã lên. */
  uploaded: string[];
  failed: UploadFailure[];
}

/** Dịch lỗi của Hugging Face sang thông điệp người dùng đọc hiểu. */
export function describeHfWriteError(err: unknown): string {
  const status = (err as { statusCode?: number } | null)?.statusCode;
  switch (status) {
    case 401:
      return 'Token Hugging Face không hợp lệ hoặc đã hết hạn.';
    case 403:
      return 'Token không đủ quyền ghi vào repo này. Dùng token có quyền Write cho đúng dataset.';
    case 404:
      return 'Không tìm thấy repo trên Hugging Face. Kiểm tra lại Repository ID.';
    case 409:
      return 'Repo này đã tồn tại trên Hugging Face.';
    case 413:
      return 'Tệp quá lớn so với giới hạn của Hugging Face.';
  }
  if (err instanceof TypeError) return 'Không kết nối được tới Hugging Face. Kiểm tra mạng rồi thử lại.';
  return err instanceof Error && err.message ? err.message : 'Lỗi không xác định khi ghi lên Hugging Face.';
}

async function commitBatch(target: HfTarget, files: Array<{ path: string; content: Blob }>, title: string): Promise<void> {
  const { commit } = await loadHub();
  await commit({
    repo: { type: 'dataset', name: target.repoId },
    accessToken: target.token,
    title,
    operations: files.map((f) => ({ operation: 'addOrUpdate' as const, path: f.path, content: f.content })),
    maxFolderDepth: 50,
  });
}

/**
 * Tải nhiều tệp lên dưới `targetFolder`, giữ nguyên cấu trúc thư mục con.
 * Chia thành từng commit; commit hỏng thì thử lại từng tệp để tách đúng tệp lỗi.
 */
export async function uploadItemsToHf(
  target: HfTarget,
  targetFolder: string,
  items: UploadItem[],
  onProgress?: (p: UploadProgress) => void
): Promise<UploadResult> {
  const batches = batchUploadItems(items);
  const uploaded: string[] = [];
  const failed: UploadFailure[] = [];

  const report = (batchIndex: number) =>
    onProgress?.({
      totalFiles: items.length,
      uploadedFiles: uploaded.length,
      failedFiles: failed.length,
      batchIndex,
      batchCount: batches.length,
    });

  report(0);
  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    const files = batch.map((i) => ({ path: joinArchivePath(targetFolder, i.relativePath), content: i.file as Blob }));
    const title = files.length === 1 ? `Upload ${files[0].path}` : `Upload ${files.length} tệp`;

    try {
      await commitBatch(target, files, title);
      uploaded.push(...files.map((f) => f.path));
    } catch (batchErr) {
      if (files.length === 1) {
        failed.push({ path: files[0].path, error: describeHfWriteError(batchErr) });
      } else {
        for (const f of files) {
          try {
            await commitBatch(target, [f], `Upload ${f.path}`);
            uploaded.push(f.path);
          } catch (fileErr) {
            failed.push({ path: f.path, error: describeHfWriteError(fileErr) });
          }
        }
      }
    }
    report(b + 1);
  }

  return { uploaded, failed };
}

/** Xóa một tệp khỏi repo. */
export async function deleteFileFromHf(
  repoId: string,
  filePath: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  if (!token) return { success: false, error: 'Chưa cấu hình token Hugging Face.' };
  try {
    const { commit } = await loadHub();
    await commit({
      repo: { type: 'dataset', name: repoId },
      accessToken: token,
      title: `Delete ${filePath}`,
      operations: [{ operation: 'delete', path: filePath }],
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: describeHfWriteError(err) };
  }
}

/** Tạo dataset private mới trên Hugging Face. Ném Error với thông điệp tiếng Việt khi lỗi. */
export async function createHfDataset(token: string, repoId: string): Promise<void> {
  if (!token) throw new Error('Chưa cấu hình token Hugging Face.');
  if (!repoId.includes('/')) throw new Error('Tên repo cần dạng owner/tên.');
  try {
    const { createRepo } = await loadHub();
    await createRepo({ repo: { type: 'dataset', name: repoId }, accessToken: token, visibility: 'private' });
  } catch (err) {
    throw new Error(describeHfWriteError(err));
  }
}
