// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { CommonInfoForm } from '../CommonInfoForm';
import { emptyCommon } from '../../registry/types';
import * as api from '../../../../lib/api';
import * as disbursementDb from '../../../../lib/disbursementDb';

afterEach(cleanup);

describe('CommonInfoForm', () => {
  const mockCustomers = [
    {
      Id: 10,
      FullName: 'HOÀNG VĂN THÁI',
      CifKh: 'CIF123',
      NationalId: '079090123456',
      IdCardIssueDate: '2023-05-25',
      IdCardIssuePlace: 'CCS QLHC về TTXH',
      Address: '123 Nguyễn Huệ, Q1, TP.HCM',
      MaritalStatus: 'Married',
      SpouseName: 'TRẦN THỊ HƯƠNG',
      SpouseNationalId: '079190654321',
    },
  ];

  const mockPayees: disbursementDb.DisbursementPayee[] = [
    {
      Id: 'payee-99',
      FullName: 'LÊ VĂN TÁM',
      NationalId: '079099887766',
      IdCardIssueDate: '2022-08-15',
      IdCardIssuePlace: 'Bộ Công An',
      AccountNumber: '1903456789',
      BankName: 'Techcombank',
      BankBranch: 'CN Tân Bình',
    },
  ];

  it('loads customers and allows selecting customer for Bên A', async () => {
    vi.spyOn(api, 'fetchCustomersAPI').mockResolvedValue(mockCustomers as any);

    const patch = vi.fn();
    render(<CommonInfoForm common={emptyCommon()} patch={patch} />);

    // Wait for customer picker trigger to show
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Chọn Khách hàng/i })[0]).toBeTruthy();
    });

    const trigger = screen.getAllByRole('button', { name: /Chọn Khách hàng/i })[0];
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText('HOÀNG VĂN THÁI')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('HOÀNG VĂN THÁI'));

    expect(patch).toHaveBeenCalledWith({
      partyA: expect.objectContaining({
        name: 'HOÀNG VĂN THÁI',
        cccd: '079090123456',
        address: '123 Nguyễn Huệ, Q1, TP.HCM',
        cccdDate: '25/05/2023',
        cccdPlace: 'CCS QLHC về TTXH',
      }),
    });
  });

  it('never displays Năm sinh field in the entire form', async () => {
    vi.spyOn(api, 'fetchCustomersAPI').mockResolvedValue([] as any);
    const patch = vi.fn();

    render(<CommonInfoForm common={emptyCommon()} patch={patch} />);

    expect(screen.queryByText(/Năm sinh/i)).toBeNull();
  });

  it('for Bảng kê (bang_ke): hides buyer CCCD, hides seller CustomerPicker/KHLQ, hides stages, and adjusts timeline', async () => {
    vi.spyOn(api, 'fetchCustomersAPI').mockResolvedValue(mockCustomers as any);
    const patch = vi.fn();

    render(
      <CommonInfoForm
        common={emptyCommon()}
        patch={patch}
        activeDocId="bang_ke"
      />
    );

    // Bên A: có Họ tên, Địa chỉ nhưng KHÔNG có CCCD số hay Ngày cấp
    expect(screen.getByText('Bên A (Bên mua)')).toBeTruthy();
    expect(screen.getByText('Bên B (Bên bán / Thụ hưởng)')).toBeTruthy();

    // Có nút Chọn từ Hàng tồn kho
    expect(screen.getByRole('button', { name: /Chọn từ Hàng tồn kho/i })).toBeTruthy();

    // Trong Bên A, không có CCCD
    // Chỉ có 1 nhãn 'CCCD số' (của Bên B), thay vì 2 nhãn
    const cccdLabels = screen.getAllByText('CCCD số');
    expect(cccdLabels.length).toBe(1);

    // Bên B không có CustomerPicker
    const pickers = screen.getAllByRole('button', { name: /Chọn Khách hàng/i });
    expect(pickers.length).toBe(1); // Chỉ có 1 picker ở Bên A

    // Không có nút Điền nhanh KHLQ
    expect(screen.queryByText(/Điền nhanh KHLQ/i)).toBeNull();

    // Mốc thời gian chỉ có Ngày lập bảng kê, không có Ngày bắt đầu / Ngày kết thúc
    expect(screen.getByText('Ngày lập bảng kê')).toBeTruthy();
    expect(screen.queryByText('Ngày bắt đầu / giao hàng')).toBeNull();
    expect(screen.queryByText('Ngày kết thúc / thanh toán hết')).toBeNull();

    // Không có khối Các đợt thanh toán
    expect(screen.queryByText('Các đợt thanh toán')).toBeNull();
  });

  it('hides bank fields when the dossier pays in cash, shows them when transfer', async () => {
    vi.spyOn(api, 'fetchCustomersAPI').mockResolvedValue([] as any);
    const patch = vi.fn();
    const cash = { ...emptyCommon(), payMethod: 'cash' as const };

    const { rerender } = render(
      <CommonInfoForm common={cash} patch={patch} activeDocId="bang_ke" />
    );

    expect(screen.getByText('Hình thức thanh toán cho Bên bán')).toBeTruthy();
    expect(screen.queryByText('Chủ tài khoản')).toBeNull();

    rerender(
      <CommonInfoForm common={emptyCommon()} patch={patch} activeDocId="bang_ke" />
    );
    expect(screen.getByText('Chủ tài khoản')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Tiền mặt'));
    expect(patch).toHaveBeenCalledWith({ payMethod: 'cash' });
  });

  it('payment request: shows salutation under Bên A and hides the goods list', async () => {
    vi.spyOn(api, 'fetchCustomersAPI').mockResolvedValue([] as any);
    const patch = vi.fn();
    const common = emptyCommon();
    common.partyA = { ...common.partyA, name: 'TRẦN THỊ PHƯƠNG' };

    render(
      <CommonInfoForm common={common} patch={patch} activeDocId="payment_request_sale" dossierId="giai_ngan" />
    );

    const salutation = screen.getByLabelText(/Xưng hô/i) as HTMLSelectElement;
    expect(salutation.value).toBe('Bà');
    fireEvent.change(salutation, { target: { value: 'Ông' } });
    expect(patch).toHaveBeenCalledWith({ partyA: expect.objectContaining({ gender: 'male' }) });

    expect(screen.queryByText('Danh mục hàng hóa / hạng mục')).toBeNull();
    expect(screen.getByText('Các đợt thanh toán')).toBeTruthy();
  });

  it('sale contract still shows the goods list', async () => {
    vi.spyOn(api, 'fetchCustomersAPI').mockResolvedValue([] as any);
    render(
      <CommonInfoForm common={emptyCommon()} patch={vi.fn()} activeDocId="sale_contract" dossierId="giai_ngan" />
    );
    expect(screen.getByText('Danh mục hàng hóa / hạng mục')).toBeTruthy();
  });

  it('allows selecting payee for Bên B from Thông tin giải ngân and auto-fills partyB and bank', async () => {
    vi.spyOn(api, 'fetchCustomersAPI').mockResolvedValue([] as any);
    vi.spyOn(disbursementDb, 'fetchDisbursementPayeesDb').mockResolvedValue(mockPayees);

    const patch = vi.fn();
    render(<CommonInfoForm common={emptyCommon()} patch={patch} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Chọn Thông tin giải ngân/i })).toBeTruthy();
    });

    const payeeTrigger = screen.getByRole('button', { name: /Chọn Thông tin giải ngân/i });
    fireEvent.click(payeeTrigger);

    await waitFor(() => {
      expect(screen.getByText('LÊ VĂN TÁM')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('LÊ VĂN TÁM'));

    expect(patch).toHaveBeenCalledWith({
      partyB: expect.objectContaining({
        name: 'LÊ VĂN TÁM',
        cccd: '079099887766',
        cccdDate: '15/08/2022',
        cccdPlace: 'Bộ Công An',
      }),
    });

    expect(patch).toHaveBeenCalledWith({
      bank: expect.objectContaining({
        owner: 'LÊ VĂN TÁM',
        accNo: '1903456789',
        name: 'Techcombank',
        branch: 'CN Tân Bình',
      }),
    });
  });
});
