import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  emptyDraft, draftToPayload, duplicateClusters, hasSettledAnswer, isAnswerCorrect, isMultiAnswer,
  questionToDraft, quizStats, searchQuestions,
  type QuizDraft, type QuizQuestion,
} from '../lib/quizBank';
import {
  fetchQuizQuestionsAPI, createQuizQuestionAPI, updateQuizQuestionAPI, deleteQuizQuestionAPI,
  seedQuizBankAPI,
} from '../lib/api';
import { useToast } from '../components/Toast';

export type QuizMode = 'browse' | 'practice';

export const PAGE_SIZE = 20;

export function useQuizBankController() {
  const { toast, show, dismiss } = useToast();

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [mode, setMode] = useState<QuizMode>('browse');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
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

  useEffect(() => {
    void load();
  }, [load]);

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

  const openNewForm = useCallback(() => {
    setEditingId(null);
    setDraft(emptyDraft());
    setFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditingId(null);
    setDraft(emptyDraft());
  }, []);

  const startEdit = useCallback((question: QuizQuestion) => {
    setEditingId(question.Id);
    setDraft(questionToDraft(question));
    setFormOpen(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    setSaving(true);
    try {
      const payload = draftToPayload(draft);
      if (editingId === null) {
        const saved = await createQuizQuestionAPI(payload);
        setQuestions(prev => [...prev, saved]);
        show('success', `Đã thêm câu hỏi số ${saved.Id}.`);
      } else {
        const saved = await updateQuizQuestionAPI(editingId, payload);
        setQuestions(prev => prev.map(q => (q.Id === saved.Id ? saved : q)));
        show('success', `Đã sửa câu hỏi số ${saved.Id}.`);
      }
      closeForm();
    } catch (err: any) {
      show('error', err?.message || 'Không lưu được câu hỏi.');
    } finally {
      setSaving(false);
    }
  }, [draft, editingId, show, closeForm]);

  const handleDelete = useCallback(async (question: QuizQuestion) => {
    if (!window.confirm(`Xoá câu hỏi số ${question.Id}?`)) return;
    try {
      await deleteQuizQuestionAPI(question.Id);
      setQuestions(prev => prev.filter(q => q.Id !== question.Id));
      show('success', `Đã xoá câu hỏi số ${question.Id}.`);
    } catch (err: any) {
      show('error', err?.message || 'Không xoá được câu hỏi.');
    }
  }, [show]);

  const handleSeed = useCallback(async () => {
    setSeeding(true);
    try {
      const { default: quizSeed } = await import('../data/quiz_bank.json');
      const count = await seedQuizBankAPI(quizSeed as unknown[]);
      show('success', `Đã nạp ${count} câu hỏi từ quiz_bank.json.`);
      await load();
    } catch (err: any) {
      show('error', err?.message || 'Không nạp được ngân hàng câu hỏi.');
    } finally {
      setSeeding(false);
    }
  }, [load, show]);

  const togglePick = useCallback((id: string) => {
    if (checked || !current) return;
    if (isMultiAnswer(current)) {
      setPicked(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    } else {
      setPicked([id]);
    }
  }, [checked, current]);

  const submitAnswer = useCallback(() => {
    if (!current || picked.length === 0) return;
    setChecked(true);
    setScore(prev => ({
      done: prev.done + 1,
      right: prev.right + (isAnswerCorrect(current, picked) ? 1 : 0),
    }));
  }, [current, picked]);

  const nextQuestion = useCallback(() => {
    setPicked([]);
    setChecked(false);
    setPracticeAt(at => (at + 1) % Math.max(1, practiceList.length));
  }, [practiceList.length]);

  return {
    toast,
    show,
    dismiss,
    questions,
    setQuestions,
    loading,
    loadError,
    load,
    mode,
    setMode,
    query,
    setQuery,
    page,
    setPage,
    formOpen,
    setFormOpen,
    editingId,
    setEditingId,
    draft,
    setDraft,
    openNewForm,
    saving,
    seeding,
    practiceAt,
    setPracticeAt,
    picked,
    setPicked,
    checked,
    setChecked,
    score,
    setScore,
    stats,
    clusters,
    conflicting,
    conflictingIds,
    filtered,
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
  };
}
