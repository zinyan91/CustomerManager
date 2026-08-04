export type DueFilter = 'all' | 'upcoming' | 'expired';

export const DUE_FILTER_LABELS: Record<DueFilter, string> = {
  all: 'Tất cả',
  upcoming: 'Sắp đến hạn',
  expired: 'Đã hết hạn',
};

/**
 * Lọc danh sách theo số ngày còn lại.
 *
 * Mốc 0 thuộc nhóm "sắp đến hạn": đến hạn HÔM NAY thì chưa quá hạn, khớp đúng
 * cách phân nhóm nợ đang dùng trong dự án (dưới 10 ngày quá hạn vẫn Nhóm 1).
 * Thiếu số ngày thì coi là sắp đến hạn để không âm thầm biến mất khỏi cả hai bộ lọc.
 */
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
  subtitle?: string;
  columns: string[];
  /** Mỗi hàng là các ô đã định dạng sẵn dạng chuỗi. */
  rows: string[][];
  /** Chỉ số cột căn phải, thường là cột tiền. */
  alignRight?: number[];
  preparedBy?: string;
  printedOn: string;
  bankName?: string;
}

function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Dựng tài liệu HTML tự chứa để in danh sách theo dõi hạn.
 *
 * Cùng cách làm với tờ lãi suất: không dùng thư viện ngoài, mở cửa sổ mới rồi
 * để trình duyệt in ra PDF. Khổ A4 ngang vì các bảng này nhiều cột.
 *
 * Đây là danh sách theo dõi NỘI BỘ, không phải tài liệu gửi khách hàng.
 */
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
  h1 { font-size: 13pt; color: #0b5cab; margin: 0 0 2px; }
  .sub { font-size: 8.5pt; color: #555; margin-bottom: 8px; }
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
  <div class="sub">
    ${input.bankName ? esc(input.bankName) + ' &bull; ' : ''}Ngày in: ${esc(input.printedOn)}
    ${input.subtitle ? ' &bull; ' + esc(input.subtitle) : ''}
  </div>
  <table>
    <thead><tr>${head}</tr></thead>
    <tbody>${body}</tbody>
  </table>
  <footer>
    Danh sách theo dõi nội bộ.${input.preparedBy ? ` Người lập: ${esc(input.preparedBy)}.` : ''}
  </footer>
</body>
</html>`;
}

export function openPrintWindow(html: string): boolean {
  const win = window.open('', '_blank');
  if (!win) return false;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.setTimeout(() => win.print(), 300);
  return true;
}
