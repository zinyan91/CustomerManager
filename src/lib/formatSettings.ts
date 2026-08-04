export type NumberStyle = 'vi' | 'en' | 'space';
export type TimeFormat = '24h' | '12h';

export interface FormatSettings {
  numberStyle: NumberStyle;
  decimalDigits: number;
  percentDigits: number;
  timeFormat: TimeFormat;
  autoGroupMoneyInput: boolean;
}

export const DEFAULT_FORMAT_SETTINGS: FormatSettings = {
  numberStyle: 'vi',
  decimalDigits: 2,
  percentDigits: 2,
  timeFormat: '24h',
  autoGroupMoneyInput: true,
};

export const STORAGE_KEYS = {
  numberStyle: 'app_number_style',
  decimalDigits: 'app_decimal_digits',
  percentDigits: 'app_percent_digits',
  timeFormat: 'app_time_format',
  autoGroupMoneyInput: 'app_auto_group_money',
} as const;

export interface NumberSeparators {
  group: string;
  decimal: string;
}

export const NUMBER_SEPARATORS: Record<NumberStyle, NumberSeparators> = {
  vi: { group: '.', decimal: ',' },
  en: { group: ',', decimal: '.' },
  space: { group: ' ', decimal: ',' },
};

export const MAX_DIGITS = 6;

function clampDigits(value: unknown): number | null {
  const n = typeof value === 'number' ? value : parseInt(String(value), 10);
  if (isNaN(n)) return null;
  return Math.min(MAX_DIGITS, Math.max(0, Math.trunc(n)));
}

let cached: FormatSettings | null = null;

export function loadFormatSettings(): FormatSettings {
  if (cached) return cached;
  if (typeof localStorage === 'undefined') return DEFAULT_FORMAT_SETTINGS;

  const style = localStorage.getItem(STORAGE_KEYS.numberStyle);
  const time = localStorage.getItem(STORAGE_KEYS.timeFormat);
  const dec = clampDigits(localStorage.getItem(STORAGE_KEYS.decimalDigits));
  const pct = clampDigits(localStorage.getItem(STORAGE_KEYS.percentDigits));
  const auto = localStorage.getItem(STORAGE_KEYS.autoGroupMoneyInput);

  cached = {
    numberStyle: style === 'en' || style === 'space' || style === 'vi'
      ? style
      : DEFAULT_FORMAT_SETTINGS.numberStyle,
    decimalDigits: dec === null ? DEFAULT_FORMAT_SETTINGS.decimalDigits : dec,
    percentDigits: pct === null ? DEFAULT_FORMAT_SETTINGS.percentDigits : pct,
    timeFormat: time === '12h' || time === '24h'
      ? time
      : DEFAULT_FORMAT_SETTINGS.timeFormat,
    autoGroupMoneyInput: auto === null
      ? DEFAULT_FORMAT_SETTINGS.autoGroupMoneyInput
      : auto !== 'false',
  };
  return cached;
}

export function saveFormatSettings(patch: Partial<FormatSettings>): FormatSettings {
  const next = { ...loadFormatSettings(), ...patch };
  if (patch.decimalDigits !== undefined) {
    next.decimalDigits = clampDigits(patch.decimalDigits) ?? DEFAULT_FORMAT_SETTINGS.decimalDigits;
  }
  if (patch.percentDigits !== undefined) {
    next.percentDigits = clampDigits(patch.percentDigits) ?? DEFAULT_FORMAT_SETTINGS.percentDigits;
  }

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.numberStyle, next.numberStyle);
    localStorage.setItem(STORAGE_KEYS.decimalDigits, String(next.decimalDigits));
    localStorage.setItem(STORAGE_KEYS.percentDigits, String(next.percentDigits));
    localStorage.setItem(STORAGE_KEYS.timeFormat, next.timeFormat);
    localStorage.setItem(STORAGE_KEYS.autoGroupMoneyInput, String(next.autoGroupMoneyInput));
  }
  cached = next;
  return next;
}

export function resetFormatSettingsCache(): void {
  cached = null;
}

export function groupInteger(digits: string, groupSep: string): string {
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, groupSep);
}

export function formatNumberWith(
  value: number | null | undefined,
  digits: number,
  style: NumberStyle
): string {
  if (value === null || value === undefined || isNaN(value)) return '';
  const sep = NUMBER_SEPARATORS[style] ?? NUMBER_SEPARATORS.vi;
  const safeDigits = clampDigits(digits) ?? 0;

  const negative = value < 0;
  const fixed = Math.abs(value).toFixed(safeDigits);
  const [intPart, fracPart] = fixed.split('.');

  const grouped = groupInteger(intPart, sep.group);
  const body = fracPart ? `${grouped}${sep.decimal}${fracPart}` : grouped;
  return negative ? `-${body}` : body;
}

export function formatMoneyWith(
  value: number | null | undefined,
  settings: FormatSettings = loadFormatSettings()
): string {
  if (value === null || value === undefined || isNaN(value)) return '';
  return formatNumberWith(value, 0, settings.numberStyle);
}

export function formatDecimalWith(
  value: number | null | undefined,
  settings: FormatSettings = loadFormatSettings()
): string {
  return formatNumberWith(value, settings.decimalDigits, settings.numberStyle);
}

export function formatPercentWith(
  ratio: number | null | undefined,
  settings: FormatSettings = loadFormatSettings()
): string {
  if (ratio === null || ratio === undefined || isNaN(ratio)) return '';
  return `${formatNumberWith(ratio * 100, settings.percentDigits, settings.numberStyle)}%`;
}

export function formatTimeWith(
  value: Date | string | null | undefined,
  settings: FormatSettings = loadFormatSettings()
): string {
  if (value === null || value === undefined || value === '') return '';

  let hours: number;
  let minutes: number;

  if (value instanceof Date) {
    if (isNaN(value.getTime())) return '';
    hours = value.getHours();
    minutes = value.getMinutes();
  } else {
    const match = String(value).match(/(\d{1,2}):(\d{2})/);
    if (!match) return '';
    hours = parseInt(match[1], 10);
    minutes = parseInt(match[2], 10);
  }

  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return '';
  }

  const mm = String(minutes).padStart(2, '0');
  if (settings.timeFormat === '24h') {
    return `${String(hours).padStart(2, '0')}:${mm}`;
  }

  const suffix = hours < 12 ? 'AM' : 'PM';
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${String(h12).padStart(2, '0')}:${mm} ${suffix}`;
}

export const NUMBER_STYLE_SAMPLES: Record<NumberStyle, string> = {
  vi: '1.234.567,89',
  en: '1,234,567.89',
  space: '1 234 567,89',
};
