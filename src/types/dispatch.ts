export type DispatchDocumentType =
  | 'quyet_dinh'
  | 'thong_bao'
  | 'hop_dong'
  | 'bien_ban'
  | 'to_trinh'
  | 'giay_to_phap_ly'
  | 'cong_van'
  | 'khac';

export const DISPATCH_TYPE_LABELS: Record<DispatchDocumentType, string> = {
  quyet_dinh: 'Quyết định',
  thong_bao: 'Thông báo',
  hop_dong: 'Hợp đồng',
  bien_ban: 'Biên bản thẩm định / họp',
  to_trinh: 'Tờ trình cấp tín dụng',
  giay_to_phap_ly: 'Giấy tờ pháp lý',
  cong_van: 'Công văn điều hành',
  khac: 'Văn bản khác',
};

export interface DispatchDocument {
  id: string;
  documentNumber: string;
  title: string;
  documentType: DispatchDocumentType;
  issuer: string;
  documentDate: string; // YYYY-MM-DD
  receivedDate: string; // YYYY-MM-DD
  customerId: number | null;
  customerName?: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
  filePath?: string; // Đường dẫn tương đối trong repo (vd: 2026/01/QD_112.pdf)
  folderPath?: string; // Thư mục cha (vd: 2026/01)
  storageProvider: 'huggingface' | 'r2' | 'supabase' | 'local';
  aiSummary?: string;
  aiKeywords?: string[];
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DispatchFilter {
  search: string;
  documentType: string;
  customerId: number | 'all';
  folderPath?: string;
  dateFrom: string;
  dateTo: string;
}

export interface DispatchUploadPayload {
  file: File;
  documentNumber: string;
  title: string;
  documentType: DispatchDocumentType;
  issuer: string;
  documentDate: string;
  receivedDate: string;
  customerId: number | null;
  folderPath?: string;
  note?: string;
}
