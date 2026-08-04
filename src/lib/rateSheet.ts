import type {
  RateProgram, RateProgramTier, RateProgramPrepaymentFee,
  RateProgramFeeOption, RateProgramCondition, DepositChannel,
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
  const rows = input.tiers.map(t => `
    <tr>
      <td class="c1">${esc(t.Label)}</td>
      <td class="num strong">${formatRateForCustomer(t.RateAnnual)}</td>
      ${t.MinTenorMonths ? `<td class="num">${t.MinTenorMonths} tháng</td>` : '<td class="num">—</td>'}
    </tr>`).join('');

  const spread = input.program.FloatingSpreadAnnual;
  const spreadNote = isNum(spread)
    ? `<p class="note"><strong>Sau thời gian cố định:</strong> ${esc(input.program.FloatingBaseLabel || 'lãi suất cơ sở')}
       + biên độ tối thiểu <strong>${formatRateForCustomer(spread)}</strong>${
         input.program.RateResetMonths ? `, kỳ điều chỉnh ${input.program.RateResetMonths} tháng/lần` : ''
       }.</p>`
    : '';

  return `
    <h2>Lãi suất cho vay (LSCV)</h2>
    <table>
      <thead>
        <tr>
          <th>Kỳ cố định LSCV</th>
          <th class="num">LSCV (%/năm)</th>
          <th class="num">Thời gian vay tối thiểu</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    ${spreadNote}`;
}

function depositRateTable(input: RateSheetInput): string {
  const channels: DepositChannel[] = input.channel
    ? [input.channel]
    : (['quay', 'online', 'ftp'] as DepositChannel[]);

  return channels.map(ch => {
    const rows = input.tiers.filter(t => t.Channel === ch);
    if (rows.length === 0) return '';
    const body = rows.map(t => `
      <tr>
        <td class="c1">${esc(t.BalanceTierLabel || '—')}</td>
        <td class="num">${t.TenorMonths ? `${t.TenorMonths} tháng` : '—'}</td>
        <td>${t.PayoutMode ? PAYOUT_MODE_LABELS[t.PayoutMode] : '—'}</td>
        <td class="num strong">${formatRateForCustomer(t.RateAnnual)}</td>
      </tr>`).join('');
    return `
      <h2>Lãi suất tiền gửi — ${esc(CHANNEL_LABELS[ch])}</h2>
      <table>
        <thead>
          <tr>
            <th>Điều kiện áp dụng</th>
            <th class="num">Kỳ hạn</th>
            <th>Cách trả lãi</th>
            <th class="num">Lãi suất (%/năm)</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>`;
  }).join('');
}

function conditionsBlock(input: RateSheetInput): string {
  const conditions = input.conditions || [];
  if (conditions.length === 0) return '';
  const items = conditions.map(c => `
    <li>${c.Heading ? `<strong>${esc(c.Heading)}:</strong> ` : ''}${esc(c.Content)}</li>`).join('');
  return `<h2>Điều kiện áp dụng</h2><ul>${items}</ul>`;
}

