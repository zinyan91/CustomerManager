import { parseAnyDate, daysUntil } from './utils';
import { printHtmlDoc } from './printHtmlDoc';

export type DueFilter = 'all' | 'upcoming' | 'expired';

export interface MonthlyDueInfo {
  dueDateIso: string;
  dueDateStr: string;
  daysLeft: number;
}

export function monthlyDueInfo(
  dateStr?: string | null,
  todayStr?: string
): MonthlyDueInfo | null {
  const origin = parseAnyDate(dateStr);
  if (!origin) return null;

  const base = todayStr ? parseAnyDate(todayStr) : null;
  const now = base
    ? new Date(base.year, base.month - 1, base.day)
    : (() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
      })();

  const clampedDueIn = (year: number, monthIdx: number): Date => {
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
    return new Date(year, monthIdx, Math.min(origin.day, daysInMonth));
  };

  let due = clampedDueIn(now.getFullYear(), now.getMonth());
  if (due.getTime() < now.getTime()) {
    due = clampedDueIn(now.getFullYear(), now.getMonth() + 1);
  }

  const yyyy = due.getFullYear();
  const mm = String(due.getMonth() + 1).padStart(2, '0');
  const dd = String(due.getDate()).padStart(2, '0');
  const dueDateIso = `${yyyy}-${mm}-${dd}`;

  return {
    dueDateIso,
    dueDateStr: `${dd}/${mm}/${yyyy}`,
    daysLeft: daysUntil(dueDateIso, todayStr) ?? 0,
  };
}

export const DUE_FILTER_LABELS: Record<DueFilter, string> = {
  all: 'Tất cả',
  upcoming: 'Sắp đến hạn',
  expired: 'Đã hết hạn',
};

export function filterByDue<T>(
  items: T[],
  filter: DueFilter,
  daysLeftOf: (item: T) => number | null | undefined
): T[] {
  if (filter === 'all') return items;
  return items.filter(item => {
    const d = daysLeftOf(item);
    const expired = d !== null && d !== undefined && d < 0;
    return filter === 'expired' ? expired : !expired;
  });
}

export function countByDue<T>(
  items: T[],
  daysLeftOf: (item: T) => number | null | undefined
): { upcoming: number; expired: number } {
  let upcoming = 0;
  let expired = 0;
  for (const item of items) {
    const d = daysLeftOf(item);
    if (d !== null && d !== undefined && d < 0) expired += 1;
    else upcoming += 1;
  }
  return { upcoming, expired };
}

export interface DueListSheetInput {
  title: string;
  columns: string[];
  rows: string[][];
  alignRight?: number[];
  preparedBy?: string;
}

function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildDueListHtml(input: DueListSheetInput): string {
  const right = new Set(input.alignRight || []);

  const head = input.columns
    .map((c, i) => `<th${right.has(i) ? ' class="r"' : ''}>${esc(c)}</th>`)
    .join('');

  const body = input.rows.length === 0
    ? `<tr><td colspan="${input.columns.length}" class="empty">Không có dòng nào.</td></tr>`
    : input.rows
        .map(r => `<tr>${r.map((cell, i) => `<td${right.has(i) ? ' class="r"' : ''}>${esc(cell)}</td>`).join('')}</tr>`)
        .join('');

  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<title>${esc(input.title)}</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Arial, sans-serif; color: #1a1a1a; margin: 0; font-size: 9pt; }
  h1 { font-size: 13pt; color: #0b5cab; margin: 0 0 8px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #c9d9e8; padding: 4px 6px; text-align: left; vertical-align: top; }
  th { background: #eaf2fa; color: #0b5cab; font-size: 8.5pt; text-transform: uppercase; }
  td.r, th.r { text-align: right; }
  tbody tr:nth-child(even) { background: #f7fafd; }
  .empty { text-align: center; color: #777; font-style: italic; }
  footer { margin-top: 10px; font-size: 8pt; color: #555; }
</style>
</head>
<body>
  <h1>${esc(input.title)}</h1>
  <table>
    <thead><tr>${head}</tr></thead>
    <tbody>${body}</tbody>
  </table>
  ${input.preparedBy ? `<footer>Người lập: ${esc(input.preparedBy)}</footer>` : ''}
</body>
</html>`;
}

export function openPrintWindow(html: string): boolean {
  return printHtmlDoc(html, 'Danh sách theo dõi hạn');
}
