// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { QuizQuestion } from '../../lib/quizBank';

const fetchQuizQuestionsAPI = vi.fn();
const createQuizQuestionAPI = vi.fn();
const deleteQuizQuestionAPI = vi.fn();
const seedQuizBankAPI = vi.fn();

vi.mock('../../lib/api', () => ({
  fetchQuizQuestionsAPI: (...args: unknown[]) => fetchQuizQuestionsAPI(...args),
  createQuizQuestionAPI: (...args: unknown[]) => createQuizQuestionAPI(...args),
  deleteQuizQuestionAPI: (...args: unknown[]) => deleteQuizQuestionAPI(...args),
  seedQuizBankAPI: (...args: unknown[]) => seedQuizBankAPI(...args),
}));

const { QuizBankView } = await import('../views/QuizBankView');

const bank: QuizQuestion[] = [
  {
    Id: 1,
    QuestionText: 'Mức cho vay tối đa của sản phẩm Đầu tư thông minh là bao nhiêu?',
    Options: [
      { id: 'A', text: 'Tối đa 70% phương án' },
      { id: 'B', text: 'Tối đa 100% phương án, không quá 05 tỷ' },
    ],
    CorrectAnswers: ['B'],
    Sources: ['PDF1 (Câu 6)'],
  },
  {
    Id: 2,
    QuestionText: 'Tiêu chí nhận diện rủi ro gồm những gì?',
    Options: [
      { id: 'A', text: 'Thái độ' },
      { id: 'B', text: 'Hành vi' },
      { id: 'C', text: 'Kết quả' },
    ],
    CorrectAnswers: ['A', 'B'],
    Sources: ['PDF2 (Câu 100)'],
    Topic: 'Tuân thủ',
  },
];

beforeEach(() => {
  fetchQuizQuestionsAPI.mockReset().mockResolvedValue(bank);
  createQuizQuestionAPI.mockReset();
  deleteQuizQuestionAPI.mockReset();
  seedQuizBankAPI.mockReset();
});

afterEach(cleanup);

const openForm = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: /Thêm câu hỏi/i }));
};

describe('QuizBankView — tra cứu', () => {
  it('dựng lên với dữ liệu thật và đếm đúng', async () => {
    render(<QuizBankView />);
    expect(await screen.findByText(/Mức cho vay tối đa/)).toBeTruthy();
    expect(screen.getByText(/Tiêu chí nhận diện rủi ro/)).toBeTruthy();
    expect(screen.getByText('nhiều đáp án')).toBeTruthy();
    expect(screen.getByText(
      (_, el) => el?.tagName === 'SPAN' && el.textContent === '2 câu'
    )).toBeTruthy();
  });

  it('đáp án đúng tô sẵn, không phải bấm hiện', async () => {
    render(<QuizBankView />);
    await screen.findByText(/Mức cho vay tối đa/);

    expect(screen.queryByRole('button', { name: /Hiện đáp án/ })).toBeNull();

    const right = screen.getByText('Tối đa 100% phương án, không quá 05 tỷ');
    expect(right.parentElement?.className).toContain('text-pos');
    expect(right.parentElement?.className).toContain('font-bold');

    const wrong = screen.getByText('Tối đa 70% phương án');
    expect(wrong.parentElement?.className).not.toContain('text-pos');
  });

  it('không còn dòng nguồn và không còn ô lọc nguồn', async () => {
    render(<QuizBankView />);
    await screen.findByText(/Mức cho vay tối đa/);

    expect(screen.queryByText(/PDF1 \(Câu 6\)/)).toBeNull();
    expect(screen.queryByLabelText('Lọc theo nguồn')).toBeNull();
  });

  it('ô tìm kiếm lọc theo nội dung lựa chọn', async () => {
    render(<QuizBankView />);
    const user = userEvent.setup();
    await screen.findByText(/Mức cho vay tối đa/);

    await user.type(screen.getByLabelText('Tìm câu hỏi'), 'hành vi');
    expect(await screen.findByText(/Tiêu chí nhận diện rủi ro/)).toBeTruthy();
    expect(screen.queryByText(/Mức cho vay tối đa/)).toBeNull();
  });

  it('bảng rỗng thì mời nạp bộ câu hỏi gốc', async () => {
    fetchQuizQuestionsAPI.mockResolvedValue([]);
    seedQuizBankAPI.mockResolvedValue(662);
    render(<QuizBankView />);
    const user = userEvent.setup();

    const seedButton = await screen.findByRole('button', { name: /Nạp bộ câu hỏi gốc/i });
    await user.click(seedButton);

    expect(seedQuizBankAPI).toHaveBeenCalledTimes(1);
    expect((seedQuizBankAPI.mock.calls[0][0] as unknown[]).length).toBe(662);
    expect(await screen.findByText(/Đã nạp 662 câu hỏi/)).toBeTruthy();
  });
});

