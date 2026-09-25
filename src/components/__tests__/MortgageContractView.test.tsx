// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router';
import type { MortgageContract } from '../../types';

const api = vi.hoisted(() => ({
  fetchMortgageContractsAPI: vi.fn(),
  fetchCustomersAPI: vi.fn(),
  fetchCollateralsByCustomerAPI: vi.fn(),
  fetchCreditContractsByCustomerAPI: vi.fn(),
  saveMortgageContractAPI: vi.fn(),
  deleteMortgageContractAPI: vi.fn(),
  MortgageLinkSaveError: class MortgageLinkSaveError extends Error {
    mortgageId: number;
    constructor(message: string, mortgageId: number) { super(message); this.mortgageId = mortgageId; }
  },
}));
vi.mock('../../lib/api', () => api);
const confirmMock = vi.hoisted(() => vi.fn());
vi.mock('../../context/ConfirmContext', () => ({ useConfirm: () => confirmMock }));

import { MortgageContractView } from '../views/MortgageContractView';

const hdtc = (p: Partial<MortgageContract> & Pick<MortgageContract, 'Id' | 'MortgageNumber'>): MortgageContract =>
  ({ CustomerId: 7, IsReleased: false, CollateralIds: [], CreditContractIds: [], ...p });

const DoiKhach = () => {
  const navigate = useNavigate();
  return <button type="button" onClick={() => navigate('/customers/8/mortgage-contracts')}>đổi khách</button>;
};

function dung(path = '/customers/7/mortgage-contracts') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/customers/:customerId/mortgage-contracts" element={<><DoiKhach /><MortgageContractView /></>} />
        <Route path="/mortgage-contracts" element={<MortgageContractView />} />
      </Routes>
    </MemoryRouter>
  );
}

const trang = (n: string) => (_: string, el: Element | null) =>
  el?.tagName === 'SPAN' && new RegExp(`Trang ${n}`).test(el.textContent ?? '');

