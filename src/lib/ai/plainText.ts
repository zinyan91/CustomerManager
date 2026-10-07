import type { AiAttachment } from '../../types/ai';
import { MAX_AI_ATTACHMENT_SIZE_BYTES, formatFileSize } from './fileToAttachment';

/** Số ký tự tệp chữ thuần đưa cho AI mỗi tệp, bằng giới hạn của Word và bảng tính. */
export const MAX_PLAIN_TEXT_CHARS = 60_000;

/** Tệp chữ thuần AI đọc được nguyên văn (kê khai thuế XML, JSON, TXT...). */
export const isPlainTextFile = (file: { name: string }): boolean => /\.(xml|txt|json|md|html?|log|tsv)$/i.test(file.name);

/** Tệp chữ thuần thành tệp đính kèm dạng chữ cho AI. Ném lỗi tiếng Việt khi quá lớn hoặc không giải mã được. */
export async function fileToPlainTextAttachment(file: File): Promise<AiAttachment> {
  if (file.size > MAX_AI_ATTACHMENT_SIZE_BYTES) {
    throw new Error(`Tệp "${file.name}" vượt quá dung lượng tối đa cho phép (${formatFileSize(MAX_AI_ATTACHMENT_SIZE_BYTES)}).`);
  }
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
  } catch {
    throw new Error(`Không đọc được tệp "${file.name}": tệp không phải chữ UTF-8. Hãy lưu lại ở dạng UTF-8 rồi gửi lại.`);
  }
  text = text.replace(/^﻿/, '');
  if (!text.trim()) throw new Error(`Tệp "${file.name}" không có nội dung.`);
  const truncated = text.length > MAX_PLAIN_TEXT_CHARS;
  const note = truncated ? `\n\n(Đã cắt bớt vì quá dài: chỉ đọc ${MAX_PLAIN_TEXT_CHARS} ký tự đầu. Nói rõ điều này với người dùng.)` : '';
  return {
    id: `text_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: file.name,
    mimeType: 'text/plain',
    size: file.size,
    base64Data: '',
    textData: (truncated ? text.slice(0, MAX_PLAIN_TEXT_CHARS) : text) + note,
  };
}
