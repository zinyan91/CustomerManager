import { exportTargetOf, isListable } from './driveExport';
import { DRIVE_FOLDER_MIME, type DriveEntry, type DriveFile } from './driveTypes';

const compareNames = (a: string, b: string) => a.localeCompare(b, 'vi', { numeric: true, sensitivity: 'base' });

/** Thêm hậu tố trước đuôi: a.pdf thành a (2).pdf. Thư mục không có đuôi. */
function withSuffix(name: string, n: number, isFolder: boolean): string {
  const dot = isFolder ? -1 : name.lastIndexOf('.');
  return dot > 0 ? `${name.slice(0, dot)} (${n})${name.slice(dot)}` : `${name} (${n})`;
}

/** Tên hiển thị: tệp Google Docs/Sheets/Slides thêm đuôi của định dạng xuất ra. */
function displayName(file: DriveFile): string {
  const target = exportTargetOf(file.mimeType);
  if (!target || file.name.toLowerCase().endsWith(target.extension)) return file.name;
  return `${file.name}${target.extension}`;
}

/**
 * Dựng cây của một kho từ danh sách phẳng của cả Shared Drive. Chỉ lấy mục nằm dưới `rootId`.
 * Mục trùng tên trong cùng thư mục (Drive cho phép) được đổi tên hiển thị thêm "(2)", "(3)" theo thứ tự tạo,
 * vì ứng dụng nhận diện mục theo đường dẫn khi chọn và dán. Tên thật trên Drive không đổi.
 * Thứ tự trả về: duyệt theo chiều rộng, mỗi thư mục sắp theo tên.
 */
export function buildRepoEntries(files: readonly DriveFile[], rootId: string): DriveEntry[] {
  const children = new Map<string, DriveFile[]>();
  for (const f of files) {
    if (!isListable(f.mimeType)) continue;
    for (const parent of f.parents) {
      const list = children.get(parent);
      if (list) list.push(f);
      else children.set(parent, [f]);
    }
  }

  const out: DriveEntry[] = [];
  const seen = new Set<string>([rootId]);
  const queue: Array<{ id: string; path: string }> = [{ id: rootId, path: '' }];

  for (let head = 0; head < queue.length; head++) {
    const { id: folderId, path: folderPath } = queue[head];
    const kids = [...(children.get(folderId) ?? [])].sort(
      (a, b) => compareNames(a.name, b.name) || a.createdTime.localeCompare(b.createdTime) || a.id.localeCompare(b.id),
    );
    const taken = new Set<string>();
    for (const file of kids) {
      // Một mục có thể nằm ở nhiều thư mục cha (Drive cũ) hoặc tạo vòng; chỉ lấy lần đầu gặp
      if (seen.has(file.id)) continue;
      seen.add(file.id);

      const isFolder = file.mimeType === DRIVE_FOLDER_MIME;
      const base = displayName(file);
      let name = base;
      for (let n = 2; taken.has(name.toLowerCase()); n++) name = withSuffix(base, n, isFolder);
      taken.add(name.toLowerCase());

      const path = folderPath ? `${folderPath}/${name}` : name;
      const target = exportTargetOf(file.mimeType);
      out.push({
        id: file.id,
        name,
        path,
        isFolder,
        size: file.size,
        modifiedTime: file.modifiedTime,
        mimeType: target ? target.mimeType : file.mimeType,
        nativeMimeType: target ? file.mimeType : '',
      });
      if (isFolder) queue.push({ id: file.id, path });
    }
  }
  return out;
}

export interface RepoListing {
  entries: DriveEntry[];
  /** Đường dẫn mọi thư mục (kể cả thư mục rỗng). */
  folders: string[];
  /** Tệp, không gồm thư mục. */
  files: DriveEntry[];
}

export function listingOf(entries: readonly DriveEntry[]): RepoListing {
  return {
    entries: [...entries],
    folders: entries.filter((e) => e.isFolder).map((e) => e.path),
    files: entries.filter((e) => !e.isFolder),
  };
}

/** Tìm mục theo đường dẫn trong kho (đường dẫn so không phân biệt hoa thường như Drive). */
export function findEntryByPath(entries: readonly DriveEntry[], path: string): DriveEntry | null {
  const wanted = path.replace(/^\/+|\/+$/g, '').toLowerCase();
  return entries.find((e) => e.path.toLowerCase() === wanted) ?? null;
}
