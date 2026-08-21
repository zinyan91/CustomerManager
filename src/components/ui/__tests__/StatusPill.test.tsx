// @vitest-environment jsdom

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { StatusPill } from '../StatusPill';

afterEach(cleanup);

describe('StatusPill Component', () => {
  it('renders children with default neutral status', () => {
    render(<StatusPill>Bình thường</StatusPill>);
    const pill = screen.getByText('Bình thường');
    expect(pill).toBeTruthy();
    expect(pill.className).toContain('rounded-[var(--r-pill)]');
  });

  it('renders semantic statuses correctly in soft mode', () => {
    const { rerender } = render(<StatusPill status="pos">Đang hoạt động</StatusPill>);
    expect(screen.getByText('Đang hoạt động').className).toContain('bg-pos-soft');

    rerender(<StatusPill status="neg">Quá hạn</StatusPill>);
    expect(screen.getByText('Quá hạn').className).toContain('bg-neg-soft');

    rerender(<StatusPill status="warn">Chú ý</StatusPill>);
    expect(screen.getByText('Chú ý').className).toContain('bg-warn-soft');
  });

  it('renders solid background with text-surface when solid is true', () => {
    render(<StatusPill status="neg" solid>Nợ nhóm 5</StatusPill>);
    const pill = screen.getByText('Nợ nhóm 5');
    expect(pill.className).toContain('bg-neg');
    expect(pill.className).toContain('text-surface');
  });
});
