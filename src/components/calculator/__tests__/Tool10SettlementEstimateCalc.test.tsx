// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Tool10SettlementEstimateCalc } from '../Tool10SettlementEstimateCalc';

afterEach(cleanup);

const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('Tool10SettlementEstimateCalc', () => {
  it('khách chưa có trên hệ thống: nhập tay hai khoản khác hình thức, ra phí và dòng tổng cuối bảng', () => {
    render(<Tool10SettlementEstimateCalc />);
    expect(screen.getAllByRole('alert').map(a => a.textContent)).toEqual(['Nhập dư nợ gốc', 'Nhập dư nợ gốc']);

    fireEvent.change(screen.getByLabelText('Hình thức vay khoản 1'), { target: { value: 'Hạn mức tín dụng' } });
    type('Dư nợ gốc khoản 1', '500000000');
    type('Dư nợ gốc khoản 2', '1000000000');
    expect(screen.getAllByRole('alert')[0].textContent).toBe('Nhập ngày giải ngân hoặc ngày trả lãi gần nhất');
    type('Ngày giải ngân khoản 1', '10/01/2026');
    type('Ngày giải ngân khoản 2', '10/03/2026');

    expect(screen.queryAllByRole('alert')).toHaveLength(0);
    expect(screen.getByText('Miễn phí (hạn mức)')).toBeTruthy();
    expect(screen.getByText('Năm thứ 1: 4%')).toBeTruthy();
    const rows = screen.getAllByRole('row');
    const last = rows[rows.length - 1].textContent ?? '';
    expect(last).toContain('TỔNG CỘNG (2 khoản)');
    expect(last).toContain('1.500.000.000');
    expect(last).toContain('40.000.000');
  });

  it('thêm và xoá khoản vay; luôn giữ ít nhất một khoản', () => {
    render(<Tool10SettlementEstimateCalc />);
    fireEvent.click(screen.getByRole('button', { name: 'Thêm khoản vay' }));
    expect(screen.getByLabelText('Dư nợ gốc khoản 3')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Xoá khoản 3' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xoá khoản 2' }));
    expect((screen.getByRole('button', { name: 'Xoá khoản 1' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
