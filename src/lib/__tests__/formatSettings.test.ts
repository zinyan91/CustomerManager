import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  DEFAULT_FORMAT_SETTINGS, STORAGE_KEYS, NUMBER_SEPARATORS,
  loadFormatSettings, saveFormatSettings, resetFormatSettingsCache,
  groupInteger, formatNumberWith, formatMoneyWith, formatDecimalWith,
  formatPercentWith, formatTimeWith, parseNumberWith, parseMoneyWith,
} from '../formatSettings';
import type { FormatSettings } from '../formatSettings';

const vi: FormatSettings = { ...DEFAULT_FORMAT_SETTINGS };
const en: FormatSettings = { ...DEFAULT_FORMAT_SETTINGS, numberStyle: 'en' };
const space: FormatSettings = { ...DEFAULT_FORMAT_SETTINGS, numberStyle: 'space' };

function installLocalStorage() {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
  };
  return store;
}

describe('groupInteger', () => {
  it('groups thousands with the given separator', () => {
    expect(groupInteger('1234567', '.')).toBe('1.234.567');
    expect(groupInteger('1234567', ',')).toBe('1,234,567');
    expect(groupInteger('1234567', ' ')).toBe('1 234 567');
  });

  it('leaves short numbers alone', () => {
    expect(groupInteger('123', '.')).toBe('123');
    expect(groupInteger('', '.')).toBe('');
  });

  it('groups exactly at the boundary', () => {
    expect(groupInteger('1000', '.')).toBe('1.000');
    expect(groupInteger('999', '.')).toBe('999');
  });
});

describe('formatNumberWith', () => {
  it('honours each separator style', () => {
    expect(formatNumberWith(1234567.89, 2, 'vi')).toBe('1.234.567,89');
    expect(formatNumberWith(1234567.89, 2, 'en')).toBe('1,234,567.89');
    expect(formatNumberWith(1234567.89, 2, 'space')).toBe('1 234 567,89');
  });

  it('honours the requested number of decimals', () => {
    expect(formatNumberWith(1234.5678, 0, 'vi')).toBe('1.235');
    expect(formatNumberWith(1234.5678, 1, 'vi')).toBe('1.234,6');
    expect(formatNumberWith(1234.5678, 4, 'vi')).toBe('1.234,5678');
  });

  it('keeps the minus sign outside the grouping', () => {
    expect(formatNumberWith(-1234567, 0, 'vi')).toBe('-1.234.567');
  });

  it('formats zero rather than treating it as missing', () => {
    expect(formatNumberWith(0, 0, 'vi')).toBe('0');
    expect(formatNumberWith(0, 2, 'vi')).toBe('0,00');
  });

  it('returns an empty string only for genuinely missing values', () => {
    expect(formatNumberWith(null, 0, 'vi')).toBe('');
    expect(formatNumberWith(undefined, 0, 'vi')).toBe('');
    expect(formatNumberWith(NaN, 0, 'vi')).toBe('');
  });

  it('clamps an out-of-range decimal count instead of throwing', () => {
    expect(formatNumberWith(1.23456789, 99, 'vi')).toBe('1,234568');
    expect(formatNumberWith(1.5, -3, 'vi')).toBe('2');
  });
});

describe('formatMoneyWith', () => {
  it('shows money without decimals in every style', () => {
    expect(formatMoneyWith(1_500_000_000, vi)).toBe('1.500.000.000');
    expect(formatMoneyWith(1_500_000_000, en)).toBe('1,500,000,000');
    expect(formatMoneyWith(1_500_000_000, space)).toBe('1 500 000 000');
  });

  it('ignores the decimal setting for money', () => {
    expect(formatMoneyWith(1234.99, { ...vi, decimalDigits: 4 })).toBe('1.235');
  });
});

