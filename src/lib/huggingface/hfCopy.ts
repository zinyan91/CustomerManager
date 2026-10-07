import type { PastePlan } from '../storageClipboard';
import type { UploadItem } from '../uploadItems';
import { HfApiError, fetchHfFileBlob, hfFileUrl } from './hfClient';

const baseName = (path: string) => path.split('/').pop() ?? path;

/**
 * Tải các tệp của kế hoạch dán từ repo nguồn về trình duyệt, sẵn sàng tải lên repo đích. Dataset Hugging Face
 * không sao chép phía máy chủ được, và tệp không đi qua máy chủ của ứng dụng. Một tệp lỗi thì dừng và nói rõ tệp nào.
 */
export async function fetchPasteItems(
  plan: PastePlan,
  sourceRepoId: string,
  token: string,
  onProgress?: (done: number, total: number) => void
): Promise<UploadItem[]> {
  const items: UploadItem[] = [];
  onProgress?.(0, plan.files.length);
  for (const f of plan.files) {
    const name = baseName(f.sourcePath);
    let blob: Blob;
    try {
      blob = await fetchHfFileBlob(hfFileUrl(sourceRepoId, f.sourcePath), token);
    } catch (err) {
      if (err instanceof HfApiError && (err.status === 401 || err.status === 403)) {
        throw new Error(`Token kho lưu trữ bị từ chối khi tải "${name}" (${err.status}).`);
      }
      if (err instanceof HfApiError && err.status === 404) {
        throw new Error(`Tệp "${name}" không còn trong kho nguồn. Hãy làm mới rồi sao chép lại.`);
      }
      throw new Error(`Không tải được "${name}" từ kho nguồn: ${err instanceof Error ? err.message : String(err)}`);
    }
    items.push({ file: new File([blob], baseName(f.relativePath), { type: blob.type }), relativePath: f.relativePath });
    onProgress?.(items.length, plan.files.length);
  }
  return items;
}
