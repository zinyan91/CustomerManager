// @vitest-environment jsdom

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import { DashboardSummaryKpis } from '../dashboard/DashboardSummaryKpis';

afterEach(cleanup);

const tien = (v: number) => `${v} VNĐ`;

const dung = (over: Partial<React.ComponentProps<typeof DashboardSummaryKpis>> = {}) =>
  render(
    <DashboardSummaryKpis
      cardBg=""
      totalDebt={81_000_000_000}
      totalLimit={235_000_000_000}
      totalCustomersCount={50}
      customersWithDebtCount={38}
      theConHieuLucCount={7}
      hanMucTheDaCap={250_000_000}
      totalCollateralVal={120_000_000_000}
      collateralsCount={64}
      weightedLtv={0.62}
      dueAlertsTotal={72}
      formatMoney={tien}
      {...over}
    />
  );

describe('DashboardSummaryKpis — năm ô, mỗi ô một đại lượng', () => {
  it('có đủ năm nhan đề', () => {
    dung();
    for (const nhan of [
      'Tổng số khách hàng',
      'Tổng quy mô dư nợ',
      'Tổng giá trị TSĐB',
      'Thẻ tín dụng',
      'Cảnh báo tới hạn',
    ]) {
      expect(screen.getByText(nhan)).toBeTruthy();
    }
  });

  it('thẻ tín dụng giữ số thẻ và đơn vị, bỏ dòng hạn mức', () => {
    dung();
    expect(screen.getByText('7')).toBeTruthy();
    expect(screen.getByText('thẻ')).toBeTruthy();
    expect(screen.queryByText(/Hạn mức đã cấp:/)).toBeNull();
  });

  it('ô khách hàng KHÔNG còn mang số thẻ', () => {
    dung();
    expect(screen.queryByText(/Thẻ tín dụng: 7/)).toBeNull();
  });

  it('bỏ năm dòng phụ và giữ các số KPI chính', () => {
    dung();
    for (const text of [/Trong đó/, /Tổng hạn mức cấp:/, /LTV bình quân:/, /Hạn mức đã cấp:/, /Cần theo dõi & xử lý ngay/]) {
      expect(screen.queryByText(text)).toBeNull();
    }
    for (const text of ['50', '81000000000 VNĐ', '120000000000 VNĐ', '7', '72']) {
      expect(screen.getByText(text)).toBeTruthy();
    }
  });

  it('mỗi ô mang một sắc định danh riêng, không ô nào trùng ô nào', () => {
    const { container } = dung();
    const sac = [...container.querySelectorAll<HTMLElement>('[data-kpi-hue]')]
      .map(el => el.style.getPropertyValue('--kpi-hue'));
    expect(sac.length).toBe(5);
    expect(new Set(sac).size).toBe(5);
    expect(sac.every(Boolean)).toBe(true);
  });

  it('ô cảnh báo giữ sắc ngữ nghĩa neg, không dùng sắc định danh', () => {
    const { container } = dung();
    const oCanhBao = [...container.querySelectorAll<HTMLElement>('[data-kpi-hue]')].at(-1)!;
    expect(oCanhBao.style.getPropertyValue('--kpi-hue')).toBe('var(--color-neg)');
  });
});
