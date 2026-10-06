export type OfficialDocCategory = 'van-ban' | 'hop-dong' | 'cong-van' | 'khac';

export type OfficialDocFileKind = 'goc' | 'bieu-mau';

/** Tệp của văn bản: chỉ là đường dẫn tới tệp nằm trong Kho lưu trữ (Hugging Face). */
export interface OfficialDocFile {
  kind: OfficialDocFileKind;
  repoId: string;
  path: string;
  name: string;
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
