import type { DispatchDocument } from '../../types/dispatch';
import { joinArchivePath } from '../archivePath';

export interface FolderEntry {
  name: string;
  /** Đường dẫn đầy đủ trong repo. */
  path: string;
  /** Số tệp ở mọi cấp bên dưới. */
  fileCount: number;
  totalBytes: number;
}

export interface FolderListing {
  folders: FolderEntry[];
  files: DispatchDocument[];
}

/** Đường dẫn tương đối so với thư mục gốc `base`; '' nếu chính là gốc; null nếu nằm ngoài gốc. */
export function stripBase(path: string, base: string): string | null {
  const p = joinArchivePath(path);
  const b = joinArchivePath(base);
  if (!b) return p;
  if (p === b) return '';
  return p.startsWith(b + '/') ? p.slice(b.length + 1) : null;
}

function dirOf(doc: DispatchDocument): string {
  if (doc.folderPath !== undefined && doc.folderPath !== '') return joinArchivePath(doc.folderPath);
  const fp = joinArchivePath(doc.filePath);
  const i = fp.lastIndexOf('/');
  return i === -1 ? '' : fp.slice(0, i);
}

const byName = (a: string, b: string) => a.localeCompare(b, 'vi', { numeric: true });

/**
 * Nội dung một thư mục kiểu trình quản lý tệp: thư mục con hiện thành thư mục,
 * `files` chỉ gồm tệp nằm trực tiếp trong thư mục này.
 * `emptyFolders` là các thư mục có thật nhưng chưa có tệp (HF trả về hoặc mới tạo).
 */
export function browseFolder(docs: DispatchDocument[], emptyFolders: string[], current: string): FolderListing {
  const cur = joinArchivePath(current);
  const prefix = cur ? cur + '/' : '';
  const files: DispatchDocument[] = [];
  const folderMap = new Map<string, FolderEntry>();

  const ensure = (name: string): FolderEntry => {
    let entry = folderMap.get(name);
    if (!entry) {
      entry = { name, path: joinArchivePath(cur, name), fileCount: 0, totalBytes: 0 };
      folderMap.set(name, entry);
    }
    return entry;
  };

  for (const doc of docs) {
    const dir = dirOf(doc);
    if (dir === cur) {
      files.push(doc);
    } else if (dir.startsWith(prefix)) {
      const entry = ensure(dir.slice(prefix.length).split('/')[0]);
      entry.fileCount += 1;
      entry.totalBytes += doc.fileSize || 0;
    }
  }

  for (const raw of emptyFolders) {
    const p = joinArchivePath(raw);
    if (p !== cur && p.startsWith(prefix)) ensure(p.slice(prefix.length).split('/')[0]);
  }

  return {
    folders: [...folderMap.values()].sort((a, b) => byName(a.name, b.name)),
    files: files.sort((a, b) => byName(a.fileName, b.fileName)),
  };
}
