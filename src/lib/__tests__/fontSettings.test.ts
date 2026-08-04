import { describe, it, expect } from 'vitest';
import {
  clampFontSize, normalizeFontSettings, fontStackOf, cssVariablesFor,
  DEFAULT_FONT_SETTINGS, FONT_SIZE_LIMITS, FONT_FAMILIES,
} from '../fontSettings';

describe('clampFontSize', () => {
  it('kẹp về khoảng cho phép của từng phần', () => {
    expect(clampFontSize('table', 999)).toBe(FONT_SIZE_LIMITS.table.max);
    expect(clampFontSize('table', 1)).toBe(FONT_SIZE_LIMITS.table.min);
    expect(clampFontSize('small', 12)).toBe(12);
  });

  it('giá trị không phải số thì về mặc định', () => {

    expect(clampFontSize('heading', 'abc')).toBe(FONT_SIZE_LIMITS.heading.default);
    expect(clampFontSize('heading', NaN)).toBe(FONT_SIZE_LIMITS.heading.default);
    expect(clampFontSize('heading', Infinity)).toBe(FONT_SIZE_LIMITS.heading.default);
  });

  it('đọc được chuỗi số', () => {
    expect(clampFontSize('table', '13')).toBe(13);
  });

  it('làm tròn về số nguyên', () => {
    expect(clampFontSize('table', 12.6)).toBe(13);
  });
});

describe('normalizeFontSettings', () => {
  it('dữ liệu rỗng trả về mặc định', () => {
    expect(normalizeFontSettings(null)).toEqual(DEFAULT_FONT_SETTINGS);
    expect(normalizeFontSettings({})).toEqual(DEFAULT_FONT_SETTINGS);
  });

  it('font lạ thì về mặc định hệ thống, không để vỡ giao diện', () => {

    expect(normalizeFontSettings({ family: 'comic-sans' }).family).toBe('system');
  });

  it('giữ giá trị hợp lệ và kẹp giá trị vượt khoảng', () => {
    const r = normalizeFontSettings({ family: 'roboto', heading: 16, table: 99, small: 0, mono: 13 });
    expect(r.family).toBe('roboto');
    expect(r.heading).toBe(16);
    expect(r.table).toBe(FONT_SIZE_LIMITS.table.max);
    expect(r.small).toBe(FONT_SIZE_LIMITS.small.min);
    expect(r.mono).toBe(13);
  });
});

describe('fontStackOf', () => {
  it('mỗi lựchọn đều có font dự phòng phía sau', () => {
    for (const f of FONT_FAMILIES) {
      expect(f.stack.split(',').length).toBeGreaterThan(1);
    }
  });

  it('key không tồn tại thì lấy stack đầu tiên', () => {
    expect(fontStackOf('khong-co' as never)).toBe(FONT_FAMILIES[0].stack);
  });

  it('KHÔNG tải font từ mạng ngoài', () => {

    for (const f of FONT_FAMILIES) {
      expect(f.stack).not.toMatch(/https?:|url\(/);
    }
  });
});

describe('cssVariablesFor', () => {
  it('trả đủ biến CSS kèm đơn vị px', () => {
    const v = cssVariablesFor({ family: 'inter', heading: 15, table: 13, small: 11, mono: 12 });
    expect(v['--fs-heading']).toBe('15px');
    expect(v['--fs-table']).toBe('13px');
    expect(v['--fs-small']).toBe('11px');
    expect(v['--fs-mono']).toBe('12px');
    expect(v['--app-font']).toContain('Inter');
  });

  it('chuẩn hoá trước khi sinh biến nên giá trị sai không lọt ra CSS', () => {

    const v = cssVariablesFor({ family: 'system', heading: 500, table: -3, small: 11, mono: 12 } as never);
    expect(v['--fs-heading']).toBe(`${FONT_SIZE_LIMITS.heading.max}px`);
    expect(v['--fs-table']).toBe(`${FONT_SIZE_LIMITS.table.min}px`);
  });
});
