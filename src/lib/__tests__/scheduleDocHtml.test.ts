import { describe, it, expect } from 'vitest';
import { buildLoanSchedule } from '../calcMath';
import { buildScheduleDocHtml, escapeHtml } from '../scheduleDocHtml';

const rows = buildLoanSchedule({
  loanAmount: 500_000_000,
  promoRateAnnual: 8.5,
  tenorMonths: 24,
  disbursementDate: '2026-08-04',
  repayMethod: 'equal_principal',
  promoMonths: 3,
  postPromoBaseRateAnnual: 8,
  marginAnnual: 3.5,
  prepayments: [
    { period: 4, amount: 50_000_000, mode: 'reduce_monthly' },
    { period: 10, amount: 30_000_000, mode: 'shorten_tenor' },
  ],
});

const totals = {
  principal: rows.reduce((a, r) => a + r.principal, 0),
  interest: rows.reduce((a, r) => a + r.interest, 0),
  total: rows.reduce((a, r) => a + r.totalPayment, 0),
};

const baseInput = {
  rows,
  totals,
  info: [
    { label: 'Số tiền vay:', value: '500.000.000 VNĐ' },
    { label: 'Thời hạn vay:', value: '24 tháng' },
  ],
};

describe('escapeHtml', () => {
  it('vô hiệu hoá thẻ và dấu nháy trong dữ liệu người dùng nhập', () => {
    expect(escapeHtml('<script>x</script>')).toBe('&lt;script&gt;x&lt;/script&gt;');
    expect(escapeHtml('a & "b"')).toBe('a &amp; &quot;b&quot;');
  });
});

describe('buildScheduleDocHtml', () => {
  it('có tiêu đề mặc định và bảng thông tin khoản vay', () => {
    const html = buildScheduleDocHtml(baseInput);
    expect(html).toContain('Bảng lịch thu nợ dự kiến');
    expect(html).toContain('<title>Bảng lịch thu nợ dự kiến</title>');
    expect(html).toContain('Số tiền vay:');
    expect(html).toContain('500.000.000 VNĐ');
  });

  it('là tài liệu in riêng khổ A4 ngang, không kèm giao diện màn hình', () => {
    const html = buildScheduleDocHtml(baseInput);
    expect(html).toContain('@page { size: A4 landscape');
    expect(html).toContain('class="sched"');
  });

  it('in đủ số dòng của bảng lịch', () => {
    const html = buildScheduleDocHtml(baseInput);
    expect((html.match(/<tr><td class="c">\d+<\/td>/g) ?? []).length).toBe(rows.length);
  });

  it('có cột ngày bắt đầu và lãi suất áp dụng của từng kỳ', () => {
    const html = buildScheduleDocHtml(baseInput);
    expect(html).toContain('Từ ngày');
    expect(html).toContain('LS áp dụng (%/năm)');
    expect(html).toContain('04/08/2026');
    expect(html).toContain('>8,5<');
    expect(html).toContain('>11,5<');
  });

  it('dòng tổng cộng khớp tổng gốc, lãi và tổng phải trả', () => {
    const html = buildScheduleDocHtml(baseInput);
    expect(html).toContain('TỔNG CỘNG');
    expect(html).toContain(totals.principal.toLocaleString('vi-VN'));
    expect(html).toContain(totals.interest.toLocaleString('vi-VN'));
    expect(html).toContain(totals.total.toLocaleString('vi-VN'));
  });

  it('nhận tiêu đề và phụ đề tự khai', () => {
    const html = buildScheduleDocHtml({ ...baseInput, title: 'Lịch trả nợ KUNN', subtitle: '(Bản dự kiến)' });
    expect(html).toContain('Lịch trả nợ KUNN');
    expect(html).toContain('(Bản dự kiến)');
  });

  it('bỏ phụ đề khi không khai', () => {
    expect(buildScheduleDocHtml(baseInput)).not.toContain('class="doc-sub"');
  });

  it('không chèn được thẻ qua nhãn thông tin', () => {
    const html = buildScheduleDocHtml({
      ...baseInput,
      info: [{ label: '<img src=x onerror=alert(1)>', value: 'x' }],
    });
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x');
  });
});
