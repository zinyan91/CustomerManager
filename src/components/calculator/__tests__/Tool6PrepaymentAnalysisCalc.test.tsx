// @vitest-environment jsdom

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { Tool6PrepaymentAnalysisCalc } from '../Tool6PrepaymentAnalysisCalc';
import { UI } from '../../../lib/uiClasses';

describe('Tool6PrepaymentAnalysisCalc Component', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders title, 4 KPI cards and initial calculation values', () => {
    render(<Tool6PrepaymentAnalysisCalc styles={UI} />);

    expect(screen.getByText(/TÍNH PHÍ TRẢ NỢ TRƯỚC HẠN & TỐI ƯU CHI PHÍ LÃI/i)).toBeDefined();
    expect(screen.getByText('TỔNG TIỀN NỘP ĐỢT NÀY')).toBeDefined();
    expect(screen.getByText('PHÍ PHẠT TRẢ TRƯỚC')).toBeDefined();
    expect(screen.getByText('TỔNG LÃI TIẾT KIỆM')).toBeDefined();
    expect(screen.getByText('LỢI ÍCH RÒNG')).toBeDefined();
  });

  it('handles clicking "Tất toán 100%" to fill full prepayment', () => {
    render(<Tool6PrepaymentAnalysisCalc styles={UI} />);

    const fullPrepayBtn = screen.getByRole('button', { name: /Tất toán 100%/i });
    fireEvent.click(fullPrepayBtn);

    const balanceInputs = screen.getAllByDisplayValue('800.000.000');
    expect(balanceInputs.length).toBeGreaterThanOrEqual(2);
  });

  it('switches repayment method', () => {
    render(<Tool6PrepaymentAnalysisCalc styles={UI} />);

    const annuityBtn = screen.getByRole('button', { name: 'Niên kim' });
    fireEvent.click(annuityBtn);

    expect(screen.getByText('LỢI ÍCH RÒNG')).toBeDefined();
  });

  it('switches fee schedule type between by_year and custom_rate', () => {
    render(<Tool6PrepaymentAnalysisCalc styles={UI} />);

    const customBtn = screen.getByRole('button', { name: 'Nhập % trực tiếp' });
    fireEvent.click(customBtn);

    expect(screen.getByPlaceholderText('VD: 1.5')).toBeDefined();
  });
});
