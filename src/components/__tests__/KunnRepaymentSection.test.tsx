// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { LoanContract } from '../../types';

import { KunnRepaymentSection } from '../portfolio/kunn/KunnRepaymentSection';

afterEach(cleanup);

const dung = (over: {
  form?: Partial<LoanContract>;
  monthlyPrincipal?: string;
  suggested?: number;
  setMonthlyPrincipal?: (v: string) => void;
} = {}) =>
  render(
    <KunnRepaymentSection
      form={{ PrincipalRepaymentMethod: 'Trả đều hàng tháng', ...over.form }}
      setForm={vi.fn()}
      graceOptions={[]}
      monthlyPrincipal={over.monthlyPrincipal ?? ''}
      setMonthlyPrincipal={over.setMonthlyPrincipal ?? vi.fn()}
      suggestedMonthlyPrincipal={over.suggested ?? 4_170_000}
    />
  );

describe('KunnRepaymentSection — ô gốc mỗi kỳ', () => {
  it('hiện ô với gốc trả đều', () => {
    dung();
    expect(screen.getByText('Gốc mỗi kỳ theo GNN')).toBeTruthy();
  });

  it('KHÔNG hiện ô với gốc trả cuối kỳ — làm tròn không tồn tại ở đó', () => {
    dung({ form: { PrincipalRepaymentMethod: 'Gốc trả cuối kỳ' } });
    expect(screen.queryByText('Gốc mỗi kỳ theo GNN')).toBeNull();
  });

  it('KHÔNG hiện ô khi chưa khai cách trả gốc — mặc định là gốc trả cuối kỳ', () => {
    dung({ form: { PrincipalRepaymentMethod: undefined } });
    expect(screen.queryByText('Gốc mỗi kỳ theo GNN')).toBeNull();
  });

  it('nêu số hệ thống sẽ tính khi để trống', () => {
    dung({ suggested: 4_170_000 });
    expect(screen.getByText(/hệ thống tính 4\.170\.000/)).toBeTruthy();
  });

  it('không hứa một con số khi chưa đủ dữ kiện để tính', () => {
    dung({ suggested: 0 });
    expect(screen.getByText(/tự tính từ số tiền vay/)).toBeTruthy();
    expect(screen.queryByText(/hệ thống tính/)).toBeNull();
  });

  it('nhập vào ô thì trả về chuỗi đã chèn dấu phân cách nghìn', () => {
    const setMonthlyPrincipal = vi.fn();
    dung({ setMonthlyPrincipal });

    fireEvent.change(screen.getByPlaceholderText('4.170.000'), {
      target: { value: '4170000' },
    });

    expect(setMonthlyPrincipal).toHaveBeenCalledWith('4.170.000');
  });

  it('bỏ ký tự không phải số, không để chữ lọt vào số tiền', () => {
    const setMonthlyPrincipal = vi.fn();
    dung({ setMonthlyPrincipal });

    fireEvent.change(screen.getByPlaceholderText('4.170.000'), {
      target: { value: '4a1b7c0000' },
    });

    expect(setMonthlyPrincipal).toHaveBeenCalledWith('4.170.000');
  });

  it('giữ nguyên số đã khai khi mở lại hồ sơ', () => {
    dung({ monthlyPrincipal: '4.160.000' });
    expect(screen.getByDisplayValue('4.160.000')).toBeTruthy();
  });
});
