export type FontFamilyKey = 'system' | 'inter' | 'roboto' | 'notoSans' | 'serif';

export interface FontFamilyOption {
  key: FontFamilyKey;
  label: string;
  stack: string;
}

export const FONT_FAMILIES: FontFamilyOption[] = [
  { key: 'system', label: 'Mặc định hệ thống', stack: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' },
  { key: 'inter', label: 'Inter / Segoe UI', stack: 'Inter, "Segoe UI", system-ui, Arial, sans-serif' },
  { key: 'roboto', label: 'Roboto', stack: 'Roboto, "Segoe UI", system-ui, Arial, sans-serif' },
  { key: 'notoSans', label: 'Noto Sans', stack: '"Noto Sans", "Segoe UI", system-ui, Arial, sans-serif' },
  { key: 'serif', label: 'Times New Roman (có chân)', stack: '"Times New Roman", Georgia, serif' },
];

export interface FontSettings {
  family: FontFamilyKey;
  heading: number;
  table: number;
  small: number;
  mono: number;
}

export const FONT_SIZE_LIMITS = {
  heading: { min: 11, max: 20, default: 14 },
  table: { min: 11, max: 18, default: 12 },
  small: { min: 10, max: 16, default: 11 },
  mono: { min: 10, max: 18, default: 12 },
} as const;

export const DEFAULT_FONT_SETTINGS: FontSettings = {
  family: 'system',
  heading: FONT_SIZE_LIMITS.heading.default,
  table: FONT_SIZE_LIMITS.table.default,
  small: FONT_SIZE_LIMITS.small.default,
  mono: FONT_SIZE_LIMITS.mono.default,
};

export const FONT_PART_LABELS: Record<keyof Omit<FontSettings, 'family'>, string> = {
  heading: 'Tiêu đề',
  table: 'Bảng & nội dung',
  small: 'Nhãn nhỏ, viên trạng thái',
  mono: 'Số tiền, mã hợp đồng',
};

const STORAGE_KEY = 'app_font_settings';

export function clampFontSize(part: keyof Omit<FontSettings, 'family'>, value: unknown): number {
  const { min, max, default: def } = FONT_SIZE_LIMITS[part];
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  if (!isFinite(n)) return def;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function normalizeFontSettings(raw: unknown): FontSettings {
  const o = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {};
  const family = FONT_FAMILIES.some(f => f.key === o.family)
    ? o.family as FontFamilyKey
    : DEFAULT_FONT_SETTINGS.family;

  return {
    family,
    heading: clampFontSize('heading', o.heading ?? DEFAULT_FONT_SETTINGS.heading),
    table: clampFontSize('table', o.table ?? DEFAULT_FONT_SETTINGS.table),
    small: clampFontSize('small', o.small ?? DEFAULT_FONT_SETTINGS.small),
    mono: clampFontSize('mono', o.mono ?? DEFAULT_FONT_SETTINGS.mono),
  };
}

export function fontStackOf(family: FontFamilyKey): string {
  return (FONT_FAMILIES.find(f => f.key === family) ?? FONT_FAMILIES[0]).stack;
}

export function loadFontSettings(): FontSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FONT_SETTINGS;
    return normalizeFontSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_FONT_SETTINGS;
  }
}

export function saveFontSettings(s: FontSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeFontSettings(s)));
  } catch {}
}

export function cssVariablesFor(s: FontSettings): Record<string, string> {
  const n = normalizeFontSettings(s);
  return {
    '--app-font': fontStackOf(n.family),
    '--fs-heading': `${n.heading}px`,
    '--fs-table': `${n.table}px`,
    '--fs-small': `${n.small}px`,
    '--fs-mono': `${n.mono}px`,
  };
}

export function applyFontSettings(s: FontSettings, root?: HTMLElement): void {
  const el = root ?? (typeof document !== 'undefined' ? document.documentElement : null);
  if (!el) return;
  const vars = cssVariablesFor(s);
  for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
}
