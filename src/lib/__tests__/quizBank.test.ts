import { describe, it, expect } from 'vitest';
import quizSeed from '../../data/quiz_bank.json';
import {
  quizNormalizeText, quizDuplicateKey, optionLetter, emptyDraft, relabelOptions,
  findDuplicateQuestion, duplicateClusters, validateQuizDraft, draftToPayload, hasSettledAnswer,
  isAnswerCorrect, isMultiAnswer, searchQuestions, quizStats, parseQuizImportFile, questionToDraft,
  quizQuestionsToExportRows, quizExportJson, quizExportFileName,
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

describe('quizDuplicateKey', () => {
  const opts = (...texts: string[]) => texts.map((text, i) => ({ id: optionLetter(i), text }));

  it('cùng câu hỏi cùng lựa chọn thì cùng khoá, dù lệch hoa thường và khoảng trắng', () => {
    expect(quizDuplicateKey('  Câu   HỎI ', opts('Một', 'Hai')))
      .toBe(quizDuplicateKey('câu hỏi', opts('MỘT', ' hai ')));
  });

  it('CÙNG CÂU HỎI NHƯNG KHÁC BỘ LỰA CHỌN thì KHÁC khoá', () => {
    expect(quizDuplicateKey('Câu hỏi', opts('Một', 'Hai')))
      .not.toBe(quizDuplicateKey('Câu hỏi', opts('Ba', 'Bốn')));
  });

  it('đảo thứ tự lựa chọn vẫn là một câu', () => {
    expect(quizDuplicateKey('Câu hỏi', opts('Một', 'Hai', 'Ba')))
      .toBe(quizDuplicateKey('Câu hỏi', opts('Ba', 'Một', 'Hai')));
  });

  it('mã lựa chọn không tính vào khoá — chỉ nội dung mới tính', () => {
    expect(quizDuplicateKey('Câu hỏi', [{ id: 'A', text: 'Một' }, { id: 'B', text: 'Hai' }]))
      .toBe(quizDuplicateKey('Câu hỏi', [{ id: 'X', text: 'Một' }, { id: 'Y', text: 'Hai' }]));
  });

  it('thêm một lựa chọn thì đổi khoá', () => {
    expect(quizDuplicateKey('Câu hỏi', opts('Một', 'Hai')))
      .not.toBe(quizDuplicateKey('Câu hỏi', opts('Một', 'Hai', 'Ba')));
  });
});

describe('findDuplicateQuestion', () => {
  const twoOptions = [{ id: 'A', text: 'Tối đa 70%' }, { id: 'B', text: 'Tối đa 100%' }];
  const bank = [q({ Id: 7, QuestionText: 'Mức cho vay tối đa là bao nhiêu?' })];

  it('bắt trùng dù lệch hoa thường và khoảng trắng', () => {
    expect(findDuplicateQuestion(
      '  mức CHO vay   tối đa là bao nhiêu?  ', twoOptions, bank
    )?.Id).toBe(7);
  });

  it('không coi câu khác là trùng', () => {
    expect(findDuplicateQuestion(
      'Mức cho vay tối thiểu là bao nhiêu?', twoOptions, bank
    )).toBeNull();
  });

  it('CÙNG CÂU DẪN nhưng khác bộ lựa chọn thì KHÔNG phải trùng', () => {
    expect(findDuplicateQuestion(
      'Mức cho vay tối đa là bao nhiêu?',
      [{ id: 'A', text: 'Ba tỷ' }, { id: 'B', text: 'Năm tỷ' }],
      bank
    )).toBeNull();
  });

  it('bỏ qua chính dòng đang sửa', () => {
    expect(findDuplicateQuestion(
      'Mức cho vay tối đa là bao nhiêu?', twoOptions, bank, 7
    )).toBeNull();
  });

  it('chuỗi rỗng không tính là trùng', () => {
    expect(findDuplicateQuestion('   ', twoOptions, bank)).toBeNull();
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

  it('cùng câu dẫn mà hai bộ lựa chọn thì thành HAI cụm, không phải một', () => {
    const bo1 = [{ id: 'A', text: 'Một' }, { id: 'B', text: 'Hai' }];
    const bo2 = [{ id: 'A', text: 'Ba' }, { id: 'B', text: 'Bốn' }];
    const chung = 'Các trường hợp sau đây hạn chế nhận thế chấp';

    const clusters = duplicateClusters([
      q({ Id: 267, QuestionText: chung, Options: bo1, CorrectAnswers: ['B'] }),
      q({ Id: 272, QuestionText: chung, Options: bo1, CorrectAnswers: ['B'] }),
      q({ Id: 274, QuestionText: chung, Options: bo2, CorrectAnswers: ['D'] }),
      q({ Id: 283, QuestionText: chung, Options: bo2, CorrectAnswers: ['D'] }),
    ]);

    expect(clusters.map(c => c.ids).sort((a, b) => a[0] - b[0]))
      .toEqual([[267, 272], [274, 283]]);
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

  it('câu hỏi đã có trong ngân hàng — trùng cả câu dẫn lẫn bộ lựa chọn', () => {
    const errors = validateQuizDraft(
      draft({ questionText: 'Đã có rồi' }),
      [q({
        Id: 42,
        QuestionText: 'đã CÓ rồi',
        Options: [{ id: 'A', text: ' một ' }, { id: 'B', text: 'HAI' }],
      })]
    );
    expect(errors).toContain('Câu hỏi này đã có trong ngân hàng (số 42).');
  });

  it('cùng câu dẫn nhưng bộ lựa chọn khác thì KHÔNG chặn', () => {
    expect(validateQuizDraft(
      draft({ questionText: 'Đã có rồi' }),
      [q({ Id: 42, QuestionText: 'đã CÓ rồi' })]
    )).toEqual([]);
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

describe('questionToDraft', () => {
  it('dựng bản nháp đúng từ câu đang có', () => {
    expect(questionToDraft(q({ Topic: 'Thẻ', Sources: ['PDF1'] }))).toEqual({
      questionText: 'Mức cho vay tối đa là bao nhiêu?',
      options: [{ id: 'A', text: 'Tối đa 70%' }, { id: 'B', text: 'Tối đa 100%' }],
      correctAnswers: ['B'],
      sources: ['PDF1'],
      topic: 'Thẻ',
      answerUnsettled: false,
    });
  });

  it('câu chưa chốt đáp án thì bật sẵn answerUnsettled', () => {
    expect(questionToDraft(q({ CorrectAnswers: [] })).answerUnsettled).toBe(true);
  });

  it('chủ đề null thành chuỗi rỗng, không thành chữ null', () => {
    expect(questionToDraft(q({ Topic: null })).topic).toBe('');
  });

  it('không dùng chung mảng với câu gốc — sửa nháp không đụng dữ liệu đang hiển thị', () => {
    const goc = q();
    const nhap = questionToDraft(goc);
    nhap.correctAnswers.push('A');
    nhap.options[0].text = 'đổi rồi';
    expect(goc.CorrectAnswers).toEqual(['B']);
    expect(goc.Options[0].text).toBe('Tối đa 70%');
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

  it('tra #a,b,c thì ra đúng cụm đó — dùng cho nút mở cụm lệch đáp án', () => {
    expect(searchQuestions(bank, '#1,3').map(x => x.Id)).toEqual([1, 3]);
    expect(searchQuestions(bank, '#1, 2 ,3').map(x => x.Id)).toEqual([1, 2, 3]);
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

  it('6 cụm trùng gồm 12 câu — so bằng câu hỏi VÀ bộ lựa chọn', () => {
    const clusters = duplicateClusters(bank);
    expect(clusters).toHaveLength(6);
    expect(clusters.reduce((s, c) => s + c.ids.length, 0)).toBe(12);
  });

  it('KHÔNG cụm nào lệch đáp án — cảnh báo "3 cụm dạy sai" trước đây là báo động giả', () => {
    const byId = new Map(bank.map(x => [x.Id, x]));
    const conflicting = duplicateClusters(bank).filter(c => {
      const keys = new Set(c.ids.map(id =>
        [...(byId.get(id)?.CorrectAnswers || [])].sort().join(',')
      ));
      return keys.size > 1;
    });
    expect(conflicting).toEqual([]);
  });

  it('267/272 và 274/283 là HAI câu khác nhau dùng chung một câu dẫn', () => {
    const byId = new Map(bank.map(x => [x.Id, x]));
    const key = (id: number) => {
      const x = byId.get(id) as QuizQuestion;
      return quizDuplicateKey(x.QuestionText, x.Options);
    };

    expect(byId.get(267)?.QuestionText).toBe(byId.get(274)?.QuestionText);
    expect(key(267)).toBe(key(272));
    expect(key(274)).toBe(key(283));
    expect(key(267)).not.toBe(key(274));
    expect(byId.get(267)?.CorrectAnswers).toEqual(['B']);
    expect(byId.get(274)?.CorrectAnswers).toEqual(['D']);
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

describe('quizQuestionsToExportRows', () => {
  it('sắp theo Id tăng dần và đổi sang khoá của tệp nhập', () => {
    const rows = quizQuestionsToExportRows([
      q({ Id: 7, QuestionText: 'Câu bảy' }),
      q({ Id: 2, QuestionText: 'Câu hai' }),
    ]);

    expect(rows.map(r => r.id)).toEqual([2, 7]);
    expect(rows[0]).toEqual({
      id: 2,
      question: 'Câu hai',
      options: [
        { id: 'A', text: 'Tối đa 70%' },
        { id: 'B', text: 'Tối đa 100%' },
      ],
      correct_answers: ['B'],
      sources: ['PDF1 (Câu 6)'],
    });
  });

  it('chỉ ghi chủ đề khi có, không ghi khoá rỗng', () => {
    expect(quizQuestionsToExportRows([q({ Topic: '  Tuân thủ ' })])[0].topic).toBe('Tuân thủ');
    expect(quizQuestionsToExportRows([q({ Topic: '   ' })])[0]).not.toHaveProperty('topic');
    expect(quizQuestionsToExportRows([q({ Topic: null })])[0]).not.toHaveProperty('topic');
  });

  it('không dùng chung tham chiếu mảng với câu gốc', () => {
    const source = q();
    const row = quizQuestionsToExportRows([source])[0];
    row.options.push({ id: 'C', text: 'Thêm sau khi xuất' });
    row.correct_answers.push('C');
    row.sources.push('Nguồn lạ');

    expect(source.Options).toHaveLength(2);
    expect(source.CorrectAnswers).toEqual(['B']);
    expect(source.Sources).toEqual(['PDF1 (Câu 6)']);
  });

  it('ngân hàng rỗng ra mảng rỗng', () => {
    expect(quizQuestionsToExportRows([])).toEqual([]);
  });
});

describe('quizExportJson', () => {
  it('nạp lại được chính tệp vừa xuất, không câu nào bị bỏ', () => {
    const bank = [
      q({ Id: 1, Topic: 'Tuân thủ' }),
      q({
        Id: 4,
        QuestionText: 'Tiêu chí nhận diện rủi ro gồm những gì?',
        Options: [
          { id: 'A', text: 'Thái độ' },
          { id: 'B', text: 'Hành vi' },
        ],
        CorrectAnswers: ['A', 'B'],
        Sources: [],
      }),
    ];

    const { rows, skipped } = parseQuizImportFile(quizExportJson(bank));

    expect(skipped).toEqual([]);
    expect(rows).toEqual([
      {
        question: bank[0].QuestionText,
        options: bank[0].Options,
        correct_answers: ['B'],
        sources: ['PDF1 (Câu 6)'],
        topic: 'Tuân thủ',
      },
      {
        question: bank[1].QuestionText,
        options: bank[1].Options,
        correct_answers: ['A', 'B'],
        sources: [],
        topic: null,
      },
    ]);
  });

  it('câu chưa chốt đáp án vẫn xuất được và nạp lại được', () => {
    const { rows, skipped } = parseQuizImportFile(
      quizExportJson([q({ CorrectAnswers: [] })])
    );

    expect(skipped).toEqual([]);
    expect(rows[0].correct_answers).toEqual([]);
  });

  it('xuất được cả bộ câu hỏi gốc trong repo', () => {
    const bank = (quizSeed as any[]).map<QuizQuestion>(raw => ({
      Id: raw.id,
      QuestionText: raw.question,
      Options: raw.options,
      CorrectAnswers: raw.correct_answers,
      Sources: raw.sources ?? [],
    }));

    const { rows, skipped } = parseQuizImportFile(quizExportJson(bank));

    expect(skipped).toEqual([]);
    expect(rows).toHaveLength(bank.length);
  });
});

describe('quizExportFileName', () => {
  it('gắn ngày vào tên tệp', () => {
    expect(quizExportFileName('2026-09-18')).toBe('ngan-hang-cau-hoi-2026-09-18.json');
  });
});
