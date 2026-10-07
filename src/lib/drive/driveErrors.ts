/** Lỗi Drive API đã đọc ra mã HTTP, lý do của Google và thông điệp gốc. */
export class DriveApiError extends Error {
  readonly status: number;
  readonly reason: string;
  constructor(status: number, reason: string, message: string) {
    super(message);
    this.name = 'DriveApiError';
    this.status = status;
    this.reason = reason;
  }
}

/** Đọc thân phản hồi lỗi của Google ({error:{code,message,errors:[{reason}]}}); không đọc được thì dùng mã HTTP. */
export async function readDriveError(res: Response): Promise<DriveApiError> {
  let reason = '';
  let message = res.statusText || `HTTP ${res.status}`;
  try {
    const body = (await res.json()) as { error?: { message?: string; errors?: Array<{ reason?: string }>; status?: string } | string };
    if (typeof body.error === 'object' && body.error) {
      message = body.error.message || message;
      reason = body.error.errors?.[0]?.reason || body.error.status || '';
    } else if (typeof body.error === 'string') {
      message = body.error;
    }
  } catch {
    // Thân không phải JSON: giữ thông điệp theo mã HTTP
  }
  return new DriveApiError(res.status, reason, message);
}

/** Thông điệp tiếng Việt cho người dùng. `what` là việc đang làm, ví dụ "Tải tệp lên". */
export function describeDriveError(err: unknown, what = 'Thao tác với Google Drive'): string {
  if (err instanceof DriveApiError) {
    const { status, reason } = err;
    if (reason === 'storageQuotaExceeded' || reason === 'teamDriveFileLimitExceeded' || reason === 'driveFileLimitExceeded') {
      return `${what} không được: Shared Drive đã hết dung lượng hoặc đạt giới hạn số tệp.`;
    }
    if (reason === 'rateLimitExceeded' || reason === 'userRateLimitExceeded' || reason === 'sharingRateLimitExceeded' || status === 429) {
      return `${what} không được: Google đang giới hạn tốc độ. Đợi một lát rồi thử lại.`;
    }
    if (status === 401) return `${what} không được: phiên truy cập Google Drive đã hết hạn. Tải lại trang rồi thử lại.`;
    if (status === 403) {
      return `${what} không được: tài khoản dịch vụ không đủ quyền trong Shared Drive (cần quyền Quản lý nội dung) hoặc thư mục này không thuộc Shared Drive.`;
    }
    if (status === 404) return `${what} không được: không tìm thấy tệp hoặc thư mục trên Google Drive (có thể đã bị xóa hoặc di chuyển).`;
    if (status >= 500) return `${what} không được: Google Drive đang lỗi (${status}). Thử lại sau ít phút.`;
    return `${what} không được: ${err.message}`;
  }
  if (err instanceof DOMException && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
    return `${what} đã bị hủy hoặc quá thời gian chờ.`;
  }
  if (err instanceof TypeError) return `${what} không được: không kết nối được tới Google Drive. Kiểm tra mạng rồi thử lại.`;
  return err instanceof Error && err.message ? err.message : `${what} không được: lỗi không xác định.`;
}
