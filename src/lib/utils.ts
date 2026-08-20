import {
  loadFormatSettings, formatMoneyWith, formatNumberWith, formatPercentWith,
  parseNumberWith, parseMoneyWith,
  groupInteger, NUMBER_SEPARATORS,
} from './formatSettings';

export { formatMoneyWith, formatNumberWith, formatPercentWith, parseNumberWith, parseMoneyWith } from './formatSettings';

export function formatNationalId(v?: string | null): string {
  if (v === null || v === undefined) return '';
  const raw = String(v).trim();
  if (!raw) return '';
  const compact = raw.replace(/\s+/g, '');
  if (!/^\d+$/.test(compact)) return raw;
  return compact.replace(/(\d{4})(?=\d)/g, '$1 ');
}

export function parseNationalIdInput(v?: string | null): string {
  if (!v) return '';
  return String(v).replace(/\s+/g, '');
}

export function fmtDecimals(v?: number | null, digits: number = 1, fallback: string = '—'): string {
  if (v === undefined || v === null || isNaN(v)) return fallback;
  return formatNumberWith(v, digits, loadFormatSettings().numberStyle);
}

export function formatMoneyInput(value: string): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const settings = loadFormatSettings();
  if (!settings.autoGroupMoneyInput) return digits;
  return groupInteger(digits, NUMBER_SEPARATORS[settings.numberStyle].group);
}

export function parseMoneyInput(value: string): number {
  return parseMoneyWith(value, loadFormatSettings());
}

export function parseDecimalNumber(value: string): number {
  return parseNumberWith(value, loadFormatSettings().numberStyle);
}

export function parseMoneyDecimalInput(value: string): number {
  return parseNumberWith(value, loadFormatSettings().numberStyle);
}

export function fmtMoney(v?: number | null): string {
  if (v === undefined || v === null || isNaN(v)) return '—';
  return `${formatMoneyWith(v)} VNĐ`;
}

export function fmtNumber(v?: number | null, fallback: string = '—'): string {
  if (v === undefined || v === null || isNaN(v)) return fallback;
  return formatMoneyWith(v);
}

export function fmtRate(v?: number | null): string {
  if (v === undefined || v === null || isNaN(v)) return '—';
  if (v === 0) return '— chưa khai';
  const ratio = v > 1 ? v / 100 : v;
  return `${formatPercentWith(ratio)}/năm`;
}

export function fmtPercent(v?: number | null, fallback: string = '—'): string {
  if (v === undefined || v === null || isNaN(v)) return fallback;
  return formatPercentWith(v);
}

export function todayIso(): string {
  const d = new Date();
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function daysUntil(dateStr?: string | null, todayStr?: string): number | null {
  const target = parseAnyDate(dateStr);
  if (!target) return null;
  const base = todayStr ? parseAnyDate(todayStr) : null;
  const now = base
    ? Date.UTC(base.year, base.month - 1, base.day)
    : (() => {
        const d = new Date();
        return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
      })();
  const to = Date.UTC(target.year, target.month - 1, target.day);
  return Math.round((to - now) / 86400000);
}

export function formatAssetType(assetType?: string | null): string {
  if (!assetType) return 'Loại 1';
  let cleaned = assetType.replace(/^(BĐS|BDS)\s*-\s*/i, '').replace(/^(BĐS|BDS)\s+/i, '').trim();
  return cleaned || 'Loại 1';
}

export interface ParsedDate {
  year: number;
  month: number;
  day: number;
}

export function parseAnyDate(v?: string | null): ParsedDate | null {
  if (!v) return null;
  const str = String(v).trim().split('T')[0].split(' ')[0];
  if (!str || str === '—') return null;

  let match = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { year, month, day };
    }
  }

  match = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (match) {
    const n1 = parseInt(match[1], 10);
    const n2 = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);

    if (n1 > 12 && n2 <= 12) {
      return { year, month: n2, day: n1 };
    }
    if (n2 > 12 && n1 <= 12) {
      return { year, month: n1, day: n2 };
    }
    if (n1 <= 12 && n2 <= 12) {
      return { year, month: n2, day: n1 };
    }
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate()
    };
  }

  return null;
}

export function fmtDate(
  v?: string | null,
  format?: 'dd/mm/yyyy' | 'mm/dd/yyyy' | 'yyyy-mm-dd'
): string {
  if (!v) return '—';
  const str = String(v).trim();
  if (!str || str === '—') return '—';

  const parsed = parseAnyDate(str);
  if (!parsed) return String(v);

  const savedFmt = (typeof localStorage !== 'undefined' ? localStorage.getItem('app_date_format') : null) as any;
  const activeFmt = format || savedFmt || 'dd/mm/yyyy';

  const dd = String(parsed.day).padStart(2, '0');
  const mm = String(parsed.month).padStart(2, '0');
  const yyyy = String(parsed.year);

  if (activeFmt === 'mm/dd/yyyy') return `${mm}/${dd}/${yyyy}`;
  if (activeFmt === 'yyyy-mm-dd') return `${yyyy}-${mm}-${dd}`;
  return `${dd}/${mm}/${yyyy}`;
}

export function toIsoDate(v?: string | null): string | null {
  const p = parseAnyDate(v);
  if (!p) return null;
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

import type { RateAdjustmentHistoryItem, LoanContract } from '../types';

export function getContractRateHistory(c?: LoanContract | null): RateAdjustmentHistoryItem[] {
  if (!c) return [];

  if (c.RateHistory) {
    if (Array.isArray(c.RateHistory)) {
      return c.RateHistory;
    }
    if (typeof c.RateHistory === 'string' && c.RateHistory.trim()) {
      try {
        const parsed = JSON.parse(c.RateHistory);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
  }

  return [];
}

export function stripLegacyNoteBlobs(note?: string | null): string {
  if (!note) return '';
  return note
    .replace(/\[COLLATERAL_IDS:[^\]]*\]/g, '')
    .replace(/\[PENALTY_SURCHARGE:[^\]]*\]/g, '')
    .replace(/\[PENALTY_RATE:[^\]]*\]/g, '')
    .replace(/\[RATE_HISTORY:[\s\S]*?\]\]/g, '')
    .replace(/\[RATE_HISTORY:[^\]]*\]/g, '')
    .split(/\r?\n/)
    .filter(line => !/^\s*HĐTD:/.test(line))
    .map(line => line.trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

export function getMasterHdtdNumber(c?: LoanContract | null): string {
  if (!c) return '';
  if (c.ContractNumber?.includes('/GNN-')) {
    return c.ContractNumber.split('/GNN-')[0].trim();
  }
  return c.ContractNumber?.trim() || 'HĐTD-CHÍNH';
}

export function chunk<T>(items: T[], size: number): T[][] {
  if (items.length === 0) return [];
  if (!Number.isFinite(size) || size <= 0) return [items];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}
