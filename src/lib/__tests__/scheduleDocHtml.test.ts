import { describe, it, expect } from 'vitest';
import { buildLoanSchedule } from '../calcMath';
import { buildCustomerScheduleDocHtml, escapeHtml } from '../scheduleDocHtml';

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
  orgName: 'Ngân hàng Thử Nghiệm – CN Trung Tâm',
  customerName: 'NGUYỄN VĂN TEST',
  docRef: 'HD999/2026',
  preparedBy: 'Trần Thị Cán Bộ',
};

describe('escapeHtml', () => {
  it('vô hiệu hoá thẻ và dấu nháy trong dữ liệu người dùng nhập', () => {
    expect(escapeHtml('<script>x</script>')).toBe('&lt;script&gt;x&lt;/script&gt;');
    expect(escapeHtml('a & "b"')).toBe('a &amp; &quot;b&quot;');
  });
});

describe('buildCustomerScheduleDocHtml', () => {
  it('có đủ tiêu đề, đơn vị, khách hàng, số hợp đồng và phần ký', () => {
    const html = buildCustomerScheduleDocHtml(baseInput);
    expect(html).toContain('Bảng lịch trả nợ dự kiến');
    expect(html).toContain('Ngân hàng Thử Nghiệm – CN Trung Tâm');
    expect(html).toContain('NGUYỄN VĂN TEST');
    expect(html).toContain('HD999/2026');
    expect(html).toContain('Trần Thị Cán Bộ');
    expect(html).toContain('Cán bộ lập bảng');
  });

  it('in đủ số dòng của bảng lịch', () => {
    const html = buildCustomerScheduleDocHtml(baseInput);
    const bodyRows = (html.match(/<tr><td class="c">\d+<\/td>/g) ?? []).length;
    expect(bodyRows).toBe(rows.length);
  });

  it('có cột ngày bắt đầu và lãi suất áp dụng của từng kỳ', () => {
    const html = buildCustomerScheduleDocHtml(baseInput);
    expect(html).toContain('Từ ngày');
    expect(html).toContain('LS áp dụng (%/năm)');
    expect(html).toContain('04/08/2026');
    expect(html).toContain('>8,5<');
    expect(html).toContain('>11,5<');
  });

  it('dòng tổng cộng khớp tổng gốc, lãi và tổng phải trả', () => {
    const html = buildCustomerScheduleDocHtml(baseInput);
    expect(html).toContain('TỔNG CỘNG');
    expect(html).toContain(totals.principal.toLocaleString('vi-VN'));
    expect(html).toContain(totals.interest.toLocaleString('vi-VN'));
    expect(html).toContain(totals.total.toLocaleString('vi-VN'));
  });

  it('bỏ khối lưu ý khi để trống, giữ khi có nội dung', () => {
    expect(buildCustomerScheduleDocHtml({ ...baseInput, noteText: '   ' })).not.toContain('class="note"');
    expect(buildCustomerScheduleDocHtml({ ...baseInput, noteText: 'Chỉ mang tính dự kiến.' }))
      .toContain('Chỉ mang tính dự kiến.');
  });

  it('không chèn thẻ khi tên khách hàng chứa mã HTML', () => {
    const html = buildCustomerScheduleDocHtml({ ...baseInput, customerName: '<img src=x onerror=alert(1)>' });
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x');
  });

  it('bỏ dòng thông tin khách hàng khi không khai', () => {
    const html = buildCustomerScheduleDocHtml({ ...baseInput, customerName: '', docRef: '' });
    expect(html).not.toContain('Khách hàng:');
    expect(html).not.toContain('Số HĐTD / Đề nghị:');
    expect(html).toContain('Số tiền vay:');
  });
});
