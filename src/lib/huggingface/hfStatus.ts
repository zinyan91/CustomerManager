import { HfApiError } from './hfClient';

export type ArchiveStatus =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'not_configured' }
  | { kind: 'no_repo' }
  | { kind: 'unauthorized'; status: number }
  | { kind: 'not_found' }
  | { kind: 'error'; message: string };

/** Phân loại lỗi khi nạp kho thành trạng thái hiển thị được. */
export function classifyArchiveError(err: unknown): ArchiveStatus {
  if (err instanceof HfApiError) {
    if (err.status === 401 || err.status === 403) return { kind: 'unauthorized', status: err.status };
    if (err.status === 404) return { kind: 'not_found' };
    return { kind: 'error', message: err.message };
  }
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
    case 'not_configured':
      return canConfigure
        ? 'Chưa cấu hình kho lưu trữ. Bấm biểu tượng bánh răng để nhập token và repo.'
        : 'Chưa cấu hình kho lưu trữ. Liên hệ Master Admin để cấu hình token và repo.';
    case 'no_repo':
      return canConfigure
        ? 'Chưa có repo nào cho mục này. Mở phần cấu hình để tạo repo.'
        : 'Bạn chưa có kho lưu trữ nào. Liên hệ Master Admin để được tạo hoặc gán kho.';
    case 'unauthorized':
      return canConfigure
        ? `Token kho lưu trữ bị từ chối (${status.status}). Hãy cập nhật token trong phần cấu hình.`
        : `Token kho lưu trữ bị từ chối (${status.status}). Liên hệ Master Admin để cập nhật token.`;
    case 'not_found':
      return 'Repo hoặc thư mục chưa có trong kho lưu trữ. Kiểm tra lại Repository ID và thư mục trong cấu hình, hoặc tải tệp đầu tiên lên để tạo thư mục.';
    case 'error':
      return status.message;
  }
}
