import { stripBase } from '../dispatch/folderBrowse';
import {
  createDriveFolder, ensureDriveFolderPath, findDriveChildFolder, listDriveFiles, newFolderPathCache, trashDriveFile, uploadDriveFile,
} from './driveClient';
import { describeDriveError } from './driveErrors';
import { baseOf, dirOf } from './driveOps';
import { buildRepoEntries } from './driveTree';
import type { DriveContext } from './driveTypes';

/** Mỗi tệp đi qua bộ nhớ trình duyệt (tải về rồi tải lên), nên tệp quá lớn không chuyển bằng công cụ này. */
export const MAX_MIGRATE_FILE_BYTES = 512 * 1024 * 1024;
const COPY_CONCURRENCY = 3;
/** Tệp giữ chỗ của thư mục trống trên Hugging Face: thư mục được tạo lại trên Drive nên không cần chép tệp này. */
const PLACEHOLDER_NAMES = new Set(['.keep']);

export interface SourceItem {
  type: string;
  path: string;
  size: number;
}

export interface MigrationFile {
  /** Đường dẫn tệp trên Hugging Face (đầy đủ, gồm thư mục gốc cấu hình của repo). */
  from: string;
  /** Đường dẫn trong kho Drive (tính từ thư mục gốc của kho). */
  rel: string;
  size: number;
}

export interface MigrationPlan {
  files: MigrationFile[];
  /** Mọi thư mục của repo (kể cả thư mục trống) để tạo lại trên Drive. */
  folders: string[];
  totalBytes: number;
  /** Tệp giữ chỗ bỏ qua. */
  skipped: string[];
  /** Tệp lớn hơn giới hạn của công cụ: không chép được. */
  oversize: MigrationFile[];
}

/** Lập kế hoạch từ cây Hugging Face của repo. `baseFolder` là thư mục gốc cấu hình của repo; mục ngoài thư mục đó bị bỏ qua. */
export function planMigration(tree: readonly SourceItem[], baseFolder: string): MigrationPlan {
  const files: MigrationFile[] = [];
  const folders = new Set<string>();
  const skipped: string[] = [];
  for (const item of tree) {
    const rel = stripBase(item.path, baseFolder);
    if (!rel) continue;
    if (item.type === 'directory') {
      folders.add(rel);
      continue;
    }
    if (PLACEHOLDER_NAMES.has(baseOf(rel))) {
      skipped.push(rel);
      const dir = dirOf(rel);
      if (dir) folders.add(dir);
      continue;
    }
    files.push({ from: item.path, rel, size: item.size });
  }
  files.sort((a, b) => a.rel.localeCompare(b.rel, 'vi', { numeric: true }));
  return {
    files,
    folders: [...folders].sort(),
    totalBytes: files.reduce((n, f) => n + f.size, 0),
    skipped: skipped.sort(),
    oversize: files.filter((f) => f.size > MAX_MIGRATE_FILE_BYTES),
  };
}

export interface DestinationState {
  /** Thư mục đích đã có sẵn ở gốc Shared Drive (chạy lại sau khi đứt giữa chừng); null nếu chưa có. */
  folderId: string | null;
  /** Tệp đã có ở đích (đường dẫn trong kho → mã và dung lượng). */
  existing: Map<string, { id: string; size: number }>;
}

/** Tìm thư mục đích theo tên repo ở gốc Shared Drive và các tệp đã có trong đó. Không ghi gì. */
export async function inspectDestination(ctx: DriveContext, name: string): Promise<DestinationState> {
  const { driveId } = await ctx.getAccess();
  const found = await findDriveChildFolder(ctx, driveId, name);
  if (!found) return { folderId: null, existing: new Map() };
  const entries = buildRepoEntries(await listDriveFiles(ctx), found.id);
  return { folderId: found.id, existing: new Map(entries.filter((e) => !e.isFolder).map((e) => [e.path, { id: e.id, size: e.size }])) };
}

