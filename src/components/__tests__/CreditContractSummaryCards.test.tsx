// @vitest-environment jsdom

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import { CreditContractSummaryCards } from '../creditContract/CreditContractSummaryCards';

afterEach(cleanup);

describe('CreditContractSummaryCards — chỉ còn số liệu không trùng thanh ngữ cảnh khách hàng', () => {
  it('còn hiện Tổng hạn mức đã cấp', () => {
    render(<CreditContractSummaryCards totalGranted={1_460_000_000} />);
    expect(screen.getByText('Tổng hạn mức đã cấp')).toBeTruthy();
  });

  it('không còn hiện danh tính khách hàng và các số đã có ở thanh ngữ cảnh', () => {
    render(<CreditContractSummaryCards totalGranted={1_460_000_000} />);
    expect(screen.queryByText('Khách hàng / Mã CIF')).toBeNull();
    expect(screen.queryByText('Dư nợ KUNN hiện hữu')).toBeNull();
    expect(screen.queryByText('Hạn mức khả dụng')).toBeNull();
  });

  it('chỉ còn đúng một ô KPI', () => {
    const { container } = render(<CreditContractSummaryCards totalGranted={1_460_000_000} />);
    expect(container.querySelectorAll('[data-kpi-hue]').length).toBe(1);
  });
});
