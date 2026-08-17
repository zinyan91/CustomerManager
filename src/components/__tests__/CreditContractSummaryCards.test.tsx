// @vitest-environment jsdom

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import { CreditContractSummaryCards } from '../creditContract/CreditContractSummaryCards';

afterEach(cleanup);

const khach = { Id: 4, CifKh: '005236683', FullName: 'LÊ NGỌC QUẾ HÂN' } as never;

const dung = (totalAvailable = 32_680_000) =>
  render(
    <CreditContractSummaryCards
      customer={khach}
      totalGranted={1_460_000_000}
      totalOutstanding={1_427_320_000}
      totalAvailable={totalAvailable}
    />
  );

describe('CreditContractSummaryCards — bốn ô tóm tắt', () => {
  it('có đủ bốn nhan đề', () => {
    dung();
    for (const nhan of [
      'Khách hàng / Mã CIF',
      'Tổng hạn mức đã cấp',
      'Dư nợ KUNN hiện hữu',
      'Hạn mức khả dụng',
    ]) {
      expect(screen.getByText(nhan)).toBeTruthy();
    }
  });

  it('mỗi ô mang một sắc định danh riêng', () => {
    const { container } = dung();
    const sac = [...container.querySelectorAll<HTMLElement>('[data-kpi-hue]')]
      .map(el => el.style.getPropertyValue('--kpi-hue'));
    expect(sac.length).toBe(4);
    expect(new Set(sac).size).toBe(4);
  });

  it('hạn mức khả dụng bằng 0 thì chuyển sang sắc ngữ nghĩa neg', () => {
    const { container } = dung(0);
    const oCuoi = [...container.querySelectorAll<HTMLElement>('[data-kpi-hue]')].at(-1)!;
    expect(oCuoi.style.getPropertyValue('--kpi-hue')).toBe('var(--color-neg)');
  });

  it('còn hạn mức thì KHÔNG dùng sắc cảnh báo', () => {
    const { container } = dung(32_680_000);
    const oCuoi = [...container.querySelectorAll<HTMLElement>('[data-kpi-hue]')].at(-1)!;
    expect(oCuoi.style.getPropertyValue('--kpi-hue')).not.toBe('var(--color-neg)');
  });

  it('ô khách hàng hiện mã CIF là con số lớn, tên là dòng dưới', () => {
    dung();
    expect(screen.getByText('005236683')).toBeTruthy();
    expect(screen.getByText('LÊ NGỌC QUẾ HÂN')).toBeTruthy();
  });

  it('khách chưa có mã CIF thì hiện gạch ngang chứ không để trống', () => {
    render(
      <CreditContractSummaryCards
        customer={{ Id: 9, CifKh: '', FullName: 'KHÁCH MỚI' } as never}
        totalGranted={0}
        totalOutstanding={0}
        totalAvailable={0}
      />
    );
    expect(screen.getByText('—')).toBeTruthy();
  });
});