describe('QuizBankView — chia trang', () => {
  const many: QuizQuestion[] = Array.from({ length: 45 }, (_, i) => ({
    Id: i + 1,
    QuestionText: `Câu số ${i + 1} của bộ đề`,
    Options: [{ id: 'A', text: 'Một' }, { id: 'B', text: 'Hai' }],
    CorrectAnswers: ['A'],
    Sources: [],
  }));

  beforeEach(() => {
    fetchQuizQuestionsAPI.mockResolvedValue(many);
  });

  it('mỗi trang 20 câu, 45 câu ra 3 trang', async () => {
    render(<QuizBankView />);
    await screen.findByText('Câu số 1 của bộ đề');

    expect(screen.getByText('Câu số 20 của bộ đề')).toBeTruthy();
    expect(screen.queryByText('Câu số 21 của bộ đề')).toBeNull();
    expect(screen.getByText('/ 3')).toBeTruthy();
  });

  it('bấm Sau sang trang hai, bấm Trước quay lại', async () => {
    render(<QuizBankView />);
    const user = userEvent.setup();
    await screen.findByText('Câu số 1 của bộ đề');

    await user.click(screen.getByRole('button', { name: /Sau/ }));
    expect(screen.getByText('Câu số 21 của bộ đề')).toBeTruthy();
    expect(screen.queryByText('Câu số 1 của bộ đề')).toBeNull();

    await user.click(screen.getByRole('button', { name: /Trước/ }));
    expect(screen.getByText('Câu số 1 của bộ đề')).toBeTruthy();
  });

  it('trang đầu khoá nút Trước, trang cuối khoá nút Sau', async () => {
    render(<QuizBankView />);
    const user = userEvent.setup();
    await screen.findByText('Câu số 1 của bộ đề');

    expect(screen.getByRole('button', { name: /Trước/ })).toHaveProperty('disabled', true);

    await user.click(screen.getByRole('button', { name: /Sau/ }));
    await user.click(screen.getByRole('button', { name: /Sau/ }));

    expect(screen.getByText('Câu số 45 của bộ đề')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Sau/ })).toHaveProperty('disabled', true);
  });

  it('nhảy tới trang bằng ô số trang, số ngoài khoảng bị kẹp lại', async () => {
    render(<QuizBankView />);
    const user = userEvent.setup();
    await screen.findByText('Câu số 1 của bộ đề');

    const box = screen.getByLabelText('Số trang');
    await user.clear(box);
    await user.type(box, '3');
    expect(screen.getByText('Câu số 41 của bộ đề')).toBeTruthy();

    await user.clear(box);
    await user.type(box, '99');
    expect(screen.getByText('Câu số 41 của bộ đề')).toBeTruthy();
    expect((box as HTMLInputElement).value).toBe('3');
  });

  it('tìm kiếm thu hẹp thì về trang một và bỏ luôn phần chia trang', async () => {
    render(<QuizBankView />);
    const user = userEvent.setup();
    await screen.findByText('Câu số 1 của bộ đề');

    await user.click(screen.getByRole('button', { name: /Sau/ }));
    expect(screen.getByText('Câu số 21 của bộ đề')).toBeTruthy();

    await user.type(screen.getByLabelText('Tìm câu hỏi'), 'Câu số 7 ');
    expect(await screen.findByText('Câu số 7 của bộ đề')).toBeTruthy();
    expect(screen.queryByLabelText('Số trang')).toBeNull();
  });

  it('không câu nào khớp thì nói rõ, không để trống trơn', async () => {
    render(<QuizBankView />);
    const user = userEvent.setup();
    await screen.findByText('Câu số 1 của bộ đề');

    await user.type(screen.getByLabelText('Tìm câu hỏi'), 'không có chữ này đâu');
    expect(await screen.findByText('Không có câu nào khớp từ khoá.')).toBeTruthy();
  });
});

