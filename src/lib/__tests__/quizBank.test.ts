import { describe, it, expect } from 'vitest';
import quizSeed from '../../data/quiz_bank.json';
import {
  quizNormalizeText, optionLetter, emptyDraft, relabelOptions,
  findDuplicateQuestion, duplicateClusters, validateQuizDraft, draftToPayload, hasSettledAnswer,
  isAnswerCorrect, isMultiAnswer, searchQuestions, quizStats, parseQuizImportFile,
  MIN_DRAFT_OPTIONS, type QuizQuestion, type QuizDraft,
} from '../quizBank';

const q = (over: Partial<QuizQuestion> = {}): QuizQuestion => ({
  Id: 1,
  QuestionText: 'Mức cho vay tối đa là bao nhiêu?',
  Options: [
    { id: 'A', text: 'Tối đa 70%' },
    { id: 'B', text: 'Tối đa 100%' },
  ],
  CorrectAnswers: ['B'],
  Sources: ['PDF1 (Câu 6)'],
  ...over,
});

const draft = (over: Partial<QuizDraft> = {}): QuizDraft => ({
  ...emptyDraft(),
  questionText: 'Câu hỏi mới',
  options: [
    { id: 'A', text: 'Một' },
    { id: 'B', text: 'Hai' },
    { id: 'C', text: '' },
    { id: 'D', text: '' },
  ],
  correctAnswers: ['A'],
  ...over,
});

describe('quizNormalizeText', () => {
  it('hạ chữ, gộp khoảng trắng, cắt hai đầu', () => {
    expect(quizNormalizeText('  Mức   cho vay\nTỐI đa ')).toBe('mức cho vay tối đa');
  });

  it('giữ nguyên dấu tiếng Việt — hai câu khác dấu là hai câu khác nghĩa', () => {
    expect(quizNormalizeText('lãi')).not.toBe(quizNormalizeText('lai'));
  });

  it('chịu được chuỗi rỗng', () => {
    expect(quizNormalizeText('')).toBe('');
  });
});

describe('optionLetter', () => {
  it('đếm A, B, C… rồi sang AA', () => {
    expect([0, 1, 4, 25, 26].map(optionLetter)).toEqual(['A', 'B', 'E', 'Z', 'AA']);
  });
});

describe('findDuplicateQuestion', () => {
  const bank = [q({ Id: 7, QuestionText: 'Mức cho vay tối đa là bao nhiêu?' })];

  it('bắt trùng dù lệch hoa thường và khoảng trắng', () => {
    expect(findDuplicateQuestion('  mức CHO vay   tối đa là bao nhiêu?  ', bank)?.Id).toBe(7);
  });

  it('không coi câu khác là trùng', () => {
    expect(findDuplicateQuestion('Mức cho vay tối thiểu là bao nhiêu?', bank)).toBeNull();
  });

  it('bỏ qua chính dòng đang sửa', () => {
    expect(findDuplicateQuestion('Mức cho vay tối đa là bao nhiêu?', bank, 7)).toBeNull();
  });

  it('chuỗi rỗng không tính là trùng', () => {
    expect(findDuplicateQuestion('   ', bank)).toBeNull();
  });
});

describe('duplicateClusters', () => {
  it('gom các câu trùng thành cụm, bỏ câu chỉ xuất hiện một lần', () => {
    const clusters = duplicateClusters([
      q({ Id: 1, QuestionText: 'A?' }),
      q({ Id: 2, QuestionText: 'a ?' }),
      q({ Id: 3, QuestionText: ' A? ' }),
      q({ Id: 4, QuestionText: 'B?' }),
    ]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].ids).toEqual([1, 3]);
  });
});

