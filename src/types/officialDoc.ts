export type OfficialDocCategory = 'van-ban' | 'hop-dong' | 'cong-van' | 'khac';

export type OfficialDocFileKind = 'goc' | 'bieu-mau';

/**
 * Tệp của văn bản: tham chiếu tới tệp trong Kho lưu trữ theo `fileId` (mã tệp Google Drive), nên đổi tên hay
 * di chuyển tệp trong Kho không làm mất liên kết (`path` chỉ để hiển thị).
 */
export interface OfficialDocFile {
  kind: OfficialDocFileKind;
  repoId: string;
  path: string;
  name: string;
  fileId?: string;
  /** Kiểu gốc trên Drive khi là tệp Google Docs/Sheets/Slides (phải xuất ra Office thay vì tải thẳng). */
  nativeMimeType?: string;
}

export type OfficialDocStatus = 'upcoming' | 'active' | 'expired';

export interface OfficialDoc {
  id: string;
  category: OfficialDocCategory;
  docNumber: string;
  title: string;
  issuedDate: string; // YYYY-MM-DD
  effectiveFrom: string; // YYYY-MM-DD
  effectiveTo: string | null; // YYYY-MM-DD, trống = không giới hạn
  files: OfficialDocFile[];
  createdAt: string;
  updatedAt: string;
}

/** Dữ liệu người dùng nhập khi tạo/sửa. */
export type OfficialDocInput = Omit<OfficialDoc, 'id' | 'createdAt' | 'updatedAt'>;

export interface OfficialDocFilter {
  search: string;
  category: OfficialDocCategory | 'all';
  status: OfficialDocStatus | 'all';
  issuedFrom: string;
  issuedTo: string;
}