export interface MigrationProgress {
  done: number;
  total: number;
  bytesDone: number;
  bytesTotal: number;
}

export interface MappedFile {
  from: string;
  path: string;
  fileId: string;
  size: number;
}

export interface CopyOutcome {
  mapped: MappedFile[];
  copied: number;
  /** Đã có sẵn ở đích với đúng dung lượng nên không chép lại. */
  reused: number;
  failed: Array<{ from: string; error: string }>;
  cancelled: boolean;
}

/**
 * Chép các tệp của kế hoạch lên Drive dưới `destRootId`, giữ cấu trúc thư mục. Tệp đã có ở đích với đúng dung lượng thì bỏ qua
 * (chạy lại được sau khi đứt). Mỗi tệp được đối chiếu hai lần: dung lượng tải về với dung lượng nguồn, và dung lượng Drive ghi nhận
 * với dung lượng tải về. Tệp lỗi được ghi lại, các tệp khác vẫn chạy tiếp. Không xóa gì ở nguồn.
 */
export async function copyToDrive(args: {
  ctx: DriveContext;
  destRootId: string;
  plan: MigrationPlan;
  existing: ReadonlyMap<string, { id: string; size: number }>;
  fetchSource: (file: MigrationFile) => Promise<Blob>;
  onProgress?: (p: MigrationProgress) => void;
  signal?: AbortSignal;
}): Promise<CopyOutcome> {
  const { ctx, destRootId, plan, existing, fetchSource, onProgress, signal } = args;
  const out: CopyOutcome = { mapped: [], copied: 0, reused: 0, failed: [], cancelled: false };
  const cache = newFolderPathCache();
  for (const folder of plan.folders) await ensureDriveFolderPath(ctx, destRootId, folder, cache);

  const total = plan.files.length;
  let done = 0;
  let bytesDone = 0;
  const report = () => onProgress?.({ done, total, bytesDone, bytesTotal: plan.totalBytes });
  report();
  const queue = [...plan.files];

  const worker = async () => {
    for (let f = queue.shift(); f; f = queue.shift()) {
      if (signal?.aborted) {
        out.cancelled = true;
        return;
      }
      try {
        const have = existing.get(f.rel);
        if (have && have.size === f.size) {
          out.mapped.push({ from: f.from, path: f.rel, fileId: have.id, size: f.size });
          out.reused++;
        } else {
          if (f.size > MAX_MIGRATE_FILE_BYTES) throw new Error(`Tệp quá lớn để chuyển bằng công cụ này (${Math.round(f.size / 1024 / 1024)} MB).`);
          const blob = await fetchSource(f);
          if (blob.size !== f.size) throw new Error(`Dung lượng tải về (${blob.size} byte) khác dung lượng nguồn (${f.size} byte).`);
          // Bản chép dở của lần trước (sai dung lượng) vào thùng rác, kẻo ở đích có hai tệp cùng tên
          if (have) await trashDriveFile(ctx, have.id);
          const parentId = await ensureDriveFolderPath(ctx, destRootId, dirOf(f.rel), cache);
          const made = await uploadDriveFile(ctx, parentId, new File([blob], baseOf(f.rel), { type: blob.type }));
          if (made.size !== blob.size) throw new Error(`Drive ghi nhận ${made.size} byte, khác ${blob.size} byte đã gửi.`);
          out.mapped.push({ from: f.from, path: f.rel, fileId: made.id, size: f.size });
          out.copied++;
        }
      } catch (err) {
        out.failed.push({ from: f.from, error: describeDriveError(err, `Chép "${baseOf(f.rel)}"`) });
      }
      done++;
      bytesDone += f.size;
      report();
    }
  };
  await Promise.all(Array.from({ length: Math.min(COPY_CONCURRENCY, Math.max(total, 1)) }, worker));
  return out;
}

export type VerifyResult = { ok: true; ids: Map<string, string> } | { ok: false; problems: string[] };

