import { describe, it, expect } from 'vitest';
import { joinMultilineMath, latexExpressionToPlain, splitMathSegments } from '../plainMath';

describe('splitMathSegments', () => {
  it('tách đúng câu AI vừa trả lời thành chữ và công thức', () => {
    expect(splitMathSegments('Tổng dư nợ dự kiến: $2 \\text{ tỷ (cũ)} + 2 \\text{ tỷ (mới)} = 4 \\text{ tỷ đồng}$ (Ngắn hạn).')).toEqual([
      { kind: 'text', value: 'Tổng dư nợ dự kiến: ' },
      { kind: 'math', tex: '2 \\text{ tỷ (cũ)} + 2 \\text{ tỷ (mới)} = 4 \\text{ tỷ đồng}', display: false },
      { kind: 'text', value: ' (Ngắn hạn).' },
    ]);
  });

  it('$$...$$ và \\[...\\] là công thức đứng riêng; \\(...\\) là công thức trong dòng', () => {
    expect(splitMathSegments('$$DSCR = \\frac{a}{b}$$')).toEqual([{ kind: 'math', tex: 'DSCR = \\frac{a}{b}', display: true }]);
    expect(splitMathSegments('\\[x \\leq y\\]')[0]).toMatchObject({ kind: 'math', display: true });
    expect(splitMathSegments('tỷ lệ \\(a \\div b\\)')[1]).toMatchObject({ kind: 'math', tex: 'a \\div b', display: false });
  });

  it('không coi "$5 và $10" là công thức', () => {
    expect(splitMathSegments('Giá $5 và $10 cho mỗi gói')).toEqual([{ kind: 'text', value: 'Giá $5 và $10 cho mỗi gói' }]);
  });
});

describe('joinMultilineMath', () => {
  it('gộp $$...$$ nhiều dòng về một dòng, khối code giữ nguyên', () => {
    expect(joinMultilineMath('Công thức:\n$$\nNWC = TSNH\n- NNH\n$$\nxong')).toBe('Công thức:\n$$ NWC = TSNH - NNH $$\nxong');
    const code = '```\n$$\na\n$$\n```';
    expect(joinMultilineMath(code)).toBe(code);
  });
});

describe('latexExpressionToPlain (dự phòng khi chưa vẽ được công thức)', () => {
  it('đúng hai câu AI vừa trả lời', () => {
    expect(latexExpressionToPlain('2 \\text{ tỷ (cũ)} + 2 \\text{ tỷ (mới)} = 4 \\text{ tỷ đồng}')).toBe('2 tỷ (cũ) + 2 tỷ (mới) = 4 tỷ đồng');
    expect(latexExpressionToPlain('30 \\text{ triệu đồng}')).toBe('30 triệu đồng');
  });

  it('phân số, phép nhân, so sánh, phần trăm; lệnh lạ thì bỏ lệnh giữ chữ', () => {
    expect(latexExpressionToPlain('DSCR = \\frac{\\text{Dòng tiền trả nợ}}{\\text{Gốc + Lãi}} \\geq 1{,}2')).toBe('DSCR = (Dòng tiền trả nợ) / (Gốc + Lãi) ≥ 1,2');
    expect(latexExpressionToPlain('4 \\times 10\\% \\approx 0{,}4')).toBe('4 × 10% ≈ 0,4');
    expect(latexExpressionToPlain('\\mathbf{ROE} = \\unknown{x}')).toBe('ROE = x');
  });
});
