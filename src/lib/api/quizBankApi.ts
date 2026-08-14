import { supabase } from '../supabase';
import type { QuizQuestion, QuizOption } from '../quizBank';

function quizDbError(err: any): Error {
  const msg = String(err?.message || '');
  const already = /đã có trong ngân hàng \(Id=(\d+)\)/.exec(msg);
  if (already) {
    return new Error(`Câu hỏi này đã có trong ngân hàng (số ${already[1]}).`);
  }
  if (/không nằm trong danh sách lựa chọn/.test(msg)
    || /Mã lựa chọn bị lặp/.test(msg)
    || /phải có mã/.test(msg)) {
    return new Error(msg);
  }
  if (err?.code === '42501' || /row-level security/i.test(msg)) {
    return new Error('Không có quyền ghi vào ngân hàng câu hỏi.');
  }
  return new Error(msg || 'Không lưu được câu hỏi.');
}

export async function fetchQuizQuestionsAPI(): Promise<QuizQuestion[]> {
  const allRows: any[] = [];
  let from = 0;
  const step = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('QuizQuestions')
      .select('*')
      .order('Id', { ascending: true })
      .range(from, from + step - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    allRows.push(...data);
    if (data.length < step) break;
    from += step;
  }

  return allRows.map((row: any) => ({
    ...row,
    Options: Array.isArray(row.Options) ? row.Options : [],
    CorrectAnswers: row.CorrectAnswers || [],
    Sources: row.Sources || [],
  }));
}

export async function createQuizQuestionAPI(
  payload: {
    QuestionText: string;
    Options: QuizOption[];
    CorrectAnswers: string[];
    Sources: string[];
    Topic: string | null;
  }
): Promise<QuizQuestion> {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('QuizQuestions')
    .insert({ ...payload, CreatedBy: auth?.user?.id ?? null })
    .select();
  if (error) throw quizDbError(error);
  if (!data || data.length === 0) throw new Error('Không lưu được câu hỏi.');
  return data[0];
}

export async function deleteQuizQuestionAPI(id: number): Promise<void> {
  const { error, count } = await supabase
    .from('QuizQuestions')
    .delete({ count: 'exact' })
    .eq('Id', id);
  if (error) throw quizDbError(error);
  if (count === 0) {
    throw new Error('Không xoá được. Chỉ admin hoặc người đã thêm câu hỏi mới xoá được.');
  }
}

export async function seedQuizBankAPI(questions: unknown[]): Promise<number> {
  const { data, error } = await supabase.rpc('seed_quiz_bank', { p_questions: questions });
  if (error) throw quizDbError(error);
  return Number(data) || 0;
}

export interface QuizImportReport {
  da_nap: number;
  trung_trong_ngan_hang: { cau: string; id_co_san: number }[];
  trung_trong_file: { cau: string }[];
  khong_hop_le: { cau: string; ly_do: string }[];
  lech_dap_an: {
    cau: string;
    id_co_san: number;
    dap_an_co_san: string[];
    dap_an_trong_file: string[];
  }[];
}

export async function importQuizQuestionsAPI(rows: unknown[]): Promise<QuizImportReport> {
  const { data, error } = await supabase.rpc('import_quiz_questions', { p_questions: rows });
  if (error) throw quizDbError(error);
  return data as QuizImportReport;
}

export async function updateQuizQuestionAPI(
  id: number,
  payload: {
    QuestionText: string;
    Options: QuizOption[];
    CorrectAnswers: string[];
    Sources: string[];
    Topic: string | null;
  }
): Promise<QuizQuestion> {
  const { data, error } = await supabase
    .from('QuizQuestions')
    .update(payload)
    .eq('Id', id)
    .select();
  if (error) throw quizDbError(error);
  if (!data || data.length === 0) {
    throw new Error('Không sửa được. Chỉ admin hoặc người đã thêm câu hỏi mới sửa được.');
  }
  return data[0];
}