function feeOptionsBlock(input: RateSheetInput): string {
  const options = input.feeOptions || [];
  if (options.length === 0) return '';
  const rows = options.map(o => `
    <tr>
      <td class="c1"><strong>${esc(o.OptionLabel)}</strong></td>
      <td>${esc(o.PackageGroup)}</td>
      <td class="num strong">${formatRateForCustomer(o.MinFeeRatio)}</td>
      <td class="small">${esc(o.Note)}</td>
    </tr>`).join('');
  return `
    <h2>Phí dịch vụ</h2>
    <table>
      <thead>
        <tr>
          <th>Phương án</th>
          <th>Nhóm gói cố định</th>
          <th class="num">Phí tối thiểu / dư nợ giải ngân</th>
          <th>Ghi chú</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function prepaymentBlock(input: RateSheetInput): string {
  const fees = input.prepaymentFees || [];
  if (fees.length === 0) return '';
  const head = fees.map(f => `<th class="num">${esc(prepaymentYearLabel(f))}</th>`).join('');
  const body = fees.map(f => `<td class="num strong">${esc(prepaymentFeeLabel(f))}</td>`).join('');
  const notes = fees
    .filter(f => f.Note)
    .map(f => `<p class="note">${esc(f.Note)}</p>`)
    .join('');
  return `
    <h2>Phí trả nợ trước hạn</h2>
    <table>
      <thead><tr><th>Thời điểm</th>${head}</tr></thead>
      <tbody><tr><td class="c1">Mức phí</td>${body}</tr></tbody>
    </table>
    ${notes}`;
}

export function buildRateSheetHtml(input: RateSheetInput): string {
  const { program } = input;
  const bankName = input.bankName || 'VIETBANK';
  const isDeposit = program.Kind === 'huy_dong';

  const periodLine = [
    `<strong>Thời gian triển khai:</strong> từ ngày ${formatDateForCustomer(program.EffectiveFrom)}`,
    program.EffectiveTo ? ` đến hết ngày ${formatDateForCustomer(program.EffectiveTo)}` : '',
    program.QuotaVnd ? ' hoặc đến khi hết hạn mức chương trình' : '',
  ].join('') + '.';

  const quotaLine = program.QuotaVnd
    ? `<p><strong>Hạn mức chương trình:</strong> ${formatMoneyForCustomer(program.QuotaVnd)}.</p>`
    : '';

  const body = isDeposit ? depositRateTable(input) : lendingRateTable(input);

  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<title>${esc(program.Name)}</title>
<style>
  @page { size: A4 portrait; margin: 11mm 12mm; }
  * { box-sizing: border-box; }
  /* Chrome mặc định KHÔNG in nền khi Save as PDF; không có dòng này thì
     dải tiêu đề xanh và ô tiêu đề bảng in ra trắng, chữ trắng mất hút. */
  html, body, header, th, .meta, tbody tr:nth-child(even) {
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  body {
    font-family: "Segoe UI", Roboto, Arial, sans-serif;
    color: #0f172a; margin: 0; font-size: 9.5pt; line-height: 1.32;
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
  .small { font-size: 8pt; color: #40556e; }
  .note { font-size: 8pt; color: #40556e; margin: 3px 0 0; }
  ul { margin: 3px 0 0 16px; padding: 0; }
  li { margin-bottom: 2px; }
  .meta { background: #f2f7fc; border: 1px solid #d7e6f5; border-radius: 6px; padding: 6px 10px; }
  footer {
    margin-top: 10px; border-top: 1px solid #c9d8e8; padding-top: 5px;
    font-size: 8pt; color: #5a6d84;
  }
  .disclaimer { margin-top: 3px; font-style: italic; }
</style>
</head>
<body>
  ${input.logoDataUri
    ? `<div class="logobar"><img src="${esc(input.logoDataUri)}" alt="${esc(bankName)}" /></div>`
    : ''}
  <header>
    ${input.logoDataUri ? '' : `<div class="bank">${esc(bankName)}</div>`}
    <h1>${esc(program.Name)}</h1>
    <div class="sub">Dành cho Khách hàng cá nhân</div>
  </header>

  <div class="meta">
    ${quotaLine}
    <p>${periodLine}</p>
  </div>

  ${body}
  ${conditionsBlock(input)}
  ${feeOptionsBlock(input)}
  ${prepaymentBlock(input)}

  <footer>
    <p><strong>Chi tiết xem tại:</strong> Thông báo số ${esc(program.DocumentNumber)}${
      program.DocumentDate ? ` ngày ${formatDateForCustomer(program.DocumentDate)}` : ''
    }.</p>
    ${input.preparedBy ? `<p><strong>Nhân viên tư vấn:</strong> ${esc(input.preparedBy)}</p>` : ''}
    <p class="disclaimer">
      Bảng lãi suất mang tính tham khảo tại thời điểm phát hành. Lãi suất và phí có thể thay đổi theo
      thông báo của ${esc(bankName)} trong từng thời kỳ. Điều kiện cụ thể của từng khoản vay được xác định
      khi ${esc(bankName)} thẩm định và phê duyệt hồ sơ.
    </p>
  </footer>
</body>
</html>`;
}