describe('validateQuizDraft', () => {
  it('bản nháp hợp lệ thì không lỗi', () => {
    expect(validateQuizDraft(draft(), [])).toEqual([]);
  });

  it('thiếu nội dung câu hỏi', () => {
    expect(validateQuizDraft(draft({ questionText: '   ' }), []))
      .toContain('Chưa nhập nội dung câu hỏi.');
  });

  it(`ít hơn ${MIN_DRAFT_OPTIONS} lựa chọn có nội dung`, () => {
    const errors = validateQuizDraft(
      draft({ options: [{ id: 'A', text: 'Một' }, { id: 'B', text: '  ' }] }), []
    );
    expect(errors.some(e => e.includes('ít nhất 2 lựa chọn'))).toBe(true);
  });

  it('chưa chọn đáp án đúng', () => {
    expect(validateQuizDraft(draft({ correctAnswers: [] }), []))
      .toContain('Chưa chọn đáp án đúng nào.');
  });

  it('đáp án trỏ vào lựa chọn để trống thì coi như chưa chọn', () => {
    expect(validateQuizDraft(draft({ correctAnswers: ['C'] }), []))
      .toContain('Chưa chọn đáp án đúng nào.');
  });

  it('hai lựa chọn nhập trùng nội dung', () => {
    const errors = validateQuizDraft(draft({
      options: [{ id: 'A', text: 'Một' }, { id: 'B', text: ' MỘT ' }],
    }), []);
    expect(errors.some(e => e.includes('bị nhập hai lần'))).toBe(true);
  });

  it('câu hỏi đã có trong ngân hàng', () => {
    const errors = validateQuizDraft(
      draft({ questionText: 'Đã có rồi' }),
      [q({ Id: 42, QuestionText: 'đã CÓ rồi' })]
    );
    expect(errors).toContain('Câu hỏi này đã có trong ngân hàng (số 42).');
  });

  it('KHÔNG chặn câu mà mọi lựa chọn đều đúng — ngân hàng có 4 câu như vậy', () => {
    expect(validateQuizDraft(draft({ correctAnswers: ['A', 'B'] }), [])).toEqual([]);
  });

  it('đánh dấu chưa chốt đáp án thì không cần chọn đáp án nào', () => {
    expect(validateQuizDraft(
      draft({ correctAnswers: [], answerUnsettled: true }), []
    )).toEqual([]);
  });

  it('không cho vừa đánh dấu chưa chốt vừa chọn đáp án', () => {
    expect(validateQuizDraft(
      draft({ correctAnswers: ['A'], answerUnsettled: true }), []
    )).toContain('Đã đánh dấu chưa chốt đáp án thì không chọn đáp án đúng nào được.');
  });
});

describe('draftToPayload', () => {
  it('bỏ lựa chọn rỗng, đánh lại mã liền mạch, cắt khoảng trắng', () => {
    const payload = draftToPayload(draft({
      questionText: '  Câu hỏi  ',
      options: [
        { id: 'A', text: ' Một ' },
        { id: 'B', text: '   ' },
        { id: 'C', text: 'Ba' },
        { id: 'D', text: 'Bốn' },
      ],
      correctAnswers: ['C'],
      sources: [' PDF1 (Câu 9) ', '  '],
      topic: ' Thẻ ',
    }));

    expect(payload.QuestionText).toBe('Câu hỏi');
    expect(payload.Options).toEqual([
      { id: 'A', text: 'Một' },
      { id: 'B', text: 'Ba' },
      { id: 'C', text: 'Bốn' },
    ]);
    expect(payload.CorrectAnswers).toEqual(['B']);
    expect(payload.Sources).toEqual(['PDF1 (Câu 9)']);
    expect(payload.Topic).toBe('Thẻ');
  });

  it('chủ đề rỗng thành null', () => {
    expect(draftToPayload(draft({ topic: '  ' })).Topic).toBeNull();
  });

  it('giữ đủ nhiều đáp án đúng', () => {
    const payload = draftToPayload(draft({
      options: [
        { id: 'A', text: 'Một' },
        { id: 'B', text: 'Hai' },
        { id: 'C', text: 'Ba' },
      ],
      correctAnswers: ['A', 'C'],
    }));
    expect(payload.CorrectAnswers).toEqual(['A', 'C']);
  });
});

