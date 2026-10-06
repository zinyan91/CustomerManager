import type { DispatchDocument } from '../../types/dispatch';
import type { HfConfig } from '../../types/huggingface';
import { fetchHfFileBlob, hfFileUrl } from '../huggingface/hfClient';
import { joinArchivePath } from '../archivePath';
import { isHfConfigComplete } from '../huggingface/hfConfigApi';

const MSG_NOT_CONFIGURED =
  'Chưa cấu hình kho lưu trữ Hugging Face. Liên hệ Master Admin để cấu hình token và repo.';

export { joinArchivePath, hfFileUrl };

/**
 * Tạo URL xem/tải tệp của Kho lưu trữ. Tệp trên Hugging Face (dataset private) cần token nên
 * tải thành Blob rồi tạo object URL.
 */
export async function resolveFileDownloadUrl(doc: DispatchDocument, hfConfig: HfConfig | null): Promise<string> {
  if (doc.storageProvider === 'huggingface') {
    if (!isHfConfigComplete(hfConfig)) {
      throw new Error(MSG_NOT_CONFIGURED);
    }
    const blob = await fetchHfFileBlob(doc.fileUrl, hfConfig.token);
    return URL.createObjectURL(blob);
  }
  return doc.fileUrl;
}
