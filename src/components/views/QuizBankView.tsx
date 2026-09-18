import React from 'react';
import {
  GraduationCap, Search, Plus, Loader2, AlertTriangle, Download,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import {
  UI, BTN_PRIMARY, BTN_SECONDARY, HEADING_SCREEN, SECTION_LABEL,
} from '../../lib/uiClasses';
import { importQuizQuestionsAPI } from '../../lib/api';
import { Toast } from '../Toast';
import { QuizQuestionForm } from '../quiz/QuizQuestionForm';
import { QuizImportPanel } from '../quiz/QuizImportPanel';
import { QuizExportButton } from '../quiz/QuizExportButton';
import { QuizTelemetryStrip } from '../quiz/QuizTelemetryStrip';
import { QuizPracticeCard } from '../quiz/QuizPracticeCard';
import { QuizQuestionItem } from '../quiz/QuizQuestionItem';
import { useQuizBankController, PAGE_SIZE } from '../../hooks/useQuizBankController';

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
    <div className="space-y-4 text-xs font-app transition-colors duration-200">
      <Toast toast={toast} onDismiss={dismiss} />

      {/* Main Control Panel */}
      <div className="rounded-2xl p-4 sm:p-5 border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-3">
          <div className={`${HEADING_SCREEN} flex items-center gap-2.5 text-accent`}>
            <div className="p-2 rounded-xl bg-accent-soft text-accent">
              <GraduationCap size={20} />
            </div>
            <span className="uppercase tracking-tight">NGÂN HÀNG CÂU HỎI & CHẾ ĐỘ ÔN TẬP NGHIỆP VỤ</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMode('browse')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                mode === 'browse'
                  ? 'bg-accent text-accent-ink border-accent shadow-md shadow-accent/20 ring-2 ring-accent/20'
                  : 'bg-surface hover:bg-surface-elevated text-ink-muted border-line/70'
              }`}
            >
              Tra cứu
            </button>
            <button
              type="button"
              onClick={() => setMode('practice')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                mode === 'practice'
                  ? 'bg-accent text-accent-ink border-accent shadow-md shadow-accent/20 ring-2 ring-accent/20'
                  : 'bg-surface hover:bg-surface-elevated text-ink-muted border-line/70'
              }`}
            >
              Luyện tập
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2.5 text-ink-muted py-8">
            <Loader2 className="w-5 h-5 animate-spin text-accent" />
            <span className="text-xs font-semibold">Đang tải ngân hàng câu hỏi nghiệp vụ…</span>
          </div>
        ) : (
          <>
            {/* Quiz Mastery KPI Header */}
            <QuizTelemetryStrip stats={stats} />

            {clusters.length > 0 && (
              <div className="text-xs leading-relaxed border border-line/70 rounded-xl p-3.5 bg-surface/60 space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-1.5 font-bold text-ink">
                  <AlertTriangle className="w-4 h-4 text-neg" />
                  <span>{clusters.length} cụm câu hỏi trùng nội dung, gồm {clusters.reduce((s, c) => s + c.ids.length, 0)} câu</span>
                </div>
                {conflicting.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-neg font-semibold text-[11px]">
                      {conflicting.length} cụm trong đó có ĐÁP ÁN ĐÚNG KHÁC NHAU trên cùng một câu hỏi — ít nhất một bản đang dạy sai. Mở cụm ra rồi sửa hoặc xoá bản sai:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {conflicting.map(c => (
                        <button
                          key={c.ids.join(',')}
                          type="button"
                          onClick={() => { setMode('browse'); setQuery(`#${c.ids.join(',')}`); }}
                          className={`${BTN_SECONDARY} px-2.5 py-1 font-mono text-[11px] border-neg/60 text-neg rounded-lg hover:bg-neg-soft cursor-pointer`}
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
              <div role="alert" className="text-xs text-neg font-semibold p-2.5 rounded-xl bg-neg-soft border border-neg/30">
                {loadError}
              </div>
            )}

            {stats.total === 0 && !loadError && (
              <div className="space-y-2.5 border border-line/70 rounded-xl p-4 bg-surface/60 shadow-2xs">
                <div className="text-xs text-ink-muted">
                  Ngân hàng chưa có câu nào. Nạp bộ câu hỏi gốc từ <code className="font-mono bg-surface px-1.5 py-0.5 rounded border border-line/60">src/data/quiz_bank.json</code> — chỉ chạy được một lần trên bảng rỗng.
                </div>
                <button
                  type="button"
                  onClick={handleSeed}
                  disabled={seeding}
                  className={`${BTN_PRIMARY} px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-accent/20 cursor-pointer`}
                >
                  {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  <span>{seeding ? 'Đang nạp…' : 'Nạp bộ câu hỏi gốc'}</span>
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Tìm kiếm nội dung câu hỏi, mã ID (#123) hoặc từ khóa..."
                  aria-label="Tìm câu hỏi"
                  className={`w-full rounded-xl pl-9 pr-3.5 py-2.5 border ${UI.inputStyle}`}
                />
              </div>
              {stats.total > 0 && <QuizExportButton questions={questions} />}
              <button
                type="button"
                onClick={() => {
                  if (formOpen && editingId === null) closeForm();
                  else openNewForm();
                }}
                className={`${BTN_PRIMARY} px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shrink-0 shadow-md shadow-accent/20 cursor-pointer`}
              >
                <Plus className="w-4 h-4" />
                <span>Thêm câu hỏi</span>
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

      {/* Form Add / Edit Question Modal-like Box */}
      {formOpen && (
        <div className="rounded-2xl p-4 sm:p-5 border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card space-y-3 animate-in fade-in duration-150">
          <div className={`${SECTION_LABEL} mb-1 text-accent`}>
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

      {/* Mode 1: Practice Mode */}
      {!loading && mode === 'practice' && (
        <QuizPracticeCard
          practiceList={practiceList}
          practiceAt={practiceAt}
          skippedInPractice={skippedInPractice}
          score={score}
          current={current}
          picked={picked}
          checked={checked}
          togglePick={togglePick}
          submitAnswer={submitAnswer}
          nextQuestion={nextQuestion}
        />
      )}

      {/* Mode 2: Browse Mode */}
      {!loading && mode === 'browse' && (
        <div className="space-y-3">
          {pageRows.map((question, rowIndex) => {
            const isConflicting = conflictingIds.has(question.Id);
            const stt = (safePage - 1) * PAGE_SIZE + rowIndex + 1;
            return (
              <QuizQuestionItem
                key={question.Id}
                question={question}
                stt={stt}
                isConflicting={isConflicting}
                onEdit={startEdit}
                onDelete={handleDelete}
              />
            );
          })}

          {pageRows.length === 0 && (
            <div className="rounded-2xl p-8 text-center border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card text-ink-muted">
              Không có câu nào khớp từ khoá.
            </div>
          )}

          {pageCount > 1 && (
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className={`${BTN_SECONDARY} px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Trước
              </button>

              <div className="flex items-center gap-2 text-xs text-ink-muted">
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
                  className={`w-14 text-center rounded-xl px-2 py-1 font-mono font-bold text-xs border ${UI.inputStyle}`}
                />
                <span>/ {pageCount}</span>
              </div>

              <button
                type="button"
                onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                disabled={safePage >= pageCount}
                className={`${BTN_SECONDARY} px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                Sau <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
