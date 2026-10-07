import type { AiAttachment } from '../../types/ai';
import type { OfficialDoc } from '../../types/officialDoc';
import { listDocIndex } from '../api/officialDocApi';
import { findCachedAnswer, isCacheValid, questionKey, type CachedAnswer, type DocRef } from './answerCache';
import { FILE_KIND_LABELS } from '../officialDoc/docFiles';
import { pickRelevantDocs } from './docRetrieval';
import { readDocsForAi, type ReadDocsResult } from './docReader';

export interface PreparedDocContext {
  /** Tệp văn bản gửi kèm câu hỏi; không lưu vào lịch sử chat. */
  attachments: AiAttachment[];
  /** Mô tả cho AI: tệp nào của văn bản nào, và tệp nào không đọc được. */
  contextText: string;
  /** Văn bản đang bàn, để câu hỏi nối tiếp không phải nêu lại. */
  focusIds: string[];
  /** Các văn bản đã đọc kèm phiên bản, để lưu làm căn cứ cho bộ nhớ trả lời. */
  refs: DocRef[];
  /** Đọc đủ mọi tệp của các văn bản đã chọn (không có tệp nào bị bỏ qua hay lỗi). */
  complete: boolean;
}

export const EMPTY_DOC_CONTEXT: PreparedDocContext = { attachments: [], contextText: '', focusIds: [], refs: [], complete: false };

export function describeRead(read: ReadDocsResult): string {
  const lines: string[] = [];
  if (read.readFiles.length > 0) {
    lines.push('NỘI DUNG VĂN BẢN VĂN THƯ ĐÃ ĐƯỢC ĐÍNH KÈM (đọc kỹ và trả lời dựa trên nội dung thật, trích đúng số liệu, bảng biểu):');
    read.readFiles.forEach((f) =>
      lines.push(`- Tệp "${f.fileName}" (${FILE_KIND_LABELS[f.kind]}) thuộc văn bản số ${f.docNumber}: ${f.title}`)
    );
  }
  if (read.forms.length > 0) {
    lines.push('BIỂU MẪU KÈM THEO (lấy ở kho Biểu mẫu qua nút tải của văn bản; AI không đọc nội dung các tệp này, chỉ cho biết tên):');
    read.forms.forEach((f) => lines.push(`- Biểu mẫu "${f.fileName}" của văn bản số ${f.docNumber}: ${f.title}`));
  }
  if (read.notes.length > 0) {
    lines.push('KHÔNG ĐỌC ĐƯỢC (nói rõ điều này với người dùng, tuyệt đối không bịa nội dung):');
    read.notes.forEach((n) => lines.push(`- ${n}`));
  }
  return lines.join('\n');
}

interface Deps {
  onStatus?: (text: string) => void;
  /** Danh mục văn bản đã tải sẵn (tránh gọi DB lần nữa). */
  index?: OfficialDoc[];
}

export interface SharedLookup {
  /** Câu trả lời dùng chung còn hiệu lực, nếu có. */
  hit: CachedAnswer | null;
  /** Danh mục văn bản đã tải, nếu tải được. */
  index: OfficialDoc[] | null;
}

/**
 * Câu trả lời cũ còn đúng khi các văn bản đã đọc chưa đổi VÀ tập văn bản mà câu hỏi chọn ra hôm nay
 * vẫn đúng là tập đó (admin thêm văn bản mới liên quan hơn thì phải đọc lại, không dùng câu cũ).
 */
function stillCurrent(cached: CachedAnswer, question: string, index: OfficialDoc[]): boolean {
  if (!isCacheValid(cached, index)) return false;
  const now = new Set(pickRelevantDocs(question, index, []).docs.map((d) => d.id));
  return now.size === cached.docRefs.length && cached.docRefs.every((r) => now.has(r.id));
}

/**
 * Tìm câu trả lời người khác đã hỏi. Lỗi bộ nhớ (vd chưa áp migration) chỉ coi là chưa có, vì đây là
 * tối ưu tốc độ chứ không phải chức năng bắt buộc; lỗi danh mục thì trả index null để bước sau tự báo lỗi.
 */
export async function lookupSharedAnswer(question: string): Promise<SharedLookup> {
  const [cached, index] = await Promise.all([
    findCachedAnswer(questionKey(question)).catch((err) => {
      console.warn('Không đọc được bộ nhớ trả lời dùng chung:', err);
      return null;
    }),
    listDocIndex().catch(() => null),
  ]);
  return { hit: cached && index && stillCurrent(cached, question, index) ? cached : null, index };
}

/**
 * Tìm văn bản Văn thư liên quan tới câu hỏi và tải nội dung để AI đọc. Không có văn bản liên quan
 * thì không tải gì. Lỗi tra cứu được báo trong `contextText` để AI nói thật với người dùng.
 */
export async function prepareDocContext(question: string, focusIds: string[], deps: Deps = {}): Promise<PreparedDocContext> {
  let docs;
  try {
    docs = deps.index ?? (await listDocIndex());
  } catch (err) {
    return { ...EMPTY_DOC_CONTEXT, focusIds, contextText: `Không tra cứu được danh mục văn bản: ${err instanceof Error ? err.message : String(err)}` };
  }

  const picked = pickRelevantDocs(question, docs, focusIds);
  if (picked.docs.length === 0) return { ...EMPTY_DOC_CONTEXT, focusIds };

  deps.onStatus?.(`Đang đọc văn bản ${picked.docs.map((d) => d.docNumber).join(', ')}...`);
  const read = await readDocsForAi(picked.docs);
  return {
    attachments: read.attachments,
    contextText: describeRead(read),
    focusIds: picked.docs.map((d) => d.id),
    refs: picked.docs.map((d) => ({ id: d.id, updatedAt: d.updatedAt })),
    complete: read.notes.length === 0 && read.readFiles.length > 0,
  };
}
