export const DRIVE_FOLDER_MIME = 'application/vnd.google-apps.folder';
export const DRIVE_SHORTCUT_MIME = 'application/vnd.google-apps.shortcut';
export const DRIVE_NATIVE_PREFIX = 'application/vnd.google-apps.';

/** Một mục như Drive API trả về (chỉ các trường ứng dụng dùng). */
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  /** Tệp Google Docs, Sheets... không có dung lượng. */
  size: number;
  parents: string[];
  modifiedTime: string;
  createdTime: string;
}

/** Mục trong cây của một kho: đường dẫn tính từ thư mục gốc của kho. */
export interface DriveEntry {
  id: string;
  /** Tên hiển thị: đã thêm đuôi khi là tệp Google Docs/Sheets/Slides và đã đổi tên nếu trùng trong thư mục. */
  name: string;
  path: string;
  isFolder: boolean;
  size: number;
  modifiedTime: string;
  /** Kiểu tệp khi tải về (kiểu xuất ra với tệp Google Docs/Sheets/Slides). */
  mimeType: string;
  /** Kiểu gốc trên Drive; khác rỗng khi là tệp Google Docs/Sheets/Slides cần xuất thay vì tải thẳng. */
  nativeMimeType: string;
}

/** Quyền truy cập Drive lấy từ Edge Function drive-token. */
export interface DriveAccess {
  accessToken: string;
  /** Mili giây Unix. */
  expiresAt: number;
  access: 'write' | 'read';
  driveId: string;
}

/** Ngữ cảnh gọi Drive: nơi lấy token và các hàm có thể thay khi test. */
export interface DriveContext {
  getAccess: () => Promise<DriveAccess>;
  /** Bỏ token đang giữ để lần sau xin mới (khi Drive trả 401). */
  invalidate: () => void;
  fetchFn?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}
