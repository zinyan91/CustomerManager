/** Giới hạn kích thước nội dung một tài liệu chung, trùng với `office_check_size` ở máy chủ. */
export const MAX_CONTENT_BYTES = 5 * 1024 * 1024;

/**
 * Báo trước khi gửi nếu nội dung chắc chắn vượt giới hạn, để người dùng thấy lý do ngay thay vì mỗi lần lưu lại bị từ chối.
 * Máy chủ đo bằng jsonb::text (thêm khoảng trắng sau dấu phẩy và hai chấm) nên có thể đo lớn hơn chút; máy chủ vẫn là nơi quyết định.
 */
export function contentSizeProblem(content: object): string | null {
  const bytes = new TextEncoder().encode(JSON.stringify(content)).length;
  if (bytes <= MAX_CONTENT_BYTES) return null;
  const megabytes = (bytes / (1024 * 1024)).toFixed(1);
  return `Tài liệu lớn ${megabytes} MB, vượt giới hạn 5 MB nên chưa lưu lên hệ thống được. Hãy bỏ bớt ảnh hoặc chia nhỏ.`;
}
