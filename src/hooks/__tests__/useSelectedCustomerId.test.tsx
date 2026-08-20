// @vitest-environment jsdom

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router';
import { useSelectedCustomerId, useCustomerNavigate } from '../useSelectedCustomerId';

afterEach(cleanup);

function Probe() {
  const id = useSelectedCustomerId();
  const doiKhach = useCustomerNavigate();
  const { pathname } = useLocation();
  return (
    <div>
      <span data-testid="id">{id === null ? 'null' : String(id)}</span>
      <span data-testid="path">{pathname}</span>
      <button type="button" onClick={() => doiKhach(77)}>doi-sang-77</button>
      <button type="button" onClick={() => doiKhach(null)}>bo-khach</button>
    </div>
  );
}

function dungLen(duongDan: string) {
  return render(
    <MemoryRouter initialEntries={[duongDan]}>
      <Routes>
        <Route path="/loans" element={<Probe />} />
        <Route path="/settings" element={<Probe />} />
        <Route path="/dashboard" element={<Probe />} />
        <Route path="/customers/:customerId/loans" element={<Probe />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('useSelectedCustomerId', () => {
  it('đường phẳng thì không có khách', () => {
    dungLen('/loans');
    expect(screen.getByTestId('id').textContent).toBe('null');
  });

  it('đường lồng thì đọc ra Id số', () => {
    dungLen('/customers/55/loans');
    expect(screen.getByTestId('id').textContent).toBe('55');
  });

  it('đứng ở tuyến cha, không có useParams, thì đọc từ đường dẫn', () => {
    render(
      <MemoryRouter initialEntries={['/customers/55/loans']}>
        <Routes>
          <Route path="*" element={<Probe />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId('id').textContent).toBe('55');
  });

  it('Id không phải số thì không có khách', () => {
    dungLen('/customers/abc/loans');
    expect(screen.getByTestId('id').textContent).toBe('null');
  });
});

describe('useCustomerNavigate', () => {
  it('đổi khách thì giữ nguyên màn, chỉ đổi Id', () => {
    dungLen('/customers/55/loans');
    fireEvent.click(screen.getByText('doi-sang-77'));
    expect(screen.getByTestId('path').textContent).toBe('/customers/77/loans');
  });

  it('từ đường phẳng chọn khách thì nhảy sang đường lồng của chính màn đó', () => {
    dungLen('/loans');
    fireEvent.click(screen.getByText('doi-sang-77'));
    expect(screen.getByTestId('path').textContent).toBe('/customers/77/loans');
  });

  it('bỏ khách thì về đường phẳng của chính màn đó', () => {
    dungLen('/customers/55/loans');
    fireEvent.click(screen.getByText('bo-khach'));
    expect(screen.getByTestId('path').textContent).toBe('/loans');
  });

  it('từ màn không thuộc phạm vi khách, đổi khách nhảy sang màn vay của khách đó', () => {
    dungLen('/settings');
    fireEvent.click(screen.getByText('doi-sang-77'));
    expect(screen.getByTestId('path').textContent).toBe('/customers/77/loans');
  });

  it('từ màn không thuộc phạm vi khách, bỏ khách về Tổng quan', () => {
    dungLen('/settings');
    fireEvent.click(screen.getByText('bo-khach'));
    expect(screen.getByTestId('path').textContent).toBe('/dashboard');
  });
});
