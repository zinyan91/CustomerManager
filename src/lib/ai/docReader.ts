import type { AiAttachment } from '../../types/ai';
import type { OfficialDoc, OfficialDocFile } from '../../types/officialDoc';
import { fetchDocFileBlob } from '../officialDoc/docFiles';
import { blobToRawBase64, isSupportedAiAttachmentFile, resolveMimeType } from './fileToAttachment';

/** Tổng dung lượng tệp gửi AI mỗi câu hỏi: Gemini giới hạn ~20MB cho cả yêu cầu, base64 phình thêm 33%. */
export const MAX_READ_BYTES = 12 * 1024 * 1024;
export const MAX_READ_FILES = 4;
const CACHE_LIMIT = 6;

export interface ReadDocsResult {
  attachments: AiAttachment[];
  /** Tên tệp đính kèm theo từng văn bản, để mô tả cho AI biết tệp nào của văn bản nào. */
  readFiles: Array<{ docId: string; docNumber: string; title: string; fileName: string; kind: OfficialDocFile['kind'] }>;
  /** Tệp không đọc được (định dạng, quá lớn, lỗi tải) để AI nói rõ thay vì đoán. */
  notes: string[];
  /** Biểu mẫu AI không đọc nội dung (Word, Excel, zip...): chỉ nêu tên cho người dùng biết văn bản có biểu mẫu nào. */
  forms: Array<{ docNumber: string; title: string; fileName: string }>;
}

// Đọc lại cùng văn bản ở câu hỏi nối tiếp thì không phải tải lại từ Kho
const cache = new Map<string, AiAttachment>();

export function clearDocReaderCache(): void {
  cache.clear();
}

function remember(key: string, att: AiAttachment) {
  cache.set(key, att);
  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
}

const orderFiles = (files: OfficialDocFile[]) => [...files].sort((a, b) => Number(b.kind === 'goc') - Number(a.kind === 'goc'));

/**
 * Tải nội dung các văn bản (PDF, ảnh) từ Kho để AI đọc. Tải song song, thẳng từ trình duyệt tới
 * Hugging Face. Tệp không đọc được ghi vào `notes`, không ném lỗi làm hỏng cả câu trả lời.
 */
export async function readDocsForAi(docs: OfficialDoc[], token: string): Promise<ReadDocsResult> {
  const result: ReadDocsResult = { attachments: [], readFiles: [], notes: [], forms: [] };
  const wanted: Array<{ doc: OfficialDoc; file: OfficialDocFile }> = [];

  for (const doc of docs) {
    if (doc.files.length === 0) {
      result.notes.push(`Văn bản ${doc.docNumber} chưa có tệp đính kèm nên chưa có nội dung để đọc.`);
      continue;
    }
    for (const file of orderFiles(doc.files)) {
      if (!isSupportedAiAttachmentFile({ name: file.name })) {
        if (file.kind === 'bieu-mau') {
          result.forms.push({ docNumber: doc.docNumber, title: doc.title, fileName: file.name });
          continue;
        }
        result.notes.push(`Tệp "${file.name}" của văn bản ${doc.docNumber} không phải PDF hoặc ảnh nên AI chưa đọc được.`);
      } else if (wanted.length < MAX_READ_FILES) {
        wanted.push({ doc, file });
      } else {
        result.notes.push(`Tệp "${file.name}" của văn bản ${doc.docNumber} chưa đọc vì đã đủ ${MAX_READ_FILES} tệp cho một câu hỏi.`);
      }
    }
  }

  const loaded = await Promise.all(
    wanted.map(async ({ doc, file }) => {
      // Tệp Drive có mã bất biến: đổi tên hay di chuyển tệp không làm đọc nhầm bản nhớ cũ
      const key = file.fileId ? `drive/${file.fileId}` : `${file.repoId}/${file.path}`;
      try {
        let att = cache.get(key);
        if (!att) {
          const blob = await fetchDocFileBlob(file, token);
          att = {
            id: `docread_${key}`,
            name: file.name,
            mimeType: resolveMimeType({ name: file.name }),
            size: blob.size,
            base64Data: await blobToRawBase64(blob),
          };
          remember(key, att);
        }
        return { doc, file, att };
      } catch (err) {
        result.notes.push(`Không đọc được tệp "${file.name}" của văn bản ${doc.docNumber}: ${err instanceof Error ? err.message : String(err)}`);
        return null;
      }
    })
  );

  let total = 0;
  for (const item of loaded) {
    if (!item) continue;
    if (total + item.att.size > MAX_READ_BYTES) {
      result.notes.push(`Tệp "${item.file.name}" của văn bản ${item.doc.docNumber} chưa đọc vì tổng dung lượng vượt giới hạn.`);
      continue;
    }
    total += item.att.size;
    result.attachments.push(item.att);
    result.readFiles.push({
      docId: item.doc.id, docNumber: item.doc.docNumber, title: item.doc.title, fileName: item.file.name, kind: item.file.kind,
    });
  }
  return result;
}
