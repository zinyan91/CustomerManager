import type { DispatchDocument, DispatchFilter, DispatchUploadPayload } from '../../types/dispatch';
import { isR2Configured, buildR2ObjectKey, getR2PublicUrl } from '../r2Storage';
import { supabase } from '../supabase';
import { getHfConfig, uploadFileToHf, deleteFileFromHf, fetchHfFileBlob } from '../huggingface/hfClient';

const DB_NAME = 'CustomerManager_DispatchStorage';
const DB_VERSION = 1;
const STORE_FILES = 'files';
const STORAGE_KEY_DISPATCHES = 'cm_dispatches_v1';

// Mở IndexedDB để lưu trữ nhị phân file (Binary Blobs) kích thước lớn
function openFileDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB không được hỗ trợ trong môi trường này.'));
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Lưu tệp nhị phân vào IndexedDB
 */
export async function saveBlobToLocalIndexedDb(id: string, file: File | Blob): Promise<string> {
  const db = await openFileDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FILES, 'readwrite');
    const store = tx.objectStore(STORE_FILES);
    const putRequest = store.put({ id, data: file, createdAt: Date.now() });

    putRequest.onsuccess = () => resolve(`idb://${id}`);
    putRequest.onerror = () => reject(putRequest.error);
  });
}

/**
 * Đọc tệp nhị phân từ IndexedDB
 */
export async function getBlobFromLocalIndexedDb(id: string): Promise<Blob | null> {
  try {
    const db = await openFileDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FILES, 'readonly');
      const store = tx.objectStore(STORE_FILES);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const res = getRequest.result;
        resolve(res ? res.data : null);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  } catch (error) {
    console.error('Lỗi khi đọc file từ IndexedDB:', error);
    return null;
  }
}

/**
 * Dữ liệu mẫu khởi tạo ban đầu cho Quản lý văn thư
 */
