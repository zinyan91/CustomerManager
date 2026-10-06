import type { OfficialDoc } from '../../types/officialDoc';
import { buildSearchText, normalizeSearch } from '../officialDoc/normalize';

export const MAX_DOCS_PER_QUESTION = 3;

export type PickReason = 'number' | 'keyword' | 'focus' | 'none';

export interface PickResult {
  docs: OfficialDoc[];
  reason: PickReason;
}

// Từ hỏi chung, không giúp phân biệt văn bản. Đã chuẩn hóa không dấu.
const STOPWORDS = new Set([
  'la', 'gi', 'nao', 'cho', 'toi', 'ban', 've', 'noi', 'cua', 'co', 'khong', 'nhung', 'va', 'hay', 'nay', 'do',
  'the', 'nhu', 'trong', 'de', 'duoc', 'bao', 'nhieu', 'xem', 'hoi', 'cac', 'mot', 'tu', 'den', 'o', 'tai', 'voi',
  'chi', 'tiet', 'van', 'so', 'hieu', 'thong', 'tin', 'dung', 'giup', 'minh', 'xin', 'vui', 'long', 'cu', 'the',
  'nhat', 'moi', 'hien', 'hanh', 'doc', 'tom', 'tat', 'phan', 'tich', 'chao', 'cam', 'on', 'ok', 'vang', 'nhe',
]);

const isBareYear = (token: string) => /^(19|20)\d{2}$/.test(token);

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Chuỗi số trong câu hỏi có thể là số hiệu (2848-8, 2753/2026). Năm đứng riêng không tính. */
export function extractNumberRefs(question: string): string[] {
  const found = normalizeSearch(question).match(/\d[\d./-]*\d|\d{3,}/g) ?? [];
  return [...new Set(found.filter((t) => t.length >= 3 && !isBareYear(t)))];
}

function matchesNumber(docNumber: string, ref: string): boolean {
  // Sau số phải không là chữ số: 2848-8 không được khớp 2848-81
  return new RegExp(`(^|[^0-9a-z])${escapeRegex(ref)}(?![0-9])`).test(normalizeSearch(docNumber));
}

const words = (text: string) => normalizeSearch(text).split(/[^a-z0-9]+/).filter(Boolean);

/** Từ khóa của câu hỏi: bỏ từ hỏi chung và token toàn chữ số (đã xử lý như số hiệu). */
export function keywordTokens(question: string): string[] {
  return [...new Set(words(question).filter((t) => t.length >= 2 && !STOPWORDS.has(t) && !/^\d+$/.test(t)))];
}

/** Số từ khóa phải khớp: câu ngắn cần ít, câu dài cần nhiều để không khớp nhầm do trùng từ. */
const requiredHits = (tokenCount: number) => (tokenCount <= 2 ? 1 : Math.max(2, Math.ceil(tokenCount * 0.4)));

/**
 * Chọn các văn bản liên quan tới câu hỏi để AI đọc. Ưu tiên: số hiệu nêu rõ; rồi từ khóa trong
 * số hiệu/tiêu đề (văn bản đang bàn ở lượt trước được cộng điểm); rồi câu hỏi ngắn nối tiếp
 * thì giữ văn bản đang bàn. Không đoán khi không có căn cứ.
 */
export function pickRelevantDocs(
  question: string,
  docs: OfficialDoc[],
  focusIds: string[] = [],
  max: number = MAX_DOCS_PER_QUESTION
): PickResult {
  const refs = extractNumberRefs(question);
  if (refs.length > 0) {
    const byNumber = docs.filter((d) => refs.some((r) => matchesNumber(d.docNumber, r))).slice(0, max);
    if (byNumber.length > 0) return { docs: byNumber, reason: 'number' };
  }

  const tokens = keywordTokens(question);
  const focus = new Set(focusIds);
  const scored = docs
    .map((doc) => {
      const docWords = new Set(words(buildSearchText(doc.docNumber, doc.title)));
      const hits = tokens.filter((t) => docWords.has(t)).length;
      return { doc, hits, score: hits > 0 && focus.has(doc.id) ? hits + 2 : hits };
    })
    .filter((x) => x.hits >= requiredHits(tokens.length))
    .sort((a, b) => b.score - a.score || b.doc.issuedDate.localeCompare(a.doc.issuedDate));

  if (scored.length > 0) {
    const top = scored[0].score;
    return { docs: scored.filter((x) => x.score >= top - 1).slice(0, max).map((x) => x.doc), reason: 'keyword' };
  }

  if (focus.size > 0 && tokens.length >= 1 && tokens.length <= 6) {
    const kept = docs.filter((d) => focus.has(d.id)).slice(0, max);
    if (kept.length > 0) return { docs: kept, reason: 'focus' };
  }
  return { docs: [], reason: 'none' };
}
