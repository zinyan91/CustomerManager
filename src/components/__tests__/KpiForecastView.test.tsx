// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { KpiForecastView } from '../views/KpiForecastView';

afterEach(cleanup);

describe('màn dự báo KPI RBO, CSO', () => {
  it('hiển thị đúng bộ số mẫu từ workbook', () => {
    render(<KpiForecastView />);
    expect(screen.getByRole('heading', { name: 'Dự báo KPI RBO, CSO' })).toBeTruthy();
    expect(screen.getByLabelText('Khu vực làm việc').querySelectorAll('option')).toHaveLength(1);
    expect((screen.getByLabelText('Khu vực làm việc') as HTMLSelectElement).value).toBe('Khu vực 5');
    const summary = screen.getByRole('region', { name: 'Kết quả dự báo KPI' });
    expect(within(summary).getByText('285,200')).toBeTruthy();
    expect(within(summary).getByText('155,255')).toBeTruthy();
    expect(within(summary).getByText('54,44%')).toBeTruthy();
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
    const row = screen.getByRole('row', { name: /Doanh số phí/ });
    expect(within(row).getByText('18,02')).toBeTruthy();
    expect(within(row).getByText('144,200')).toBeTruthy();
  });
});
