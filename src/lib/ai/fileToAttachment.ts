import type { AiAttachment } from '../../types/ai';

export const SUPPORTED_AI_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

/**
 * Định dạng kích thước tệp tin sang dạng đọc được
 */
export function formatFileSize(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const num = bytes / Math.pow(1024, i);
  return `${num.toFixed(num >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Xác định MIME type từ tên tệp hoặc loại MIME có sẵn
 */
export function resolveMimeType(file: { name: string; type?: string }): string {
  if (file.type && file.type.trim()) {
    const lower = file.type.toLowerCase();
    if (SUPPORTED_AI_MIME_TYPES.includes(lower as any)) {
      return lower;
    }
  }

  const ext = file.name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    default:
      return file.type || '';
  }
}

/**
 * Kiểm tra xem tệp có được hỗ trợ cho AI đọc không
 */
export function isSupportedAiAttachmentFile(file: { name: string; type?: string }): boolean {
  const mime = resolveMimeType(file);
  return SUPPORTED_AI_MIME_TYPES.includes(mime as any);
}

/**
 * Chuyển đổi Blob/File thành chuỗi Base64 sạch (không kèm tiền tố data:)
 */
export async function blobToRawBase64(blob: Blob): Promise<string> {
  if (typeof FileReader !== 'undefined') {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result as string;
        const comma = res.indexOf(',');
        resolve(comma >= 0 ? res.slice(comma + 1) : res);
      };
      reader.onerror = () => reject(new Error('Lỗi khi đọc tệp tin.'));
      reader.readAsDataURL(blob);
    });
  }

  // Fallback dùng arrayBuffer (môi trường Node / Vitest)
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Đọc file / blob thành đối tượng AiAttachment chứa Base64 dữ liệu
 */
export async function fileToAiAttachment(file: File): Promise<AiAttachment> {
  const mimeType = resolveMimeType(file);
  if (!isSupportedAiAttachmentFile(file)) {
    throw new Error(
      `Định dạng của tệp "${file.name}" không được hỗ trợ. AI đọc được hình ảnh (PNG, JPG, WebP), PDF, Word (.docx), Excel/CSV và tệp chữ (XML, TXT, JSON).`
    );
  }

  const rawBase64 = await blobToRawBase64(file);
  const dataUrl = `data:${mimeType};base64,${rawBase64}`;

  const id = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  return {
    id,
    name: file.name,
    mimeType,
    size: file.size,
    base64Data: rawBase64,
    previewUrl: mimeType.startsWith('image/') ? dataUrl : undefined,
  };
}

/**
 * Đọc nhiều tệp tin và trả về danh sách đính kèm thành công kèm mảng lỗi nếu có
 */
export async function convertFilesToAiAttachments(files: File[]): Promise<{
  attachments: AiAttachment[];
  errors: string[];
}> {
  const attachments: AiAttachment[] = [];
  const errors: string[] = [];

  for (const file of files) {
    try {
      const att = await fileToAiAttachment(file);
      attachments.push(att);
    } catch (err: any) {
      errors.push(err.message || `Lỗi khi xử lý tệp ${file.name}`);
    }
  }

  return { attachments, errors };
}
