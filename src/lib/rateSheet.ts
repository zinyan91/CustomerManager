import type {
  RateProgram, RateProgramTier, RateProgramPrepaymentFee,
  RateProgramFeeOption, RateProgramCondition, DepositChannel, DepositPayoutMode,
} from './rateQuote';
import { PAYOUT_MODE_LABELS, CHANNEL_LABELS } from './rateQuote';

function isNum(v?: number | null): v is number {
  return v !== null && v !== undefined && !isNaN(v);
}

export function formatRateForCustomer(rate?: number | null): string {
  if (!isNum(rate)) return '—';
  const asPercent = rate * 100;
  const rounded = Number(asPercent.toFixed(2));
  return `${rounded.toString().replace('.', ',')}%`;
}

export function formatMoneyForCustomer(amount?: number | null): string {
  if (!isNum(amount)) return '—';
  if (amount >= 1_000_000_000_000) {
    const v = amount / 1_000_000_000_000;
    return `${Number(v.toFixed(2)).toString().replace('.', ',')} nghìn tỷ đồng`;
  }
  if (amount >= 1_000_000_000) {
    const v = amount / 1_000_000_000;
    return `${Number(v.toFixed(2)).toString().replace('.', ',')} tỷ đồng`;
  }
  return `${amount.toLocaleString('vi-VN')} đồng`;
}

export function formatDateForCustomer(iso?: string | null): string {
  if (!iso) return '—';
  const parts = iso.split('T')[0].split('-');
  if (parts.length !== 3) return iso;
  return `${parseInt(parts[2], 10)}/${parseInt(parts[1], 10)}/${parts[0]}`;
}

export function prepaymentYearLabel(fee: RateProgramPrepaymentFee): string {
  if (fee.YearTo === null || fee.YearTo === undefined) {
    return `Từ năm thứ ${fee.YearFrom}`;
  }
  if (fee.YearFrom === fee.YearTo) return `Năm ${fee.YearFrom}`;
  return `Năm ${fee.YearFrom} – ${fee.YearTo}`;
}

export function prepaymentFeeLabel(fee: RateProgramPrepaymentFee): string {
  if (!isNum(fee.FeeRatio)) return '—';
  if (fee.FeeRatio === 0) return 'Miễn phí';
  return formatRateForCustomer(fee.FeeRatio);
}

const KIND_FILE_BASE: Record<string, string> = {
  cho_vay_ngan_han: 'LS NGAN HAN',
  cho_vay_trung_dai_han: 'LS TDH',
  huy_dong: 'LS HUY DONG',
};

export function customerSegmentOf(program: Pick<RateProgram, 'TargetText' | 'Name'>): 'KHCN' | 'KHDN' {
  const text = `${program.TargetText || ''} ${program.Name || ''}`.toUpperCase();
  if (text.includes('KHDN') || text.includes('DOANH NGHIỆP')) return 'KHDN';
  return 'KHCN';
}

export function rateSheetFileBase(
  program: Pick<RateProgram, 'Kind' | 'TargetText' | 'Name'>
): string {
  const base = KIND_FILE_BASE[program.Kind] || 'LS';
  if (program.Kind === 'huy_dong') return base;
  return `${base} ${customerSegmentOf(program)}`;
}

export interface RateSheetBlocker {
  message: string;
}

export interface RateSheetInput {
  program: RateProgram;
  tiers: RateProgramTier[];
  prepaymentFees?: RateProgramPrepaymentFee[];
  feeOptions?: RateProgramFeeOption[];
  conditions?: RateProgramCondition[];
  bankName?: string;
  preparedBy?: string;
  channel?: DepositChannel | null;
  logoDataUri?: string | null;
  includeFees?: boolean;
}

