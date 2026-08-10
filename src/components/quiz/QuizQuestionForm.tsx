import React from 'react';
import { Plus, Trash2, Save, X } from 'lucide-react';
import { UI, BTN_PRIMARY, BTN_SECONDARY, SECTION_LABEL } from '../../lib/uiClasses';
import {
  optionLetter, relabelOptions, validateQuizDraft, findDuplicateQuestion,
  MIN_DRAFT_OPTIONS, MAX_DRAFT_OPTIONS,
  type QuizDraft, type QuizQuestion,
} from '../../lib/quizBank';

interface QuizQuestionFormProps {
  draft: QuizDraft;
  setDraft: (next: QuizDraft) => void;
  questions: Pick<QuizQuestion, 'Id' | 'QuestionText'>[];
  saving: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

export const QuizQuestionForm: React.FC<QuizQuestionFormProps> = ({
  draft, setDraft, questions, saving, onSubmit, onCancel,
}) => {
  const errors = validateQuizDraft(draft, questions);
  const duplicate = findDuplicateQuestion(draft.questionText, questions);

  const setOptionText = (index: number, text: string) => {
    setDraft({
      ...draft,
      options: draft.options.map((o, i) => (i === index ? { ...o, text } : o)),
    });
  };

  const toggleCorrect = (id: string) => {
    setDraft({
      ...draft,
      correctAnswers: draft.correctAnswers.includes(id)
        ? draft.correctAnswers.filter(x => x !== id)
        : [...draft.correctAnswers, id],
    });
  };

  const addOption = () => {
    if (draft.options.length >= MAX_DRAFT_OPTIONS) return;
    setDraft({
      ...draft,
      options: [...draft.options, { id: optionLetter(draft.options.length), text: '' }],
    });
  };

  const removeOption = (index: number) => {
    if (draft.options.length <= MIN_DRAFT_OPTIONS) return;
    const kept = draft.options.filter((_, i) => i !== index);
    const dropped = draft.options[index].id;
    const { options, correctAnswers } = relabelOptions(
      kept,
      draft.correctAnswers.filter(id => id !== dropped)
    );
    setDraft({ ...draft, options, correctAnswers });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label htmlFor="quiz-question" className={SECTION_LABEL}>Nội dung câu hỏi</label>
        <textarea
          id="quiz-question"
          rows={3}
          value={draft.questionText}
          onChange={e => setDraft({ ...draft, questionText: e.target.value })}
          placeholder="Dán nguyên văn câu hỏi, kể cả số hiệu quyết định"
          className={`w-full rounded-md px-3 py-2 border resize-y ${UI.inputStyle}`}
        />
        {duplicate && (
          <div role="alert" className="text-[11px] text-neg font-semibold">
            Đã có câu này trong ngân hàng — số {duplicate.Id}. Sửa nội dung hoặc bỏ qua.
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className={SECTION_LABEL}>
            Lựa chọn — tích vào ô vuông ở những đáp án đúng
          </span>
          <span className="text-[10px] text-ink-faint">
            {draft.answerUnsettled
              ? 'Chưa chốt đáp án'
              : draft.correctAnswers.length > 1 ? 'Câu nhiều đáp án' : 'Câu một đáp án'}
          </span>
        </div>

        {draft.options.map((option, index) => {
          const isCorrect = draft.correctAnswers.includes(option.id);
          return (
            <div key={option.id} className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 shrink-0 w-14">
                <input
                  type="checkbox"
                  checked={isCorrect}
                  disabled={draft.answerUnsettled}
                  onChange={() => toggleCorrect(option.id)}
                  aria-label={`Lựa chọn ${option.id} là đáp án đúng`}
                  className="accent-accent"
                />
                <span className={`font-mono text-[11px] ${isCorrect ? 'text-pos font-bold' : 'text-ink-faint'}`}>
                  {option.id}
                </span>
              </label>
              <input
                type="text"
                value={option.text}
                onChange={e => setOptionText(index, e.target.value)}
                aria-label={`Nội dung lựa chọn ${option.id}`}
                placeholder={index < MIN_DRAFT_OPTIONS ? 'Bắt buộc' : 'Để trống thì bỏ qua'}
                className={`flex-1 min-w-0 rounded-md px-2.5 py-1.5 border ${UI.inputStyle}`}
              />
              <button
                type="button"
                onClick={() => removeOption(index)}
                disabled={draft.options.length <= MIN_DRAFT_OPTIONS}
                aria-label={`Xoá lựa chọn ${option.id}`}
                className={`${BTN_SECONDARY} px-1.5 py-1.5 shrink-0`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}

        <div className="flex flex-wrap items-center gap-3 pt-0.5">
          <button
            type="button"
            onClick={addOption}
            disabled={draft.options.length >= MAX_DRAFT_OPTIONS}
            className={`${BTN_SECONDARY} px-2.5 py-1 text-[11px] flex items-center gap-1`}
          >
            <Plus className="w-3 h-3" /> Thêm lựa chọn
          </button>

          <label className="flex items-center gap-1.5 text-[11px] text-ink-muted">
            <input
              type="checkbox"
              checked={draft.answerUnsettled}
              onChange={() => setDraft({
                ...draft,
                answerUnsettled: !draft.answerUnsettled,
                correctAnswers: draft.answerUnsettled ? draft.correctAnswers : [],
              })}
              className="accent-accent"
            />
            Chưa chốt đáp án
          </label>
        </div>

        {draft.answerUnsettled && (
          <div className="text-[10px] text-ink-faint leading-relaxed">
            Dùng cho câu mà đề ghi "câu nào cũng sai", hoặc câu còn phải đối chiếu văn bản gốc.
            Chế độ Luyện tập sẽ bỏ qua câu này vì không chấm được.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="quiz-topic" className={SECTION_LABEL}>Chủ đề</label>
          <input
            id="quiz-topic"
            type="text"
            value={draft.topic}
            onChange={e => setDraft({ ...draft, topic: e.target.value })}
            placeholder="Thẻ, TSBĐ, sản phẩm cho vay…"
            className={`w-full rounded-md px-2.5 py-1.5 border ${UI.inputStyle}`}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="quiz-sources" className={SECTION_LABEL}>Nguồn</label>
          <input
            id="quiz-sources"
            type="text"
            value={draft.sources.join('; ')}
            onChange={e => setDraft({
              ...draft,
              sources: e.target.value.split(';').map(s => s.trim()).filter(Boolean),
            })}
            placeholder="PDF1 (Câu 12); QĐ 3032/2023/QĐ-TDCN"
            className={`w-full rounded-md px-2.5 py-1.5 border ${UI.inputStyle}`}
          />
        </div>
      </div>

      {errors.length > 0 && (
        <ul role="alert" className="text-[11px] text-neg space-y-0.5 list-disc pl-4">
          {errors.map(e => <li key={e}>{e}</li>)}
        </ul>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={onSubmit}
          disabled={saving || errors.length > 0}
          className={`${BTN_PRIMARY} px-3.5 py-2 flex items-center gap-1.5`}
        >
          <Save className="w-4 h-4" /> {saving ? 'Đang lưu…' : 'Lưu câu hỏi'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={`${BTN_SECONDARY} px-3 py-2 flex items-center gap-1.5`}
        >
          <X className="w-4 h-4" /> Bỏ
        </button>
      </div>
    </div>
  );
};