describe('relabelOptions', () => {
  it('xoá lựa chọn giữa thì mã dồn lại và đáp án đúng đi theo', () => {
    const { options, correctAnswers } = relabelOptions(
      [{ id: 'A', text: 'Một' }, { id: 'C', text: 'Ba' }, { id: 'D', text: 'Bốn' }],
      ['C', 'D']
    );
    expect(options.map(o => o.id)).toEqual(['A', 'B', 'C']);
    expect(options.map(o => o.text)).toEqual(['Một', 'Ba', 'Bốn']);
    expect(correctAnswers).toEqual(['B', 'C']);
  });
});

describe('isAnswerCorrect', () => {
  it('một đáp án — đúng khi khớp', () => {
    expect(isAnswerCorrect(q(), ['B'])).toBe(true);
    expect(isAnswerCorrect(q(), ['A'])).toBe(false);
  });

  it('nhiều đáp án — phải đủ và không thừa', () => {
    const multi = q({ CorrectAnswers: ['A', 'C'] });
    expect(isAnswerCorrect(multi, ['C', 'A'])).toBe(true);
    expect(isAnswerCorrect(multi, ['A'])).toBe(false);
    expect(isAnswerCorrect(multi, ['A', 'B', 'C'])).toBe(false);
  });

  it('không chọn gì thì sai', () => {
    expect(isAnswerCorrect(q(), [])).toBe(false);
  });

  it('câu chưa chốt đáp án thì không bao giờ chấm đúng, kể cả khi không chọn gì', () => {
    const unsettled = q({ CorrectAnswers: [] });
    expect(hasSettledAnswer(unsettled)).toBe(false);
    expect(isAnswerCorrect(unsettled, [])).toBe(false);
    expect(isAnswerCorrect(unsettled, ['A'])).toBe(false);
  });

  it('nhận ra câu nhiều đáp án', () => {
    expect(isMultiAnswer(q())).toBe(false);
    expect(isMultiAnswer(q({ CorrectAnswers: ['A', 'B'] }))).toBe(true);
  });
});

describe('searchQuestions', () => {
  const bank = [
    q({ Id: 1, QuestionText: 'Hạn mức thẻ Platinum' }),
    q({ Id: 2, QuestionText: 'Lãi suất cho vay', Options: [{ id: 'A', text: 'Thả nổi' }, { id: 'B', text: 'Cố định' }] }),
    q({ Id: 3, QuestionText: 'Tài sản bảo đảm', Sources: ['PDF2 (Câu 15)'], Topic: 'TSBĐ' }),
  ];

  it('tra theo nội dung câu hỏi, không phân biệt hoa thường', () => {
    expect(searchQuestions(bank, 'platinum').map(x => x.Id)).toEqual([1]);
  });

  it('tra cả trong lựa chọn, nguồn và chủ đề', () => {
    expect(searchQuestions(bank, 'thả nổi').map(x => x.Id)).toEqual([2]);
    expect(searchQuestions(bank, 'pdf2').map(x => x.Id)).toEqual([3]);
    expect(searchQuestions(bank, 'tsbđ').map(x => x.Id)).toEqual([3]);
  });

  it('tra #id thì ra đúng một câu — để lần từ báo cáo nạp thêm về câu đang có', () => {
    expect(searchQuestions(bank, '#3').map(x => x.Id)).toEqual([3]);
    expect(searchQuestions(bank, ' #3 ').map(x => x.Id)).toEqual([3]);
    expect(searchQuestions(bank, '#999')).toEqual([]);
  });

  it('từ khoá rỗng thì trả nguyên bộ', () => {
    expect(searchQuestions(bank, '  ')).toHaveLength(3);
  });
});

