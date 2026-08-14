import React from 'react';
import {
  GraduationCap, Search, Plus, Loader2, Trash2, Pencil, AlertTriangle, Download,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import {
  UI, PANEL, BTN_PRIMARY, BTN_SECONDARY, BTN_DANGER,
  HEADING_SCREEN, SECTION_LABEL, ROW_RAIL_ALERT, ROW_RAIL_NEUTRAL,
} from '../../lib/uiClasses';
import {
  hasSettledAnswer, isAnswerCorrect, isMultiAnswer,
} from '../../lib/quizBank';
import { importQuizQuestionsAPI } from '../../lib/api';
import { Toast } from '../Toast';
import { QuizQuestionForm } from '../quiz/QuizQuestionForm';
import { QuizImportPanel } from '../quiz/QuizImportPanel';
import quizSeed from '../../data/quiz_bank.json';
import { useQuizBankController } from '../../hooks/useQuizBankController';

export const QuizBankView: React.FC = () => {
  const {
    toast,
    show,
    dismiss,
    questions,
    loading,
    loadError,
    load,
    mode,
    setMode,
    query,
    setQuery,
    setPage,
    formOpen,
    editingId,
    draft,
    setDraft,
    openNewForm,
    saving,
    seeding,
    practiceAt,
    picked,
    checked,
    score,
    stats,
    clusters,
    conflicting,
    conflictingIds,
    practiceList,
    current,
    skippedInPractice,
    pageCount,
    safePage,
    pageRows,
    closeForm,
    startEdit,
    handleSubmit,
    handleDelete,
    handleSeed,
    togglePick,
    submitAnswer,
    nextQuestion,
  } = useQuizBankController();

  return (
    <div className="space-y-4 text-xs">
      <Toast toast={toast} onDismiss={dismiss} />

      <div className={`${PANEL} p-4 space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
          <div className={`${HEADING_SCREEN} flex items-center gap-2 text-accent`}>
            <GraduationCap size={18} className="text-accent" />
            <span className="uppercase">NGÂN HÀNG CÂU HỎI & CHẾ ĐỘ LUYỆN TẬP</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setMode('browse')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
                mode === 'browse'
                  ? 'bg-accent text-accent-ink border-accent shadow-xs'
                  : 'bg-panel-muted text-ink-muted border-line hover:border-accent hover:text-accent'
              }`}>
              Tra cứu
            </button>
            <button type="button" onClick={() => setMode('practice')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
                mode === 'practice'
                  ? 'bg-accent text-accent-ink border-accent shadow-xs'
                  : 'bg-panel-muted text-ink-muted border-line hover:border-accent hover:text-accent'
              }`}>
              Luyện tập
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-ink-muted py-4">
            <Loader2 className="w-4 h-4 animate-spin text-accent" /> Đang tải ngân hàng câu hỏi nghiệp vụ…
          </div>
        ) : (
          <>
            {/* Quiz Mastery KPI Header */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-panel-muted rounded-lg p-3 border border-line space-y-0.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Tổng ngân hàng câu hỏi</div>
                <div className="font-mono font-bold text-sm text-accent">{stats.total} Câu hỏi</div>
                <div className="text-[11px] text-ink-faint">Phục vụ kiểm tra nghiệp vụ</div>
              </div>

              <div className="bg-panel-muted rounded-lg p-3 border border-line space-y-0.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Câu hỏi nhiều đáp án</div>
                <div className="font-mono font-bold text-sm text-pos">{stats.multiAnswer} Câu hỏi</div>
                <div className="text-[11px] text-ink-faint">Dạng trắc nghiệm lựa chọn tổ hợp</div>
              </div>

              <div className="bg-panel-muted rounded-lg p-3 border border-line space-y-0.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Câu chưa chốt đáp án</div>
                <div className="font-mono font-bold text-sm text-warn">{stats.unsettled} Câu hỏi</div>
                <div className="text-[11px] text-ink-faint">Cần rà soát và duyệt chính thức</div>
              </div>
            </div>

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
                  <div className="space-y-1">
                    <div className="text-neg font-semibold">
                      {conflicting.length} cụm trong đó có ĐÁP ÁN ĐÚNG KHÁC NHAU trên cùng một câu
                      hỏi — ít nhất một bản đang dạy sai. Mở cụm ra rồi sửa hoặc xoá bản sai:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {conflicting.map(c => (
                        <button
                          key={c.ids.join(',')}
                          type="button"
                          onClick={() => { setMode('browse'); setQuery(`#${c.ids.join(',')}`); }}
                          className={`${BTN_SECONDARY} px-2 py-1 font-mono text-[11px] border-neg text-neg`}
                        >
                          {c.ids.join(', ')}
                        </button>
                      ))}
                    </div>
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
                  placeholder="Tìm trong câu hỏi, lựa chọn hoặc chủ đề — gõ #12 để tới đúng câu số 12"
                  aria-label="Tìm câu hỏi"
                  className={`w-full rounded-md pl-8 pr-3 py-2 border ${UI.inputStyle}`} />
              </div>
              <button type="button"
                onClick={() => {
                  if (formOpen && editingId === null) closeForm();
                  else openNewForm();
                }}
                className={`${BTN_PRIMARY} px-3 py-2 flex items-center gap-1.5 shrink-0`}>
                <Plus className="w-4 h-4" /> Thêm câu hỏi
              </button>
            </div>

            {stats.total > 0 && (
              <QuizImportPanel
                onImport={importQuizQuestionsAPI}
                onImported={load}
                onError={message => show('error', message)}
              />
            )}
          </>
        )}
      </div>

      {formOpen && (
        <div className={`${PANEL} p-4`}>
          <div className={`${SECTION_LABEL} mb-2`}>
            {editingId === null ? 'Thêm câu hỏi mới' : `Sửa câu hỏi số ${editingId}`}
          </div>
          <QuizQuestionForm
            draft={draft}
            setDraft={setDraft}
            questions={questions}
            saving={saving}
            editingId={editingId ?? undefined}
            onSubmit={handleSubmit}
            onCancel={closeForm}
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
                    <button type="button" onClick={() => startEdit(question)}
                      aria-label={`Sửa câu ${question.Id}`}
                      className={`${BTN_SECONDARY} px-2 py-1.5`}>
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
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
