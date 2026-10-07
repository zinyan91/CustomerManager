import type { PasteFile } from '../storageClipboard';
import { joinArchivePath } from '../archivePath';
import { copyDriveFile, createDriveFolder, ensureDriveFolderPath, moveDriveFile, newFolderPathCache, renameDriveFile, trashDriveFile } from './driveClient';
import { exportTargetOf } from './driveExport';
import type { DriveContext, DriveEntry } from './driveTypes';

export const MAX_ENTRY_NAME_LENGTH = 255;
const COPY_CONCURRENCY = 3;

const lower = (path: string) => path.replace(/^\/+|\/+$/g, '').toLowerCase();
export const dirOf = (path: string) => (path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '');
export const baseOf = (path: string) => path.slice(path.lastIndexOf('/') + 1);

/** Tra mục theo đường dẫn (không phân biệt hoa thường, như cây kho). */
export type EntryIndex = Map<string, DriveEntry>;

/** Mã của mọi thư mục đang có (đường dẫn → mã), để tải lên hay sao chép dùng lại thay vì tìm trên Google. */
export function folderIdMap(entries: readonly DriveEntry[]): Map<string, string> {
  return new Map(entries.filter((e) => e.isFolder).map((e) => [e.path, e.id]));
}

export function indexEntries(entries: readonly DriveEntry[]): EntryIndex {
  return new Map(entries.map((e) => [lower(e.path), e]));
}

/** Lỗi nghiệp vụ nhìn thấy được (tên sai, trùng tên, di chuyển vào chính nó...): thông điệp đã là tiếng Việt cho người dùng. */
export class DriveOpError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DriveOpError';
  }
}

/** Tên tệp/thư mục hợp lệ; trả thông điệp lỗi hoặc null. */
export function validateEntryName(name: string): string | null {
  const t = name.trim();
  if (!t) return 'Nhập tên.';
  if (/[\\/]/.test(t)) return 'Tên không được chứa dấu / hoặc \\.';
  if (t === '.' || t === '..') return 'Tên không hợp lệ.';
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(t)) return 'Tên chứa ký tự không hợp lệ.';
  if (t.length > MAX_ENTRY_NAME_LENGTH) return `Tên quá dài (tối đa ${MAX_ENTRY_NAME_LENGTH} ký tự).`;
  return null;
}

/** ID thư mục tại đường dẫn; '' là thư mục gốc của kho. null nếu không có hoặc không phải thư mục. */
export function folderIdAt(index: EntryIndex, rootId: string, path: string): string | null {
  const key = lower(path);
  if (!key) return rootId;
  const e = index.get(key);
  return e?.isFolder ? e.id : null;
}

function requireEntry(index: EntryIndex, path: string): DriveEntry {
  const e = index.get(lower(path));
  if (!e) throw new DriveOpError(`Không tìm thấy "${baseOf(path)}". Hãy làm mới danh sách rồi thử lại.`);
  return e;
}

function requireFolderId(index: EntryIndex, rootId: string, path: string): string {
  const id = folderIdAt(index, rootId, path);
  if (!id) throw new DriveOpError(`Không tìm thấy thư mục "${path || 'Gốc'}". Hãy làm mới danh sách rồi thử lại.`);
  return id;
}

const joinPath = (dir: string, name: string) => (dir ? `${dir}/${name}` : name);

/** Tên Drive cần ghi khi người dùng đổi tên mục hiển thị: tệp Google Docs/Sheets/Slides được hiện kèm đuôi xuất, không ghi đuôi đó vào tên thật. */
export function driveNameFor(entry: Pick<DriveEntry, 'nativeMimeType'>, displayName: string): string {
  const name = displayName.trim();
  const ext = entry.nativeMimeType ? exportTargetOf(entry.nativeMimeType)?.extension : undefined;
  return ext && name.toLowerCase().endsWith(ext) ? name.slice(0, -ext.length) : name;
}

export async function createFolderAt(ctx: DriveContext, index: EntryIndex, rootId: string, parentPath: string, name: string) {
  const invalid = validateEntryName(name);
  if (invalid) throw new DriveOpError(invalid);
  const clean = name.trim();
  const parentId = requireFolderId(index, rootId, parentPath);
  if (index.has(lower(joinPath(parentPath, clean)))) throw new DriveOpError(`Đã có mục tên "${clean}" ở thư mục này.`);
  return createDriveFolder(ctx, parentId, clean);
}