const SEED_DISPATCHES: DispatchDocument[] = [
  {
    id: 'seed-doc-001',
    documentNumber: '112/QĐ-NHNN',
    title: 'Quyết định về việc ban hành quy chế cho vay và trích lập dự phòng rủi ro tín dụng năm 2026',
    documentType: 'quyet_dinh',
    issuer: 'Thống đốc Ngân hàng Nhà nước',
    documentDate: '2026-08-15',
    receivedDate: '2026-08-18',
    customerId: null,
    customerName: undefined,
    fileName: '112_QD_NHNN_Quy_che_cho_vay_2026.pdf',
    fileSize: 458920,
    fileType: 'application/pdf',
    fileUrl: 'sample://112_QD_NHNN_Quy_che_cho_vay_2026.pdf',
    storageProvider: 'local',
    aiSummary: 'Quy định chi tiết về chuẩn mực cấp tín dụng, phân loại nợ theo 5 nhóm rủi ro và các tỷ lệ khấu trừ an toàn tài sản bảo đảm.',
    aiKeywords: ['Quy chế cho vay', 'Trích lập dự phòng', 'Thông tư 11', 'LTV an toàn'],
    note: 'Văn bản gốc lưu tại tủ văn thư Hội Sở',
    createdAt: '2026-08-18T08:30:00.000Z',
    updatedAt: '2026-08-18T08:30:00.000Z',
  },
  {
    id: 'seed-doc-002',
    documentNumber: '2405/TB-QLTD',
    title: 'Thông báo lãi suất cơ sở và biểu phí dịch vụ tín dụng quý 4/2026',
    documentType: 'thong_bao',
    issuer: 'Khối Quản trị Tín dụng & Nguồn vốn',
    documentDate: '2026-09-25',
    receivedDate: '2026-09-26',
    customerId: null,
    customerName: undefined,
    fileName: '2405_TB_QLTD_Lai_suat_co_so_Q4_2026.pdf',
    fileSize: 284100,
    fileType: 'application/pdf',
    fileUrl: 'sample://2405_TB_QLTD_Lai_suat_co_so_Q4_2026.pdf',
    storageProvider: 'local',
    aiSummary: 'Cập nhật lãi suất sàn cho vay ngắn hạn 6.8%/năm, trung dài hạn 8.5%/năm. Biên độ điều chỉnh cộng thêm từ 2.5% đến 3.5%.',
    aiKeywords: ['Lãi suất cơ sở', 'Lãi suất sàn', 'Biên độ', 'Q4-2026'],
    note: 'Áp dụng cho toàn bộ hợp đồng giải ngân từ 01/10/2026',
    createdAt: '2026-09-26T09:15:00.000Z',
    updatedAt: '2026-09-26T09:15:00.000Z',
  },
  {
    id: 'seed-doc-003',
    documentNumber: 'BBTD-2026/089',
    title: 'Biên bản định giá và thẩm định thực tế tài sản bảo đảm Bất động sản số 45 Nguyễn Huệ',
    documentType: 'bien_ban',
    issuer: 'Hội đồng Định giá Chi nhánh',
    documentDate: '2026-09-28',
    receivedDate: '2026-09-29',
    customerId: 1,
    customerName: 'Nguyễn Văn An',
    fileName: 'BB_Dinh_Gia_TSDB_45_Nguyen_Hue.pdf',
    fileSize: 1205400,
    fileType: 'application/pdf',
    fileUrl: 'sample://BB_Dinh_Gia_TSDB_45_Nguyen_Hue.pdf',
    storageProvider: 'local',
    aiSummary: 'Định giá thửa đất 120m2 tại số 45 Nguyễn Huệ giá trị 8.5 tỷ VNĐ. Tỷ lệ cấp tín dụng tối đa LTV 70% tương đương mức cho vay tối đa 5.95 tỷ VNĐ.',
    aiKeywords: ['Định giá TSĐB', 'Bất động sản', 'LTV 70%', 'Nguyễn Huệ'],
    note: 'Hồ sơ có kèm bản vẽ trích lục địa chính và ảnh chụp hiện trạng',
    createdAt: '2026-09-29T14:20:00.000Z',
    updatedAt: '2026-09-29T14:20:00.000Z',
  },
  {
    id: 'seed-doc-004',
    documentNumber: 'TTTD-09/2026',
    title: 'Tờ trình phê duyệt cấp hạn mức tín dụng tài trợ vốn lưu động công ty TNHH Minh Long',
    documentType: 'to_trinh',
    issuer: 'Phòng Khách hàng Doanh nghiệp',
    documentDate: '2026-10-02',
    receivedDate: '2026-10-03',
    customerId: null,
    customerName: undefined,
    fileName: 'To_Trinh_Han_Muc_Minh_Long_2026.docx',
    fileSize: 345000,
    fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    fileUrl: 'sample://To_Trinh_Han_Muc_Minh_Long_2026.docx',
    storageProvider: 'local',
    aiSummary: 'Đề xuất phê duyệt hạn mức cho vay 12 tỷ VNĐ thời hạn 12 tháng. Tài sản thế chấp là nhà xưởng và hàng tồn kho luân chuyển.',
    aiKeywords: ['Tờ trình tín dụng', 'Hạn mức', 'Vốn lưu động', 'Bảo đảm hàng tồn kho'],
    note: 'Đã thông qua Ban Thẩm định rủi ro Chi nhánh',
    createdAt: '2026-10-03T10:00:00.000Z',
    updatedAt: '2026-10-03T10:00:00.000Z',
  },
];

/**
 * Lấy danh sách văn thư từ bộ lưu trữ (LocalStorage / Supabase)
 */
