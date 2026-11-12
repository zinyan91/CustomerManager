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

    // Bên A không có CCCD; Bên B nhận chuyển khoản cũng không cần CCCD
    expect(screen.queryAllByText('CCCD số')).toHaveLength(0);

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

  it('hình thức thanh toán nằm trong Bên B: tiền mặt hiện CCCD, chuyển khoản hiện tài khoản; không có ô chủ tài khoản', async () => {
    vi.spyOn(api, 'fetchCustomersAPI').mockResolvedValue([] as any);
    const patch = vi.fn();
    const cash = { ...emptyCommon(), payMethod: 'cash' as const };

    const { rerender } = render(
      <CommonInfoForm common={cash} patch={patch} activeDocId="sale_contract" dossierId="giai_ngan" />
    );

    expect(screen.getByRole('radiogroup', { name: 'Hình thức thanh toán cho Bên bán' })).toBeTruthy();
    expect(screen.queryByText('Hình thức thanh toán cho Bên bán')).toBeNull();
    expect(screen.getAllByText('CCCD số')).toHaveLength(2);
    expect(screen.getAllByText('Nơi cấp CCCD')).toHaveLength(2);
    expect(screen.queryByLabelText('Số tài khoản')).toBeNull();

    rerender(
      <CommonInfoForm common={emptyCommon()} patch={patch} activeDocId="sale_contract" dossierId="giai_ngan" />
    );
    expect(screen.getAllByText('CCCD số')).toHaveLength(1);
    expect(screen.getByLabelText('Số tài khoản')).toBeTruthy();
    expect(screen.getByLabelText('Ngân hàng')).toBeTruthy();
    expect(screen.getByLabelText('Chi nhánh')).toBeTruthy();
    expect(screen.queryByText('Chủ tài khoản')).toBeNull();

    fireEvent.click(screen.getByLabelText('Tiền mặt'));
    expect(patch).toHaveBeenCalledWith({ payMethod: 'cash' });
  });

  it('đổi tên Bên B thì chủ tài khoản đổi theo', () => {
    vi.spyOn(api, 'fetchCustomersAPI').mockResolvedValue([] as any);
    const patch = vi.fn();
    render(<CommonInfoForm common={emptyCommon()} patch={patch} activeDocId="sale_contract" dossierId="giai_ngan" />);
    fireEvent.change(document.getElementById('partyB-name')!, { target: { value: 'TRẦN THỊ PHƯƠNG' } });
    expect(patch).toHaveBeenCalledWith(expect.objectContaining({
      partyB: expect.objectContaining({ name: 'TRẦN THỊ PHƯƠNG' }),
      bank: expect.objectContaining({ owner: 'TRẦN THỊ PHƯƠNG' }),
    }));
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

    expect(patch).toHaveBeenCalledWith(expect.objectContaining({
      partyB: expect.objectContaining({
        name: 'LÊ VĂN TÁM',
        cccd: '079099887766',
        cccdDate: '15/08/2022',
        cccdPlace: 'Bộ Công An',
      }),
    }));

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

describe('CommonInfoForm — tổng tiền theo bảng hàng hóa', () => {
  const coHang = () => {
    const c = emptyCommon();
    c.items = [
      { id: '1', name: 'Lúa', unit: 'Tấn', quantity: 25, price: 8_500_000 },
      { id: '2', name: 'Gạo', unit: 'Kg', quantity: 100, price: 20_000 },
    ];
    return c;
  };

  it('HĐ mua bán: tổng giá trị tự lấy từ bảng hàng, không hiện ô nhập tổng tiền', async () => {
    vi.spyOn(api, 'fetchCustomersAPI').mockResolvedValue([] as any);
    const patch = vi.fn();
    render(<CommonInfoForm common={coHang()} patch={patch} activeDocId="sale_contract" dossierId="giai_ngan" />);
    await waitFor(() => expect(patch).toHaveBeenCalledWith({ totalAmount: '214.500.000' }));
    expect(screen.queryByLabelText(/Tổng giá trị/)).toBeNull();
    expect(screen.queryByText('Tổng tiền')).toBeNull();
  });

  it('xưng hô nằm cùng dòng với Họ tên của Bên A, không chiếm dòng riêng', () => {
    vi.spyOn(api, 'fetchCustomersAPI').mockResolvedValue([] as any);
    render(<CommonInfoForm common={emptyCommon()} patch={vi.fn()} activeDocId="sale_contract" dossierId="giai_ngan" />);
    const xungHo = screen.getByLabelText(/Xưng hô/i);
    const oTen = screen.getAllByLabelText('Họ tên')[0];
    expect(xungHo.parentElement).toBe(oTen.parentElement);
  });

  it('Đề nghị thanh toán mua bán cũng lấy tổng từ bảng hàng dù khung hàng bị ẩn', async () => {
    vi.spyOn(api, 'fetchCustomersAPI').mockResolvedValue([] as any);
    const patch = vi.fn();
    render(<CommonInfoForm common={coHang()} patch={patch} activeDocId="payment_request_sale" dossierId="giai_ngan" />);
    await waitFor(() => expect(patch).toHaveBeenCalledWith({ totalAmount: '214.500.000' }));
  });

  it('hồ sơ không có bảng hàng (sửa chữa nhà) vẫn nhập tay tổng giá trị', () => {
    vi.spyOn(api, 'fetchCustomersAPI').mockResolvedValue([] as any);
    const patch = vi.fn();
    render(<CommonInfoForm common={coHang()} patch={patch} activeDocId="construction" dossierId="sua_chua_nha" />);
    expect(patch).not.toHaveBeenCalledWith(expect.objectContaining({ totalAmount: expect.anything() }));
    expect((screen.getByLabelText(/Tổng giá trị/) as HTMLInputElement).readOnly).toBe(false);
  });
});

describe('CommonInfoForm — đợt thanh toán theo từng biểu mẫu', () => {
  it('HĐ mua bán chỉ có ô "Thanh toán Lần 1", không có danh sách đợt; nhập thì tạo Đợt 1', () => {
    vi.spyOn(api, 'fetchCustomersAPI').mockResolvedValue([] as any);
    const patch = vi.fn();
    render(<CommonInfoForm common={emptyCommon()} patch={patch} activeDocId="sale_contract" dossierId="giai_ngan" />);
    expect(screen.queryByText('Các đợt thanh toán')).toBeNull();
    fireEvent.change(screen.getByLabelText('Thanh toán Lần 1 (VNĐ)'), { target: { value: '100000000' } });
    expect(patch).toHaveBeenCalledWith({
      stages: [expect.objectContaining({ stageName: 'Đợt 1', amount: '100.000.000', status: 'paid' })],
    });
  });

  it('HĐ mua bán: sửa Lần 1 chỉ đổi số tiền Đợt 1, giữ nguyên các đợt khác', () => {
    vi.spyOn(api, 'fetchCustomersAPI').mockResolvedValue([] as any);
    const patch = vi.fn();
    const c = emptyCommon();
    c.stages = [
      { id: 's1', stageName: 'Đợt 1', amount: '50.000.000', status: 'paid', note: '' },
      { id: 's2', stageName: 'Đợt 2', amount: '70.000.000', status: 'current', note: '' },
    ];
    render(<CommonInfoForm common={c} patch={patch} activeDocId="sale_contract" dossierId="giai_ngan" />);
    const o = screen.getByLabelText('Thanh toán Lần 1 (VNĐ)') as HTMLInputElement;
    expect(o.value).toBe('50.000.000');
    fireEvent.change(o, { target: { value: '60000000' } });
    expect(patch).toHaveBeenCalledWith({ stages: [{ ...c.stages[0], amount: '60.000.000' }, c.stages[1]] });
  });

  it('Đề nghị thanh toán thi công có danh sách đợt; HĐ thi công thì không', () => {
    vi.spyOn(api, 'fetchCustomersAPI').mockResolvedValue([] as any);
    const { unmount } = render(<CommonInfoForm common={emptyCommon()} patch={vi.fn()} activeDocId="payment_request_const" dossierId="sua_chua_nha" />);
    expect(screen.getByText('Các đợt thanh toán')).toBeTruthy();
    unmount();
    render(<CommonInfoForm common={emptyCommon()} patch={vi.fn()} activeDocId="construction" dossierId="sua_chua_nha" />);
    expect(screen.queryByText('Các đợt thanh toán')).toBeNull();
    expect(screen.queryByLabelText('Thanh toán Lần 1 (VNĐ)')).toBeNull();
  });

  it('Đề nghị thanh toán bảng kê có danh sách đợt như đề nghị thanh toán hợp đồng; thêm đợt thì tạo Đợt 1', () => {
    vi.spyOn(api, 'fetchCustomersAPI').mockResolvedValue([] as any);
    const patch = vi.fn();
    render(<CommonInfoForm common={emptyCommon()} patch={patch} activeDocId="payment_request_bang_ke" dossierId="giai_ngan" />);
    expect(screen.getByText('Các đợt thanh toán')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Thêm đợt thanh toán/ }));
    expect(patch).toHaveBeenCalledWith({
      stages: [expect.objectContaining({ stageName: 'Đợt 1', status: 'paid' })],
    });
  });
});

