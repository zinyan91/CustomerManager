import type { DispatchDocument } from '../types/dispatch';
import type { StorageProviderId } from '../types/storageRepo';
import { joinArchivePath } from './archivePath';
import { uniqueFileName } from './officialDoc/docPaths';
import {
  FolderZipError, MAX_ZIP_ENTRIES, sanitizeZipName, suggestedZipFileName, type FolderZipPlan,
} from './dispatch/folderZipPlan';

/** Tệp dán phải qua bộ nhớ trình duyệt (tải về rồi tải lên lại) nên có giới hạn. */
export const MAX_PASTE_BYTES = 200 * 1024 * 1024;
export const MAX_PASTE_FILES = 500;

export interface ClipTop {
  kind: 'file' | 'folder';
  /** Đường dẫn đầy đủ trong repo nguồn. */
  path: string;
  name: string;
}

export interface ClipFile {
  /** Đường dẫn đầy đủ trong repo nguồn. */
  path: string;
  size: number;
  modifiedAt: string;
  /** Vị trí tương đối của tệp khi dán: bắt đầu bằng tên mục được chọn. */
  rel: string;
  /** Tệp Google Drive: mã tệp và kiểu gốc (tệp Google Docs/Sheets/Slides phải xuất). */
  fileId?: string;
  nativeMimeType?: string;
}

/** Những mục đã sao chép, đã trải thành danh sách tệp để vẫn dán được khi đổi sang kho khác. */
export interface StorageClip {
  repoId: string;
  /** Nơi lưu tệp nguồn, quyết định cách tải về khi dán. */
  provider: StorageProviderId;
  tops: ClipTop[];
  files: ClipFile[];
}

export class ClipboardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClipboardError';
  }
}

export const topKey = (top: Pick<ClipTop, 'kind' | 'path'>) => `${top.kind}:${top.path}`;

const nameOf = (path: string) => path.split('/').pop() ?? path;

type DocLike = Pick<DispatchDocument, 'filePath' | 'fileSize' | 'updatedAt'> & Partial<Pick<DispatchDocument, 'fileId' | 'nativeMimeType'>>;

/** Trải các mục đã chọn thành danh sách tệp. Mục không có tệp nào (thư mục trống) bị bỏ qua; không còn tệp nào thì báo lỗi. */
export function buildClip(repoId: string, docs: readonly DocLike[], tops: readonly ClipTop[], provider: StorageProviderId = 'huggingface'): StorageClip {
  const files: ClipFile[] = [];
  const kept: ClipTop[] = [];
  // Hai mục cùng tên (ở hai thư mục khác nhau) phải có tên khác nhau ngay từ đây, kẻo dán ra đè lên nhau
  const usedNames = new Set<string>();
  for (const original of tops) {
    const top = { ...original, name: uniqueFileName(original.name, usedNames) };
    usedNames.add(top.name);
    const before = files.length;
    for (const doc of docs) {
      const path = joinArchivePath(doc.filePath);
      if (!path) continue;
      const rest = top.kind === 'file' ? (path === top.path ? '' : null) : path.startsWith(`${top.path}/`) ? path.slice(top.path.length + 1) : null;
      if (rest === null) continue;
      if (!Number.isSafeInteger(doc.fileSize) || doc.fileSize < 0) {
        throw new ClipboardError(`Kích thước tệp "${nameOf(path)}" không hợp lệ.`);
      }
      files.push({
        path,
        size: doc.fileSize,
        modifiedAt: doc.updatedAt || '',
        rel: top.kind === 'file' ? top.name : `${top.name}/${rest}`,
        ...(doc.fileId ? { fileId: doc.fileId, nativeMimeType: doc.nativeMimeType ?? '' } : {}),
      });
    }
    if (files.length > before) kept.push(top);
    else usedNames.delete(top.name);
  }
  if (files.length === 0) throw new ClipboardError('Mục đã chọn không có tệp nào để sao chép.');
  return { repoId, provider, tops: kept, files };
}

export interface PasteFile {
  sourcePath: string;
  fileId?: string;
  nativeMimeType?: string;
  /** Đường dẫn tương đối dưới thư mục đích, đã đổi tên nếu trùng. */
  relativePath: string;
  size: number;
}

