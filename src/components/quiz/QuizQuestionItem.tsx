import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { BTN_SECONDARY, BTN_DANGER, ROW_RAIL_ALERT, ROW_RAIL_NEUTRAL } from '../../lib/uiClasses';
import { hasSettledAnswer, isMultiAnswer, type QuizQuestion } from '../../lib/quizBank';

interface QuizQuestionItemProps {
  question: QuizQuestion;
  stt: number;
  isConflicting: boolean;
  onEdit: (q: QuizQuestion) => void;
  onDelete: (q: QuizQuestion) => void;
}

export const QuizQuestionItem: React.FC<QuizQuestionItemProps> = ({
  question,
  stt,
  isConflicting,
  onEdit,
  onDelete,
}) => {
  return (
    <div data-workspace-panel
      className={`rounded-xl p-3.5 sm:p-4 border border-line/70 bg-panel/85 backdrop-blur-xl shadow-xs space-y-3 font-app hover:border-accent/40 transition-all ${
        isConflicting ? ROW_RAIL_ALERT : ROW_RAIL_NEUTRAL
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-ink-faint">
            <span className="font-mono font-bold px-1.5 py-0.5 rounded-md bg-accent-soft text-accent text-[11px]">
              {stt}
            </span>
            <span className="font-mono text-ink-faint">#{question.Id}</span>
            {question.Topic && (
              <span className="px-2 py-0.5 rounded-md bg-surface border border-line/60 font-semibold text-ink-muted">
                {question.Topic}
              </span>
            )}
            {isMultiAnswer(question) && (
              <span className="px-2 py-0.5 rounded-md bg-accent-soft text-accent font-semibold border border-accent/20">
                nhiều đáp án
              </span>
            )}
            {!hasSettledAnswer(question) && (
              <span className="px-2 py-0.5 rounded-md bg-warn-soft text-warn font-semibold border border-warn/20">
                chưa chốt đáp án
              </span>
            )}
            {isConflicting && (
              <span className="px-2 py-0.5 rounded-md bg-neg-soft text-neg font-semibold border border-neg/20">
                trùng câu, lệch đáp án
              </span>
            )}
          </div>
          <div className="text-ink leading-relaxed font-semibold text-sm sm:text-base pt-0.5">
            {question.QuestionText}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onEdit(question)}
            aria-label={`Sửa câu ${question.Id}`}
            className={`${BTN_SECONDARY} p-2 rounded-xl text-ink-muted hover:text-accent hover:border-accent shadow-2xs cursor-pointer transition-colors`}
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(question)}
            aria-label={`Xoá câu ${question.Id}`}
            className={`${BTN_DANGER} p-2 rounded-xl shadow-2xs cursor-pointer transition-colors`}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="space-y-1.5 pt-1 border-t border-line/50">
        {question.Options.map(option => {
          const isRight = question.CorrectAnswers.includes(option.id);
          return (
            <div
              key={option.id}
              className={`flex items-start gap-2.5 leading-relaxed rounded-lg p-2 sm:p-2.5 text-xs sm:text-sm transition-colors ${
                isRight
                  ? 'text-pos font-bold bg-pos-soft border border-pos/30 shadow-2xs'
                  : 'text-ink-muted bg-surface/40 hover:bg-surface/70'
              }`}
            >
              <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-surface/80 border border-line/60 text-[11px] sm:text-xs shrink-0">
                {option.id}
              </span>
              <span className="pt-0.5">{option.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