export async function getDispatches(): Promise<DispatchDocument[]> {
  try {
    // 1. Thử lấy từ Supabase table Dispatches nếu có
    const { data: sbData, error: sbError } = await supabase
      .from('Dispatches')
      .select('*')
      .order('CreatedAt', { ascending: false });

    if (!sbError && sbData && sbData.length > 0) {
      return sbData.map((row: any) => ({
        id: String(row.Id),
        documentNumber: row.DocumentNumber || '',
        title: row.Title,
        documentType: row.DocumentType,
        issuer: row.Issuer || '',
        documentDate: row.DocumentDate || '',
        receivedDate: row.ReceivedDate || '',
        customerId: row.CustomerId ? Number(row.CustomerId) : null,
        fileName: row.FileName,
        fileSize: Number(row.FileSize || 0),
        fileType: row.FileType,
        fileUrl: row.FileUrl,
        storageProvider: row.StorageProvider || 'local',
        aiSummary: row.AiSummary,
        aiKeywords: row.AiKeywords,
        note: row.Note,
        createdAt: row.CreatedAt,
        updatedAt: row.UpdatedAt,
      }));
    }
  } catch {
    // Supabase table chưa tồn tại hoặc lỗi mạng, chuyển sang local cache
  }

  // 2. Fallback sang localStorage
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DISPATCHES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Lỗi khi nạp danh sách văn thư từ localStorage:', err);
  }

  // 3. Khởi tạo dữ liệu seed ban đầu
  try {
    localStorage.setItem(STORAGE_KEY_DISPATCHES, JSON.stringify(SEED_DISPATCHES));
  } catch {}
  return SEED_DISPATCHES;
}

/**
 * Tải lên tệp và tạo bản ghi văn thư mới
 */
export async function uploadDispatchDocument(
  payload: DispatchUploadPayload
): Promise<DispatchDocument> {
  const fileId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  let fileUrl = '';
  let storageProvider: 'huggingface' | 'r2' | 'supabase' | 'local' = 'local';

  // Xác định thư mục cha & đường dẫn tệp
  const yearStr = payload.documentDate ? payload.documentDate.substring(0, 4) : String(new Date().getFullYear());
  const folderPath = (payload.folderPath || `${yearStr}/${payload.documentType}`).replace(/^\/+|\/+$/g, '');
  const filePath = `${folderPath}/${payload.file.name}`;

  // 1. Lưu bản đệm nhị phân vào IndexedDB để preview/tải offline siêu tốc
  try {
    fileUrl = await saveBlobToLocalIndexedDb(fileId, payload.file);
  } catch {}

  // 2. Thử tải lên Hugging Face Dataset nếu đã cấu hình
  const hfConfig = getHfConfig();
  if (hfConfig.token && hfConfig.repoId) {
    try {
      const hfUploadResult = await uploadFileToHf(hfConfig.repoId, filePath, payload.file, hfConfig.token);
      if (hfUploadResult.success && hfUploadResult.url) {
        fileUrl = hfUploadResult.url;
        storageProvider = 'huggingface';
      }
    } catch (err) {
      console.warn('Lỗi khi tải lên Hugging Face, lưu dự phòng cục bộ:', err);
    }
  } else if (isR2Configured()) {
    try {
      const r2Key = buildR2ObjectKey('documents', fileId, payload.file.name);
      fileUrl = getR2PublicUrl(r2Key);
      storageProvider = 'r2';
    } catch {
      storageProvider = 'local';
    }
  }

  const now = new Date().toISOString();
  const newDoc: DispatchDocument = {
    id: fileId,
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
    fileUrl,
    filePath,
    folderPath,
    storageProvider,
    note: payload.note?.trim(),
    createdAt: now,
    updatedAt: now,
  };

  // Thử lưu vào Supabase
  try {
    await supabase.from('Dispatches').insert({
      DocumentNumber: newDoc.documentNumber,
      Title: newDoc.title,
      DocumentType: newDoc.documentType,
      Issuer: newDoc.issuer,
      DocumentDate: newDoc.documentDate || null,
      ReceivedDate: newDoc.receivedDate || null,
      CustomerId: newDoc.customerId,
      FileName: newDoc.fileName,
      FileSize: newDoc.fileSize,
      FileType: newDoc.fileType,
      FileUrl: newDoc.fileUrl,
      StorageProvider: newDoc.storageProvider,
      Note: newDoc.note || null,
    });
  } catch {
    // Supabase không khả dụng
  }

  // Đồng bộ vào localStorage
  const current = await getDispatches();
  const updated = [newDoc, ...current];
  try {
    localStorage.setItem(STORAGE_KEY_DISPATCHES, JSON.stringify(updated));
  } catch (e) {
    console.error('Không thể lưu vào localStorage:', e);
  }

  return newDoc;
}

