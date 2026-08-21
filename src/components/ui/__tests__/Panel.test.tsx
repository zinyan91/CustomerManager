// @vitest-environment jsdom

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Panel, PanelHeader } from '../Panel';

afterEach(cleanup);

describe('Panel and PanelHeader Component', () => {
  it('renders panel with specular styling and custom children', () => {
    render(<Panel>Nội dung thẻ</Panel>);
    const panel = screen.getByText('Nội dung thẻ');
    expect(panel.className).toContain('rounded-[var(--r-panel)]');
    expect(panel.className).toContain('specular-card');
  });

  it('renders panel header with title, subtitle, badge and actions', () => {
    render(
      <PanelHeader
        title="Quản trị khách hàng"
        subtitle="Theo dõi hạn mức và danh mục nợ"
        badge={<span data-testid="badge">10 KH</span>}
        actions={<button>Tạo mới</button>}
      />
    );
    expect(screen.getByText('Quản trị khách hàng')).toBeTruthy();
    expect(screen.getByText('Theo dõi hạn mức và danh mục nợ')).toBeTruthy();
    expect(screen.getByTestId('badge')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tạo mới' })).toBeTruthy();
  });
});
