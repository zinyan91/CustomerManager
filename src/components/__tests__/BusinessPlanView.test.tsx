// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

import { BusinessPlanView } from '../views/BusinessPlanView';
import { ThemeProvider } from '../../context/ThemeContext';

function dungLen() {
  return render(
    <ThemeProvider>
      <BusinessPlanView />
    </ThemeProvider>
  );
}

let loiRender: string[] = [];

beforeEach(() => {
  loiRender = [];
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    loiRender.push(args.map(String).join(' '));
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('BusinessPlanView — bảng tính dựng được lên', () => {
  it('render ngay không cần chọn khách hàng hay nạp dữ liệu', () => {
    dungLen();
    expect(screen.getByText('BẢNG TÍNH HẠN MỨC')).toBeTruthy();
    expect(loiRender).toEqual([]);
  });

  it('bày đủ các khối của bảng tính HM', () => {
    dungLen();
    expect(screen.getAllByText(/Phương án kết quả kinh doanh/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Tính toán nhu cầu cấp tín dụng/).length).toBeGreaterThan(0);
    expect(screen.getByText('Bảng cân đối')).toBeTruthy();
    expect(screen.getByText('Tiêu chí / tháng')).toBeTruthy();
    expect(screen.getByText('Dư nợ & lãi vay')).toBeTruthy();
    expect(screen.getAllByText('Chi phí').some(el => el.tagName.toLowerCase() === 'h3')).toBe(true);
    expect(loiRender).toEqual([]);
  });

  it('không còn ô chọn khách hàng hay hợp đồng tín dụng', () => {
    dungLen();
    expect(screen.queryByText(/Chọn khách hàng/)).toBeNull();
    expect(screen.queryByText(/Hợp đồng tín dụng/)).toBeNull();
    expect(screen.queryByText(/Lưu phương án/)).toBeNull();
  });

  it('đổi sang cho vay từng lần thì hiện khối tương ứng và bỏ khối hạn mức', () => {
    dungLen();
    const sel = document.querySelector('main, div')!.querySelector('select') as HTMLSelectElement;
    fireEvent.change(sel, { target: { value: 'each_time' } });

    const tieuDeKhoi = screen.getAllByText('Cho vay từng lần')
      .filter(el => el.tagName.toLowerCase() === 'h3');
    expect(tieuDeKhoi).toHaveLength(1);
    expect(screen.queryAllByText(/Tính toán nhu cầu cấp tín dụng/)).toHaveLength(0);
    expect(screen.getByText(/Xuất 2 phụ lục/)).toBeTruthy();
    expect(loiRender).toEqual([]);
  });

  it('mặc định là hồ sơ hạn mức và xuất ba phụ lục', () => {
    dungLen();
    expect(screen.getByText(/Xuất 3 phụ lục/)).toBeTruthy();
  });
});
