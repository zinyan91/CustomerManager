import type { DispatchDocument } from '../../types/dispatch';
import { joinArchivePath } from '../archivePath';
import { normalizeRelativePath } from '../uploadItems';

/** Giới hạn số tệp mỗi lần nén (cùng ngưỡng với trang quản trị Felix). */
export const MAX_ZIP_ENTRIES = 5000;
/** Khi trình duyệt không có hộp "Lưu thành", zip phải nằm hết trong bộ nhớ nên giới hạn dung lượng. */
export const MAX_BUFFERED_ZIP_BYTES = 500 * 1024 * 1024;

export interface ZipEntry {
  /** Đường dẫn tệp trong repo. */
  filePath: string;
  /** Đường dẫn bên trong tệp zip, luôn bắt đầu bằng tên thư mục gốc. */
  zipPath: string;
  size: number;
  modifiedAt: string;
}

export interface FolderZipPlan {
  /** Tên tệp zip gợi ý, đã làm sạch. */
  fileName: string;
  entries: ZipEntry[];
  totalBytes: number;
}

export class FolderZipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FolderZipError';
  }
}

/** Làm sạch tên để dùng làm tên tệp/thư mục trên Windows, macOS, Linux. */
export function sanitizeZipName(name: string): string {
  const cleaned = name
    // eslint-disable-next-line no-control-regex
    .replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+|[. ]+$/g, '')
    .slice(0, 120)
    .trim();
  return cleaned || 'tai-lieu';
}

export function suggestedZipFileName(name: string): string {
  return `${sanitizeZipName(name)}.zip`;
}

/**
 * Lập kế hoạch nén một thư mục: mọi tệp ở mọi cấp bên dưới, giữ cấu trúc thư mục con,
 * gói trong một thư mục gốc để giải nén ra không bị rải tệp lên chỗ đang đứng.
 * `rootLabel` là tên dùng khi nén từ gốc repo (không có tên thư mục).
 */
export function planFolderZip(docs: DispatchDocument[], folderPath: string, rootLabel: string): FolderZipPlan {
  const folder = joinArchivePath(folderPath);
  const prefix = folder ? folder + '/' : '';
  const rootName = sanitizeZipName(folder ? folder.split('/').pop()! : rootLabel);

  const entries: ZipEntry[] = [];
  for (const doc of docs) {
    const filePath = joinArchivePath(doc.filePath);
    if (!filePath || !filePath.startsWith(prefix)) continue;

    const rel = normalizeRelativePath(filePath.slice(prefix.length));
    if (!rel) continue;
    if (!Number.isSafeInteger(doc.fileSize) || doc.fileSize < 0) {
      throw new FolderZipError(`Không thể nén: kích thước tệp "${doc.fileName}" không hợp lệ.`);
    }
    entries.push({ filePath, zipPath: `${rootName}/${rel}`, size: doc.fileSize, modifiedAt: doc.updatedAt || '' });
  }

  if (entries.length === 0) throw new FolderZipError('Thư mục này chưa có tệp nào để tải.');
  if (entries.length > MAX_ZIP_ENTRIES) {
    throw new FolderZipError(`Mỗi lần chỉ nén được tối đa ${MAX_ZIP_ENTRIES} tệp. Hãy tải từng thư mục con.`);
  }

  entries.sort((a, b) => a.zipPath.localeCompare(b.zipPath, 'vi', { numeric: true }));
  return {
    fileName: suggestedZipFileName(rootName),
    entries,
    totalBytes: entries.reduce((sum, e) => sum + e.size, 0),
  };
}

export type ZipSinkMode = 'native' | 'memory' | 'too_large';

/** Ghi thẳng ra đĩa nếu có hộp "Lưu thành"; không có thì gom vào bộ nhớ, quá giới hạn thì từ chối. */
export function chooseSinkMode(hasNativePicker: boolean, totalBytes: number): ZipSinkMode {
  if (hasNativePicker) return 'native';
  return totalBytes > MAX_BUFFERED_ZIP_BYTES ? 'too_large' : 'memory';
}