describe('QuizBankView — khung nhập liệu', () => {
  it('mặc định 4 lựa chọn, thêm và bớt được', async () => {
    render(<QuizBankView />);
    const user = userEvent.setup();
    await screen.findByText(/Mức cho vay tối đa/);
    await openForm(user);

    expect(screen.getByLabelText('Nội dung lựa chọn D')).toBeTruthy();
    expect(screen.queryByLabelText('Nội dung lựa chọn E')).toBeNull();

    await user.click(screen.getByRole('button', { name: /Thêm lựa chọn/i }));
    expect(screen.getByLabelText('Nội dung lựa chọn E')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Xoá lựa chọn E' }));
    expect(screen.queryByLabelText('Nội dung lựa chọn E')).toBeNull();
  });

  it('xoá lựa chọn giữa thì mã dồn lại, nội dung đi theo', async () => {
    render(<QuizBankView />);
    const user = userEvent.setup();
    await screen.findByText(/Mức cho vay tối đa/);
    await openForm(user);

    await user.type(screen.getByLabelText('Nội dung lựa chọn A'), 'Một');
    await user.type(screen.getByLabelText('Nội dung lựa chọn B'), 'Hai');
    await user.type(screen.getByLabelText('Nội dung lựa chọn C'), 'Ba');

    await user.click(screen.getByRole('button', { name: 'Xoá lựa chọn B' }));

    expect((screen.getByLabelText('Nội dung lựa chọn A') as HTMLInputElement).value).toBe('Một');
    expect((screen.getByLabelText('Nội dung lựa chọn B') as HTMLInputElement).value).toBe('Ba');
  });

  it('chọn nhiều đáp án đúng cho một câu', async () => {
    createQuizQuestionAPI.mockResolvedValue({ ...bank[0], Id: 99 });
    render(<QuizBankView />);
    const user = userEvent.setup();
    await screen.findByText(/Mức cho vay tối đa/);
    await openForm(user);

    await user.type(screen.getByLabelText(/Nội dung câu hỏi/i), 'Câu hỏi hoàn toàn mới');
    await user.type(screen.getByLabelText('Nội dung lựa chọn A'), 'Một');
    await user.type(screen.getByLabelText('Nội dung lựa chọn B'), 'Hai');
    await user.type(screen.getByLabelText('Nội dung lựa chọn C'), 'Ba');
    await user.click(screen.getByLabelText('Lựa chọn A là đáp án đúng'));
    await user.click(screen.getByLabelText('Lựa chọn C là đáp án đúng'));

    expect(screen.getByText('Câu nhiều đáp án')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /Lưu câu hỏi/i }));

    expect(createQuizQuestionAPI).toHaveBeenCalledTimes(1);
    expect(createQuizQuestionAPI.mock.calls[0][0]).toEqual({
      QuestionText: 'Câu hỏi hoàn toàn mới',
      Options: [
        { id: 'A', text: 'Một' },
        { id: 'B', text: 'Hai' },
        { id: 'C', text: 'Ba' },
      ],
      CorrectAnswers: ['A', 'C'],
      Sources: [],
      Topic: null,
    });
  });

  it('chưa chọn đáp án đúng thì không lưu được', async () => {
    render(<QuizBankView />);
    const user = userEvent.setup();
    await screen.findByText(/Mức cho vay tối đa/);
    await openForm(user);

    await user.type(screen.getByLabelText(/Nội dung câu hỏi/i), 'Câu chưa có đáp án');
    await user.type(screen.getByLabelText('Nội dung lựa chọn A'), 'Một');
    await user.type(screen.getByLabelText('Nội dung lựa chọn B'), 'Hai');

    expect(screen.getByText('Chưa chọn đáp án đúng nào.')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Lưu câu hỏi/i })).toHaveProperty('disabled', true);
    expect(createQuizQuestionAPI).not.toHaveBeenCalled();
  });
});