/** Đổi tên một tệp hay thư mục. Trùng tên với mục khác cùng thư mục thì từ chối. Trả false khi tên không đổi. */
export async function renameAt(ctx: DriveContext, index: EntryIndex, path: string, newName: string): Promise<boolean> {
  const invalid = validateEntryName(newName);
  if (invalid) throw new DriveOpError(invalid);
  const entry = requireEntry(index, path);
  const clean = newName.trim();
  if (clean === entry.name) return false;
  const clash = index.get(lower(joinPath(dirOf(entry.path), clean)));
  if (clash && clash.id !== entry.id) throw new DriveOpError(`Đã có mục tên "${clean}" ở thư mục này.`);
  await renameDriveFile(ctx, entry.id, driveNameFor(entry, clean));
  return true;
}

/**
 * Di chuyển các mục vào thư mục đích. Kiểm hết trước khi di chuyển để lỗi không để lại việc làm dở: không đưa thư mục vào
 * chính nó hay thư mục con của nó, không đè lên mục cùng tên ở đích. Mục đã nằm sẵn ở đích thì bỏ qua. Trả số mục đã chuyển.
 */
export async function moveInto(ctx: DriveContext, index: EntryIndex, rootId: string, paths: readonly string[], destPath: string): Promise<number> {
  const destId = requireFolderId(index, rootId, destPath);
  const dest = lower(destPath);
  const todo: Array<{ entry: DriveEntry; fromId: string }> = [];
  const names = new Set<string>();

  for (const path of paths) {
    const entry = requireEntry(index, path);
    const from = dirOf(entry.path);
    if (lower(from) === dest) continue;
    const self = lower(entry.path);
    if (entry.isFolder && (dest === self || dest.startsWith(`${self}/`))) {
      throw new DriveOpError(`Không thể di chuyển thư mục "${entry.name}" vào chính nó hay thư mục con của nó.`);
    }
    const target = lower(joinPath(destPath, entry.name));
    if (index.has(target) || names.has(target)) throw new DriveOpError(`Thư mục đích đã có mục tên "${entry.name}".`);
    names.add(target);
    todo.push({ entry, fromId: requireFolderId(index, rootId, from) });
  }

  for (const { entry, fromId } of todo) await moveDriveFile(ctx, entry.id, fromId, destId);
  return todo.length;
}

/** Mục nằm trong thư mục khác cũng được chọn thì bỏ, vì đưa thư mục vào thùng rác đã kéo theo mọi thứ bên trong. */
export function topMostPaths(paths: readonly string[]): string[] {
  const keys = paths.map(lower);
  return paths.filter((_, i) => !keys.some((other, j) => j !== i && keys[i].startsWith(`${other}/`)));
}

/** Đưa các mục vào thùng rác của Shared Drive (khôi phục được). Trả số mục đã xóa. */
export async function trashPaths(ctx: DriveContext, index: EntryIndex, paths: readonly string[]): Promise<number> {
  const entries = topMostPaths(paths).map((p) => requireEntry(index, p));
  for (const e of entries) await trashDriveFile(ctx, e.id);
  return entries.length;
}

export interface CopyResult {
  copied: string[];
  failed: Array<{ path: string; error: string }>;
}

/**
 * Sao chép tệp Drive vào thư mục đích ngay trên máy chủ Google (không tải về trình duyệt), giữ cấu trúc thư mục con.
 * `files` là kế hoạch dán đã đổi tên tránh trùng. Mỗi tệp lỗi được ghi lại, các tệp khác vẫn chạy tiếp.
 */
export async function copyFilesInto(
  ctx: DriveContext,
  rootId: string,
  destFolder: string,
  files: readonly PasteFile[],
  describe: (err: unknown, what: string) => string,
  onProgress?: (done: number, total: number) => void,
  knownFolders?: ReadonlyMap<string, string>,
): Promise<CopyResult> {
  const result: CopyResult = { copied: [], failed: [] };
  const folderCache = newFolderPathCache(knownFolders);
  const queue = [...files];
  let done = 0;
  onProgress?.(0, files.length);

  const worker = async () => {
    for (let f = queue.shift(); f; f = queue.shift()) {
      const target = joinArchivePath(destFolder, f.relativePath);
      try {
        if (!f.fileId) throw new DriveOpError(`Tệp "${baseOf(f.sourcePath)}" thiếu mã tệp Google Drive.`);
        const parentId = await ensureDriveFolderPath(ctx, rootId, dirOf(target), folderCache);
        await copyDriveFile(ctx, f.fileId, parentId, baseOf(target));
        result.copied.push(target);
      } catch (err) {
        result.failed.push({ path: target, error: err instanceof DriveOpError ? err.message : describe(err, `Sao chép "${baseOf(f.sourcePath)}"`) });
      }
      onProgress?.(++done, files.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(COPY_CONCURRENCY, files.length) }, worker));
  return result;
}