describe('ngân hàng câu hỏi có thật trong repo', () => {
  const raw = quizSeed as unknown as {
    id: number;
    question: string;
    options: { id: string; text: string }[];
    correct_answers: string[];
    sources: string[];
  }[];

  const bank: QuizQuestion[] = raw.map(r => ({
    Id: r.id,
    QuestionText: r.question,
    Options: r.options,
    CorrectAnswers: r.correct_answers,
    Sources: r.sources,
  }));

  it('662 câu, 21 câu nhiều đáp án, 2 câu chưa chốt đáp án, số lựa chọn từ 1 tới 5', () => {
    const stats = quizStats(bank);
    expect(stats.total).toBe(662);
    expect(stats.multiAnswer).toBe(21);
    expect(stats.unsettled).toBe(2);
    expect(stats.optionCounts).toEqual([
      { size: 1, count: 1 },
      { size: 2, count: 8 },
      { size: 3, count: 1 },
      { size: 4, count: 644 },
      { size: 5, count: 8 },
    ]);
  });

  it('9 cụm trùng nội dung gồm 24 câu — giữ nguyên theo quyết định 10/08/2026', () => {
    const clusters = duplicateClusters(bank);
    expect(clusters).toHaveLength(9);
    expect(clusters.reduce((s, c) => s + c.ids.length, 0)).toBe(24);
  });

  it('ba cụm trùng có đáp án đúng KHÁC NHAU — không phải trùng vô hại', () => {
    const byId = new Map(bank.map(x => [x.Id, x]));
    const conflicting = duplicateClusters(bank).filter(c => {
      const keys = new Set(c.ids.map(id =>
        [...(byId.get(id)?.CorrectAnswers || [])].sort().join(',')
      ));
      return keys.size > 1;
    });
    expect(conflicting.map(c => c.ids)).toEqual([
      [267, 272, 274, 283],
      [309, 325, 344, 345],
      [318, 343, 347],
    ]);
  });

  it('mọi đáp án đúng đều nằm trong danh sách lựa chọn — cùng luật với trigger CSDL', () => {
    const lech = bank.filter(x => {
      const ids = new Set(x.Options.map(o => o.id));
      return x.CorrectAnswers.some(a => !ids.has(a));
    });
    expect(lech).toEqual([]);
  });

  it('đúng hai câu "CÂU NÀO CŨNG SAI" để trống đáp án — chốt 10/08/2026', () => {
    expect(bank.filter(x => !hasSettledAnswer(x)).map(x => x.Id)).toEqual([504, 570]);
    for (const id of [504, 570]) {
      expect(bank.find(x => x.Id === id)?.QuestionText).toMatch(/CÂU NÀO CŨNG SAI/);
    }
  });

  it('bốn câu mọi lựa chọn đều đúng một cách hợp lệ — vì vậy không đặt ràng buộc chặn', () => {
    const allCorrect = bank.filter(x =>
      hasSettledAnswer(x) && x.CorrectAnswers.length === x.Options.length && x.Options.length > 1);
    expect(allCorrect.map(x => x.Id)).toEqual([176, 194, 195, 198]);
  });

  it('không câu nào thiếu lựa chọn', () => {
    expect(bank.filter(x => x.Options.length === 0)).toEqual([]);
  });

  it('mã lựa chọn trong một câu không lặp', () => {
    const lap = bank.filter(x => new Set(x.Options.map(o => o.id)).size !== x.Options.length);
    expect(lap).toEqual([]);
  });
});

