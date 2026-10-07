import { DriveApiError, describeDriveError } from './drive/driveErrors';

export type ArchiveStatus =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'no_repo' }
  | { kind: 'error'; message: string };

/** Phân loại lỗi khi nạp kho thành trạng thái hiển thị được. */
export function classifyArchiveError(err: unknown): ArchiveStatus {
  if (err instanceof DriveApiError) return { kind: 'error', message: describeDriveError(err, 'Nạp kho lưu trữ') };
  if (err instanceof DOMException && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
    return { kind: 'error', message: 'Kho lưu trữ phản hồi quá chậm. Thử tải lại sau ít phút.' };
  }
  if (err instanceof TypeError) {
    return { kind: 'error', message: 'Không kết nối được tới kho lưu trữ. Kiểm tra mạng rồi thử lại.' };
  }
  return { kind: 'error', message: err instanceof Error ? err.message : 'Lỗi không xác định khi nạp kho lưu trữ.' };
}

/** Thông điệp cho người dùng; null khi không cần cảnh báo. */
export function archiveStatusMessage(status: ArchiveStatus, canConfigure: boolean): string | null {
  switch (status.kind) {
    case 'loading':
    case 'ready':
      return null;
    case 'no_repo':
      return canConfigure
        ? 'Chưa có repo nào cho mục này. Mở phần cấu hình để tạo repo.'
        : 'Bạn chưa có kho lưu trữ nào. Liên hệ Master Admin để được tạo hoặc gán kho.';
    case 'error':
      return status.message;
  }
}
