// @vitest-environment jsdom

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { Tool2StkSingleCalc } from '../Tool2StkSingleCalc';
import { UI } from '../../../lib/uiClasses';

describe('Tool2StkSingleCalc Component Tests', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders header, classification buttons, and 2 KPI cards', () => {
    render(<Tool2StkSingleCalc styles={UI} />);

    expect(screen.getByText(/TÍNH CẦM CỐ TIỀN GỬI & CHỨNG CHỈ TIỀN GỬI/i)).toBeDefined();
    expect(screen.getAllByText('Tiền gửi (TG) VND').length).toBeGreaterThan(0);
    expect(screen.getByText('Tiền gửi Ngoại tệ')).toBeDefined();
    expect(screen.getByText('Chứng chỉ tiền gửi (CCTG)')).toBeDefined();
    expect(screen.getByText('Lãnh lãi cuối kỳ')).toBeDefined();
    expect(screen.getByText('Lãnh lãi định kỳ')).toBeDefined();
    expect(screen.getByText('Lãnh lãi trước')).toBeDefined();

    // 2 Ô KPI mới
    expect(screen.getByText('TỔNG GỐC LÃI SỔ NHẬN')).toBeDefined();
    expect(screen.getByText('TỔNG TRẢ NỢ (GỐC + LÃI VAY)')).toBeDefined();
  });

  it('switches between deposit types and updates currency inputs', () => {
    render(<Tool2StkSingleCalc styles={UI} />);

    const foreignBtn = screen.getByText('Tiền gửi Ngoại tệ');
    fireEvent.click(foreignBtn);

    expect(screen.getByPlaceholderText('USD')).toBeDefined();
    expect(screen.getByPlaceholderText('25.450')).toBeDefined();

    const cctgBtn = screen.getByText('Chứng chỉ tiền gửi (CCTG)');
    fireEvent.click(cctgBtn);

    expect(screen.queryByPlaceholderText('25.450')).toBeNull();
  });

  it('switches interest payment method to upfront/periodic and displays paid interest input', () => {
    render(<Tool2StkSingleCalc styles={UI} />);

    const upfrontBtn = screen.getByText('Lãnh lãi trước');
    fireEvent.click(upfrontBtn);

    expect(screen.getByText(/Lãi tiền gửi đã chi cho KH/i)).toBeDefined();
  });

  it('auto-fills max allowable loan when clicking "Vay tối đa theo quy định"', () => {
    render(<Tool2StkSingleCalc styles={UI} />);

    const autoMaxBtn = screen.getByText('Vay tối đa theo quy định');
    fireEvent.click(autoMaxBtn);

    // Verify loan amount is filled to max
    const elements = screen.getAllByDisplayValue('500.000.000');
    expect(elements.length).toBe(2);
  });

  it('supports adding and removing multiple loan items', () => {
    render(<Tool2StkSingleCalc styles={UI} />);

    expect(screen.getByText(/KHOẢN VAY CẦM CỐ \(1 KHOẢN\)/i)).toBeDefined();

    const addBtn = screen.getByText('Thêm khoản vay');
    fireEvent.click(addBtn);

    expect(screen.getByText(/KHOẢN VAY CẦM CỐ \(2 KHOẢN\)/i)).toBeDefined();
    expect(screen.getByDisplayValue('Khoản vay 2')).toBeDefined();

    // Delete second loan
    const trashBtns = screen.getAllByTitle('Xóa khoản vay');
    expect(trashBtns.length).toBe(2);
    fireEvent.click(trashBtns[1]);

    expect(screen.getByText(/KHOẢN VAY CẦM CỐ \(1 KHOẢN\)/i)).toBeDefined();
  });
});
