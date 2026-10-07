export type FileKind = 'pdf' | 'image' | 'archive' | 'executable' | 'other';

const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'avif']);
const ARCHIVE_EXT = new Set(['zip', 'rar', '7z', 'tar', 'gz', 'tgz', 'bz2', 'xz']);
const EXECUTABLE_EXT = new Set(['exe', 'msi']);

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot < 0 ? '' : fileName.slice(dot + 1).toLowerCase();
}

/** Loại tệp theo đuôi, rồi theo kiểu MIME khi đuôi không rõ. Quyết định cách xem trước và có đưa cho AI đọc hay không. */
export function fileKindOf(fileName: string, mimeType = ''): FileKind {
  const ext = extensionOf(fileName);
  const mime = mimeType.toLowerCase();
  if (ext === 'pdf' || mime.includes('pdf')) return 'pdf';
  if (IMAGE_EXT.has(ext) || mime.startsWith('image/')) return 'image';
  if (ARCHIVE_EXT.has(ext)) return 'archive';
  if (EXECUTABLE_EXT.has(ext)) return 'executable';
  return 'other';
}

/** Tệp nén và tệp chạy không có chữ để AI tóm tắt hay hỏi đáp. */
export const isReadableByAi = (kind: FileKind): boolean => kind !== 'archive' && kind !== 'executable';
