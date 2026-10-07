import type { DispatchDocument } from '../../types/dispatch';
import { guessMime } from '../dispatch/mergeArchive';
import { downloadDriveBlob } from './driveClient';
import { describeDriveError } from './driveErrors';
import type { DriveContext, DriveEntry } from './driveTypes';

const folderOf = (path: string) => (path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '');

/** Tên tệp bỏ đuôi, dùng làm "số hiệu" tạm của tệp trong Kho (cùng cách với tệp Hugging Face chưa có metadata). */
const stem = (name: string) => name.replace(/\.[^/.]+$/, '');

/** Tệp (không phải thư mục) của một kho Drive thành tài liệu hiển thị trong Kho lưu trữ. */
export function entriesToDocuments(entries: readonly DriveEntry[], repoId: string, now: string): DispatchDocument[] {
  return entries
    .filter((e) => !e.isFolder)
    .map((e) => ({
      id: `drive_${e.id}`,
      documentNumber: stem(e.name),
      title: e.name,
      documentType: 'khac' as const,
      issuer: 'Kho lưu trữ',
      documentDate: '',
      receivedDate: '',
      customerId: null,
      fileName: e.name,
      fileSize: e.size,
      fileType: e.mimeType,
      fileUrl: '',
      filePath: e.path,
      folderPath: folderOf(e.path),
      repoId,
      storageProvider: 'drive' as const,
      fileId: e.id,
      nativeMimeType: e.nativeMimeType || undefined,
      createdAt: e.modifiedTime || now,
      updatedAt: e.modifiedTime || now,
    }));
}

/**
 * Drive trả Content-Type theo tệp gốc, nhưng tệp tải lên bằng tên lạ có thể là octet-stream làm PDF bị tải xuống thay vì hiện trong tab.
 * Gắn lại kiểu theo đuôi tên khi Drive không cho kiểu cụ thể.
 */
export function withDocumentType(blob: Blob, fileName: string): Blob {
  if (blob.type && blob.type !== 'application/octet-stream') return blob;
  const guessed = guessMime(fileName);
  return guessed === 'application/octet-stream' ? blob : new Blob([blob], { type: guessed });
}

/** Tải tệp Drive của một tài liệu trong Kho. Ném lỗi tiếng Việt khi hỏng. */
export async function fetchDriveDocBlob(ctx: DriveContext, doc: Pick<DispatchDocument, 'fileId' | 'fileName' | 'nativeMimeType'>): Promise<Blob> {
  if (!doc.fileId) throw new Error(`Tệp "${doc.fileName}" thiếu mã tệp Google Drive.`);
  try {
    return withDocumentType(await downloadDriveBlob(ctx, doc.fileId, doc.nativeMimeType ?? ''), doc.fileName);
  } catch (err) {
    throw new Error(describeDriveError(err, `Tải "${doc.fileName}"`));
  }
}

/** Hàm lấy tệp nguồn Drive cho kế hoạch dán (sao chép sang kho Hugging Face). */
export function driveBlobFetcher(ctx: DriveContext): (file: { sourcePath: string; fileId?: string; nativeMimeType?: string }) => Promise<Blob> {
  return (file) =>
    fetchDriveDocBlob(ctx, { fileId: file.fileId, fileName: file.sourcePath.split('/').pop() ?? file.sourcePath, nativeMimeType: file.nativeMimeType });
}