describe('QuizBankView — chặn trùng khi submit', () => {
  it('câu đã có thì báo trùng ngay lúc nhập và khoá nút lưu', async () => {
    render(<QuizBankView />);
    const user = userEvent.setup();
    await screen.findByText(/Mức cho vay tối đa/);
    await openForm(user);

    await user.type(
      screen.getByLabelText(/Nội dung câu hỏi/i),
      '  tiêu chí NHẬN DIỆN rủi ro gồm những gì?  '
    );
    await user.type(screen.getByLabelText('Nội dung lựa chọn A'), 'Một');
    await user.type(screen.getByLabelText('Nội dung lựa chọn B'), 'Hai');
    await user.click(screen.getByLabelText('Lựa chọn A là đáp án đúng'));

    expect(screen.getByText(/Đã có câu này trong ngân hàng — số 2/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Lưu câu hỏi/i })).toHaveProperty('disabled', true);
    expect(createQuizQuestionAPI).not.toHaveBeenCalled();
  });

  it('trùng do người khác vừa thêm — báo lỗi từ CSDL, không nuốt', async () => {
    createQuizQuestionAPI.mockRejectedValue(
      new Error('Câu hỏi này đã có trong ngân hàng (số 507).')
    );
    render(<QuizBankView />);
    const user = userEvent.setup();
    await screen.findByText(/Mức cho vay tối đa/);
    await openForm(user);

    await user.type(screen.getByLabelText(/Nội dung câu hỏi/i), 'Câu chưa thấy ở máy này');
    await user.type(screen.getByLabelText('Nội dung lựa chọn A'), 'Một');
    await user.type(screen.getByLabelText('Nội dung lựa chọn B'), 'Hai');
    await user.click(screen.getByLabelText('Lựa chọn A là đáp án đúng'));
    await user.click(screen.getByRole('button', { name: /Lưu câu hỏi/i }));

    expect(await screen.findByText('Câu hỏi này đã có trong ngân hàng (số 507).')).toBeTruthy();
  });

  it('cảnh báo cụm trùng có sẵn kèm cụm lệch đáp án', async () => {
    fetchQuizQuestionsAPI.mockResolvedValue([
      { ...bank[0], Id: 10, QuestionText: 'Câu X', CorrectAnswers: ['A'] },
      { ...bank[0], Id: 11, QuestionText: 'câu x', CorrectAnswers: ['B'] },
      { ...bank[0], Id: 12, QuestionText: 'Câu Y', CorrectAnswers: ['A'] },
      { ...bank[0], Id: 13, QuestionText: 'câu y ', CorrectAnswers: ['A'] },
    ]);
    render(<QuizBankView />);

    expect(await screen.findByText(/2 cụm câu hỏi trùng nội dung, gồm 4 câu/)).toBeTruthy();
    expect(screen.getByText(/1 cụm trong đó có ĐÁP ÁN ĐÚNG KHÁC NHAU/)).toBeTruthy();
    expect(screen.getByText(/\(10, 11\)/)).toBeTruthy();
    expect(screen.getAllByText('trùng câu, lệch đáp án')).toHaveLength(2);
  });
});

describe('QuizBankView — câu chưa chốt đáp án', () => {
  const withUnsettled = [
    ...bank,
    {
      Id: 3,
      QuestionText: 'Chọn câu sai về Sản phẩm Tiết kiệm Phát Lộc (CÂU NÀO CŨNG SAI)',
      Options: [{ id: 'A', text: 'Gửi thêm bất cứ lúc nào' }, { id: 'B', text: 'Ưu đãi nhiều lần' }],
      CorrectAnswers: [],
      Sources: ['PDF2 (Câu 300)'],
    },
  ];

  it('đếm riêng và gắn nhãn ở màn tra cứu', async () => {
    fetchQuizQuestionsAPI.mockResolvedValue(withUnsettled);
    render(<QuizBankView />);

    expect(await screen.findByText(
      (_, el) => el?.tagName === 'SPAN' && el.textContent === '1 câu chưa chốt đáp án'
    )).toBeTruthy();
    expect(screen.getByText('chưa chốt đáp án')).toBeTruthy();
  });

  it('luyện tập bỏ qua câu đó và nói rõ đã bỏ bao nhiêu', async () => {
    fetchQuizQuestionsAPI.mockResolvedValue(withUnsettled);
    render(<QuizBankView />);
    const user = userEvent.setup();
    await screen.findByText(/Mức cho vay tối đa/);

    await user.click(screen.getByRole('button', { name: 'Luyện tập' }));

    expect(screen.getByText(/Câu 1 \/ 2/)).toBeTruthy();
    expect(screen.getByText(/bỏ qua 1 câu chưa chốt đáp án/)).toBeTruthy();
    expect(screen.queryByText(/CÂU NÀO CŨNG SAI/)).toBeNull();
  });

  it('khung nhập liệu cho phép đánh dấu chưa chốt và gửi mảng rỗng', async () => {
    createQuizQuestionAPI.mockResolvedValue({ ...bank[0], Id: 99 });
    render(<QuizBankView />);
    const user = userEvent.setup();
    await screen.findByText(/Mức cho vay tối đa/);
    await openForm(user);

    await user.type(screen.getByLabelText(/Nội dung câu hỏi/i), 'Câu nào cũng sai — chờ đối chiếu');
    await user.type(screen.getByLabelText('Nội dung lựa chọn A'), 'Một');
    await user.type(screen.getByLabelText('Nội dung lựa chọn B'), 'Hai');

    expect(screen.getByText('Chưa chọn đáp án đúng nào.')).toBeTruthy();

    await user.click(screen.getByLabelText('Chưa chốt đáp án'));

    expect(screen.queryByText('Chưa chọn đáp án đúng nào.')).toBeNull();
    expect(screen.getByLabelText('Lựa chọn A là đáp án đúng')).toHaveProperty('disabled', true);

    await user.click(screen.getByRole('button', { name: /Lưu câu hỏi/i }));

    expect(createQuizQuestionAPI.mock.calls[0][0]).toMatchObject({
      QuestionText: 'Câu nào cũng sai — chờ đối chiếu',
      CorrectAnswers: [],
    });
  });
});

