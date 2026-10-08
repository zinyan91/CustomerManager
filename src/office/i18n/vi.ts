import { calcVi } from './calcVi';
import { ribbonVi } from './ribbonVi';

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
    recent: 'Gần đây',
    noRecent: 'Chưa có tài liệu nào.',
    open: 'Mở',
    delete: 'Xóa bản nháp',
    confirmDelete: (name: string) => `Xóa bản nháp "${name}"? Thao tác này không hoàn tác được.`,
    updated: (when: string) => `Sửa lúc ${when}`,
    draftsNote: 'Bản nháp nằm trong trình duyệt này, không gắn với tài khoản. Cần chia sẻ thì tải về.',
  },
  writer: {
    saving: 'Đang lưu…',
    saved: 'Đã lưu bản nháp',
    saveFailed: 'Không lưu được bản nháp trong trình duyệt',
    errors: {
      imageFailed: 'Không đọc được ảnh này.',
      draftMissing: 'Không tìm thấy bản nháp này; có thể nó đã bị xóa.',
    },
  },
};

export type OfficeMessages = typeof vi;