export interface PastePlan {
  files: PasteFile[];
  totalBytes: number;
  /** Tên cấp đầu của từng mục sau khi dán (đã đổi tên nếu trùng). */
  names: string[];
  /** Số mục phải đổi tên vì trùng tên có sẵn. */
  renamed: number;
}

/**
 * Lập kế hoạch dán vào `destFolder` của `destRepoId`. Tên mục trùng với mục có sẵn ở thư mục đích thì thêm hậu tố
 * (a.pdf thành a-2.pdf), không ghi đè. Không dán thư mục vào chính nó hay thư mục con của nó.
 * `serverSide`: Google tự sao chép giữa các kho Drive, tệp không đi qua trình duyệt nên không áp giới hạn dung lượng và số tệp.
 */
export function planPaste(
  clip: StorageClip,
  destRepoId: string,
  destFolder: string,
  destDocs: readonly Pick<DispatchDocument, 'filePath'>[],
  { serverSide = false }: { serverSide?: boolean } = {},
): PastePlan {
  const dest = joinArchivePath(destFolder);

  if (clip.repoId === destRepoId) {
    for (const top of clip.tops) {
      if (top.kind === 'folder' && (dest === top.path || dest.startsWith(`${top.path}/`))) {
        throw new ClipboardError(`Không thể dán thư mục "${top.name}" vào chính nó.`);
      }
    }
  }

  const prefix = dest ? `${dest}/` : '';
  const taken = new Set<string>();
  for (const doc of destDocs) {
    const path = joinArchivePath(doc.filePath);
    if (path.startsWith(prefix)) taken.add(path.slice(prefix.length).split('/')[0]);
  }

  const renames = new Map<string, string>();
  for (const top of clip.tops) {
    const next = uniqueFileName(top.name, taken);
    taken.add(next);
    renames.set(top.name, next);
  }

  const files = clip.files.map((f) => {
    const [first, ...rest] = f.rel.split('/');
    return {
      sourcePath: f.path,
      relativePath: [renames.get(first) ?? first, ...rest].join('/'),
      size: f.size,
      ...(f.fileId ? { fileId: f.fileId, nativeMimeType: f.nativeMimeType ?? '' } : {}),
    };
  });
  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);

  if (!serverSide && files.length > MAX_PASTE_FILES) {
    throw new ClipboardError(`Mỗi lần chỉ dán được tối đa ${MAX_PASTE_FILES} tệp. Hãy chia nhỏ.`);
  }
  if (!serverSide && totalBytes > MAX_PASTE_BYTES) {
    throw new ClipboardError(`Mỗi lần chỉ dán được tối đa ${Math.round(MAX_PASTE_BYTES / 1024 / 1024)} MB. Hãy chia nhỏ hoặc tải về rồi tải lên.`);
  }

  const names = clip.tops.map((t) => renames.get(t.name) ?? t.name);
  return { files, totalBytes, names, renamed: clip.tops.filter((t) => renames.get(t.name) !== t.name).length };
}

/** Nén nhiều mục đã chọn thành một ZIP, giữ cấu trúc thư mục. `rootLabel` là tên thư mục gốc trong ZIP. */
export function planClipZip(clip: StorageClip, rootLabel: string): FolderZipPlan {
  const root = sanitizeZipName(rootLabel);
  if (clip.files.length > MAX_ZIP_ENTRIES) {
    throw new FolderZipError(`Mỗi lần chỉ nén được tối đa ${MAX_ZIP_ENTRIES} tệp. Hãy chọn ít mục hơn.`);
  }
  const entries = clip.files
    .map((f) => ({
      filePath: f.path,
      zipPath: `${root}/${f.rel}`,
      size: f.size,
      modifiedAt: f.modifiedAt,
      ...(f.fileId ? { fileId: f.fileId, nativeMimeType: f.nativeMimeType ?? '' } : {}),
    }))
    .sort((a, b) => a.zipPath.localeCompare(b.zipPath, 'vi', { numeric: true }));
  return { fileName: suggestedZipFileName(root), entries, totalBytes: entries.reduce((sum, e) => sum + e.size, 0) };
}

export function describeClip(clip: StorageClip): string {
  return clip.tops.length === 1 ? clip.tops[0].name : `${clip.tops.length} mục`;
}
