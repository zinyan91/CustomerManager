// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { KpiForecastView } from '../views/KpiForecastView';

afterEach(cleanup);

describe('màn dự báo KPI RBO, CSO', () => {
  it('để trống dữ liệu thực hiện khi mở màn hình', () => {
    render(<KpiForecastView />);
    expect(screen.getByRole('heading', { name: 'Dự báo KPI RBO, CSO' })).toBeTruthy();
    expect(screen.getByLabelText('Khu vực làm việc').querySelectorAll('option')).toHaveLength(1);
    expect((screen.getByLabelText('Khu vực làm việc') as HTMLSelectElement).value).toBe('Khu vực 5');
    expect((screen.getByLabelText('Thâm niên chính thức (tháng)') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Thực hiện Tăng ròng dư nợ') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Thực hiện Số đẹp') as HTMLInputElement).value).toBe('');
    expect(screen.getByRole('rowheader', { name: 'TỔNG CỘNG' })).toBeTruthy();
    expect(screen.getAllByRole('rowheader').map(cell => cell.textContent?.trim())).toEqual([
      'Tăng ròng dư nợ',
      'Tăng ròng huy động CKH',
      'Tăng ròng CASA bình quân',
      'Quy mô dư nợ quản lý',
      'Doanh số phí',
      'Số đẹp',
      'Phi nhân thọ',
      'Nhân thọ',
      'Hủy Bảo hiểm',
      'Hoạt động tín dụng',
      'FX',
      'Dịch vụ tại quầy & NHĐT',
      'Số lượng thẻ tín dụng active',
      'Số lượng khách hàng active',
      'TỔNG CỘNG',
    ]);
  });

  it('đổi sang CSO thì dùng đúng bộ chỉ tiêu và cập nhật kết quả khi nhập số', () => {
    render(<KpiForecastView />);
    fireEvent.change(screen.getByLabelText('Cấp bậc'), { target: { value: 'CSO1' } });
    fireEvent.change(screen.getByLabelText('Thâm niên chính thức (tháng)'), { target: { value: '24' } });
    expect(screen.queryByText('Tăng ròng dư nợ')).toBeNull();
    expect(screen.getByText('Quy mô huy động CKH chăm sóc')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Thực hiện Tăng ròng huy động CKH'), { target: { value: '6400' } });
    const row = screen.getByRole('row', { name: /Tăng ròng huy động CKH/ });
    expect(row.textContent).toContain('100,00%');
  });

  it('cộng các cấu phần phí vào doanh số phí và điểm thực hiện', () => {
    render(<KpiForecastView />);
    const beautifulNumberInput = screen.getByLabelText('Thực hiện Số đẹp');
    expect(beautifulNumberInput.className).toContain('kpi-forecast-number-input');
    fireEvent.wheel(beautifulNumberInput);
    fireEvent.change(beautifulNumberInput, { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Thực hiện Phi nhân thọ'), { target: { value: '15' } });
    fireEvent.change(screen.getByLabelText('Thực hiện Hoạt động tín dụng'), { target: { value: '0,02' } });
    const row = screen.getByRole('row', { name: /Doanh số phí/ });
    expect(within(row).getByText('18,02')).toBeTruthy();
    expect(within(row).getByText('144,20')).toBeTruthy();
  });

  it('không định dạng lại giữa lúc đang gõ số', () => {
    render(<KpiForecastView />);
    const input = screen.getByLabelText('Thực hiện Tăng ròng dư nợ') as HTMLInputElement;

    fireEvent.change(input, { target: { value: '59000' } });
    expect(input.value).toBe('59000');

    fireEvent.blur(input);
    expect(input.value).toBe('59.000,00');
  });
});
