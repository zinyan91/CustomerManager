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
      outstanding={460_000_000}
      available={1_000_000_000}
      handleNewContract={vi.fn()}
      {...props}
    />
  );

describe('CustomerSummaryHeader — gom số liệu và giải ngân', () => {
  it('không còn hiện tên hay CIF khách hàng', () => {
    dung();
    expect(screen.queryByText(/CIF:/)).toBeNull();
  });

  it('hiện dư nợ và khả dụng theo dữ liệu cùng phạm vi với tổng mức cấp', () => {
    dung();
    expect(screen.getByText('Dư nợ hiện hành')).toBeTruthy();
    expect(screen.getByText('460.000.000 VNĐ')).toBeTruthy();
    expect(screen.getByText('Hạn mức khả dụng')).toBeTruthy();
    expect(screen.getByText('1.000.000.000 VNĐ')).toBeTruthy();
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