describe('QuizBankView — luyện tập', () => {
  const practice = async () => {
    render(<QuizBankView />);
    const user = userEvent.setup();
    await screen.findByText(/Mức cho vay tối đa/);
    await user.click(screen.getByRole('button', { name: 'Luyện tập' }));
    return user;
  };

  it('chấm đúng câu một đáp án', async () => {
    const user = await practice();
    await user.click(screen.getByRole('button', { name: /Tối đa 100% phương án/ }));
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }));

    expect(screen.getByText('Đúng')).toBeTruthy();
    expect(screen.getByText(/\(100%\)/)).toBeTruthy();
  });

  it('câu một đáp án thì chọn cái sau bỏ cái trước', async () => {
    const user = await practice();
    await user.click(screen.getByRole('button', { name: /Tối đa 70% phương án/ }));
    await user.click(screen.getByRole('button', { name: /Tối đa 100% phương án/ }));
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }));

    expect(screen.getByText('Đúng')).toBeTruthy();
  });

  it('câu nhiều đáp án — thiếu một đáp án là sai', async () => {
    const user = await practice();
    await user.click(screen.getByRole('button', { name: /Tối đa 70% phương án/ }));
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }));
    await user.click(screen.getByRole('button', { name: 'Câu tiếp' }));

    expect(screen.getByText(/Câu nhiều đáp án — chọn tất cả/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Thái độ/ }));
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }));

    expect(screen.getByText('Sai — đáp án A, B')).toBeTruthy();
  });

  it('câu nhiều đáp án — chọn đủ thì đúng, thứ tự không quan trọng', async () => {
    const user = await practice();
    await user.click(screen.getByRole('button', { name: /Tối đa 70% phương án/ }));
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }));
    await user.click(screen.getByRole('button', { name: 'Câu tiếp' }));

    await user.click(screen.getByRole('button', { name: /Hành vi/ }));
    await user.click(screen.getByRole('button', { name: /Thái độ/ }));
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }));

    expect(screen.getByText('Đúng')).toBeTruthy();
  });

  it('chưa chọn gì thì không kiểm tra được', async () => {
    await practice();
    expect(screen.getByRole('button', { name: 'Kiểm tra' })).toHaveProperty('disabled', true);
  });
});

describe('QuizBankView — xoá', () => {
  it('báo rõ khi không có quyền xoá câu của người khác', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    deleteQuizQuestionAPI.mockRejectedValue(
      new Error('Không xoá được. Chỉ admin hoặc người đã thêm câu hỏi mới xoá được.')
    );
    render(<QuizBankView />);
    const user = userEvent.setup();
    await screen.findByText(/Mức cho vay tối đa/);

    await user.click(screen.getByRole('button', { name: 'Xoá câu 1' }));

    expect(await screen.findByText(/Chỉ admin hoặc người đã thêm câu hỏi mới xoá được/)).toBeTruthy();
    expect(screen.getByText(/Mức cho vay tối đa/)).toBeTruthy();
  });

  it('xoá xong thì biến khỏi danh sách', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    deleteQuizQuestionAPI.mockResolvedValue(undefined);
    render(<QuizBankView />);
    const user = userEvent.setup();
    await screen.findByText(/Mức cho vay tối đa/);

    await user.click(screen.getByRole('button', { name: 'Xoá câu 1' }));

    expect(await screen.findByText(/Đã xoá câu hỏi số 1/)).toBeTruthy();
    expect(screen.queryByText(/Mức cho vay tối đa/)).toBeNull();
    expect(screen.getByText(/Tiêu chí nhận diện rủi ro/)).toBeTruthy();
  });

  it('bấm huỷ ở hộp xác nhận thì không gọi API', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<QuizBankView />);
    const user = userEvent.setup();
    await screen.findByText(/Mức cho vay tối đa/);

    await user.click(screen.getByRole('button', { name: 'Xoá câu 1' }));
    expect(deleteQuizQuestionAPI).not.toHaveBeenCalled();
  });
});

describe('QuizBankView — lỗi đọc', () => {
  it('không nuốt lỗi khi không đọc được ngân hàng', async () => {
    fetchQuizQuestionsAPI.mockRejectedValue(new Error('relation "QuizQuestions" does not exist'));
    render(<QuizBankView />);
    expect(await screen.findByText(/does not exist/)).toBeTruthy();
  });
});
