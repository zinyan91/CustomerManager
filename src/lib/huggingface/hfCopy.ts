import type { PasteFile, PastePlan } from '../storageClipboard';
import type { UploadItem } from '../uploadItems';
import { HfApiError, fetchHfFileBlob, hfFileUrl } from './hfClient';

const baseName = (path: string) => path.split('/').pop() ?? path;

/** Lấy nội dung một tệp nguồn của kế hoạch dán. Ném lỗi tiếng Việt nêu rõ tệp nào khi hỏng. */
export type BlobFetcher = (file: PasteFile) => Promise<Blob>;

/** Đọc tệp từ repo Hugging Face của kho nguồn. */
export function hfBlobFetcher(sourceRepoId: string, token: string): BlobFetcher {
  return async (file) => {
    const name = baseName(file.sourcePath);
    try {
      return await fetchHfFileBlob(hfFileUrl(sourceRepoId, file.sourcePath), token);
    } catch (err) {
      if (err instanceof HfApiError && (err.status === 401 || err.status === 403)) {
        throw new Error(`Token kho lưu trữ bị từ chối khi tải "${name}" (${err.status}).`);
      }
      if (err instanceof HfApiError && err.status === 404) {
        throw new Error(`Tệp "${name}" không còn trong kho nguồn. Hãy làm mới rồi sao chép lại.`);
      }
      throw new Error(`Không tải được "${name}" từ kho nguồn: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
}

/**
 * Tải các tệp của kế hoạch dán về trình duyệt, sẵn sàng tải lên kho đích. Hugging Face không sao chép phía máy chủ được,
 * và tệp không đi qua máy chủ của ứng dụng. Một tệp lỗi thì dừng ngay.
 */
export async function fetchPasteItems(
  plan: PastePlan,
  fetchBlob: BlobFetcher,
  onProgress?: (done: number, total: number) => void
): Promise<UploadItem[]> {
  const items: UploadItem[] = [];
  onProgress?.(0, plan.files.length);
  for (const f of plan.files) {
    const blob = await fetchBlob(f);
    items.push({ file: new File([blob], baseName(f.relativePath), { type: blob.type }), relativePath: f.relativePath });
    onProgress?.(items.length, plan.files.length);
  }
  return items;
}