describe('formatDecimalWith', () => {
  it('uses the configured decimal count', () => {
    expect(formatDecimalWith(3.14159, { ...vi, decimalDigits: 2 })).toBe('3,14');
    expect(formatDecimalWith(3.14159, { ...vi, decimalDigits: 4 })).toBe('3,1416');
    expect(formatDecimalWith(3.14159, { ...vi, decimalDigits: 0 })).toBe('3');
  });
});

describe('formatPercentWith', () => {
  it('converts a fraction to a percentage', () => {
    expect(formatPercentWith(0.0845, vi)).toBe('8,45%');
    expect(formatPercentWith(0.117, vi)).toBe('11,70%');
  });

  it('honours the configured percent decimals', () => {
    expect(formatPercentWith(0.0845, { ...vi, percentDigits: 0 })).toBe('8%');
    expect(formatPercentWith(0.0845, { ...vi, percentDigits: 1 })).toBe('8,5%');
    expect(formatPercentWith(0.0845, { ...vi, percentDigits: 4 })).toBe('8,4500%');
  });

  it('follows the separator style', () => {
    expect(formatPercentWith(0.0845, en)).toBe('8.45%');
  });

  it('keeps a genuine zero visible', () => {
    expect(formatPercentWith(0, vi)).toBe('0,00%');
  });

  it('returns empty only when the value is missing', () => {
    expect(formatPercentWith(null, vi)).toBe('');
    expect(formatPercentWith(undefined, vi)).toBe('');
  });
});

describe('formatTimeWith', () => {
  it('formats 24-hour time with a leading zero', () => {
    expect(formatTimeWith('9:05', vi)).toBe('09:05');
    expect(formatTimeWith('14:30', vi)).toBe('14:30');
  });

  it('formats 12-hour time with AM and PM', () => {
    const h12: FormatSettings = { ...vi, timeFormat: '12h' };
    expect(formatTimeWith('09:05', h12)).toBe('09:05 AM');
    expect(formatTimeWith('14:30', h12)).toBe('02:30 PM');
  });

  it('maps midnight and noon correctly, not to 00', () => {
    const h12: FormatSettings = { ...vi, timeFormat: '12h' };
    expect(formatTimeWith('00:00', h12)).toBe('12:00 AM');
    expect(formatTimeWith('12:00', h12)).toBe('12:00 PM');
    expect(formatTimeWith('23:59', h12)).toBe('11:59 PM');
  });

  it('reads a Date object', () => {
    expect(formatTimeWith(new Date(2026, 7, 4, 8, 7), vi)).toBe('08:07');
  });

  it('pulls the time out of a full timestamp', () => {
    expect(formatTimeWith('2026-08-04T14:30:00', vi)).toBe('14:30');
  });

  it('returns empty for junk rather than a wrong time', () => {
    expect(formatTimeWith('không phải giờ', vi)).toBe('');
    expect(formatTimeWith('99:99', vi)).toBe('');
    expect(formatTimeWith(null, vi)).toBe('');
    expect(formatTimeWith(new Date('bad'), vi)).toBe('');
  });
});

