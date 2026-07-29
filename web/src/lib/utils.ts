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
    // Handle ISO datetime strings like "2026-05-15T00:00:00Z"
    const dateOnly = v.split('T')[0];
    const parts = dateOnly.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return v;
  } catch {
    return v;
  }
}
