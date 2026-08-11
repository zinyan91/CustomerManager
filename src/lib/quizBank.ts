export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  Id: number;
  QuestionText: string;
  Options: QuizOption[];
  CorrectAnswers: string[];
  Sources: string[];
  Topic?: string | null;
  CreatedBy?: string | null;
  CreatedAt?: string;
}

export interface QuizDraft {
  questionText: string;
  options: QuizOption[];
  correctAnswers: string[];
  sources: string[];
  topic: string;
  answerUnsettled: boolean;
}

export const MIN_DRAFT_OPTIONS = 2;
export const MAX_DRAFT_OPTIONS = 12;

export function quizNormalizeText(text: string): string {
  return (text || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

const KEY_FIELD_SEP = '\u0001';
const KEY_OPTION_SEP = '\u0002';

export function quizDuplicateKey<T extends { text: string }>(
  questionText: string,
  options: readonly T[]
): string {
  const parts = options.map(o => quizNormalizeText(o.text)).sort();
  return quizNormalizeText(questionText) + KEY_FIELD_SEP + parts.join(KEY_OPTION_SEP);
}

export function optionLetter(index: number): string {
  let n = index + 1;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

export function emptyDraft(): QuizDraft {
  return {
    questionText: '',
    options: Array.from({ length: 4 }, (_, i) => ({ id: optionLetter(i), text: '' })),
    correctAnswers: [],
    sources: [],
    topic: '',
    answerUnsettled: false,
  };
}

export function hasSettledAnswer(question: Pick<QuizQuestion, 'CorrectAnswers'>): boolean {
  return question.CorrectAnswers.length > 0;
}

export function questionToDraft(question: QuizQuestion): QuizDraft {
  return {
    questionText: question.QuestionText,
    options: question.Options.map(o => ({ id: o.id, text: o.text })),
    correctAnswers: [...question.CorrectAnswers],
    sources: [...question.Sources],
    topic: question.Topic || '',
    answerUnsettled: !hasSettledAnswer(question),
  };
}

export function relabelOptions(options: QuizOption[], correctAnswers: string[]): {
  options: QuizOption[];
  correctAnswers: string[];
} {
  const next = options.map((o, i) => ({ id: optionLetter(i), text: o.text }));
  const moved = new Map(options.map((o, i) => [o.id, next[i].id]));
  const keptOrder = next.map(o => o.id);
  const remapped = correctAnswers
    .map(id => moved.get(id))
    .filter((id): id is string => !!id);
  return {
    options: next,
    correctAnswers: keptOrder.filter(id => remapped.includes(id)),
  };
}

export type DuplicateCandidate = Pick<QuizQuestion, 'Id' | 'QuestionText' | 'Options'>;

export function findDuplicateQuestion<T extends { text: string }>(
  questionText: string,
  options: readonly T[],
  questions: DuplicateCandidate[],
  excludeId?: number
): DuplicateCandidate | null {
  if (!quizNormalizeText(questionText)) return null;
  const key = quizDuplicateKey(questionText, options);
  return questions.find(q =>
    q.Id !== excludeId && quizDuplicateKey(q.QuestionText, q.Options) === key
  ) || null;
}

export function duplicateClusters(
  questions: DuplicateCandidate[]
): { key: string; ids: number[] }[] {
  const groups = new Map<string, number[]>();
  for (const q of questions) {
    if (!quizNormalizeText(q.QuestionText)) continue;
    const key = quizDuplicateKey(q.QuestionText, q.Options);
    const at = groups.get(key);
    if (at) at.push(q.Id);
    else groups.set(key, [q.Id]);
  }
  return [...groups.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([key, ids]) => ({ key, ids }));
}

export function validateQuizDraft(
  draft: QuizDraft,
  questions: DuplicateCandidate[],
  excludeId?: number
): string[] {
  const errors: string[] = [];

  if (!draft.questionText.trim()) {
    errors.push('Chưa nhập nội dung câu hỏi.');
  }

  const filled = draft.options.filter(o => o.text.trim() !== '');
  if (filled.length < MIN_DRAFT_OPTIONS) {
    errors.push(`Phải có ít nhất ${MIN_DRAFT_OPTIONS} lựa chọn có nội dung.`);
  }

  const seen = new Set<string>();
  for (const o of filled) {
    const key = quizNormalizeText(o.text);
    if (seen.has(key)) {
      errors.push(`Lựa chọn "${o.text.trim()}" bị nhập hai lần.`);
      break;
    }
    seen.add(key);
  }

  const filledIds = new Set(filled.map(o => o.id));
  const correct = draft.correctAnswers.filter(id => filledIds.has(id));
  if (correct.length === 0 && !draft.answerUnsettled) {
    errors.push('Chưa chọn đáp án đúng nào.');
  }
  if (correct.length > 0 && draft.answerUnsettled) {
    errors.push('Đã đánh dấu chưa chốt đáp án thì không chọn đáp án đúng nào được.');
  }

  const duplicate = findDuplicateQuestion(draft.questionText, filled, questions, excludeId);
  if (duplicate) {
    errors.push(`Câu hỏi này đã có trong ngân hàng (số ${duplicate.Id}).`);
  }

  return errors;
}

export function draftToPayload(draft: QuizDraft): {
  QuestionText: string;
  Options: QuizOption[];
  CorrectAnswers: string[];
  Sources: string[];
  Topic: string | null;
} {
  const filled = draft.options
    .filter(o => o.text.trim() !== '')
    .map(o => ({ id: o.id, text: o.text.trim() }));
  const ids = new Set(filled.map(o => o.id));

  const { options, correctAnswers } = relabelOptions(
    filled,
    draft.answerUnsettled ? [] : draft.correctAnswers.filter(id => ids.has(id))
  );

  return {
    QuestionText: draft.questionText.trim(),
    Options: options,
    CorrectAnswers: correctAnswers,
    Sources: draft.sources.map(s => s.trim()).filter(Boolean),
    Topic: draft.topic.trim() || null,
  };
}

export function isAnswerCorrect(question: Pick<QuizQuestion, 'CorrectAnswers'>, picked: string[]): boolean {
  if (!hasSettledAnswer(question)) return false;
  const want = new Set(question.CorrectAnswers);
  const got = new Set(picked);
  if (want.size !== got.size) return false;
  for (const id of want) if (!got.has(id)) return false;
  return true;
}

export function isMultiAnswer(question: Pick<QuizQuestion, 'CorrectAnswers'>): boolean {
  return question.CorrectAnswers.length > 1;
}

export function searchQuestions(questions: QuizQuestion[], term: string): QuizQuestion[] {
  const key = quizNormalizeText(term);
  if (!key) return questions;

  const byId = /^#([\d\s,]+)$/.exec(key);
  if (byId) {
    const ids = new Set(
      byId[1].split(/[\s,]+/).filter(Boolean).map(n => parseInt(n, 10))
    );
    if (ids.size > 0) return questions.filter(q => ids.has(q.Id));
  }

  return questions.filter(q =>
    quizNormalizeText(q.QuestionText).includes(key)
    || q.Options.some(o => quizNormalizeText(o.text).includes(key))
    || q.Sources.some(s => quizNormalizeText(s).includes(key))
    || quizNormalizeText(q.Topic || '').includes(key)
  );
}

export function quizStats(questions: QuizQuestion[]): {
  total: number;
  multiAnswer: number;
  unsettled: number;
  optionCounts: { size: number; count: number }[];
  duplicateClusters: number;
} {
  const sizes = new Map<number, number>();
  for (const q of questions) {
    const n = q.Options.length;
    sizes.set(n, (sizes.get(n) || 0) + 1);
  }
  return {
    total: questions.length,
    multiAnswer: questions.filter(isMultiAnswer).length,
    unsettled: questions.filter(q => !hasSettledAnswer(q)).length,
    optionCounts: [...sizes.entries()]
      .map(([size, count]) => ({ size, count }))
      .sort((a, b) => a.size - b.size),
    duplicateClusters: duplicateClusters(questions).length,
  };
}

export interface QuizImportRow {
  question: string;
  options: QuizOption[];
  correct_answers: string[];
  sources: string[];
  topic: string | null;
}

export interface QuizImportParse {
  rows: QuizImportRow[];
  skipped: { at: number; reason: string }[];
}

function pick(source: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) return source[key];
  }
  return undefined;
}

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(v => String(v).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(/[,;]/).map(v => v.trim()).filter(Boolean);
  }
  return [];
}

