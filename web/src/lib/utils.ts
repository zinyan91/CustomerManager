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

/**
 * Format a YYYY-MM-DD (or ISO datetime) string as dd/mm/yyyy.
 * Returns '—' if input is null / undefined / empty.
 */
export function fmtDate(v?: string | null): string {
  if (!v) return '—';
  try {
    const str = String(v).trim();
    if (!str || str === '—') return '—';

    const dateOnly = str.split('T')[0].split(' ')[0];

    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(dateOnly)) {
      const parts = dateOnly.split(/[-/]/);
      const yyyy = parts[0];
      const mm = parts[1].padStart(2, '0');
      const dd = parts[2].padStart(2, '0');
      return `${dd}/${mm}/${yyyy}`;
    }

    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateOnly)) {
      const parts = dateOnly.split('/');
      const p1 = parts[0].padStart(2, '0');
      const p2 = parts[1].padStart(2, '0');
      const yyyy = parts[2];
      return `${p1}/${p2}/${yyyy}`;
    }

    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }

    return str;
  } catch {
    return String(v);
  }
}
