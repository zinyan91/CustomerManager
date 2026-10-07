import type { DispatchDocument } from '../../types/dispatch';
import { joinArchivePath } from '../archivePath';

export { joinArchivePath };

/** URL xem/tải tệp của Kho lưu trữ. Tệp Google Drive tải thành Blob (cần token) rồi tạo object URL. */
export async function resolveFileDownloadUrl(doc: DispatchDocument): Promise<string> {
  if (doc.storageProvider === 'drive') {
    // Nạp trễ: token Drive kéo theo máy khách Supabase
    const [{ driveContext }, { fetchDriveDocBlob }] = await Promise.all([import('../drive/driveToken'), import('../drive/driveDocuments')]);
    return URL.createObjectURL(await fetchDriveDocBlob(driveContext, doc));
  }
  return doc.fileUrl;
}
