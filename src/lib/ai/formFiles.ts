import { formatFileSize, isSupportedAiAttachmentFile } from './fileToAttachment';

/** Biểu mẫu tải thẳng từ trình duyệt lên kho tệp, không qua máy chủ ứng dụng nên chỉ cần chặn tổng cỡ quá lớn. */
export const MAX_FORM_TOTAL_BYTES = 100 * 1024 * 1024;

/**
 * Tệp gửi kèm mà AI không đọc nội dung (Word, Excel, ZIP...) là biểu mẫu của văn bản. PDF và ảnh
 * là văn bản để AI đọc.
 */
export const isFormAttachment = (file: { name: string; type?: string }): boolean => !isSupportedAiAttachmentFile(file);

/** Lỗi khi tổng cỡ bộ biểu mẫu vượt giới hạn; null nếu dùng được. */
export function checkFormTotal(files: Array<{ size: number }>): string | null {
  const total = files.reduce((sum, f) => sum + f.size, 0);
  return total > MAX_FORM_TOTAL_BYTES
    ? `Bộ biểu mẫu vượt quá ${formatFileSize(MAX_FORM_TOTAL_BYTES)}. Hãy chia nhỏ hoặc tải thẳng vào kho Biểu mẫu.`
    : null;
}

/**
 * Bộ biểu mẫu là của đúng một văn bản: cần đi cùng một tệp văn bản (PDF hoặc ảnh).
 * Trả thông điệp nếu cách đính kèm hiện tại chưa dùng được; null nếu hợp lệ hoặc không có biểu mẫu.
 */
export function formPairingProblem(formCount: number, documentCount: number): string | null {
  if (formCount === 0) return null;
  if (documentCount === 0) return 'Thêm văn bản PDF hoặc ảnh đi cùng biểu mẫu.';
  if (documentCount > 1) return 'Bộ biểu mẫu chỉ đi kèm một văn bản. Gỡ bớt tệp văn bản.';
  return null;
}
