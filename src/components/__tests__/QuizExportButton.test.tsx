// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { parseQuizImportFile, type QuizQuestion } from '../../lib/quizBank';
import { QuizExportButton } from '../quiz/QuizExportButton';

const bank: QuizQuestion[] = [
  {
    Id: 4,
    QuestionText: 'Tiêu chí nhận diện rủi ro gồm những gì?',
    Options: [
      { id: 'A', text: 'Thái độ' },
      { id: 'B', text: 'Hành vi' },
    ],
    CorrectAnswers: ['A', 'B'],
    Sources: ['PDF2 (Câu 100)'],
    Topic: 'Tuân thủ',
  },
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
];

const RealBlob = globalThis.Blob;
const realCreate = URL.createObjectURL;
const realRevoke = URL.revokeObjectURL;
const realClick = HTMLAnchorElement.prototype.click;

let downloads: { name: string; text: string; type: string }[] = [];

beforeEach(() => {
  downloads = [];
  const bodies = new Map<string, { text: string; type: string }>();
  let seq = 0;

  globalThis.Blob = class extends RealBlob {
    __text: string;
    constructor(parts: BlobPart[], options?: BlobPropertyBag) {
      super(parts, options);
      this.__text = parts.map(String).join('');
    }
  } as unknown as typeof Blob;

  URL.createObjectURL = vi.fn((blob: Blob) => {
    const url = `blob:quiz-${seq++}`;
    bodies.set(url, { text: (blob as unknown as { __text: string }).__text, type: blob.type });
    return url;
  }) as typeof URL.createObjectURL;
  URL.revokeObjectURL = vi.fn();

  HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
    const body = bodies.get(this.href);
    downloads.push({ name: this.download, text: body?.text ?? '', type: body?.type ?? '' });
  };
});

afterEach(() => {
  cleanup();
  globalThis.Blob = RealBlob;
  URL.createObjectURL = realCreate;
  URL.revokeObjectURL = realRevoke;
  HTMLAnchorElement.prototype.click = realClick;
});

const clickExport = () => {
  fireEvent.click(screen.getByRole('button', { name: /Xuất JSON/i }));
};

describe('QuizExportButton', () => {
  it('nhãn nút đếm đúng số câu trong ngân hàng', () => {
    render(<QuizExportButton questions={bank} />);
    expect(screen.getByRole('button', { name: 'Xuất JSON (2 câu)' })).toBeTruthy();
  });

  it('tải về tệp .json đặt tên theo ngày, đúng kiểu MIME', () => {
    render(<QuizExportButton questions={bank} />);
    clickExport();

    expect(downloads).toHaveLength(1);
    expect(downloads[0].name).toMatch(/^ngan-hang-cau-hoi-\d{4}-\d{2}-\d{2}\.json$/);
    expect(downloads[0].type).toBe('application/json;charset=utf-8');
  });

  it('tệp xuất ra nạp lại được, không câu nào bị bỏ, sắp theo Id', () => {
    render(<QuizExportButton questions={bank} />);
    clickExport();

    const { rows, skipped } = parseQuizImportFile(downloads[0].text);

    expect(skipped).toEqual([]);
    expect(rows).toHaveLength(2);
    expect(rows[0].question).toContain('Mức cho vay tối đa');
    expect(rows[1].correct_answers).toEqual(['A', 'B']);
    expect(rows[1].topic).toBe('Tuân thủ');
  });

  it('ngân hàng rỗng thì nút khoá, bấm không tải gì', () => {
    render(<QuizExportButton questions={[]} />);
    const button = screen.getByRole('button', { name: 'Xuất JSON (0 câu)' }) as HTMLButtonElement;

    expect(button.disabled).toBe(true);
    clickExport();
    expect(downloads).toEqual([]);
  });
});
