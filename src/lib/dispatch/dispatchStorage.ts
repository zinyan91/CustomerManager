import type { DispatchDocument, DispatchFilter, DispatchUploadPayload } from '../../types/dispatch';
import type { HfConfig } from '../../types/huggingface';
import { supabase } from '../supabase';
import { fetchHfFileBlob, hfFileUrl } from '../huggingface/hfClient';
import { uploadItemsToHf, deleteFileFromHf } from '../huggingface/hfWrite';
import { joinArchivePath } from '../archivePath';
import { isHfConfigComplete } from '../huggingface/hfConfigApi';
import { isPersistedDispatch } from './mergeArchive';

const MSG_NOT_CONFIGURED =
  'Chưa cấu hình kho lưu trữ Hugging Face. Liên hệ Master Admin để cấu hình token và repo.';

export { joinArchivePath, hfFileUrl };

/** Dòng bảng Dispatches (PascalCase) sang DispatchDocument. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapDispatchRow(row: any): DispatchDocument {
  return {
    id: String(row.Id),
    documentNumber: row.DocumentNumber || '',
    title: row.Title,
    documentType: row.DocumentType,
    issuer: row.Issuer || '',
    documentDate: row.DocumentDate || '',
    receivedDate: row.ReceivedDate || '',
    customerId: row.CustomerId != null ? Number(row.CustomerId) : null,
    fileName: row.FileName,
    fileSize: Number(row.FileSize ?? 0),
    fileType: row.FileType,
    fileUrl: row.FileUrl,
    filePath: row.FilePath || undefined,
    folderPath: row.FolderPath || undefined,
    repoId: row.RepoId || undefined,
    storageProvider: row.StorageProvider || 'huggingface',
    aiSummary: row.AiSummary || undefined,
    aiKeywords: row.AiKeywords || undefined,
    note: row.Note || undefined,
    createdAt: row.CreatedAt,
    updatedAt: row.UpdatedAt,
  };
}

/** DispatchDocument sang dòng ghi vào Dispatches. Không gửi OwnerId: DB tự gán auth.uid(). */
export function toDispatchRow(doc: DispatchDocument): Record<string, unknown> {
  return {
    DocumentNumber: doc.documentNumber || null,
    Title: doc.title,
    DocumentType: doc.documentType,
    Issuer: doc.issuer || null,
    DocumentDate: doc.documentDate || null,
    ReceivedDate: doc.receivedDate || null,
    CustomerId: doc.customerId,
    FileName: doc.fileName,
    FileSize: doc.fileSize,
    FileType: doc.fileType,
    FileUrl: doc.fileUrl,
    FilePath: doc.filePath ?? null,
    FolderPath: doc.folderPath ?? null,
    RepoId: doc.repoId ?? null,
    StorageProvider: doc.storageProvider,
    AiSummary: doc.aiSummary ?? null,
    AiKeywords: doc.aiKeywords ?? null,
    Note: doc.note ?? null,
    UpdatedAt: new Date().toISOString(),
  };
}

/** Danh sách metadata văn thư của một repo. Ném lỗi khi DB báo lỗi. */
export async function listDispatches(repoId: string): Promise<DispatchDocument[]> {
  const { data, error } = await supabase
    .from('Dispatches')
    .select('*')
    .eq('RepoId', repoId)
    .order('CreatedAt', { ascending: false });

  if (error) {
    throw new Error(`Không đọc được danh sách văn thư: ${error.message}`);
  }
  return (data ?? []).map(mapDispatchRow);
}

/** Tạo hoặc cập nhật metadata theo đường dẫn tệp. Ném lỗi khi ghi hỏng (kể cả bị RLS chặn). */
export async function saveDispatchRecord(doc: DispatchDocument): Promise<DispatchDocument> {
  if (!doc.filePath || !doc.repoId) {
    throw new Error('Văn bản chưa có repo hoặc đường dẫn tệp nên không lưu được thông tin.');
  }
  const { data, error } = await supabase
    .from('Dispatches')
    .upsert(toDispatchRow(doc), { onConflict: 'RepoId,FilePath' })
    .select()
    .single();

  if (error) {
    throw new Error(`Không lưu được thông tin văn bản: ${error.message}`);
  }
  return mapDispatchRow(data);
}

/** Xóa dòng metadata (nếu có). Ném lỗi khi không xóa được hoặc không đủ quyền. */
export async function deleteDispatchRecord(doc: DispatchDocument): Promise<void> {
  if (!isPersistedDispatch(doc)) return;

  const { data, error } = await supabase
    .from('Dispatches')
    .delete()
    .eq('Id', Number(doc.id))
    .select('Id');

  if (error) {
    throw new Error(`Không xóa được thông tin văn bản: ${error.message}`);
  }
  if (!data || data.length === 0) {
    throw new Error('Không xóa được thông tin văn bản: không đủ quyền hoặc bản ghi không còn.');
  }
}

/**
 * Tải tệp lên Hugging Face rồi ghi metadata. Bắt buộc có cấu hình HF: tệp chỉ
 * nằm trên máy người tải thì tài khoản khác không thấy được.
 */
