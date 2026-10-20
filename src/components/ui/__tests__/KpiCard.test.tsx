// @vitest-environment jsdom

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Landmark } from 'lucide-react';
import { KpiCard } from '../KpiCard';

afterEach(cleanup);

describe('KpiCard Component', () => {
  it('renders label, value, subtext and icon correctly', () => {
    render(
      <KpiCard
        label="Tổng hạn mức"
        value="1.500.000.000 đ"
        subtext="3 hợp đồng hiệu lực"
        icon={Landmark}
        hue="accent"
      />
    );
    expect(screen.getByText('Tổng hạn mức')).toBeTruthy();
    expect(screen.getByText('1.500.000.000 đ')).toBeTruthy();
    expect(screen.getByText('3 hợp đồng hiệu lực')).toBeTruthy();
    expect(screen.getByText('1.500.000.000 đ').className).toContain('num-lead');
  });

  it('applies semantic hue styles correctly', () => {
    const { container } = render(
      <KpiCard label="Nợ xấu" value="50.000.000 đ" hue="neg" />
    );
    const card = container.querySelector('[data-kpi-hue="neg"]');
    expect(card).toBeTruthy();
    expect(screen.getByText('50.000.000 đ').className).toContain('text-neg');
  });
});
