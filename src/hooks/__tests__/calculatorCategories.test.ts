import { describe, it, expect } from 'vitest';
import { CALCULATOR_CATEGORIES } from '../useCalculatorController';

describe('đánh số công cụ tính toán', () => {
  it('tab lớn đánh 1, 2, 3…; công cụ trong mỗi tab đánh lại từ 1, liên tục, không trùng', () => {
    expect(CALCULATOR_CATEGORIES.map(c => Number.parseInt(c.label, 10))).toEqual(CALCULATOR_CATEGORIES.map((_, i) => i + 1));
    for (const cat of CALCULATOR_CATEGORIES) {
      expect(cat.tools.map(t => Number.parseInt(t.label, 10)), cat.label).toEqual(cat.tools.map((_, i) => i + 1));
    }
  });
});