function asOptions(value: unknown): QuizOption[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw, i) => {
      if (typeof raw === 'string') {
        return { id: optionLetter(i), text: raw.trim() };
      }
      if (raw && typeof raw === 'object') {
        const entry = raw as Record<string, unknown>;
        const text = pick(entry, ['text', 'content', 'noi_dung', 'label']);
        const id = pick(entry, ['id', 'ma', 'key']);
        return {
          id: id === undefined ? optionLetter(i) : String(id).trim(),
          text: text === undefined ? '' : String(text).trim(),
        };
      }
      return { id: optionLetter(i), text: '' };
    })
    .filter(o => o.id !== '' && o.text !== '');
}

export function parseQuizImportFile(text: string): QuizImportParse {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Tệp không phải JSON hợp lệ.');
  }

  const list = Array.isArray(parsed)
    ? parsed
    : (parsed && typeof parsed === 'object'
      && Array.isArray((parsed as Record<string, unknown>).questions)
      ? (parsed as { questions: unknown[] }).questions
      : null);

  if (!list) {
    throw new Error('Tệp phải là một mảng câu hỏi, hoặc một object có khoá "questions".');
  }

  const rows: QuizImportRow[] = [];
  const skipped: { at: number; reason: string }[] = [];

  list.forEach((raw, index) => {
    const at = index + 1;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      skipped.push({ at, reason: 'Không phải một object câu hỏi.' });
      return;
    }
    const entry = raw as Record<string, unknown>;

    const question = String(pick(entry, ['question', 'cau_hoi', 'noi_dung']) ?? '').trim();
    if (!question) {
      skipped.push({ at, reason: 'Thiếu nội dung câu hỏi.' });
      return;
    }

    const options = asOptions(pick(entry, ['options', 'lua_chon', 'choices']));
    if (options.length < 1) {
      skipped.push({ at, reason: 'Không đọc được lựa chọn nào.' });
      return;
    }
    if (new Set(options.map(o => o.id)).size !== options.length) {
      skipped.push({ at, reason: 'Mã lựa chọn bị lặp trong cùng một câu.' });
      return;
    }

    const ids = new Set(options.map(o => o.id));
    const correct = asStringList(
      pick(entry, ['correct_answers', 'dap_an', 'answer', 'answers'])
    );
    const outside = correct.filter(id => !ids.has(id));
    if (outside.length > 0) {
      skipped.push({
        at,
        reason: `Đáp án ${outside.join(', ')} không nằm trong danh sách lựa chọn.`,
      });
      return;
    }

    rows.push({
      question,
      options,
      correct_answers: correct,
      sources: asStringList(pick(entry, ['sources', 'nguon', 'source'])),
      topic: String(pick(entry, ['topic', 'chu_de']) ?? '').trim() || null,
    });
  });

  return { rows, skipped };
}