/**
 * Cập nhật thông tin văn thư (ví dụ sau khi AI tóm tắt xong)
 */
export async function updateDispatchDocument(
  id: string,
  updates: Partial<DispatchDocument>
): Promise<DispatchDocument | null> {
  const current = await getDispatches();
  const index = current.findIndex((d) => d.id === id);
  if (index === -1) return null;

  const updatedDoc: DispatchDocument = {
    ...current[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  current[index] = updatedDoc;
  try {
    localStorage.setItem(STORAGE_KEY_DISPATCHES, JSON.stringify(current));
  } catch {}

  // Cập nhật Supabase nếu có
  try {
    await supabase
      .from('Dispatches')
      .update({
        Title: updatedDoc.title,
        DocumentNumber: updatedDoc.documentNumber,
        AiSummary: updatedDoc.aiSummary,
        AiKeywords: updatedDoc.aiKeywords,
        Note: updatedDoc.note,
        UpdatedAt: updatedDoc.updatedAt,
      })
      .eq('Id', id);
  } catch {}

  return updatedDoc;
}

/**
 * Xóa một văn thư khỏi kho
 */
export async function deleteDispatchDocument(id: string): Promise<boolean> {
  const current = await getDispatches();
  const docToDelete = current.find((d) => d.id === id);

  // Xóa trên Hugging Face nếu lưu trữ HF
  if (docToDelete?.storageProvider === 'huggingface' && docToDelete.filePath) {
    const hfConfig = getHfConfig();
    if (hfConfig.token && hfConfig.repoId) {
      try {
        await deleteFileFromHf(hfConfig.repoId, docToDelete.filePath, hfConfig.token);
      } catch (err) {
        console.warn('Không thể xoá tệp trên Hugging Face:', err);
      }
    }
  }

  const filtered = current.filter((d) => d.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY_DISPATCHES, JSON.stringify(filtered));
  } catch {}

  try {
    await supabase.from('Dispatches').delete().eq('Id', id);
  } catch {}

  return true;
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
 * Tạo URL tải file hoặc xem file
 */
export async function resolveFileDownloadUrl(doc: DispatchDocument): Promise<string> {
  // Nếu là file IDB
  if (doc.fileUrl.startsWith('idb://')) {
    const id = doc.fileUrl.replace('idb://', '');
    const blob = await getBlobFromLocalIndexedDb(id);
    if (blob) {
      return URL.createObjectURL(blob);
    }
  }

  // Nếu lưu trên Hugging Face
  if (doc.storageProvider === 'huggingface') {
    // Thử lấy blob từ IndexedDB trước
    const localBlob = await getBlobFromLocalIndexedDb(doc.id);
    if (localBlob) {
      return URL.createObjectURL(localBlob);
    }
    // Nếu không có trong IDB, fetch từ Hugging Face bằng token
    try {
      const hfConfig = getHfConfig();
      const blob = await fetchHfFileBlob(doc.fileUrl, hfConfig.token);
      return URL.createObjectURL(blob);
    } catch {
      return doc.fileUrl;
    }
  }

  // Nếu là sample file, tạo blob mẫu text giả lập
  if (doc.fileUrl.startsWith('sample://')) {
    const sampleContent = `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n\n${doc.issuer.toUpperCase()}\nSố: ${doc.documentNumber}\n\nTRÍCH YẾU: ${doc.title}\n\nNgày ban hành: ${doc.documentDate}\nNgày tiếp nhận: ${doc.receivedDate}\n\nNỘI DUNG VĂN BẢN MÔ PHỎNG:\n${doc.aiSummary || 'Văn bản lưu trữ nội bộ được tạo trong hệ thống CustomerManager.'}\n\nGhi chú: ${doc.note || 'Không có'}`;
    const blob = new Blob([sampleContent], { type: 'text/plain;charset=utf-8' });
    return URL.createObjectURL(blob);
  }

  return doc.fileUrl;
}
