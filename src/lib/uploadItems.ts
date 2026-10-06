/** Một tệp chờ upload kèm đường dẫn tương đối (gồm cả tên tệp) trong thư mục đích. */
export interface UploadItem {
  file: File;
  relativePath: string;
}

export const MAX_FILES_PER_COMMIT = 50;
export const MAX_BYTES_PER_COMMIT = 300 * 1024 * 1024;

const IGNORED_NAMES = new Set(['.DS_Store', 'Thumbs.db', 'desktop.ini']);

/** Chuẩn hóa đường dẫn: gạch chéo xuôi, bỏ đoạn rỗng, "." và ".." (chặn thoát khỏi thư mục đích). */
export function normalizeRelativePath(path: string): string {
  return path
    .replace(/\\/g, '/')
    .split('/')
    .map((s) => s.trim())
    .filter((s) => s !== '' && s !== '.' && s !== '..')
    .join('/');
}

function isIgnored(relativePath: string): boolean {
  const name = relativePath.split('/').pop() ?? '';
  return IGNORED_NAMES.has(name) || relativePath.split('/').includes('.git');
}

function toItem(file: File, relativePath: string): UploadItem | null {
  const rel = normalizeRelativePath(relativePath || file.name);
  if (!rel || isIgnored(rel)) return null;
  return { file, relativePath: rel };
}

/** Từ ô chọn file hoặc chọn folder (webkitdirectory giữ cấu trúc ở webkitRelativePath). */
export function itemsFromFileList(files: FileList | File[]): UploadItem[] {
  const out: UploadItem[] = [];
  for (const file of Array.from(files)) {
    const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
    const item = toItem(file, rel);
    if (item) out.push(item);
  }
  return out;
}

// Khai báo tối thiểu cho File System Access API (kéo thả folder)
interface FsEntry {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
}
interface FsFileEntry extends FsEntry {
  file: (ok: (f: File) => void, fail: (e: unknown) => void) => void;
}
interface FsDirEntry extends FsEntry {
  createReader: () => { readEntries: (ok: (e: FsEntry[]) => void, fail: (e: unknown) => void) => void };
}

async function readAllEntries(dir: FsDirEntry): Promise<FsEntry[]> {
  const reader = dir.createReader();
  const all: FsEntry[] = [];
  // readEntries trả từng đợt (Chrome tối đa 100); lặp tới khi rỗng
  for (;;) {
    const batch = await new Promise<FsEntry[]>((ok, fail) => reader.readEntries(ok, fail));
    if (batch.length === 0) break;
    all.push(...batch);
  }
  return all;
}

async function walkEntry(entry: FsEntry, prefix: string, out: UploadItem[]): Promise<void> {
  if (entry.isFile) {
    const file = await new Promise<File>((ok, fail) => (entry as FsFileEntry).file(ok, fail));
    const item = toItem(file, `${prefix}${entry.name}`);
    if (item) out.push(item);
    return;
  }
  if (entry.isDirectory) {
    const children = await readAllEntries(entry as FsDirEntry);
    for (const child of children) {
      await walkEntry(child, `${prefix}${entry.name}/`, out);
    }
  }
}

/** Từ sự kiện kéo thả: hỗ trợ cả tệp rời lẫn folder (duyệt đệ quy). */
export async function itemsFromDataTransfer(dt: DataTransfer): Promise<UploadItem[]> {
  const out: UploadItem[] = [];
  const entries: FsEntry[] = [];
  const looseFiles: File[] = [];

  for (const item of Array.from(dt.items ?? [])) {
    if (item.kind !== 'file') continue;
    const entry = (item as DataTransferItem & { webkitGetAsEntry?: () => FsEntry | null }).webkitGetAsEntry?.();
    if (entry) entries.push(entry);
    else {
      const f = item.getAsFile();
      if (f) looseFiles.push(f);
    }
  }

  // webkitGetAsEntry chỉ hợp lệ trong lúc xử lý sự kiện nên đã gom hết ở trên rồi mới duyệt
  for (const entry of entries) await walkEntry(entry, '', out);
  for (const f of looseFiles) {
    const item = toItem(f, f.name);
    if (item) out.push(item);
  }

  // Trình duyệt không hỗ trợ entry API: dùng danh sách files phẳng
  if (out.length === 0 && entries.length === 0 && looseFiles.length === 0) {
    return itemsFromFileList(dt.files ?? []);
  }
  return out;
}

/** Chia thành từng commit theo số tệp và tổng dung lượng; một tệp lớn hơn giới hạn vẫn đứng riêng một lô. */
export function batchUploadItems(
  items: UploadItem[],
  maxFiles: number = MAX_FILES_PER_COMMIT,
  maxBytes: number = MAX_BYTES_PER_COMMIT
): UploadItem[][] {
  const batches: UploadItem[][] = [];
  let current: UploadItem[] = [];
  let bytes = 0;

  for (const item of items) {
    const size = item.file.size;
    const full = current.length >= maxFiles || (current.length > 0 && bytes + size > maxBytes);
    if (full) {
      batches.push(current);
      current = [];
      bytes = 0;
    }
    current.push(item);
    bytes += size;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

/** Tên thư mục gốc (đoạn đầu) của các tệp, để báo "đã tải folder X". */
export function topLevelNames(items: UploadItem[]): string[] {
  return Array.from(new Set(items.map((i) => i.relativePath.split('/')[0])));
}
