import { describe, it, expect } from 'vitest';
import { relativeLuminance, contrastRatio } from '../contrast';
import { THEME_TOKENS, CONTRAST_PAIRS, type ThemeName } from '../themeTokens';

describe('relativeLuminance', () => {
  it('đen là 0, trắng là 1', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5);
  });

  it('không phân biệt hoa thường và chấp nhận thiếu dấu thăng', () => {
    expect(relativeLuminance('#38bdf8')).toBeCloseTo(relativeLuminance('38BDF8'), 10);
  });
});

describe('contrastRatio', () => {
  it('đen trên trắng là 21', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 2);
  });

  it('cùng một màu thì bằng 1', () => {
    expect(contrastRatio('#38BDF8', '#38BDF8')).toBeCloseTo(1, 5);
  });

  it('đảo thứ tự hai màu cho cùng kết quả', () => {
    expect(contrastRatio('#0F172A', '#34D399')).toBeCloseTo(contrastRatio('#34D399', '#0F172A'), 10);
  });
});

const THEMES: ThemeName[] = ['dark', 'light'];

describe('dữ liệu đầu vào phải ổn định', () => {
  it('CONTRAST_PAIRS có đúng 15 phần tử', () => {
    expect(CONTRAST_PAIRS).toHaveLength(15);
  });

  it('THEME_TOKENS.dark có đúng 25 token', () => {
    expect(Object.keys(THEME_TOKENS.dark)).toHaveLength(25);
  });

  it('THEME_TOKENS.light có đúng 25 token', () => {
    expect(Object.keys(THEME_TOKENS.light)).toHaveLength(25);
  });

  it('dark và light có cùng bộ tên token', () => {
    const darkKeys = Object.keys(THEME_TOKENS.dark).sort();
    const lightKeys = Object.keys(THEME_TOKENS.light).sort();
    expect(darkKeys).toEqual(lightKeys);
  });

  it('mọi fg và bg trong CONTRAST_PAIRS đều tồn tại ở cả hai giao diện', () => {
    const darkTokens = Object.keys(THEME_TOKENS.dark);
    const lightTokens = Object.keys(THEME_TOKENS.light);

    for (const pair of CONTRAST_PAIRS) {
      expect(darkTokens, `thiếu token ${pair.fg} trong dark`).toContain(pair.fg);
      expect(darkTokens, `thiếu token ${pair.bg} trong dark`).toContain(pair.bg);
      expect(lightTokens, `thiếu token ${pair.fg} trong light`).toContain(pair.fg);
      expect(lightTokens, `thiếu token ${pair.bg} trong light`).toContain(pair.bg);
    }
  });

  it('không cặp nào trong CONTRAST_PAIRS được hạ min xuống dưới 4.5 (ngưỡng WCAG AA)', () => {
    for (const pair of CONTRAST_PAIRS) {
      expect(pair.min, `${pair.fg} trên ${pair.bg} có min = ${pair.min}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('bảng màu đạt ngưỡng tương phản WCAG AA', () => {
  for (const theme of THEMES) {
    for (const pair of CONTRAST_PAIRS) {
      it(`${theme}: ${pair.fg} trên ${pair.bg} ≥ ${pair.min}`, () => {
        const t = THEME_TOKENS[theme];
        expect(t[pair.fg], `thiếu token ${pair.fg}`).toBeTruthy();
        expect(t[pair.bg], `thiếu token ${pair.bg}`).toBeTruthy();
        expect(contrastRatio(t[pair.fg], t[pair.bg])).toBeGreaterThanOrEqual(pair.min);
      });
    }
  }

  it('viên trạng thái nền đặc dùng chữ text-surface, không dùng trắng', () => {
    for (const theme of THEMES) {
      const t = THEME_TOKENS[theme];
      for (const bg of ['neg', 'warn', 'pos'] as const) {
        expect(
          contrastRatio(t.surface, t[bg]),
          `${theme}: ${bg} với chữ surface`
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