beforeEach(() => {
  api.fetchCustomersAPI.mockResolvedValue([{ Id: 7, FullName: 'NGÔ NHỊ ĐẠT', CifKh: '900007' }]);
  api.fetchCollateralsByCustomerAPI.mockResolvedValue([{ Id: 3, CustomerId: 7, AssetCode: 'TS-03' }]);
  api.fetchCreditContractsByCustomerAPI.mockResolvedValue([{ Id: 9, CustomerId: 7, HdtdNumber: '2002/HDTD/9653222' }]);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('MortgageContractView — danh sách', () => {
  it('chưa chọn khách thì nhắc chọn khách, không gọi API', () => {
    dung('/mortgage-contracts');
    expect(screen.getByText('Chọn khách hàng')).toBeTruthy();
    expect(api.fetchMortgageContractsAPI).not.toHaveBeenCalled();
  });

  it('hiện HĐTC đang hiệu lực kèm nhãn tài sản và HĐTD; ẩn HĐTC đã giải chấp', async () => {
    api.fetchMortgageContractsAPI.mockResolvedValue([
      hdtc({ Id: 1, MortgageNumber: 'HĐTC-01', CollateralIds: [3], CreditContractIds: [9] }),
      hdtc({ Id: 2, MortgageNumber: 'HĐTC-02', IsReleased: true, ReleasedDate: '2026-01-01' }),
    ]);
    dung();
    expect(await screen.findByText('HĐTC-01')).toBeTruthy();
    expect(screen.getByText('TS-03')).toBeTruthy();
    expect(screen.getByText('2002/HDTD/9653222')).toBeTruthy();
    expect(screen.queryByText('HĐTC-02')).toBeNull();
    expect(api.fetchMortgageContractsAPI).toHaveBeenCalledWith(7);
  });

  it('phân trang 10 dòng; đổi lọc thì về trang 1', async () => {
    api.fetchMortgageContractsAPI.mockResolvedValue(
      Array.from({ length: 12 }, (_, i) => hdtc({ Id: i + 1, MortgageNumber: `HĐTC-${String(i + 1).padStart(2, '0')}` })));
    dung();
    expect(await screen.findByText(trang('1 / 2'))).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
    expect(screen.getByText(trang('2 / 2'))).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Lọc trạng thái'), { target: { value: 'all' } });
    expect(screen.getByText(trang('1 / 2'))).toBeTruthy();
  });

  it('lỗi nạp danh sách thì hiện thông báo, không trắng màn', async () => {
    api.fetchMortgageContractsAPI.mockRejectedValue(new Error('Không nạp được danh sách HĐTC: mất mạng'));
    dung();
    expect(await screen.findByText(/mất mạng/)).toBeTruthy();
  });

  it('dữ liệu khách cũ về muộn không đè dữ liệu khách mới', async () => {
    let traKhachCu: (v: MortgageContract[]) => void = () => {};
    api.fetchMortgageContractsAPI
      .mockImplementationOnce(() => new Promise(r => { traKhachCu = r; }))
      .mockResolvedValueOnce([hdtc({ Id: 9, CustomerId: 8, MortgageNumber: 'HĐTC-KHACH-MOI' })]);
    dung('/customers/7/mortgage-contracts');
    fireEvent.click(screen.getByRole('button', { name: 'đổi khách' }));
    expect(await screen.findByText('HĐTC-KHACH-MOI')).toBeTruthy();
    traKhachCu([hdtc({ Id: 1, MortgageNumber: 'HĐTC-KHACH-CU' })]);
    await waitFor(() => expect(screen.queryByText('HĐTC-KHACH-CU')).toBeNull());
    expect(api.fetchMortgageContractsAPI).toHaveBeenNthCalledWith(2, 8);
  });
});

describe('MortgageContractView — form', () => {
  it('thêm mới: chỉ liệt kê tài sản/HĐTD của khách, tick rồi lưu gọi API với id đã chọn', async () => {
    api.fetchMortgageContractsAPI.mockResolvedValue([]);
    api.saveMortgageContractAPI.mockResolvedValue(11);
    dung();
    fireEvent.click(await screen.findByRole('button', { name: /Thêm HĐTC/ }));

    fireEvent.change(screen.getByLabelText('Số HĐTC'), { target: { value: 'HĐTC-05' } });
    fireEvent.click(screen.getByLabelText('TS-03'));
    fireEvent.click(screen.getByLabelText('2002/HDTD/9653222'));
    fireEvent.change(screen.getByLabelText('Giá trị bảo đảm tối đa (VNĐ)'), { target: { value: '2500000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu HĐTC' }));

    await waitFor(() => expect(api.saveMortgageContractAPI).toHaveBeenCalled());
    const [draft, before] = api.saveMortgageContractAPI.mock.calls[0];
    expect(draft).toMatchObject({
      CustomerId: 7, MortgageNumber: 'HĐTC-05', CollateralIds: [3], CreditContractIds: [9], MaxSecuredAmount: 2500000000,
    });
    expect(before).toBeNull();
  });

  it('thiếu số HĐTC thì hiện lỗi, không gọi API', async () => {
    api.fetchMortgageContractsAPI.mockResolvedValue([]);
    dung();
    fireEvent.click(await screen.findByRole('button', { name: /Thêm HĐTC/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Lưu HĐTC' }));
    expect(await screen.findByText('Số HĐTC là bắt buộc.')).toBeTruthy();
    expect(api.saveMortgageContractAPI).not.toHaveBeenCalled();
  });

  it('HĐTC chưa giải chấp: nút Xoá bị khoá kèm giải thích', async () => {
    api.fetchMortgageContractsAPI.mockResolvedValue([hdtc({ Id: 1, MortgageNumber: 'HĐTC-01' })]);
    dung();
    fireEvent.click(await screen.findByText('HĐTC-01'));
    const nutXoa = screen.getByRole('button', { name: 'Xoá HĐTC' }) as HTMLButtonElement;
    expect(nutXoa.disabled).toBe(true);
    expect(screen.getByText(/Chưa giải chấp nên chưa xoá được/)).toBeTruthy();
  });

  it('HĐTC đã giải chấp: xác nhận rồi xoá', async () => {
    api.fetchMortgageContractsAPI.mockResolvedValue([
      hdtc({ Id: 2, MortgageNumber: 'HĐTC-02', IsReleased: true, ReleasedDate: '2026-01-01' })]);
    api.deleteMortgageContractAPI.mockResolvedValue(undefined);
    confirmMock.mockResolvedValue(true);
    dung();
    fireEvent.change(await screen.findByLabelText('Lọc trạng thái'), { target: { value: 'all' } });
    fireEvent.click(await screen.findByText('HĐTC-02'));
    fireEvent.click(screen.getByRole('button', { name: 'Xoá HĐTC' }));
    await waitFor(() => expect(api.deleteMortgageContractAPI).toHaveBeenCalledWith(2));
  });

  it('lưu HĐTC mới lỗi ở bước liên kết: lần lưu sau là cập nhật HĐTC vừa tạo', async () => {
    const { MortgageLinkSaveError } = api;
    api.fetchMortgageContractsAPI
      .mockResolvedValueOnce([])
      .mockResolvedValue([hdtc({ Id: 11, MortgageNumber: 'HĐTC-05' })]);
    api.saveMortgageContractAPI
      .mockRejectedValueOnce(new MortgageLinkSaveError('Đã lưu HĐTC "HĐTC-05" nhưng chưa lưu được danh sách tài sản/HĐTD: lỗi', 11))
      .mockResolvedValueOnce(11);
    dung();
    fireEvent.click(await screen.findByRole('button', { name: /Thêm HĐTC/ }));
    fireEvent.change(screen.getByLabelText('Số HĐTC'), { target: { value: 'HĐTC-05' } });
    fireEvent.click(screen.getByLabelText('TS-03'));
    fireEvent.click(screen.getByRole('button', { name: 'Lưu HĐTC' }));
    expect(await screen.findByText(/chưa lưu được danh sách tài sản/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Lưu HĐTC' }));
    await waitFor(() => expect(api.saveMortgageContractAPI).toHaveBeenCalledTimes(2));
    const [draft2, before2] = api.saveMortgageContractAPI.mock.calls[1];
    expect(draft2.Id).toBe(11);
    expect(before2).toMatchObject({ Id: 11 });
  });
});

describe('MortgageContractView — nhãn nhiều tài sản / HĐTD', () => {
  it('ngăn cách bằng dấu phẩy như spec ("TS-01, TS-03")', async () => {
    api.fetchCollateralsByCustomerAPI.mockResolvedValue([
      { Id: 3, CustomerId: 7, AssetCode: 'TS-03' }, { Id: 4, CustomerId: 7, AssetCode: 'TS-04' }]);
    api.fetchCreditContractsByCustomerAPI.mockResolvedValue([
      { Id: 9, CustomerId: 7, HdtdNumber: 'HDTD-A' }, { Id: 10, CustomerId: 7, HdtdNumber: 'HDTD-B' }]);
    api.fetchMortgageContractsAPI.mockResolvedValue([
      hdtc({ Id: 1, MortgageNumber: 'HĐTC-01', CollateralIds: [3, 4], CreditContractIds: [9, 10] })]);
    dung();
    expect(await screen.findByText('TS-03, TS-04')).toBeTruthy();
    expect(screen.getByText('HDTD-A, HDTD-B')).toBeTruthy();
  });
});

describe('MortgageContractView — đổi khách khi đang lưu', () => {
  it('lưu xong sau khi đã chuyển sang khách khác thì không nạp đè dữ liệu khách cũ', async () => {
    api.fetchMortgageContractsAPI.mockImplementation(async (id: number) =>
      id === 7 ? [hdtc({ Id: 1, MortgageNumber: 'HĐTC-KHACH-CU' })] : [hdtc({ Id: 9, CustomerId: 8, MortgageNumber: 'HĐTC-KHACH-MOI' })]);
    let xongLuu: (v: number) => void = () => {};
    api.saveMortgageContractAPI.mockImplementation(() => new Promise<number>(r => { xongLuu = r; }));
    dung();
    fireEvent.click(await screen.findByRole('button', { name: /Thêm HĐTC/ }));
    fireEvent.change(screen.getByLabelText('Số HĐTC'), { target: { value: 'HĐTC-05' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu HĐTC' }));
    await waitFor(() => expect(api.saveMortgageContractAPI).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: 'đổi khách', hidden: true }));
    expect(await screen.findByText('HĐTC-KHACH-MOI')).toBeTruthy();

    xongLuu(11);
    await new Promise(r => setTimeout(r, 20));
    expect(screen.getByText('HĐTC-KHACH-MOI')).toBeTruthy();
    expect(screen.queryByText('HĐTC-KHACH-CU')).toBeNull();
  });
});

describe('MortgageContractView — chọn khách ngay tại màn', () => {
  it('chưa chọn khách thì có ô chọn khách; chọn xong nạp HĐTC của khách đó', async () => {
    api.fetchMortgageContractsAPI.mockResolvedValue([hdtc({ Id: 1, MortgageNumber: 'HĐTC-01' })]);
    dung('/mortgage-contracts');
    fireEvent.click(await screen.findByRole('button', { name: /Chọn Khách hàng/i }));
    fireEvent.click(await screen.findByText('NGÔ NHỊ ĐẠT'));
    expect(await screen.findByText('HĐTC-01')).toBeTruthy();
    expect(api.fetchMortgageContractsAPI).toHaveBeenCalledWith(7);
  });
});
