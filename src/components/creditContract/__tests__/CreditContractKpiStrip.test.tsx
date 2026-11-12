// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { CreditContractKpiStrip } from '../CreditContractKpiStrip';

afterEach(cleanup);

describe('CreditContractKpiStrip', () => {
  it('hiện khả năng bảo đảm, phần đang dùng và phần còn cấp thêm được', () => {
    render(<CreditContractKpiStrip totalGranted={420_000_000} activeContractCount={1} totalContractCount={1}
      capacity={{ capacity: 433_300_000, used: 297_495_000, remaining: 135_805_000 }} />);
    expect(screen.getByText('Khả năng bảo đảm').parentElement!.textContent).toContain('433.300.000');
    expect(screen.getByText(/đang dùng/).textContent).toContain('297.495.000');
    const con = screen.getByText('Còn cấp thêm được').parentElement!;
    expect(con.textContent).toContain('135.805.000');
    expect(con.closest('[data-metric-tone]')!.getAttribute('data-metric-tone')).toBe('pos');
    expect(screen.queryByText('Tỷ lệ bảo đảm')).toBeNull();
  });

  it('hết khả năng bảo đảm thì tô đỏ', () => {
    render(<CreditContractKpiStrip totalGranted={0} activeContractCount={0} totalContractCount={0}
      capacity={{ capacity: 100, used: 100, remaining: 0 }} />);
    expect(screen.getByText('Còn cấp thêm được').closest('[data-metric-tone]')!.getAttribute('data-metric-tone')).toBe('neg');
  });
});
