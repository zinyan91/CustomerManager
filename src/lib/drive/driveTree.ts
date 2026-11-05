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

const dirOfPath = (path: string) => (path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '');
const baseOfPath = (path: string) => path.slice(path.lastIndexOf('/') + 1);
const joinRelPath = (dir: string, name: string) => (dir ? `${dir}/${name}` : name);

/** Sắp lại cây theo thứ tự duyệt chiều rộng và tên tự nhiên từng thư mục, khớp với `buildRepoEntries`. */
export function sortRepoEntries(entries: readonly DriveEntry[]): DriveEntry[] {
  const byDir = new Map<string, DriveEntry[]>();
  for (const e of entries) {
    const dir = dirOfPath(e.path).toLowerCase();
    const list = byDir.get(dir);
    if (list) list.push(e);
    else byDir.set(dir, [e]);
  }
  const out: DriveEntry[] = [];
  const queue = [''];
  const seen = new Set<string>(['']);
  for (let head = 0; head < queue.length; head++) {
    const dir = queue[head];
    const kids = [...(byDir.get(dir) ?? [])].sort(
      (a, b) => compareNames(a.name, b.name) || a.id.localeCompare(b.id),
    );
    for (const item of kids) {
      out.push(item);
      if (item.isFolder) {
        const key = item.path.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          queue.push(key);
        }
      }
    }
  }
  return out;
}

/** Chuyển một `DriveFile` mới tạo/tải lên thành `DriveEntry` tại đường dẫn `path`. */
export function driveFileToEntry(file: DriveFile, path: string): DriveEntry {
  const isFolder = file.mimeType === DRIVE_FOLDER_MIME;
  const target = exportTargetOf(file.mimeType);
  return {
    id: file.id,
    name: baseOfPath(path),
    path,
    isFolder,
    size: file.size,
    modifiedTime: file.modifiedTime,
    mimeType: target ? target.mimeType : file.mimeType,
    nativeMimeType: target ? file.mimeType : '',
  };
}

/** Gộp hoặc cập nhật các `DriveEntry` mới vào cây hiện tại (trùng ID hoặc đường dẫn thì thay thế), sắp lại đúng thứ tự. */
export function upsertRepoEntries(entries: readonly DriveEntry[], added: readonly DriveEntry[]): DriveEntry[] {
  if (added.length === 0) return [...entries];
  const addedIds = new Set(added.map((a) => a.id));
  const addedPaths = new Set(added.map((a) => a.path.toLowerCase()));
  const kept = entries.filter((e) => !addedIds.has(e.id) && !addedPaths.has(e.path.toLowerCase()));
  return sortRepoEntries([...kept, ...added]);
}

/** Cập nhật cây sau khi đổi tên một mục tại `path` thành `newName` (nếu là thư mục thì đổi luôn tiền tố của mọi mục con). */
export function renameRepoEntry(entries: readonly DriveEntry[], path: string, newName: string): DriveEntry[] {
  const clean = newName.trim();
  const targetKey = path.replace(/^\/+|\/+$/g, '').toLowerCase();
  const target = entries.find((e) => e.path.toLowerCase() === targetKey);
  if (!target || target.name === clean) return [...entries];
  const newPath = joinRelPath(dirOfPath(target.path), clean);
  const prefix = `${targetKey}/`;
  const updated = entries.map((e) => {
    const low = e.path.toLowerCase();
    if (low === targetKey) return { ...e, name: clean, path: newPath };
    if (target.isFolder && low.startsWith(prefix)) {
      return { ...e, path: `${newPath}/${e.path.slice(target.path.length + 1)}` };
    }
    return e;
  });
  return sortRepoEntries(updated);
}

/** Cập nhật cây sau khi di chuyển các mục tại `paths` sang thư mục `destPath` (nếu là thư mục thì mọi mục con đi theo). */
export function moveRepoEntries(entries: readonly DriveEntry[], paths: readonly string[], destPath: string): DriveEntry[] {
  const dest = destPath.replace(/^\/+|\/+$/g, '');
  let current = [...entries];
  for (const rawPath of paths) {
    const key = rawPath.replace(/^\/+|\/+$/g, '').toLowerCase();
    const target = current.find((e) => e.path.toLowerCase() === key);
    if (!target) continue;
    const newPath = joinRelPath(dest, target.name);
    if (newPath.toLowerCase() === key) continue;
    const prefix = `${key}/`;
    current = current.map((e) => {
      const low = e.path.toLowerCase();
      if (low === key) return { ...e, path: newPath };
      if (target.isFolder && low.startsWith(prefix)) {
        return { ...e, path: `${newPath}/${e.path.slice(target.path.length + 1)}` };
      }
      return e;
    });
  }
  return sortRepoEntries(current);
}

/** Cập nhật cây sau khi xóa các mục tại `paths` vào thùng rác (thư mục bị xóa thì mọi mục bên trong cũng bị gỡ). */
export function removeRepoEntries(entries: readonly DriveEntry[], paths: readonly string[]): DriveEntry[] {
  const keys = paths.map((p) => p.replace(/^\/+|\/+$/g, '').toLowerCase()).filter(Boolean);
  if (keys.length === 0) return [...entries];
  return entries.filter((e) => {
    const low = e.path.toLowerCase();
    return !keys.some((k) => low === k || low.startsWith(`${k}/`));
  });
}
