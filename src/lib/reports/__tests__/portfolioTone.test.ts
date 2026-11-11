import { describe, it, expect } from 'vitest';
import { appraisalTone, hdtdEndTone, kunnDueTone } from '../portfolioTone';
import { matchesDebtGroup } from '../debtGroup';

describe('luật màu danh mục, khớp dashboard', () => {
  it('KUNN: đỏ khi còn ≤ 3 ngày hoặc quá hạn, vàng 4–10 ngày, xanh từ 11 ngày', () => {
    expect([-1, 0, 3, 4, 10, 11].map(kunnDueTone)).toEqual(['neg', 'neg', 'neg', 'warn', 'warn', 'pos']);
  });
  it('HĐTD: đỏ dưới 6 ngày, vàng 6–20 ngày, xanh từ 21 ngày', () => {
    expect([-2, 5, 6, 20, 21].map(hdtdEndTone)).toEqual(['neg', 'neg', 'warn', 'warn', 'pos']);
  });
  it('định giá TSBĐ: đỏ khi hết hạn, vàng 1–15 ngày, xanh từ 16 ngày', () => {
    expect([-3, 0, 1, 15, 16].map(appraisalTone)).toEqual(['neg', 'neg', 'warn', 'warn', 'pos']);
  });
  it('không có ngày thì không tô', () => {
    expect(kunnDueTone(null)).toBeNull();
  });
});

describe('lọc nhóm nợ', () => {
  it('nhóm 1 chỉ giữ nhóm 1; nhóm 2–5 giữ từ nhóm 2 trở lên; toàn bộ giữ hết', () => {
    expect([1, 2, 5].map(g => matchesDebtGroup(g, 'group1'))).toEqual([true, false, false]);
    expect([1, 2, 5].map(g => matchesDebtGroup(g, 'group2to5'))).toEqual([false, true, true]);
    expect([1, 2, 5].map(g => matchesDebtGroup(g, 'all'))).toEqual([true, true, true]);
  });
});