export function findRateSheetBlockers(input: RateSheetInput): RateSheetBlocker[] {
  const blockers: RateSheetBlocker[] = [];
  const { program, tiers } = input;

  if (!program.SourceVerified) {
    blockers.push({
      message: `Chương trình "${program.DocumentNumber}" chưa đối chiếu văn bản gốc — không được gửi cho khách hàng.`,
    });
  }

  const relevant = program.Kind === 'huy_dong' && input.channel
    ? tiers.filter(t => t.Channel === input.channel)
    : tiers;

  if (relevant.length === 0) {
    blockers.push({ message: 'Chương trình chưa có dòng lãi suất nào để in.' });
  }

  const missing = relevant.filter(t => !isNum(t.RateAnnual));
  if (missing.length > 0) {
    blockers.push({
      message: `Còn ${missing.length} gói chưa có lãi suất: ${missing.map(t => t.Label).join('; ')}.`,
    });
  }

  const missingFees = (input.prepaymentFees || []).filter(f => !isNum(f.FeeRatio));
  if (missingFees.length > 0) {
    blockers.push({
      message: `Phí trả nợ trước hạn còn thiếu số ở: ${missingFees.map(prepaymentYearLabel).join('; ')}.`,
    });
  }

  return blockers;
}

function esc(v?: string | null): string {
  if (!v) return '';
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function lendingRateTable(input: RateSheetInput): string {
  const hasChoice = input.tiers.some(t => t.PackageCode);
  const spread = input.program.FloatingSpreadAnnual;
  const hasSpread = isNum(spread);

  const spreadCellText = hasSpread
    ? `${esc(input.program.FloatingBaseLabel || 'LSCS')} + biên độ tối thiểu ${formatRateForCustomer(spread)}`
    : '';

  const rows = input.tiers.map((t, i) => `
    <tr>
      ${hasChoice ? `<td class="mid strong">${esc(t.PackageCode || '—')}</td>` : ''}
      <td class="c1">${esc(t.Label)}</td>
      <td class="num strong">${formatRateForCustomer(t.RateAnnual)}</td>
      <td class="num">${t.MinTenorMonths ? `${t.MinTenorMonths} tháng` : '—'}</td>
      ${hasSpread && i === 0
        ? `<td class="mid spread" rowspan="${input.tiers.length}">${spreadCellText}</td>`
        : ''}
    </tr>`).join('');

  const resetNote = input.program.RateResetMonths
    ? `<p class="note">LSCV sau thời gian cố định áp dụng khi thời gian vay lớn hơn thời gian cố định,
       kỳ điều chỉnh ${input.program.RateResetMonths} tháng/lần.</p>`
    : '';

  return `
    <h2>Lãi suất cho vay (LSCV)</h2>
    <table>
      <thead>
        <tr>
          ${hasChoice ? '<th class="mid">Lựa chọn</th>' : ''}
          <th>Kỳ cố định LSCV</th>
          <th class="num">LSCV (%/năm)</th>
          <th class="num">TG vay tối thiểu</th>
          ${hasSpread ? '<th class="mid">LSCV sau thời gian cố định</th>' : ''}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    ${resetNote}`;
}

function tierFeeTable(input: RateSheetInput): string {
  if (input.includeFees === false) return '';
  const rows = input.tiers.filter(t => isNum(t.MinFeeRatio));
  if (rows.length === 0) return '';

  const minAmount = input.program.MinFeeAmountVnd;
  const body = rows.map((t, i) => `
    <tr>
      <td class="mid strong">${esc(t.PackageCode || t.Label)}</td>
      <td class="num strong">${formatRateForCustomer(t.MinFeeRatio)}</td>
      ${isNum(minAmount) && i === 0
        ? `<td class="mid" rowspan="${rows.length}">${formatMoneyForCustomer(minAmount)}</td>`
        : ''}
    </tr>`).join('');

  return `
    <h2>Doanh thu phí dịch vụ tối thiểu</h2>
    <table>
      <thead>
        <tr>
          <th class="mid">Lựa chọn</th>
          <th class="num">Doanh thu phí tối thiểu</th>
          ${isNum(minAmount) ? '<th class="mid">Số tiền tối thiểu</th>' : ''}
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>`;
}

export interface DepositMatrix {
  tenors: number[];
  payoutModes: DepositPayoutMode[];
  rows: { balanceTier: string; cells: (number | null)[] }[];
}

const PAYOUT_ORDER: DepositPayoutMode[] = ['cuoi_ky', 'hang_thang', 'hang_quy', 'tra_truoc'];

export function buildDepositMatrix(
  tiers: RateProgramTier[],
  channel: DepositChannel
): DepositMatrix {
  const rows = tiers.filter(t => t.Channel === channel);

  const tenors: number[] = [];
  for (const t of rows) {
    if (isNum(t.TenorMonths) && !tenors.includes(t.TenorMonths)) tenors.push(t.TenorMonths);
  }
  tenors.sort((a, b) => a - b);

  const payoutModes = PAYOUT_ORDER.filter(m => rows.some(t => t.PayoutMode === m));

  const balanceTiers: string[] = [];
  for (const t of rows) {
    const key = t.BalanceTierLabel || '';
    if (!balanceTiers.includes(key)) balanceTiers.push(key);
  }

  return {
    tenors,
    payoutModes,
    rows: balanceTiers.map(balanceTier => ({
      balanceTier,
      cells: tenors.flatMap(tenor =>
        payoutModes.map(mode => {
          const hit = rows.find(t =>
            (t.BalanceTierLabel || '') === balanceTier
            && t.TenorMonths === tenor
            && t.PayoutMode === mode
          );
          return hit && isNum(hit.RateAnnual) ? hit.RateAnnual : null;
        })
      ),
    })),
  };
}

const KENH_GUI_KHACH: DepositChannel[] = ['quay', 'online'];

function depositRateTable(input: RateSheetInput): string {
  const channels: DepositChannel[] = input.channel
    ? (KENH_GUI_KHACH.includes(input.channel) ? [input.channel] : [])
    : KENH_GUI_KHACH;

  return channels.map(ch => {
    const rows = input.tiers.filter(t => t.Channel === ch);
    if (rows.length === 0) return '';

    const hasTier = rows.some(t => t.BalanceTierLabel);
    const hasPayout = rows.some(t => t.PayoutMode);

    if (!hasTier || !hasPayout) {
      const body = rows.map(t => `
        <tr>
          <td class="c1">${t.TenorMonths ? `Kỳ hạn ${t.TenorMonths} tháng` : esc(t.Label)}</td>
          <td class="num strong">${formatRateForCustomer(t.RateAnnual)}</td>
        </tr>`).join('');
      return `
        <h2>Lãi suất tiền gửi — ${esc(CHANNEL_LABELS[ch])}</h2>
        <table>
          <thead><tr><th>Kỳ hạn</th><th class="num">Lãi suất (%/năm)</th></tr></thead>
          <tbody>${body}</tbody>
        </table>`;
    }

    const m = buildDepositMatrix(input.tiers, ch);
    const groupHead = m.tenors
      .map(t => `<th class="mid" colspan="${m.payoutModes.length}">Kỳ hạn ${String(t).padStart(2, '0')} tháng</th>`)
      .join('');
    const modeHead = m.tenors
      .map(() => m.payoutModes.map(mo => `<th class="mid">${esc(PAYOUT_MODE_LABELS[mo])}</th>`).join(''))
      .join('');
    const body = m.rows.map(r => `
      <tr>
        <td class="c1">${esc(r.balanceTier) || '—'}</td>
        ${r.cells.map(c => `<td class="num strong">${c === null ? '—' : formatRateForCustomer(c)}</td>`).join('')}
      </tr>`).join('');

    return `
      <h2>Lãi suất tiền gửi — ${esc(CHANNEL_LABELS[ch])}</h2>
      <table>
        <thead>
          <tr><th rowspan="2" class="mid">Điều kiện áp dụng</th>${groupHead}</tr>
          <tr>${modeHead}</tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
      <p class="note">Đơn vị tính: %/năm.</p>`;
  }).join('');
}

function conditionsBlock(input: RateSheetInput): string {
  const conditions = input.conditions || [];
  if (conditions.length === 0) return '';
  const items = conditions.map(c => `
    <li>${c.Heading ? `<strong>${esc(c.Heading)}:</strong> ` : ''}${esc(c.Content)}</li>`).join('');
  return `<h2>Điều kiện áp dụng</h2><ul>${items}</ul>`;
}

export function pivotFeeOptions(options: RateProgramFeeOption[]): {
  optionLabels: string[];
  groups: { group: string; cells: (RateProgramFeeOption | null)[] }[];
} {
  const optionLabels: string[] = [];
  const groupNames: string[] = [];

  for (const o of options) {
    if (!optionLabels.includes(o.OptionLabel)) optionLabels.push(o.OptionLabel);
    if (!groupNames.includes(o.PackageGroup)) groupNames.push(o.PackageGroup);
  }

  const groups = groupNames.map(group => ({
    group,
    cells: optionLabels.map(label =>
      options.find(o => o.PackageGroup === group && o.OptionLabel === label) ?? null
    ),
  }));

  return { optionLabels, groups };
}

function feeOptionsBlock(input: RateSheetInput): string {
  if (input.includeFees === false) return '';
  const options = input.feeOptions || [];
  if (options.length === 0) return '';

  const { optionLabels, groups } = pivotFeeOptions(options);

  const head = optionLabels.map(l => `<th class="mid">${esc(l)}</th>`).join('');
  const body = groups.map(g => `
    <tr>
      <td class="c1">${esc(g.group)}</td>
      ${g.cells.map(c => c === null
        ? '<td class="mid">—</td>'
        : `<td>
             <div class="feebig">${formatRateForCustomer(c.MinFeeRatio)}</div>
             <div class="small">dư nợ giải ngân lần này${c.Note ? `. ${esc(c.Note)}` : ''}</div>
           </td>`).join('')}
    </tr>`).join('');

  return `
    <h2>Phí dịch vụ — khách hàng chọn 1 trong 2 phương án</h2>
    <table>
      <thead><tr><th>Lựa chọn</th>${head}</tr></thead>
      <tbody>${body}</tbody>
    </table>`;
}

function prepaymentBlock(input: RateSheetInput): string {
  const fees = input.prepaymentFees || [];
  if (fees.length === 0) return '';

  const notes = fees
    .filter(f => f.Note)
    .map(f => `<p>${esc(f.Note)}</p>`)
    .join('');

  const byLoanType = fees.filter(f => f.AppliesTo);
  if (byLoanType.length > 0) {
    const body = byLoanType.map(f => `
      <tr>
        <td class="c1">${esc(f.AppliesTo)}</td>
        <td class="num strong">${esc(prepaymentFeeLabel(f))}</td>
      </tr>`).join('');
    return `
      <h2>Phí trả nợ trước hạn</h2>
      <table>
        <thead><tr><th>Loại khoản vay</th><th class="num">Mức phí</th></tr></thead>
        <tbody>${body}</tbody>
      </table>
      ${notes}`;
  }

  const head = fees.map(f => `<th class="num">${esc(prepaymentYearLabel(f))}</th>`).join('');
  const body = fees.map(f => `<td class="num strong">${esc(prepaymentFeeLabel(f))}</td>`).join('');
  return `
    <h2>Phí trả nợ trước hạn</h2>
    <table>
      <thead><tr><th>Thời điểm</th>${head}</tr></thead>
      <tbody><tr><td class="c1">Mức phí</td>${body}</tr></tbody>
    </table>
    ${notes}`;
}

export interface RateSheetParts {
  fileBase: string;
  styles: string;
  bodyHtml: string;
  landscape: boolean;
}

export function buildRateSheetParts(input: RateSheetInput): RateSheetParts {
  const { program } = input;
  const bankName = input.bankName || 'VIETBANK';
  const isDeposit = program.Kind === 'huy_dong';

  const body = isDeposit ? depositRateTable(input) : lendingRateTable(input);

  const styles = `
  @page { size: A4 ${isDeposit ? 'landscape' : 'portrait'}; margin: 0; }
  * { box-sizing: border-box; }
  html, body, header, th, .meta, tbody tr:nth-child(even) {
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  body, .rate-sheet-root {
    font-family: "Segoe UI", Roboto, Arial, sans-serif;
    color: #0f172a; margin: 0; padding: 11mm 12mm; font-size: 9.5pt; line-height: 1.32;
  }
  .logobar { margin-bottom: 6px; }
  .logobar img { height: 34px; width: auto; display: block; }
  header {
    background: #0b5cab; color: #fff; padding: 9px 14px; border-radius: 8px;
    margin-bottom: 9px;
  }
  .bank { font-size: 11pt; font-weight: 800; letter-spacing: .12em; }
  h1 { font-size: 14pt; margin: 3px 0 1px; font-weight: 800; text-transform: uppercase; }
  .sub { font-size: 9.5pt; opacity: .92; }
  .scope p { font-size: 8.5pt; color: #333; margin: 2px 0 0; line-height: 1.35; }
  h2 {
    font-size: 10pt; color: #0b5cab; margin: 10px 0 3px; text-transform: uppercase;
    border-bottom: 2px solid #d7e6f5; padding-bottom: 2px;
  }
  p { margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 3px; page-break-inside: avoid; }
  th, td { border: 1px solid #c9d8e8; padding: 3.5px 6px; vertical-align: top; }
  th { background: #0b5cab; color: #fff; font-size: 8.5pt; text-align: left; font-weight: 700; }
  tbody tr:nth-child(even) { background: #f2f7fc; }
  .num { text-align: right; white-space: nowrap; }
  th.num { text-align: right; }
  .strong { font-weight: 800; color: #0b5cab; }
  .c1 { font-weight: 600; }
  .mid { text-align: center; vertical-align: middle; }
  .spread { font-weight: 700; color: #0b5cab; }
  .feebig { font-weight: 800; color: #0b5cab; font-size: 11pt; }
  .small { font-size: 8pt; color: #40556e; }
  .note { font-size: 9pt; color: #40556e; margin: 3px 0 0; }
  ul { margin: 3px 0 0 16px; padding: 0; }
  li { margin-bottom: 2px; }
  .meta { background: #f2f7fc; border: 1px solid #d7e6f5; border-radius: 6px; padding: 6px 10px; }
  footer {
    margin-top: 10px; border-top: 1px solid #c9d8e8; padding-top: 5px;
    font-size: 8pt; color: #5a6d84;
  }
`;

  const bodyHtml = `
  ${input.logoDataUri
    ? `<div class="logobar"><img src="${esc(input.logoDataUri)}" alt="${esc(bankName)}" /></div>`
    : ''}
  <header>
    ${input.logoDataUri ? '' : `<div class="bank">${esc(bankName)}</div>`}
    <h1>${esc(program.Name)}</h1>
  </header>

  ${isDeposit && program.ScopeText
    ? `<section class="scope"><h2>Phạm vi áp dụng</h2><p>${esc(program.ScopeText)}</p></section>`
    : ''}

  ${body}
  ${isDeposit ? '' : tierFeeTable(input)}
  ${feeOptionsBlock(input)}
  ${prepaymentBlock(input)}
  ${conditionsBlock(input)}

  <footer>
    ${input.preparedBy ? `<p><strong>Nhân viên tư vấn:</strong> ${esc(input.preparedBy)}</p>` : ''}
  </footer>
`;

  return { fileBase: rateSheetFileBase(program), styles, bodyHtml, landscape: isDeposit };
}

export function buildRateSheetHtml(input: RateSheetInput): string {
  const { fileBase, styles, bodyHtml } = buildRateSheetParts(input);

  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<title>${esc(fileBase)}</title>
<style>${styles}</style>
</head>
<body>${bodyHtml}</body>
</html>`;
}
