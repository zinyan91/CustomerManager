import { supabase } from '../supabase';
import { normalizeSearch } from '../officialDoc/normalize';

export const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const MAX_ANSWER_CHARS = 20000;
const TABLE = 'AiAnswerCache';

export interface DocRef {
  id: string;
  updatedAt: string;
}

export interface CachedAnswer {
  question: string;
  answer: string;
  docRefs: DocRef[];
  updatedAt: string;
}

/**
 * Khóa câu hỏi: các từ không dấu, bỏ trùng, sắp xếp. Hỏi lại cùng ý ("lãi suất ngắn hạn?" và
 * "Ngắn hạn lãi suất") ra cùng khóa; thêm hay bớt một từ thì ra khóa khác nên không dùng nhầm.
 */
export function questionKey(question: string): string {
  const words = normalizeSearch(question).split(/[^a-z0-9]+/).filter(Boolean);
  return [...new Set(words)].sort().join(' ');
}

/**
 * Câu trả lời còn dùng được khi mọi văn bản đã đọc vẫn còn và chưa bị sửa kể từ lúc đó, và chưa
 * quá hạn. Chưa có văn bản nào được ghi nhận thì không dùng (không có căn cứ).
 */
export function isCacheValid(entry: CachedAnswer, index: DocRef[], now: number = Date.now()): boolean {
  if (entry.docRefs.length === 0) return false;
  const saved = Date.parse(entry.updatedAt);
  if (!Number.isFinite(saved) || now - saved > CACHE_TTL_MS) return false;
  const current = new Map(index.map((d) => [d.id, d.updatedAt]));
  return entry.docRefs.every((ref) => current.get(ref.id) === ref.updatedAt);
}

/** Câu trả lời đã lưu cho khóa này, hoặc null. Ném lỗi khi DB báo lỗi. */
export async function findCachedAnswer(key: string): Promise<CachedAnswer | null> {
  if (!key) return null;
  const { data, error } = await supabase
    .from(TABLE)
    .select('Question,Answer,DocRefs,UpdatedAt')
    .eq('QuestionKey', key)
    .maybeSingle();
  if (error) throw new Error(`Không đọc được bộ nhớ trả lời: ${error.message}`);
  if (!data) return null;
  const docRefs = Array.isArray(data.DocRefs)
    ? data.DocRefs.filter((r: unknown): r is DocRef => typeof (r as DocRef)?.id === 'string' && typeof (r as DocRef)?.updatedAt === 'string')
    : [];
  return { question: data.Question, answer: data.Answer, docRefs, updatedAt: data.UpdatedAt };
}

export interface SaveAnswerArgs {
  key: string;
  question: string;
  answer: string;
  docRefs: DocRef[];
  model: string;
}

/** Lưu hoặc làm mới câu trả lời. Ném lỗi khi ghi hỏng. */
export async function saveCachedAnswer(args: SaveAnswerArgs): Promise<void> {
  const { key, question, answer, docRefs, model } = args;
  if (!key || !answer.trim() || docRefs.length === 0) throw new Error('Thiếu dữ liệu để lưu câu trả lời.');
  if (answer.length > MAX_ANSWER_CHARS) return;
  const { error } = await supabase
    .from(TABLE)
    .upsert(
      { QuestionKey: key, Question: question.slice(0, 500), Answer: answer, DocRefs: docRefs, Model: model, UpdatedAt: new Date().toISOString() },
      { onConflict: 'QuestionKey' }
    );
  if (error) throw new Error(`Không lưu được bộ nhớ trả lời: ${error.message}`);
}
