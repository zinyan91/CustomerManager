import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  GraduationCap, Search, Plus, Loader2, Trash2, AlertTriangle, Download,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import {
  UI, PANEL, BTN_PRIMARY, BTN_SECONDARY, BTN_DANGER,
  HEADING_SCREEN, SECTION_LABEL, ROW_RAIL_ALERT, ROW_RAIL_NEUTRAL,
} from '../../lib/uiClasses';
import {
  emptyDraft, draftToPayload, duplicateClusters, hasSettledAnswer, isAnswerCorrect, isMultiAnswer,
  quizStats, searchQuestions,
  type QuizDraft, type QuizQuestion,
} from '../../lib/quizBank';
import {
  fetchQuizQuestionsAPI, createQuizQuestionAPI, deleteQuizQuestionAPI, seedQuizBankAPI,
} from '../../lib/api';
import { Toast, useToast } from '../Toast';
import { QuizQuestionForm } from '../quiz/QuizQuestionForm';
import quizSeed from '../../data/quiz_bank.json';

type Mode = 'browse' | 'practice';

const PAGE_SIZE = 20;

export const QuizBankView: React.FC = () => {
  const { toast, show, dismiss } = useToast();

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [mode, setMode] = useState<Mode>('browse');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<QuizDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const [practiceAt, setPracticeAt] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState({ done: 0, right: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setQuestions(await fetchQuizQuestionsAPI());
    } catch (err: any) {
      setLoadError(err?.message || 'Không đọc được ngân hàng câu hỏi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => quizStats(questions), [questions]);
  const clusters = useMemo(() => duplicateClusters(questions), [questions]);

  const conflicting = useMemo(() => {
    const byId = new Map(questions.map(q => [q.Id, q]));
    return clusters.filter(c => new Set(c.ids.map(id =>
      [...(byId.get(id)?.CorrectAnswers || [])].sort().join(',')
    )).size > 1);
  }, [clusters, questions]);

  const conflictingIds = useMemo(
    () => new Set(conflicting.flatMap(c => c.ids)),
    [conflicting]
  );

  const filtered = useMemo(() => searchQuestions(questions, query), [questions, query]);

  const practiceList = useMemo(() => filtered.filter(hasSettledAnswer), [filtered]);
  const current = practiceList[practiceAt] || null;
  const skippedInPractice = filtered.length - practiceList.length;

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
    setPracticeAt(0);
    setPicked([]);
    setChecked(false);
  }, [query, mode]);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const saved = await createQuizQuestionAPI(draftToPayload(draft));
      setQuestions(prev => [...prev, saved]);
      setDraft(emptyDraft());
      setFormOpen(false);
      show('success', `Đã thêm câu hỏi số ${saved.Id}.`);
    } catch (err: any) {
      show('error', err?.message || 'Không lưu được câu hỏi.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (question: QuizQuestion) => {
    if (!window.confirm(`Xoá câu hỏi số ${question.Id}?`)) return;
    try {
      await deleteQuizQuestionAPI(question.Id);
      setQuestions(prev => prev.filter(q => q.Id !== question.Id));
      show('success', `Đã xoá câu hỏi số ${question.Id}.`);
    } catch (err: any) {
      show('error', err?.message || 'Không xoá được câu hỏi.');
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const count = await seedQuizBankAPI(quizSeed as unknown[]);
      show('success', `Đã nạp ${count} câu hỏi từ quiz_bank.json.`);
      await load();
    } catch (err: any) {
      show('error', err?.message || 'Không nạp được ngân hàng câu hỏi.');
    } finally {
      setSeeding(false);
    }
  };

  const togglePick = (id: string) => {
    if (checked || !current) return;
    if (isMultiAnswer(current)) {
      setPicked(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    } else {
      setPicked([id]);
    }
  };

  const submitAnswer = () => {
    if (!current || picked.length === 0) return;
    setChecked(true);
    setScore(prev => ({
      done: prev.done + 1,
      right: prev.right + (isAnswerCorrect(current, picked) ? 1 : 0),
    }));
  };

  const nextQuestion = () => {
    setPicked([]);
    setChecked(false);
    setPracticeAt(at => (at + 1) % Math.max(1, practiceList.length));
  };


  return (
    <div className="space-y-4 text-xs">
      <Toast toast={toast} onDismiss={dismiss} />

      <div className={`${PANEL} p-4 space-y-3`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className={`${HEADING_SCREEN} flex items-center gap-2`}>
            <GraduationCap size={16} /> NGÂN HÀNG CÂU HỎI NGHIỆP VỤ
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setMode('browse')}
              className={`${BTN_SECONDARY} px-2.5 py-1 text-[11px] ${mode === 'browse' ? 'border-accent text-accent' : ''}`}>
              Tra cứu
            </button>
            <button type="button" onClick={() => setMode('practice')}
              className={`${BTN_SECONDARY} px-2.5 py-1 text-[11px] ${mode === 'practice' ? 'border-accent text-accent' : ''}`}>
              Luyện tập
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-ink-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> Đang đọc ngân hàng câu hỏi…
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-ink-muted">
              <span><strong className="text-ink">{stats.total}</strong> câu</span>
              <span><strong className="text-ink">{stats.multiAnswer}</strong> câu nhiều đáp án</span>
              {stats.unsettled > 0 && (
                <span><strong className="text-ink">{stats.unsettled}</strong> câu chưa chốt đáp án</span>
              )}
            </div>

            {clusters.length > 0 && (
              <div className="text-[11px] leading-relaxed border border-line rounded-md p-2.5 bg-panel-muted space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-ink">
                  <AlertTriangle className="w-3.5 h-3.5 text-neg" />
                  {clusters.length} cụm câu hỏi trùng nội dung, gồm {clusters.reduce((s, c) => s + c.ids.length, 0)} câu
                </div>
                {conflicting.length > 0 && (
                  <div className="text-neg font-semibold">
                    {conflicting.length} cụm trong đó có ĐÁP ÁN ĐÚNG KHÁC NHAU trên cùng một câu hỏi —
                    ít nhất một bản đang dạy sai:{' '}
                    {conflicting.map(c => `(${c.ids.join(', ')})`).join(' · ')}
                  </div>
                )}
              </div>
            )}

            {loadError && (
              <div role="alert" className="text-[11px] text-neg">
                {loadError}
              </div>
            )}

            {stats.total === 0 && !loadError && (
              <div className="space-y-2 border border-line rounded-md p-3 bg-panel-muted">
                <div className="text-[11px] text-ink-muted">
                  Ngân hàng chưa có câu nào. Nạp {(quizSeed as unknown[]).length} câu từ{' '}
                  <code className="font-mono">src/data/quiz_bank.json</code> — chỉ chạy được một lần,
                  trên bảng rỗng.
                </div>
                <button type="button" onClick={handleSeed} disabled={seeding}
                  className={`${BTN_PRIMARY} px-3 py-1.5 flex items-center gap-1.5`}>
                  {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  {seeding ? 'Đang nạp…' : 'Nạp bộ câu hỏi gốc'}
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                  placeholder="Tìm trong câu hỏi, lựa chọn hoặc chủ đề"
                  aria-label="Tìm câu hỏi"
                  className={`w-full rounded-md pl-8 pr-3 py-2 border ${UI.inputStyle}`} />
              </div>
              <button type="button" onClick={() => setFormOpen(v => !v)}
                className={`${BTN_PRIMARY} px-3 py-2 flex items-center gap-1.5 shrink-0`}>
                <Plus className="w-4 h-4" /> Thêm câu hỏi
              </button>
            </div>
          </>
        )}
      </div>

      {formOpen && (
        <div className={`${PANEL} p-4`}>
          <div className={`${SECTION_LABEL} mb-2`}>Thêm câu hỏi mới</div>
          <QuizQuestionForm
            draft={draft}
            setDraft={setDraft}
            questions={questions}
            saving={saving}
            onSubmit={handleSubmit}
            onCancel={() => { setFormOpen(false); setDraft(emptyDraft()); }}
          />
        </div>
      )}

      {!loading && mode === 'practice' && (
        <div className={`${PANEL} p-4 space-y-3`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-[11px] text-ink-muted">
            <span>
              Câu {practiceList.length === 0 ? 0 : practiceAt + 1} / {practiceList.length}
              {skippedInPractice > 0 && (
                <span className="text-ink-faint">
                  {' '}· bỏ qua {skippedInPractice} câu chưa chốt đáp án
                </span>
              )}
            </span>
            <span>
              Đã làm <strong className="text-ink">{score.done}</strong> ·
              đúng <strong className="text-pos">{score.right}</strong>
              {score.done > 0 && ` (${Math.round((score.right / score.done) * 100)}%)`}
            </span>
          </div>

          {!current ? (
            <div className="text-ink-muted">Không có câu nào khớp bộ lọc.</div>
          ) : (
            <>
              <div className="text-ink leading-relaxed font-medium">{current.QuestionText}</div>
              {isMultiAnswer(current) && (
                <div className="text-[10px] uppercase tracking-[0.1em] text-ink-faint">
                  Câu nhiều đáp án — chọn tất cả đáp án đúng
                </div>
              )}

              <div className="space-y-1.5">
                {current.Options.map(option => {
                  const isPicked = picked.includes(option.id);
                  const isRight = current.CorrectAnswers.includes(option.id);
                  const tone = !checked
                    ? (isPicked ? 'border-accent bg-accent-soft text-accent' : 'border-line text-ink')
                    : isRight
                      ? 'border-pos bg-pos-soft text-pos'
                      : (isPicked ? 'border-neg bg-neg-soft text-neg' : 'border-line text-ink-muted');
                  return (
                    <button key={option.id} type="button" onClick={() => togglePick(option.id)}
                      disabled={checked}
                      aria-pressed={isPicked}
                      className={`w-full text-left rounded-md border px-3 py-2 flex gap-2.5 transition-colors ${tone}`}>
                      <span className="font-mono font-bold shrink-0">{option.id}</span>
                      <span className="leading-relaxed">{option.text}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                {!checked ? (
                  <button type="button" onClick={submitAnswer} disabled={picked.length === 0}
                    className={`${BTN_PRIMARY} px-3.5 py-2`}>
                    Kiểm tra
                  </button>
                ) : (
                  <>
                    <span className={`font-semibold ${isAnswerCorrect(current, picked) ? 'text-pos' : 'text-neg'}`}>
                      {isAnswerCorrect(current, picked) ? 'Đúng' : `Sai — đáp án ${current.CorrectAnswers.join(', ')}`}
                    </span>
                    <button type="button" onClick={nextQuestion} className={`${BTN_SECONDARY} px-3 py-2`}>
                      Câu tiếp
                    </button>
                  </>
                )}
              </div>

            </>
          )}
        </div>
      )}

      {!loading && mode === 'browse' && (
        <div className="space-y-2">
          {pageRows.map(question => {
            const isConflicting = conflictingIds.has(question.Id);
            return (
              <div key={question.Id}
                className={`${PANEL} p-3 space-y-2 ${isConflicting ? ROW_RAIL_ALERT : ROW_RAIL_NEUTRAL}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 text-[10px] text-ink-faint">
                      <span className="font-mono">#{question.Id}</span>
                      {question.Topic && <span>{question.Topic}</span>}
                      {isMultiAnswer(question) && (
                        <span className="text-accent font-semibold">nhiều đáp án</span>
                      )}
                      {!hasSettledAnswer(question) && (
                        <span className="text-ink-muted font-semibold">chưa chốt đáp án</span>
                      )}
                      {isConflicting && (
                        <span className="text-neg font-semibold">trùng câu, lệch đáp án</span>
                      )}
                    </div>
                    <div className="text-ink leading-relaxed">{question.QuestionText}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button type="button" onClick={() => handleDelete(question)}
                      aria-label={`Xoá câu ${question.Id}`}
                      className={`${BTN_DANGER} px-2 py-1.5`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 pl-1">
                  {question.Options.map(option => {
                    const isRight = question.CorrectAnswers.includes(option.id);
                    return (
                      <div key={option.id}
                        className={`flex gap-2 leading-relaxed rounded-sm ${
                          isRight
                            ? 'text-pos font-bold bg-pos-soft px-1.5 -mx-0.5 py-0.5'
                            : 'text-ink-muted px-1.5 -mx-0.5 py-0.5'
                        }`}>
                        <span className="font-mono shrink-0">{option.id}</span>
                        <span>{option.text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {pageRows.length === 0 && (
            <div className={`${PANEL} p-4 text-ink-muted`}>Không có câu nào khớp từ khoá.</div>
          )}

          {pageCount > 1 && (
            <div className="flex items-center justify-between gap-2 pt-1">
              <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className={`${BTN_SECONDARY} px-3 py-1.5 flex items-center gap-1`}>
                <ChevronLeft className="w-3.5 h-3.5" /> Trước
              </button>

              <div className="flex items-center gap-2 text-[11px] text-ink-muted">
                <span>Trang</span>
                <input
                  type="number"
                  min={1}
                  max={pageCount}
                  value={safePage}
                  onChange={e => {
                    const next = parseInt(e.target.value, 10);
                    if (!isNaN(next)) setPage(Math.min(pageCount, Math.max(1, next)));
                  }}
                  aria-label="Số trang"
                  className={`w-14 text-center rounded-md px-1.5 py-1 border ${UI.inputStyle}`}
                />
                <span>/ {pageCount}</span>
              </div>

              <button type="button" onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                disabled={safePage >= pageCount}
                className={`${BTN_SECONDARY} px-3 py-1.5 flex items-center gap-1`}>
                Sau <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