describe('CommonInfoForm — gọn ghi chú và mốc thời gian', () => {
  it('hồ sơ mua bán: không có ghi chú phụ, ngày giao hàng trùng ngày ký nên không có ô riêng', () => {
    vi.spyOn(api, 'fetchCustomersAPI').mockResolvedValue([] as any);
    render(<CommonInfoForm common={emptyCommon()} patch={vi.fn()} activeDocId="sale_contract" dossierId="giai_ngan" />);
    expect(screen.queryByText('Dùng làm Đợt 1 của Đề nghị thanh toán.')).toBeNull();
    expect(screen.queryByText(/Chọn nhanh từ/)).toBeNull();
    expect(screen.queryByText('Ngày bắt đầu / giao hàng')).toBeNull();
    expect(screen.getByText('Ngày ký hợp đồng')).toBeTruthy();
    expect(screen.getByText('Ngày kết thúc / thanh toán hết')).toBeTruthy();
  });

  it('hồ sơ thi công vẫn có ngày bắt đầu riêng', () => {
    vi.spyOn(api, 'fetchCustomersAPI').mockResolvedValue([] as any);
    render(<CommonInfoForm common={emptyCommon()} patch={vi.fn()} activeDocId="construction" dossierId="sua_chua_nha" />);
    expect(screen.getByText('Ngày bắt đầu / giao hàng')).toBeTruthy();
  });
});