export async function uploadDispatchDocument(
  payload: DispatchUploadPayload,
  hfConfig: HfConfig | null
): Promise<DispatchDocument> {
  if (!isHfConfigComplete(hfConfig)) {
    throw new Error(MSG_NOT_CONFIGURED);
  }

  const yearStr = payload.documentDate ? payload.documentDate.substring(0, 4) : String(new Date().getFullYear());
  const folderPath = payload.folderPath
    ? joinArchivePath(payload.folderPath)
    : joinArchivePath(hfConfig.folder, yearStr, payload.documentType);
  const filePath = joinArchivePath(folderPath, payload.file.name);

  const uploaded = await uploadItemsToHf(
    { repoId: hfConfig.repoId, token: hfConfig.token },
    folderPath,
    [{ file: payload.file, relativePath: payload.file.name }]
  );
  if (uploaded.failed.length > 0) {
    throw new Error(uploaded.failed[0].error || 'Không tải được tệp lên Hugging Face.');
  }

  const now = new Date().toISOString();
  const draft: DispatchDocument = {
    id: filePath,
    documentNumber: payload.documentNumber.trim(),
    title: payload.title.trim(),
    documentType: payload.documentType,
    issuer: payload.issuer.trim(),
    documentDate: payload.documentDate,
    receivedDate: payload.receivedDate,
    customerId: payload.customerId,
    fileName: payload.file.name,
    fileSize: payload.file.size,
    fileType: payload.file.type || 'application/octet-stream',
    fileUrl: hfFileUrl(hfConfig.repoId, filePath),
    filePath,
    folderPath,
    repoId: hfConfig.repoId,
    storageProvider: 'huggingface',
    note: payload.note?.trim(),
    createdAt: now,
    updatedAt: now,
  };

  try {
    return await saveDispatchRecord(draft);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Tệp đã lên Hugging Face nhưng chưa ghi được thông tin văn bản: ${reason}`);
  }
}

/** Xóa tệp trên Hugging Face rồi xóa metadata. Ném lỗi ở bước nào hỏng. */
export async function deleteDispatchDocument(doc: DispatchDocument, hfConfig: HfConfig | null): Promise<void> {
  if (doc.storageProvider === 'huggingface' && doc.filePath) {
    if (!isHfConfigComplete(hfConfig)) {
      throw new Error(MSG_NOT_CONFIGURED);
    }
    const res = await deleteFileFromHf(hfConfig.repoId, doc.filePath, hfConfig.token);
    if (!res.success) {
      throw new Error(res.error || 'Không xóa được tệp trên Hugging Face.');
    }
  }
  await deleteDispatchRecord(doc);
}

/**
 * Tìm kiếm và lọc danh sách văn thư
 */
export function filterDispatches(
  dispatches: DispatchDocument[],
  filter: DispatchFilter
): DispatchDocument[] {
  const q = filter.search.trim().toLowerCase();

  return dispatches.filter((doc) => {
    // 1. Tìm kiếm text (số hiệu, trích yếu, người ban hành, tên tệp, ghi chú)
    if (q) {
      const matchDocNum = doc.documentNumber.toLowerCase().includes(q);
      const matchTitle = doc.title.toLowerCase().includes(q);
      const matchIssuer = doc.issuer.toLowerCase().includes(q);
      const matchFile = doc.fileName.toLowerCase().includes(q);
      const matchNote = doc.note ? doc.note.toLowerCase().includes(q) : false;
      const matchSummary = doc.aiSummary ? doc.aiSummary.toLowerCase().includes(q) : false;

      if (!matchDocNum && !matchTitle && !matchIssuer && !matchFile && !matchNote && !matchSummary) {
        return false;
      }
    }

    // 2. Lọc theo loại văn bản
    if (filter.documentType && filter.documentType !== 'all') {
      if (doc.documentType !== filter.documentType) {
        return false;
      }
    }

    // 3. Lọc theo khách hàng
    if (filter.customerId !== 'all') {
      if (doc.customerId !== filter.customerId) {
        return false;
      }
    }

    // 4. Lọc theo thư mục (Folder Path)
    if (filter.folderPath) {
      const targetFolder = filter.folderPath.replace(/^\/+|\/+$/g, '');
      const docFolder = (doc.folderPath || '').replace(/^\/+|\/+$/g, '');
      const docPath = (doc.filePath || '').replace(/^\/+|\/+$/g, '');
      if (docFolder !== targetFolder && !docPath.startsWith(targetFolder + '/')) {
        return false;
      }
    }

    // 5. Lọc theo ngày ban hành (Từ ngày)
    if (filter.dateFrom && doc.documentDate) {
      if (doc.documentDate < filter.dateFrom) {
        return false;
      }
    }

    // 6. Lọc theo ngày ban hành (Đến ngày)
    if (filter.dateTo && doc.documentDate) {
      if (doc.documentDate > filter.dateTo) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Tạo URL xem/tải tệp. Tệp trên Hugging Face (dataset private) cần token nên
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
