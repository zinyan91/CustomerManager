// @vitest-environment jsdom

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

import { CustomerSummaryHeader } from '../portfolio/CustomerSummaryHeader';

afterEach(cleanup);

const dung = (props: Partial<Parameters<typeof CustomerSummaryHeader>[0]> = {}) =>
  render(
    <CustomerSummaryHeader
      selectedMasterFilter="ALL"
      totalCreditLimit={1_460_000_000}
      handleNewContract={vi.fn()}
      {...props}
    />
  );

describe('CustomerSummaryHeader — bỏ phần trùng với thanh ngữ cảnh khách hàng', () => {
  it('không còn hiện tên hay CIF khách hàng', () => {
    dung();
    expect(screen.queryByText(/CIF:/)).toBeNull();
  });

  it('không còn hiện Tổng Dư Nợ KUNN hay HMTD Còn Lại', () => {
    dung();
    expect(screen.queryByText(/Dư Nợ KUNN/)).toBeNull();
    expect(screen.queryByText('HMTD Còn Lại')).toBeNull();
  });

  it('vẫn còn Tổng Mức Cấp — số duy nhất không có ở thanh ngữ cảnh', () => {
    dung();
    expect(screen.getByText('Tổng Mức Cấp (Tất cả)')).toBeTruthy();
    expect(screen.getByText('1.460.000.000 VNĐ')).toBeTruthy();
  });

  it('vẫn còn nút Giải ngân KUNN mới và gọi được', () => {
    const onNew = vi.fn();
    dung({ handleNewContract: onNew });
    fireEvent.click(screen.getByText('Giải ngân KUNN mới'));
    expect(onNew).toHaveBeenCalledTimes(1);
  });

  it('lọc theo một HĐTD thì nhãn đổi thành Mức Cấp HĐTD', () => {
    dung({ selectedMasterFilter: 'HDTD-01' });
    expect(screen.getByText('Mức Cấp HĐTD')).toBeTruthy();
  });
});
