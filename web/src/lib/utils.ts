export function formatMoneyInput(value: string): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('vi-VN');
}

export function parseMoneyInput(value: string): number {
  if (!value) return 0;
  const digits = value.replace(/\D/g, '');
  return parseFloat(digits) || 0;
}

export interface ParsedDate {
  year: number;
  month: number;
  day: number;
}

/**
 * Robust date string parser.
 * Handles ISO (YYYY-MM-DD), VN (DD/MM/YYYY), US (MM/DD/YYYY), or ISO timestamps.
 */
export function parseAnyDate(v?: string | null): ParsedDate | null {
  if (!v) return null;
  const str = String(v).trim().split('T')[0].split(' ')[0];
  if (!str || str === '—') return null;

  // 1. YYYY-MM-DD or YYYY/MM/DD
  let match = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { year, month, day };
    }
  }

  // 2. DD/MM/YYYY or MM/DD/YYYY
  match = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (match) {
    const n1 = parseInt(match[1], 10);
    const n2 = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);

    if (n1 > 12 && n2 <= 12) {
      // n1 MUST be Day, n2 MUST be Month (DD/MM/YYYY)
      return { year, month: n2, day: n1 };
    }
    if (n2 > 12 && n1 <= 12) {
      // n2 MUST be Day, n1 MUST be Month (MM/DD/YYYY)
      return { year, month: n1, day: n2 };
    }
    if (n1 <= 12 && n2 <= 12) {
      // Default n1=Day, n2=Month (DD/MM/YYYY)
      return { year, month: n2, day: n1 };
    }
  }

  // 3. Fallback standard Date parse
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

/**
 * Format a YYYY-MM-DD (or ISO datetime) string according to the requested or stored format.
 * Returns '—' if input is null / undefined / empty.
 */
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
