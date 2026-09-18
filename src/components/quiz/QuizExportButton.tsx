import React from 'react';
import { Download } from 'lucide-react';
import { BTN_SECONDARY } from '../../lib/uiClasses';
import {
  quizExportJson, quizExportFileName, QUIZ_EXPORT_MIME, type QuizQuestion,
} from '../../lib/quizBank';
import { downloadTextFile } from '../../lib/xlsExport';
import { todayIso } from '../../lib/utils';

interface QuizExportButtonProps {
  questions: QuizQuestion[];
}

export const QuizExportButton: React.FC<QuizExportButtonProps> = ({ questions }) => (
  <button
    type="button"
    onClick={() => downloadTextFile(
      quizExportJson(questions),
      quizExportFileName(todayIso()),
      QUIZ_EXPORT_MIME
    )}
    disabled={questions.length === 0}
    className={`${BTN_SECONDARY} px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shrink-0 shadow-2xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`}
  >
    <Download className="w-4 h-4 text-accent" />
    <span>Xuất JSON ({questions.length} câu)</span>
  </button>
);
