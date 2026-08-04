import type { LoanScheduleRow } from './calcMath';
import { fmtDate } from './utils';

export const CUSTOMER_SCHEDULE_HEADERS = [
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

export interface CustomerScheduleDocInput {
  rows: LoanScheduleRow[];
  info: { label: string; value: string }[];
  totals: { principal: number; interest: number; total: number };
  orgName?: string;
  customerName?: string;
  docRef?: string;
  preparedBy?: string;
  noteText?: string;
  title?: string;
  subtitle?: string;
  showSignature?: boolean;
}

const DOC_CSS = `
  @page { size: A4 landscape; margin: 12mm 10mm; }
  body { font-family: "Segoe UI", Arial, sans-serif; font-size: 11px; color: #0f172a; }
  .doc-head { text-align: center; margin-bottom: 10px; }
  .org { font-size: 12px; font-weight: bold; text-transform: uppercase; }
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
  .note { margin-top: 10px; font-size: 10px; font-style: italic; line-height: 1.5; }
  .sign { width: 100%; margin-top: 18px; border-collapse: collapse; }
  .sign td { width: 50%; text-align: center; font-size: 11px; padding-top: 4px; }
  .sign .role { font-weight: bold; text-transform: uppercase; }
  .sign .space { height: 55px; }
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

export function customerScheduleRowCells(r: LoanScheduleRow): string[] {
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

export function buildCustomerScheduleDocHtml(input: CustomerScheduleDocInput): string {
  const org = txt(input.orgName);
  const customer = txt(input.customerName);
  const ref = txt(input.docRef);
  const officer = txt(input.preparedBy);
  const note = txt(input.noteText);

  const pairs = [
    ...(customer ? [{ label: 'Khách hàng:', value: customer }] : []),
    ...(ref ? [{ label: 'Số HĐTD / Đề nghị:', value: ref }] : []),
    ...input.info.map(p => ({ label: escapeHtml(p.label), value: escapeHtml(p.value) })),
  ];

  let infoRows = '';
  for (let i = 0; i < pairs.length; i += 2) {
    const a = pairs[i];
    const b = pairs[i + 1];
    infoRows += `<tr>`
      + `<td class="info-label">${a ? a.label : ''}</td><td class="info-val">${a ? a.value : ''}</td>`
      + `<td class="info-label">${b ? b.label : ''}</td><td class="info-val">${b ? b.value : ''}</td>`
      + `</tr>`;
  }

  const headHtml = CUSTOMER_SCHEDULE_HEADERS.map(h => `<th>${h}</th>`).join('');
  const bodyHtml = input.rows.map(r => {
    const cells = customerScheduleRowCells(r)
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

  const title = txt(input.title) || 'Bảng lịch trả nợ dự kiến';
  const subtitle = input.subtitle === undefined
    ? '(Kèm theo hồ sơ vay của khách hàng)'
    : txt(input.subtitle);
  const showSignature = input.showSignature !== false;

  return `<html><head><meta charset="utf-8" /><title>${title}</title><style>${DOC_CSS}</style></head>`
    + `<body>`
    + `<div class="doc-head">`
    + (org ? `<div class="org">${org}</div>` : '')
    + `<div class="doc-title">${title}</div>`
    + (subtitle ? `<div class="doc-sub">${subtitle}</div>` : '')
    + `</div>`
    + `<table class="info-table">${infoRows}</table>`
    + `<table class="sched"><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody><tfoot>${footHtml}</tfoot></table>`
    + (note ? `<div class="note"><b>Lưu ý:</b> ${note}</div>` : '')
    + (showSignature
      ? `<table class="sign">`
        + `<tr><td class="role">Khách hàng</td><td class="role">Cán bộ lập bảng</td></tr>`
        + `<tr><td class="space"></td><td class="space"></td></tr>`
        + `<tr><td>${customer}</td><td>${officer}</td></tr>`
        + `</table>`
      : '')
    + `</body></html>`;
}
