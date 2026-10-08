import { calcVi } from './calcVi';
import { ribbonVi } from './ribbonVi';
import { writerVi } from './writerVi';

export const vi = {
  calc: calcVi,
  ribbon: ribbonVi,
  app: {
    title: 'Báo cáo',
    loading: 'Đang tải…',
    backToApp: 'Về ứng dụng',
    home: 'Trang chủ Báo cáo',
  },
  home: {
    title: 'Báo cáo',
    spreadsheet: 'Bảng tính',
    spreadsheetNew: 'Bảng tính trống',
    spreadsheetOpen: 'Mở bảng tính',
    spreadsheetOpenHint: 'XLSX hoặc CSV từ máy',
    document: 'Văn bản',
    documentNew: 'Văn bản trống',
    documentOpen: 'Mở văn bản',
    documentOpenHint: 'DOCX, TXT hoặc HTML từ máy',
    recent: 'Gần đây',
    noRecent: 'Chưa có tài liệu nào.',
    open: 'Mở',
    delete: 'Xóa bản nháp',
    confirmDelete: (name: string) => `Xóa bản nháp "${name}"? Thao tác này không hoàn tác được.`,
    updated: (when: string) => `Sửa lúc ${when}`,
    draftsNote: 'Bản nháp nằm trong trình duyệt này, không gắn với tài khoản. Cần chia sẻ thì tải về.',
  },
  writer: writerVi,
};

export type OfficeMessages = typeof vi;
