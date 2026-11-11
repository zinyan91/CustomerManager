// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Tool10SettlementEstimateCalc } from '../Tool10SettlementEstimateCalc';
import { fetchCustomersStrictAPI } from '../../../lib/api/customerApi';
import { fetchCustomerLoanSourceStrictAPI } from '../../../lib/api/settlementEstimateApi';
import { exportSettlementEstimateExcel } from '../../../lib/settlementEstimateExport';

vi.mock('../../../lib/api/customerApi', () => ({ fetchCustomersStrictAPI: vi.fn() }));
vi.mock('../../../lib/api/settlementEstimateApi', () => ({ fetchCustomerLoanSourceStrictAPI: vi.fn() }));
vi.mock('../../../lib/settlementEstimateExport', () => ({ exportSettlementEstimateExcel: vi.fn() }));

const SOURCE = {
  contracts: [
    { Id: 1, CustomerId: 9, ContractNumber: 'KUNN-01', ContractType: 1, LoanMethod: 'Cho vay từng lần',
      LoanAmount: 600_000_000, InterestRate: 0.09, DisbursementDate: '2026-01-10', IsSettled: false },
    { Id: 2, CustomerId: 9, ContractNumber: 'KUNN-02', ContractType: 1, LoanMethod: 'Cho vay từng lần',
      LoanAmount: 200_000_000, InterestRate: 0.1, DisbursementDate: '2026-02-01', IsSettled: false },
  ],
  creditContracts: [],
  schedules: [
    { Id: 11, ContractId: 1, PeriodNumber: 1, DueDate: '2026-02-10', PrincipalAmount: 100_000_000, InterestAmount: 0,
      TotalAmount: 100_000_000, IsPaid: true, ActualPaidPrincipal: 100_000_000 },
    { Id: 12, ContractId: 1, PeriodNumber: 2, DueDate: '2026-03-10', PrincipalAmount: 100_000_000, InterestAmount: 0,
      TotalAmount: 100_000_000, IsPaid: false },
  ],
};

beforeEach(() => {
  vi.mocked(fetchCustomersStrictAPI).mockReset().mockResolvedValue([{ Id: 9, CifKh: 'CIF9', FullName: 'Trần Thị B' }] as never);
  vi.mocked(fetchCustomerLoanSourceStrictAPI).mockReset().mockResolvedValue(SOURCE as never);
  vi.mocked(exportSettlementEstimateExcel).mockReset();
});
afterEach(cleanup);

const pickCustomer = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Nạp từ khoản vay' }));
  fireEvent.click(screen.getByRole('button', { name: 'Chọn Khách hàng' }));
  fireEvent.click(await screen.findByText('Trần Thị B'));
  await screen.findByLabelText('Chọn KUNN-01');
};

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

  it('nạp KUNN chưa tất toán của khách: dư nợ còn lại, lãi suất, mốc tính lãi; bỏ dòng trống; không nạp trùng', async () => {
    render(<Tool10SettlementEstimateCalc />);
    await pickCustomer();
    fireEvent.click(screen.getByLabelText('Chọn KUNN-02'));
    fireEvent.click(screen.getByRole('button', { name: 'Thêm 1 khoản vào bảng' }));

    expect((screen.getByLabelText('Số KUNN khoản 1') as HTMLInputElement).value).toBe('KUNN-01');
    expect((screen.getByLabelText('Dư nợ gốc khoản 1') as HTMLInputElement).value).toBe('500.000.000');
    expect((screen.getByLabelText('Lãi suất khoản 1') as HTMLInputElement).value).toBe('9,00');
    expect((screen.getByLabelText('Ngày trả lãi gần nhất khoản 1') as HTMLInputElement).value).toBe('10/02/2026');
    expect(screen.queryByLabelText('Dư nợ gốc khoản 2')).toBeNull();

    await pickCustomer();
    fireEvent.click(screen.getByRole('button', { name: 'Thêm 2 khoản vào bảng' }));
    expect((screen.getByLabelText('Số KUNN khoản 2') as HTMLInputElement).value).toBe('KUNN-02');
    expect(screen.queryByLabelText('Số KUNN khoản 3')).toBeNull();
  });

  it('lỗi tải khoản vay hiện nguyên thông điệp, không hiện như khách không có khoản vay', async () => {
    vi.mocked(fetchCustomerLoanSourceStrictAPI).mockRejectedValueOnce(new Error('permission denied for table RepaymentSchedules'));
    render(<Tool10SettlementEstimateCalc />);
    fireEvent.click(screen.getByRole('button', { name: 'Nạp từ khoản vay' }));
    fireEvent.click(screen.getByRole('button', { name: 'Chọn Khách hàng' }));
    fireEvent.click(await screen.findByText('Trần Thị B'));
    await waitFor(() => expect(screen.getByText('permission denied for table RepaymentSchedules')).toBeTruthy());
    expect(screen.queryByText('Khách hàng không còn KUNN nào chưa tất toán.')).toBeNull();
  });

  it('Xuất Excel gửi đúng các dòng đang có trên bảng', async () => {
    render(<Tool10SettlementEstimateCalc />);
    await pickCustomer();
    fireEvent.click(screen.getByRole('button', { name: 'Thêm 2 khoản vào bảng' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xuất Excel' }));
    const [rows] = vi.mocked(exportSettlementEstimateExcel).mock.calls[0];
    expect(rows.map(r => [r.contractNumber, r.principal, r.line.error])).toEqual([
      ['KUNN-01', 500_000_000, null],
      ['KUNN-02', 200_000_000, null],
    ]);
  });
});
