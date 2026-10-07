import { formatFileSize } from './fileToAttachment';

/** Zip được tải thẳng từ trình duyệt lên kho tệp, không qua máy chủ ứng dụng nên chỉ cần chặn cỡ quá lớn. */
export const MAX_FORM_ZIP_BYTES = 100 * 1024 * 1024;

const ZIP_TYPES = ['application/zip', 'application/x-zip-compressed', 'application/x-zip'];

export function isZipFile(file: { name: string; type?: string }): boolean {
  return /\.zip$/i.test(file.name) || ZIP_TYPES.includes((file.type ?? '').toLowerCase());
}

/** Lỗi khi gắn một thư mục nén vào ô soạn tin; null nếu dùng được. */
export function checkFormZip(file: { name: string; size: number }, canRecord: boolean): string | null {
  if (!canRecord) return 'Bạn không có quyền thêm văn bản nên chưa dùng được thư mục nén biểu mẫu.';
  if (file.size > MAX_FORM_ZIP_BYTES) {
    return `Thư mục nén "${file.name}" vượt quá ${formatFileSize(MAX_FORM_ZIP_BYTES)}. Hãy chia nhỏ hoặc tải thẳng vào kho Biểu mẫu.`;
  }
  return null;
}

/**
 * Thư mục nén là biểu mẫu của đúng một văn bản: cần một thư mục nén đi cùng một tệp văn bản.
 * Trả thông điệp nếu cách đính kèm hiện tại chưa dùng được; null nếu hợp lệ hoặc không có thư mục nén.
 */
export function zipPairingProblem(zipCount: number, documentCount: number): string | null {
  if (zipCount === 0) return null;
  if (zipCount > 1) return 'Chỉ kèm được một thư mục nén cho mỗi văn bản.';
  if (documentCount === 0) return 'Thêm văn bản PDF hoặc ảnh đi cùng thư mục nén.';
  if (documentCount > 1) return 'Thư mục nén chỉ đi kèm một văn bản. Gỡ bớt tệp văn bản.';
  return null;
}