describe('CommonInfoForm — số tiền giải ngân và đơn giá', () => {
  it('nhập số tiền giải ngân: Đợt 1 = tổng − giải ngân, đã thanh toán; Đợt 2 = số giải ngân, đề nghị thanh toán', async () => {
    vi.spyOn(api, 'fetchCustomersAPI').mockResolvedValue([] as any);
    const patch = vi.fn();
    const c = { ...emptyCommon(), totalAmount: '500.000.000', disbursementAmount: '350.000.000' };
    render(<CommonInfoForm common={c} patch={patch} activeDocId="payment_request_sale" dossierId="giai_ngan" />);
    await waitFor(() => expect(patch).toHaveBeenCalledWith({
      stages: [
        expect.objectContaining({ stageName: 'Đợt 1', amount: '150.000.000', status: 'paid' }),
        expect.objectContaining({ stageName: 'Đợt 2', amount: '350.000.000', status: 'current' }),
      ],
    }));
  });

  it('HĐ mua bán: có ô số tiền giải ngân, Lần 1 tự tính và chỉ đọc', () => {
    vi.spyOn(api, 'fetchCustomersAPI').mockResolvedValue([] as any);
    const patch = vi.fn();
    const c = { ...emptyCommon(), totalAmount: '500.000.000', disbursementAmount: '' };
    const { rerender } = render(<CommonInfoForm common={c} patch={patch} activeDocId="sale_contract" dossierId="giai_ngan" />);
    fireEvent.change(screen.getByLabelText('Số tiền giải ngân (VNĐ)'), { target: { value: '350000000' } });
    expect(patch).toHaveBeenCalledWith({ disbursementAmount: '350.000.000' });
    rerender(<CommonInfoForm common={{ ...c, disbursementAmount: '350.000.000' }} patch={patch} activeDocId="sale_contract" dossierId="giai_ngan" />);
    const lan1 = screen.getByLabelText('Thanh toán Lần 1 (VNĐ)') as HTMLInputElement;
    expect(lan1.value).toBe('150.000.000');
    expect(lan1.readOnly).toBe(true);
  });

  it('đơn giá hiện dấu phân cách và lưu thành số', () => {
    vi.spyOn(api, 'fetchCustomersAPI').mockResolvedValue([] as any);
    const patch = vi.fn();
    const c = { ...emptyCommon(), items: [{ id: '1', name: 'Lúa', unit: 'Kg', quantity: 10, price: 8_500_000 }] };
    render(<CommonInfoForm common={c} patch={patch} activeDocId="sale_contract" dossierId="giai_ngan" />);
    const price = screen.getByLabelText('Đơn giá Lúa') as HTMLInputElement;
    expect(price.value).toBe('8.500.000');
    fireEvent.change(price, { target: { value: '9.200.000' } });
    expect(patch).toHaveBeenCalledWith({ items: [expect.objectContaining({ price: 9_200_000 })] });
  });
});
