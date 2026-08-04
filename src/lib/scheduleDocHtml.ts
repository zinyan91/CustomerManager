import type { LoanScheduleRow } from './calcMath';
import { fmtDate } from './utils';

export const SCHEDULE_DOC_HEADERS = [
  'Kỳ',
  'Từ ngày',
  'Đến ngày',
  'Số ngày',
  'Dư nợ đầu kỳ',
  'LS áp dụng (%/năm)',
  'Gốc phải trả',
  'Lãi phải trả',
  'Tổng phải trả',
  'Dư nợ cuối kỳ',
];

export interface ScheduleDocInput {
  rows: LoanScheduleRow[];
  info: { label: string; value: string }[];
  totals: { principal: number; interest: number; total: number };
  title?: string;
  subtitle?: string;
}

const DOC_CSS = `
  @page { size: A4 landscape; margin: 12mm 10mm; }
  body { font-family: "Segoe UI", Arial, sans-serif; font-size: 11px; color: #0f172a; }
  .doc-head { text-align: center; margin-bottom: 10px; }
  .doc-title { font-size: 17px; font-weight: bold; text-transform: uppercase; margin-top: 6px; }
  .doc-sub { font-size: 11px; font-style: italic; margin-top: 3px; }
  .info-table { width: 100%; border-collapse: collapse; margin: 10px 0 6px 0; }
  .info-table td { padding: 4px 8px; border: 1px solid #cbd5e1; font-size: 11px; }
  .info-label { width: 18%; font-weight: bold; background: #f1f5f9; }
  .info-val { width: 32%; }
  table.sched { width: 100%; border-collapse: collapse; }
  table.sched th { background: #e2e8f0; border: 1px solid #94a3b8; padding: 5px 4px; font-size: 10px; text-align: center; }
  table.sched td { border: 1px solid #cbd5e1; padding: 4px; font-size: 10px; }
  table.sched tfoot td { background: #f1f5f9; font-weight: bold; }
  .c { text-align: center; }
  .r { text-align: right; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
`;

export function escapeHtml(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function txt(v?: string): string {
  return escapeHtml((v ?? '').trim());
}

export function scheduleDocRowCells(r: LoanScheduleRow): string[] {
  return [
    String(r.period),
    fmtDate(r.startDate),
    fmtDate(r.dueDate),
    `${r.days}`,
    r.beginningBalance.toLocaleString('vi-VN'),
    r.rateAnnual.toLocaleString('vi-VN', { maximumFractionDigits: 2 }),
    r.principal.toLocaleString('vi-VN'),
    r.interest.toLocaleString('vi-VN'),
    r.totalPayment.toLocaleString('vi-VN'),
    r.endingBalance.toLocaleString('vi-VN'),
  ];
}

export function buildScheduleDocHtml(input: ScheduleDocInput): string {
  const pairs = input.info.map(p => ({ label: escapeHtml(p.label), value: escapeHtml(p.value) }));

  let infoRows = '';
  for (let i = 0; i < pairs.length; i += 2) {
    const a = pairs[i];
    const b = pairs[i + 1];
    infoRows += `<tr>`
      + `<td class="info-label">${a ? a.label : ''}</td><td class="info-val">${a ? a.value : ''}</td>`
      + `<td class="info-label">${b ? b.label : ''}</td><td class="info-val">${b ? b.value : ''}</td>`
      + `</tr>`;
  }

  const headHtml = SCHEDULE_DOC_HEADERS.map(h => `<th>${h}</th>`).join('');
  const bodyHtml = input.rows.map(r => {
    const cells = scheduleDocRowCells(r)
      .map((c, idx) => `<td class="${idx <= 3 || idx === 5 ? 'c' : 'r'}">${c}</td>`)
      .join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  const footHtml = `<tr>`
    + `<td class="c" colspan="6">TỔNG CỘNG</td>`
    + `<td class="r">${input.totals.principal.toLocaleString('vi-VN')}</td>`
    + `<td class="r">${input.totals.interest.toLocaleString('vi-VN')}</td>`
    + `<td class="r">${input.totals.total.toLocaleString('vi-VN')}</td>`
    + `<td></td>`
    + `</tr>`;

  const title = txt(input.title) || 'Bảng lịch thu nợ dự kiến';
  const subtitle = txt(input.subtitle);

  return `<html><head><meta charset="utf-8" /><title>${title}</title><style>${DOC_CSS}</style></head>`
    + `<body>`
    + `<div class="doc-head">`
    + `<div class="doc-title">${title}</div>`
    + (subtitle ? `<div class="doc-sub">${subtitle}</div>` : '')
    + `</div>`
    + `<table class="info-table">${infoRows}</table>`
    + `<table class="sched"><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody><tfoot>${footHtml}</tfoot></table>`
    + `</body></html>`;
}