describe('parseQuizImportFile', () => {
  const file = (rows: unknown) => JSON.stringify(rows);

  it('đọc đúng dạng của quiz_bank.json', () => {
    const { rows, skipped } = parseQuizImportFile(file([{
      id: 9,
      question: '  Hạn mức thẻ Platinum là bao nhiêu?  ',
      options: [{ id: 'A', text: ' 100tr ' }, { id: 'B', text: '500tr' }],
      correct_answers: ['B'],
      sources: [' PDF3 (Câu 2) '],
    }]));

    expect(skipped).toEqual([]);
    expect(rows).toEqual([{
      question: 'Hạn mức thẻ Platinum là bao nhiêu?',
      options: [{ id: 'A', text: '100tr' }, { id: 'B', text: '500tr' }],
      correct_answers: ['B'],
      sources: ['PDF3 (Câu 2)'],
      topic: null,
    }]);
  });

  it('bỏ qua khoá id của tệp — CSDL tự cấp số', () => {
    const { rows } = parseQuizImportFile(file([{
      id: 999, question: 'A?', options: ['Một', 'Hai'], correct_answers: ['A'],
    }]));
    expect(rows[0]).not.toHaveProperty('id');
  });

  it('lựa chọn dạng mảng chuỗi thì tự đánh mã A, B, C', () => {
    const { rows } = parseQuizImportFile(file([{
      question: 'A?', options: ['Một', 'Hai', 'Ba'], correct_answers: 'B',
    }]));
    expect(rows[0].options).toEqual([
      { id: 'A', text: 'Một' }, { id: 'B', text: 'Hai' }, { id: 'C', text: 'Ba' },
    ]);
    expect(rows[0].correct_answers).toEqual(['B']);
  });

  it('nhận khoá tiếng Việt và đáp án viết liền bằng dấu phẩy', () => {
    const { rows } = parseQuizImportFile(file([{
      cau_hoi: 'A?', lua_chon: ['Một', 'Hai'], dap_an: 'A, B', chu_de: ' Thẻ ', nguon: 'PDF4',
    }]));
    expect(rows[0].correct_answers).toEqual(['A', 'B']);
    expect(rows[0].topic).toBe('Thẻ');
    expect(rows[0].sources).toEqual(['PDF4']);
  });

  it('object bọc ngoài có khoá questions cũng đọc được', () => {
    const { rows } = parseQuizImportFile(JSON.stringify({
      questions: [{ question: 'A?', options: ['Một', 'Hai'], correct_answers: ['A'] }],
    }));
    expect(rows).toHaveLength(1);
  });

  it('câu chưa chốt đáp án nạp được — mảng đáp án rỗng', () => {
    const { rows, skipped } = parseQuizImportFile(file([{
      question: 'Câu nào cũng sai', options: ['Một', 'Hai'], correct_answers: [],
    }]));
    expect(skipped).toEqual([]);
    expect(rows[0].correct_answers).toEqual([]);
  });

  it('báo từng dòng bỏ qua kèm số dòng và lý do, không nuốt', () => {
    const { rows, skipped } = parseQuizImportFile(file([
      { question: '  ', options: ['Một', 'Hai'] },
      { question: 'A?', options: [] },
      { question: 'B?', options: ['Một', 'Hai'], correct_answers: ['Z'] },
      { question: 'C?', options: [{ id: 'A', text: 'Một' }, { id: 'A', text: 'Hai' }] },
      'không phải object',
      { question: 'D?', options: ['Một', 'Hai'], correct_answers: ['A'] },
    ]));

    expect(rows.map(r => r.question)).toEqual(['D?']);
    expect(skipped).toEqual([
      { at: 1, reason: 'Thiếu nội dung câu hỏi.' },
      { at: 2, reason: 'Không đọc được lựa chọn nào.' },
      { at: 3, reason: 'Đáp án Z không nằm trong danh sách lựa chọn.' },
      { at: 4, reason: 'Mã lựa chọn bị lặp trong cùng một câu.' },
      { at: 5, reason: 'Không phải một object câu hỏi.' },
    ]);
  });

  it('tệp không phải JSON thì báo rõ', () => {
    expect(() => parseQuizImportFile('{ hỏng')).toThrow('Tệp không phải JSON hợp lệ.');
  });

  it('JSON hợp lệ nhưng không phải mảng câu hỏi thì báo rõ', () => {
    expect(() => parseQuizImportFile('{"a":1}')).toThrow(/mảng câu hỏi/);
  });

  it('tệp rỗng ra không câu nào, không nổ', () => {
    expect(parseQuizImportFile('[]')).toEqual({ rows: [], skipped: [] });
  });
});
