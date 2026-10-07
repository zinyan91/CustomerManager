import { DRIVE_FOLDER_MIME, DRIVE_NATIVE_PREFIX } from './driveTypes';

export interface ExportTarget {
  mimeType: string;
  extension: string;
}

const EXPORTS: Record<string, ExportTarget> = {
  'application/vnd.google-apps.document': { mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', extension: '.docx' },
  'application/vnd.google-apps.spreadsheet': { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', extension: '.xlsx' },
  'application/vnd.google-apps.presentation': { mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', extension: '.pptx' },
  'application/vnd.google-apps.drawing': { mimeType: 'application/pdf', extension: '.pdf' },
};

/** Tệp do Google tạo (Docs, Sheets, Slides, Drawings): không tải thẳng được mà phải xuất sang định dạng Office hoặc PDF. */
export const isNativeMime = (mimeType: string): boolean => mimeType.startsWith(DRIVE_NATIVE_PREFIX) && mimeType !== DRIVE_FOLDER_MIME;

/** Đích xuất của tệp Google; null khi loại này không xuất được (biểu mẫu, lối tắt, Apps Script...). */
export function exportTargetOf(mimeType: string): ExportTarget | null {
  return EXPORTS[mimeType] ?? null;
}

/** Mục này có hiện được trong Kho không: thư mục, tệp thường, và tệp Google xuất được. */
export function isListable(mimeType: string): boolean {
  if (mimeType === DRIVE_FOLDER_MIME) return true;
  return !isNativeMime(mimeType) || exportTargetOf(mimeType) !== null;
}
