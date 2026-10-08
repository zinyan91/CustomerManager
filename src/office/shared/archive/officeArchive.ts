import { updateDriveFile } from '../../../lib/drive/driveClient';
import { fetchDriveDocBlob } from '../../../lib/drive/driveDocuments';
import { uploadItemsToDrive } from '../../../lib/drive/driveUpload';
import type { DriveContext } from '../../../lib/drive/driveTypes';
import type { DispatchDocument } from '../../../types/dispatch';

/** Tệp trong Kho lưu trữ mà một tài liệu đang mở gắn với: lưu lại thì ghi đè đúng tệp này. */
export interface DriveLink {
  /** Mã thư mục gốc của kho trong Drive. */
  rootId: string;
  fileId: string;
  /** Đường dẫn trong kho, để hiển thị. */
  path: string;
}

/** Nơi sẽ ghi một tệp mới, do hộp chọn kho tính ra từ cây kho đang nạp. */
export interface ArchiveSaveTarget {
  rootId: string;
  folder: string;
  name: string;
  existingPaths: readonly string[];
  folderIds: ReadonlyMap<string, string>;
}

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const hasExtension = (name: string, extensions: readonly string[]): boolean => {
  const lower = name.toLowerCase();
  return extensions.some((ext) => lower.endsWith(ext));
};

/** Tên tệp gợi ý: tên tài liệu (hoặc tên mặc định) kèm đuôi, không thêm đuôi lần hai. */
export function archiveFileName(title: string, fallback: string, extension: string): string {
  const base = title.trim() || fallback;
  return base.toLowerCase().endsWith(extension) ? base : `${base}${extension}`;
}

/** Ghi tệp mới vào kho. Trùng tên tệp có sẵn thì Drive đặt thêm hậu tố (a-2.xlsx); trả đúng mã và đường dẫn tệp vừa tạo. */
export async function saveNewToArchive(ctx: DriveContext, target: ArchiveSaveTarget, blob: Blob): Promise<DriveLink> {
  const file = new File([blob], target.name, { type: blob.type });
  const result = await uploadItemsToDrive(ctx, target.rootId, target.folder, [{ file, relativePath: target.name }], target.existingPaths, undefined, target.folderIds);
  if (result.failed.length > 0) throw new Error(result.failed[0].error);
  const made = result.files[0];
  if (!made) throw new Error('Không ghi được tệp lên Kho lưu trữ.');
  return { rootId: target.rootId, fileId: made.fileId, path: made.path };
}

/** Ghi đè nội dung tệp đã gắn với tài liệu. */
export async function overwriteInArchive(ctx: DriveContext, link: DriveLink, blob: Blob): Promise<void> {
  await updateDriveFile(ctx, link.fileId, blob);
}

/** Tải một tệp trong kho thành File để mở trong trình soạn. */
export async function openFromArchive(ctx: DriveContext, doc: DispatchDocument): Promise<{ file: File; link: DriveLink }> {
  const blob = await fetchDriveDocBlob(ctx, doc);
  if (!doc.fileId) throw new Error(`Tệp "${doc.fileName}" thiếu mã tệp Google Drive.`);
  return {
    file: new File([blob], doc.fileName, { type: blob.type }),
    link: { rootId: doc.repoId ?? '', fileId: doc.fileId, path: doc.filePath ?? doc.fileName },
  };
}

/** Đọc lại liên kết đã lưu trong nháp; dữ liệu thiếu hay sai kiểu thì coi như chưa gắn. */
export function parseDriveLink(value: unknown): DriveLink | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<DriveLink>;
  if (typeof raw.rootId !== 'string' || typeof raw.fileId !== 'string' || !raw.rootId || !raw.fileId) return null;
  return { rootId: raw.rootId, fileId: raw.fileId, path: typeof raw.path === 'string' ? raw.path : '' };
}
