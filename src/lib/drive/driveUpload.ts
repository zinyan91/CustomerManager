import { joinArchivePath } from '../archivePath';
import type { UploadItem } from '../uploadItems';
import type { UploadFailure, UploadProgress, UploadResult } from '../uploadItems';
import { ensureDriveFolderPath, newFolderPathCache, updateDriveFile, uploadDriveFile } from './driveClient';
import { describeDriveError } from './driveErrors';
import { baseOf, dirOf } from './driveOps';
import type { DriveContext } from './driveTypes';

const UPLOAD_CONCURRENCY = 3;

/** Trạng thái của từng tệp trong một đợt tải lên. */
export type UploadFileState = 'wait' | 'run' | 'done' | 'failed' | 'cancelled';

export interface UploadFileEvent {
  path: string;
  size: number;
  state: UploadFileState;
  error?: string;
  /** Số byte đã gửi (khi đang tải). */
  loaded?: number;
  /** Tệp gốc, để thử lại khi lỗi hoặc đã hủy (có ở sự kiện đầu tiên của tệp). */
  item?: UploadItem;
}

export interface DriveUploadOptions {
  /** Đường dẫn đích viết thường mà tệp mới ghi đè lên tệp cũ, kèm mã tệp cũ. */
  overwrite?: ReadonlyMap<string, string>;
  /** Tín hiệu hủy riêng của từng tệp; tệp đã hủy trước khi bắt đầu thì không tải. */
  signalFor?: (path: string) => AbortSignal | undefined;
}

const isAbort = (err: unknown) => err instanceof Error && err.name === 'AbortError';

export interface PlannedUpload {
  item: UploadItem;
  /** Đường dẫn đầy đủ trong kho sau khi đã đổi tên tránh trùng. */
  path: string;
}

const lower = (s: string) => s.toLowerCase();

/**
 * Đường dẫn đích của từng tệp: dưới `targetFolder`, giữ cấu trúc thư mục con. Tên trùng với tệp đã có ở đúng thư mục đó
 * (hay trùng giữa các tệp cùng đợt) thì thêm hậu tố (a.pdf thành a-2.pdf). Drive cho phép hai tệp cùng tên nên nếu không đổi
 * tên thì tệp mới nằm cạnh tệp cũ mà không phân biệt được.
 */
export function planDriveUploads(items: readonly UploadItem[], targetFolder: string, existingPaths: readonly string[]): PlannedUpload[] {
  const namesByDir = new Map<string, Set<string>>();
  const take = (path: string) => {
    const dir = lower(dirOf(path));
    const set = namesByDir.get(dir) ?? new Set<string>();
    set.add(lower(baseOf(path)));
    namesByDir.set(dir, set);
  };
  for (const p of existingPaths) take(p);

  return items.map((item) => {
    const wanted = joinArchivePath(targetFolder, item.relativePath);
    const dir = dirOf(wanted);
    const taken = namesByDir.get(lower(dir)) ?? new Set<string>();
    const name = freeName(baseOf(wanted), taken);
    const path = dir ? `${dir}/${name}` : name;
    take(path);
    return { item, path };
  });
}

function freeName(name: string, takenLower: ReadonlySet<string>): string {
  if (!takenLower.has(lower(name))) return name;
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}${ext}`;
    if (!takenLower.has(lower(candidate))) return candidate;
  }
}

/** Kết quả tải lên kèm mã Drive của từng tệp đã lên, để văn bản tham chiếu theo mã. */
export interface DriveUploadResult extends UploadResult {
  files: Array<{ path: string; fileId: string }>;
  /** Tệp người dùng hủy (không tính là lỗi). */
  cancelled: string[];
}

/**
 * Tải nhiều tệp lên Drive dưới `targetFolder` của kho có thư mục gốc `rootId`, giữ cấu trúc thư mục con (tạo thư mục còn thiếu,
 * dùng lại thư mục đã có). Ba tệp chạy song song. Tệp lỗi được ghi lại với thông điệp tiếng Việt, các tệp khác vẫn chạy tiếp.
 */
export async function uploadItemsToDrive(
  ctx: DriveContext,
  rootId: string,
  targetFolder: string,
  items: readonly UploadItem[],
  existingPaths: readonly string[],
  onProgress?: (p: UploadProgress) => void,
  knownFolders?: ReadonlyMap<string, string>,
  onFile?: (event: UploadFileEvent) => void,
  options: DriveUploadOptions = {},
): Promise<DriveUploadResult> {
  const planned = planDriveUploads(items, targetFolder, existingPaths);
  const uploaded: string[] = [];
  const created: Array<{ path: string; fileId: string }> = [];
  const failed: UploadFailure[] = [];
  const cancelled: string[] = [];
  const folderCache = newFolderPathCache(knownFolders);
  const queue = [...planned];

  const report = () =>
    onProgress?.({ totalFiles: planned.length, uploadedFiles: uploaded.length, failedFiles: failed.length + cancelled.length, batchIndex: 0, batchCount: 1 });
  report();
  for (const job of planned) onFile?.({ path: job.path, size: job.item.file.size, state: 'wait', item: job.item });

  const worker = async () => {
    for (let job = queue.shift(); job; job = queue.shift()) {
      const size = job.item.file.size;
      const signal = options.signalFor?.(job.path);
      if (signal?.aborted) {
        cancelled.push(job.path);
        onFile?.({ path: job.path, size, state: 'cancelled' });
        report();
        continue;
      }
      onFile?.({ path: job.path, size, state: 'run', loaded: 0 });
      try {
        const file = baseOf(job.path) === job.item.file.name ? job.item.file : new File([job.item.file], baseOf(job.path), { type: job.item.file.type });
        const progress = (sent: number) => onFile?.({ path: job.path, size, state: 'run', loaded: sent });
        const overwriteId = options.overwrite?.get(lower(job.path));
        let fileId: string;
        if (overwriteId) {
          fileId = (await updateDriveFile(ctx, overwriteId, file, { onProgress: progress, signal })).id;
        } else {
          const parentId = await ensureDriveFolderPath(ctx, rootId, dirOf(job.path), folderCache);
          fileId = (await uploadDriveFile(ctx, parentId, file, { onProgress: progress, signal })).id;
        }
        uploaded.push(job.path);
        created.push({ path: job.path, fileId });
        onFile?.({ path: job.path, size, state: 'done', loaded: size });
      } catch (err) {
        if (isAbort(err) || signal?.aborted) {
          cancelled.push(job.path);
          onFile?.({ path: job.path, size, state: 'cancelled' });
        } else {
          const error = describeDriveError(err, 'Tải lên');
          failed.push({ path: job.path, error });
          onFile?.({ path: job.path, size, state: 'failed', error });
        }
      }
      report();
    }
  };
  await Promise.all(Array.from({ length: Math.min(UPLOAD_CONCURRENCY, planned.length) }, worker));
  return { uploaded, failed, files: created, cancelled };
}