/** Đối chiếu độc lập sau khi chép: đọc lại cây đích và so từng tệp theo đường dẫn và dung lượng. Mã tệp lấy từ chính cây đích. */
export async function verifyCopy(ctx: DriveContext, destRootId: string, expected: ReadonlyArray<{ path: string; size: number }>): Promise<VerifyResult> {
  const entries = buildRepoEntries(await listDriveFiles(ctx), destRootId);
  const byPath = new Map(entries.filter((e) => !e.isFolder).map((e) => [e.path, e]));
  const ids = new Map<string, string>();
  const problems: string[] = [];
  for (const e of expected) {
    const found = byPath.get(e.path);
    if (!found) problems.push(`Thiếu trên Drive: ${e.path}`);
    else if (found.size !== e.size) problems.push(`Lệch dung lượng: ${e.path} (Drive ${found.size}, nguồn ${e.size})`);
    else ids.set(e.path, found.id);
  }
  return problems.length > 0 ? { ok: false, problems } : { ok: true, ids };
}

export class MigrationError extends Error {
  readonly details: string[];
  constructor(message: string, details: string[] = []) {
    super(message);
    this.name = 'MigrationError';
    this.details = details;
  }
}

export interface MigrationRunResult {
  destRootId: string;
  /** Danh sách để gửi cho hàm chuyển trong CSDL. */
  files: Array<{ from: string; path: string; fileId: string }>;
  copied: number;
  reused: number;
}

/**
 * Chạy trọn phần Drive của việc chuyển một repo: dùng hoặc tạo thư mục đích, chép, đối chiếu. Chưa đổi gì trong CSDL.
 * Ném MigrationError (kèm chi tiết) khi có tệp lỗi, bị hủy hoặc đối chiếu lệch; những gì đã chép được giữ lại để chạy lại chép tiếp.
 */
export async function migrateRepoFilesToDrive(args: {
  ctx: DriveContext;
  repoName: string;
  plan: MigrationPlan;
  fetchSource: (file: MigrationFile) => Promise<Blob>;
  onProgress?: (p: MigrationProgress) => void;
  signal?: AbortSignal;
}): Promise<MigrationRunResult> {
  const { ctx, repoName, plan, fetchSource, onProgress, signal } = args;
  if (plan.oversize.length > 0) {
    throw new MigrationError(`Có ${plan.oversize.length} tệp lớn hơn ${MAX_MIGRATE_FILE_BYTES / 1024 / 1024} MB, công cụ không chuyển được.`, plan.oversize.map((f) => f.rel));
  }
  const dest = await inspectDestination(ctx, repoName);
  const destRootId = dest.folderId ?? (await createDriveFolder(ctx, (await ctx.getAccess()).driveId, repoName)).id;

  const outcome = await copyToDrive({ ctx, destRootId, plan, existing: dest.existing, fetchSource, onProgress, signal });
  if (outcome.cancelled) throw new MigrationError('Đã dừng. Các tệp đã chép được giữ lại; chạy lại để chép tiếp.');
  if (outcome.failed.length > 0) {
    throw new MigrationError(
      `${outcome.failed.length} tệp chưa chép được. Chưa đổi gì trong hệ thống; chạy lại để chép tiếp các tệp còn thiếu.`,
      outcome.failed.map((f) => `${f.from}: ${f.error}`),
    );
  }

  const verified = await verifyCopy(ctx, destRootId, outcome.mapped.map((m) => ({ path: m.path, size: m.size })));
  if (!verified.ok) throw new MigrationError('Đối chiếu sau khi chép phát hiện chênh lệch. Chưa đổi gì trong hệ thống.', verified.problems);

  return {
    destRootId,
    files: outcome.mapped.map((m) => ({ from: m.from, path: m.path, fileId: verified.ids.get(m.path) ?? m.fileId })),
    copied: outcome.copied,
    reused: outcome.reused,
  };
}
