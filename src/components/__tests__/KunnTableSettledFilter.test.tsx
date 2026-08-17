// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { LoanContract } from '../../types';

import { KunnTable } from '../portfolio/KunnTable';

afterEach(cleanup);

const kunn = (over: Partial<LoanContract>): LoanContract => ({
  Id: 1,
  CustomerId: 4,
  ContractNumber: 'GNN-01',
  ContractType: 0,
  LoanAmount: 500_000_000,
  ...over,
} as LoanContract);

const dung = (over: {
  contracts?: LoanContract[];
  settledCount?: number;
  hiddenCount?: number;
  showSettled?: boolean;
  onToggle?: (v: boolean) => void;
} = {}) =>
  render(
    <KunnTable
      containerCardBg=""
      tableHeaderStyle=""
      filteredContracts={over.contracts ?? []}
      selectedContract={null}
      handleSelectContract={vi.fn()}
      allSchedulesMap={{}}
      getAutoDebtGroupInfo={() => ({ debtGroup: 1, maxOverdueDays: 0 })}
      getMasterHdtdNumber={() => 'HD-01'}
      isSettled={(c) => c.IsSettled === true}
      getEffectiveBalanceForContract={() => 0}
      settledCount={over.settledCount ?? 0}
      hiddenCount={over.hiddenCount ?? 0}
      showSettled={over.showSettled ?? true}
      onToggleShowSettled={over.onToggle ?? vi.fn()}
    />
  );

const hai = [
  kunn({ Id: 1, ContractNumber: 'GNN-01', IsSettled: true }),
  kunn({ Id: 2, ContractNumber: 'GNN-02', IsSettled: false }),
];

describe('KunnTable — bộ lọc khoản đã tất toán', () => {
  it('KHÔNG bày nút lọc khi khách chưa có khoản nào tất toán', () => {
    dung({ contracts: [kunn({ Id: 2, IsSettled: false })], settledCount: 0 });
    expect(screen.queryByText('Đang vay')).toBeNull();
  });

  it('bày nút lọc khi có ít nhất một khoản đã tất toán', () => {
    dung({ contracts: hai, settledCount: 1 });
    expect(screen.getByText('Tất cả')).toBeTruthy();
    expect(screen.getByText('Đang vay')).toBeTruthy();
  });

  it('số đếm trên tiêu đề đếm đúng số dòng đang bày', () => {
    dung({ contracts: [hai[1]], settledCount: 1, hiddenCount: 1, showSettled: false });
    expect(screen.getByText(/1 KHOẢN VAY/)).toBeTruthy();
  });

  it('bấm nút gọi ngược lên với giá trị mới', () => {
    const onToggle = vi.fn();
    dung({ contracts: hai, settledCount: 1, onToggle });
    fireEvent.click(screen.getByText('Đang vay'));
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it('khách tất toán hết mà lọc Đang vay thì báo rõ, không để bảng trắng', () => {
    dung({ contracts: [], settledCount: 1, hiddenCount: 1, showSettled: false });
    expect(screen.getByText(/1 khoản đã tất toán đang ẩn/)).toBeTruthy();
  });

  it('không có KUNN nào thì vẫn là thông báo cũ, không phải thông báo đang ẩn', () => {
    dung({ contracts: [] });
    expect(screen.queryByText(/đã tất toán đang ẩn/)).toBeNull();
    expect(screen.getByText(/Chưa có Giấy Nhận Nợ nào/)).toBeTruthy();
  });
});
