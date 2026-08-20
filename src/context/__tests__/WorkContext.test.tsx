// @vitest-environment jsdom

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { WorkProvider, useWork } from '../WorkContext';

afterEach(cleanup);

function ComponentThu() {
  const { setActiveTab } = useWork();
  const location = useLocation();
  return (
    <div>
      <div data-testid="duong-dan">{location.pathname}</div>
      <button type="button" onClick={() => setActiveTab('loans')}>toi-loans</button>
      <button type="button" onClick={() => setActiveTab('khong-ton-tai')}>toi-khong-ton-tai</button>
    </div>
  );
}

function dungLen(duongDanBanDau: string) {
  return render(
    <MemoryRouter initialEntries={[duongDanBanDau]}>
      <WorkProvider>
        <ComponentThu />
      </WorkProvider>
    </MemoryRouter>
  );
}

describe('WorkContext — cầu tạm setActiveTab', () => {
  it('gọi setActiveTab với id hợp lệ thì đường dẫn đổi đúng', () => {
    dungLen('/dashboard');
    fireEvent.click(screen.getByText('toi-loans'));
    expect(screen.getByTestId('duong-dan').textContent).toBe('/loans');
  });

  it('gọi setActiveTab với id không có trong bảng thì đường dẫn không đổi', () => {
    dungLen('/dashboard');
    fireEvent.click(screen.getByText('toi-khong-ton-tai'));
    expect(screen.getByTestId('duong-dan').textContent).toBe('/dashboard');
  });
});
