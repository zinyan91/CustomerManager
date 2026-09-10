// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { CommonInfoForm } from '../CommonInfoForm';
import { emptyCommon } from '../../registry/types';
import * as api from '../../../../lib/api';

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
        activeSpecific={{ paymentMethod: 'cash' }}
      />
    );

    // Bên A: có Họ tên, Địa chỉ nhưng KHÔNG có CCCD số hay Ngày cấp
    expect(screen.getByText('Bên A (Bên mua hàng / Khách hàng)')).toBeTruthy();
    expect(screen.getByText('Bên B (Bên bán hàng - Người dân / Hộ kinh doanh)')).toBeTruthy();

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

  it('hides Bank section when paymentMethod is cash, shows it when transfer', async () => {
    vi.spyOn(api, 'fetchCustomersAPI').mockResolvedValue([] as any);
    const patch = vi.fn();

    const { rerender } = render(
      <CommonInfoForm
        common={emptyCommon()}
        patch={patch}
        activeDocId="bang_ke"
        activeSpecific={{ paymentMethod: 'cash' }}
      />
    );

    // Khi chọn Tiền mặt: Khối Tài khoản ngân hàng phải biến mất
    expect(screen.queryByText(/Tài khoản ngân hàng thụ hưởng/i)).toBeNull();

    // Khi chọn Chuyển khoản: Khối Tài khoản ngân hàng hiển thị
    rerender(
      <CommonInfoForm
        common={emptyCommon()}
        patch={patch}
        activeDocId="bang_ke"
        activeSpecific={{ paymentMethod: 'transfer' }}
      />
    );

    expect(screen.getByText(/Tài khoản ngân hàng thụ hưởng/i)).toBeTruthy();
  });
});
