// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router';
import type { MortgageContract } from '../../types';

const api = vi.hoisted(() => ({
  fetchMortgageContractsAPI: vi.fn(),
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