describe('loadFormatSettings / saveFormatSettings', () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = installLocalStorage();
    resetFormatSettingsCache();
  });

  afterEach(() => {
    delete (globalThis as any).localStorage;
    resetFormatSettingsCache();
  });

  it('falls back to Vietnamese defaults when nothing is stored', () => {
    expect(loadFormatSettings()).toEqual(DEFAULT_FORMAT_SETTINGS);
  });

  it('round-trips a saved setting', () => {
    saveFormatSettings({ numberStyle: 'en', percentDigits: 3, timeFormat: '12h' });
    resetFormatSettingsCache();
    const loaded = loadFormatSettings();
    expect(loaded.numberStyle).toBe('en');
    expect(loaded.percentDigits).toBe(3);
    expect(loaded.timeFormat).toBe('12h');
  });

  it('keeps a deliberate zero-decimal setting instead of falling back', () => {
    saveFormatSettings({ decimalDigits: 0, percentDigits: 0 });
    resetFormatSettingsCache();
    const loaded = loadFormatSettings();
    expect(loaded.decimalDigits).toBe(0);
    expect(loaded.percentDigits).toBe(0);
  });

  it('keeps the auto-group switch off once turned off', () => {
    saveFormatSettings({ autoGroupMoneyInput: false });
    resetFormatSettingsCache();
    expect(loadFormatSettings().autoGroupMoneyInput).toBe(false);
  });

  it('ignores a corrupted stored value', () => {
    store.set(STORAGE_KEYS.numberStyle, 'klingon');
    store.set(STORAGE_KEYS.timeFormat, '37h');
    store.set(STORAGE_KEYS.decimalDigits, 'abc');
    resetFormatSettingsCache();
    const loaded = loadFormatSettings();
    expect(loaded.numberStyle).toBe('vi');
    expect(loaded.timeFormat).toBe('24h');
    expect(loaded.decimalDigits).toBe(DEFAULT_FORMAT_SETTINGS.decimalDigits);
  });

  it('clamps an absurd decimal count on save', () => {
    saveFormatSettings({ decimalDigits: 99 });
    expect(loadFormatSettings().decimalDigits).toBe(6);
  });
});

describe('NUMBER_SEPARATORS', () => {
  it('never uses the same character for grouping and decimals', () => {
    for (const style of Object.keys(NUMBER_SEPARATORS) as (keyof typeof NUMBER_SEPARATORS)[]) {
      const s = NUMBER_SEPARATORS[style];
      expect(s.group).not.toBe(s.decimal);
    }
  });
});

describe('parseNumberWith', () => {
  it('đọc đúng định dạng kiểu Việt Nam (vi: chấm ngăn nghìn, phẩy thập phân)', () => {
    expect(parseNumberWith('1.234.567,89', 'vi')).toBe(1234567.89);
    expect(parseNumberWith('350.000', 'vi')).toBe(350000);
    expect(parseNumberWith('329.000', 'vi')).toBe(329000);
    expect(parseNumberWith('74.484.800', 'vi')).toBe(74484800);
    expect(parseNumberWith('1,25', 'vi')).toBe(1.25);
    expect(parseNumberWith('1.25', 'vi')).toBe(1.25); // fallback dot on numpad
  });

  it('đọc đúng định dạng kiểu Quốc tế (en: phẩy ngăn nghìn, chấm thập phân)', () => {
    expect(parseNumberWith('1,234,567.89', 'en')).toBe(1234567.89);
    expect(parseNumberWith('350,000', 'en')).toBe(350000);
    expect(parseNumberWith('74,484,800', 'en')).toBe(74484800);
    expect(parseNumberWith('1.25', 'en')).toBe(1.25);
  });

  it('đọc đúng định dạng khoảng trắng (space: khoảng trắng ngăn nghìn, phẩy thập phân)', () => {
    expect(parseNumberWith('1 234 567,89', 'space')).toBe(1234567.89);
    expect(parseNumberWith('350 000', 'space')).toBe(350000);
    expect(parseNumberWith('74 484 800', 'space')).toBe(74484800);
  });

  it('xử lý các giá trị rỗng hoặc không hợp lệ', () => {
    expect(parseNumberWith('', 'vi')).toBe(0);
    expect(parseNumberWith(null, 'vi')).toBe(0);
    expect(parseNumberWith(undefined, 'vi')).toBe(0);
    expect(parseNumberWith('abc', 'vi')).toBe(0);
  });
});

describe('parseMoneyWith', () => {
  it('đọc tiền nguyên và làm tròn theo setting', () => {
    expect(parseMoneyWith('350.000', vi)).toBe(350000);
    expect(parseMoneyWith('350,000', en)).toBe(350000);
    expect(parseMoneyWith('350 000', space)).toBe(350000);
    expect(parseMoneyWith('74.484.800', vi)).toBe(74484800);
    expect(parseMoneyWith('1234.56', vi)).toBe(1235);
  });
});

