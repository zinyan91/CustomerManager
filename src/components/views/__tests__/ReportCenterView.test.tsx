// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { ReportCenterView } from '../ReportCenterView';

afterEach(cleanup);

describe('ReportCenterView', () => {
  it('hien du nam bao cao tren thanh trai', () => {
    render(<ReportCenterView />);
    expect(screen.getByText('Danh mục')).toBeTruthy();
    expect(screen.getByText('Nợ due')).toBeTruthy();
    expect(screen.getByText('KUNN')).toBeTruthy();
    expect(screen.getByText('HĐTD')).toBeTruthy();
    expect(screen.getByText('Tài sản')).toBeTruthy();
  });

  it('bo chon het thi nut xuat bi vo hieu, khong tai tep rong', () => {
    render(<ReportCenterView />);
    fireEvent.click(screen.getByText('Danh mục'));
    const nut = screen.getByRole('button', { name: /Xuất Excel/i });
    expect(nut.hasAttribute('disabled')).toBe(true);
  });

  it('bo loc ky han co du bon lua chon va muc tat ca', () => {
    render(<ReportCenterView />);
    expect(screen.getByText('Tất cả')).toBeTruthy();
    expect(screen.getByText('Quá hạn')).toBeTruthy();
    expect(screen.getByText('Tới hạn')).toBeTruthy();
    expect(screen.getByText('Sắp tới hạn')).toBeTruthy();
  });
});
