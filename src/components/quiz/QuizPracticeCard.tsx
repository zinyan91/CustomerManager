import React from 'react';
import { BTN_PRIMARY, BTN_SECONDARY } from '../../lib/uiClasses';
import { isMultiAnswer, isAnswerCorrect, type QuizQuestion } from '../../lib/quizBank';

interface QuizPracticeCardProps {
  practiceList: QuizQuestion[];
  practiceAt: number;
  skippedInPractice: number;
  score: { done: number; right: number };
  current: QuizQuestion | null;
  picked: string[];
  checked: boolean;
  togglePick: (id: string) => void;
  submitAnswer: () => void;
  nextQuestion: () => void;
}

export const QuizPracticeCard: React.FC<QuizPracticeCardProps> = ({
  practiceList,
  practiceAt,
  skippedInPractice,
  score,
  current,
  picked,
  checked,
  togglePick,
  submitAnswer,
  nextQuestion,
}) => {
  return (
    <div className="rounded-2xl p-4 sm:p-5 border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card space-y-4 font-app animate-in fade-in duration-150">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs border-b border-line/60 pb-2.5">
        <span>
          Câu {practiceList.length === 0 ? 0 : practiceAt + 1} / {practiceList.length}
          {skippedInPractice > 0 && (
            <span className="text-ink-faint">
              {' '}· bỏ qua {skippedInPractice} câu chưa chốt đáp án
            </span>
          )}
        </span>
        <span className="text-ink-muted">
          Đã làm <strong className="text-ink">{score.done}</strong> ·{' '}
          đúng <strong className="text-pos">{score.right}</strong>
          {score.done > 0 && ` (${Math.round((score.right / score.done) * 100)}%)`}
        </span>
      </div>

      {!current ? (
        <div className="text-ink-muted text-xs p-4 text-center">Không có câu nào khớp bộ lọc.</div>
      ) : (
        <>
          <div className="space-y-1.5 p-3.5 sm:p-4 rounded-xl border border-line/70 bg-surface/60 shadow-2xs">
            <div className="text-ink leading-relaxed font-semibold text-xs sm:text-sm">{current.QuestionText}</div>
            {isMultiAnswer(current) && (
              <div className="text-[10px] uppercase font-bold tracking-[0.1em] text-accent">
                ★ Câu nhiều đáp án — chọn tất cả đáp án đúng
              </div>
            )}
          </div>

          <div className="space-y-2">
            {current.Options.map(option => {
              const isPicked = picked.includes(option.id);
              const isRight = current.CorrectAnswers.includes(option.id);
              const tone = !checked
                ? (isPicked ? 'border-accent bg-accent-soft text-accent ring-2 ring-accent/20' : 'border-line/70 bg-surface/60 text-ink hover:bg-surface hover:border-accent/40')
                : isRight
                  ? 'border-pos bg-pos-soft text-pos ring-2 ring-pos/20'
                  : (isPicked ? 'border-neg bg-neg-soft text-neg ring-2 ring-neg/20' : 'border-line/60 bg-surface/40 text-ink-muted');

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => togglePick(option.id)}
                  disabled={checked}
                  aria-pressed={isPicked}
                  className={`w-full text-left rounded-xl border p-3 flex items-start gap-2.5 transition-all cursor-pointer shadow-2xs ${tone}`}
                >
                  <span className="font-mono font-bold shrink-0">{option.id}</span>
                  <span className="leading-relaxed text-xs">{option.text}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-line/60">
            {!checked ? (
              <button
                type="button"
                onClick={submitAnswer}
                disabled={picked.length === 0}
                className={`${BTN_PRIMARY} px-4 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-accent/20 cursor-pointer disabled:opacity-50`}
              >
                Kiểm tra
              </button>
            ) : (
              <>
                <span className={`font-semibold ${isAnswerCorrect(current, picked) ? 'text-pos' : 'text-neg'}`}>
                  {isAnswerCorrect(current, picked) ? 'Đúng' : `Sai — đáp án ${current.CorrectAnswers.join(', ')}`}
                </span>
                <button
                  type="button"
                  onClick={nextQuestion}
                  className={`${BTN_SECONDARY} px-4 py-2.5 rounded-xl font-bold text-xs shadow-2xs cursor-pointer`}
                >
                  Câu tiếp
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};
