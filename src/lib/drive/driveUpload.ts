import { joinArchivePath } from '../archivePath';
import type { UploadItem } from '../uploadItems';
import type { UploadFailure, UploadProgress, UploadResult } from '../huggingface/hfWrite';
import { ensureDriveFolderPath, newFolderPathCache, uploadDriveFile } from './driveClient';
import { describeDriveError } from './driveErrors';
import { baseOf, dirOf } from './driveOps';
import type { DriveContext } from './driveTypes';

const UPLOAD_CONCURRENCY = 3;

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
): Promise<DriveUploadResult> {
  const planned = planDriveUploads(items, targetFolder, existingPaths);
  const uploaded: string[] = [];
  const created: Array<{ path: string; fileId: string }> = [];
  const failed: UploadFailure[] = [];
  const folderCache = newFolderPathCache(knownFolders);
  const queue = [...planned];

  const report = () =>
    onProgress?.({ totalFiles: planned.length, uploadedFiles: uploaded.length, failedFiles: failed.length, batchIndex: 0, batchCount: 1 });
  report();

  const worker = async () => {
    for (let job = queue.shift(); job; job = queue.shift()) {
      try {
        const parentId = await ensureDriveFolderPath(ctx, rootId, dirOf(job.path), folderCache);
        const file = baseOf(job.path) === job.item.file.name ? job.item.file : new File([job.item.file], baseOf(job.path), { type: job.item.file.type });
        const made = await uploadDriveFile(ctx, parentId, file);
        uploaded.push(job.path);
        created.push({ path: job.path, fileId: made.id });
      } catch (err) {
        failed.push({ path: job.path, error: describeDriveError(err, 'Tải lên') });
      }
      report();
    }
  };
  await Promise.all(Array.from({ length: Math.min(UPLOAD_CONCURRENCY, planned.length) }, worker));
  return { uploaded, failed, files: created };
}
