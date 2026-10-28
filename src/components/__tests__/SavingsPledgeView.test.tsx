// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { SAMPLE } from '../../lib/__tests__/fixtures/savingsPledgeSample';

const m = vi.hoisted(() => ({ books: vi.fn(), loans: vi.fn(), record: vi.fn() }));

vi.mock('../../hooks/useSelectedCustomerId', () => ({
  useSelectedCustomerId: () => 1,
  useCustomerNavigate: () => vi.fn(),
}));
vi.mock('../../hooks/useCurrentDate', () => ({ useCurrentDate: () => '2026-10-27' }));
vi.mock('../../lib/api', () => ({
  fetchCustomersAPI: async () => [{ Id: 1, FullName: 'Trần Thị Minh Hạnh', CifKh: '1002345678' }],
  fetchSavingsBooksByCustomerAPI: m.books,
  fetchPledgeLoanBundleByCustomerAPI: m.loans,
  saveSavingsBookAPI: vi.fn(),
  savePledgeLoanAPI: vi.fn(),
  recordPledgeRepaymentAPI: m.record,
}));

import { SavingsPledgeView } from '../views/SavingsPledgeView';

afterEach(cleanup);

beforeEach(() => {
  m.books.mockReset().mockResolvedValue(SAMPLE.books);
  m.loans.mockReset().mockResolvedValue({ loans: SAMPLE.loans, links: SAMPLE.links, repayments: [] });
  m.record.mockReset().mockResolvedValue(1);
});

async function renderLoaded() {
  render(<SavingsPledgeView />);
  await screen.findByRole('row', { name: /^STK-0123-001/ });
}

describe('SavingsPledgeView', () => {
  it('hai tab co so dem', async () => {
    await renderLoaded();
    expect(screen.getByRole('tab', { name: 'Sổ tiết kiệm (3)' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Khoản vay cầm cố (2)' })).toBeTruthy();
  });

  it('bam dong thi khung chi tiet doi theo', async () => {
    await renderLoaded();
    fireEvent.click(screen.getByRole('row', { name: /^STK-0123-002/ }));
    expect(screen.getByRole('complementary', { name: 'Chi tiết sổ STK-0123-002' })).toBeTruthy();
  });

  it('bam so so trong chi tiet khoan vay thi chuyen tab va chon dung so', async () => {
    await renderLoaded();
    fireEvent.mouseDown(screen.getByRole('tab', { name: /Khoản vay cầm cố/ }));
    fireEvent.click(screen.getByRole('tab', { name: /Khoản vay cầm cố/ }));
    fireEvent.click(await screen.findByRole('row', { name: /^CC-2026-0907/ }));
    const detail = screen.getByRole('complementary', { name: 'Chi tiết khoản vay CC-2026-0907' });
    fireEvent.click(within(detail).getByRole('button', { name: 'STK-0123-002' }));
    await waitFor(() => expect(screen.getByRole('complementary', { name: 'Chi tiết sổ STK-0123-002' })).toBeTruthy());
  });

  it('hop thoai tra no hien loi va khoa nut ghi nhan', async () => {
    await renderLoaded();
    fireEvent.mouseDown(screen.getByRole('tab', { name: /Khoản vay cầm cố/ }));
    fireEvent.click(screen.getByRole('tab', { name: /Khoản vay cầm cố/ }));
    const detail = await screen.findByRole('complementary', { name: 'Chi tiết khoản vay CC-2026-0418' });
    fireEvent.click(within(detail).getByRole('button', { name: 'Trả nợ' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByRole('alert')).toBeNull();
    expect((within(dialog).getByRole('button', { name: 'Ghi nhận trả nợ' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(within(dialog).getByLabelText('Gốc trả'), { target: { value: '500.000.000' } });
    expect(within(dialog).getByRole('alert').textContent).toBe('Gốc trả trước một phần phải lớn hơn 0 và nhỏ hơn dư nợ 400.000.000.');
    expect(within(dialog).getByRole('heading').className).not.toMatch(/text-sm|font-semibold/);
  });

  it('khung chi tiet: chu dung font app, chi so dung mono', async () => {
    await renderLoaded();
    const detail = screen.getByRole('complementary', { name: 'Chi tiết sổ STK-0123-001' });
    const dd = (label: string) => within(detail).getByText(label).nextElementSibling as HTMLElement;
    expect(dd('Loại tiền gửi').className).not.toContain('font-mono');
    expect(dd('Lãnh lãi').className).not.toContain('font-mono');
    expect(dd('Số tiền gửi').className).toContain('font-mono');
  });

  it('don vi tien la VNĐ va 3 the KPI xep 3 cot', async () => {
    await renderLoaded();
    const cards = [...document.querySelectorAll('.workspace-kpi-card')];
    expect(cards[0].textContent).toContain('VNĐ');
    expect(cards[0].parentElement!.className).toContain('sm:grid-cols-3');
  });

  it('bang khoan vay co cot thoi han, ngay giai ngan, ngay den han rieng', async () => {
    await renderLoaded();
    fireEvent.mouseDown(screen.getByRole('tab', { name: /Khoản vay cầm cố/ }));
    fireEvent.click(screen.getByRole('tab', { name: /Khoản vay cầm cố/ }));
    await screen.findByRole('row', { name: /^CC-2026-0418/ });
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Số HĐ cầm cố', 'Dư nợ gốc', 'Lãi suất', 'Thời hạn', 'Ngày giải ngân', 'Ngày đến hạn', 'Lãi đến hôm nay', 'Trạng thái',
    ]);
  });

  it('tieu de form sua giu so goc khi dang go', async () => {
    await renderLoaded();
    fireEvent.click(screen.getByRole('button', { name: 'Sửa thông tin sổ' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Số sổ/, { selector: 'input' }), { target: { value: 'STK-MOI' } });
    expect(within(dialog).getByRole('heading').textContent).toBe('Sửa sổ STK-0123-001');
  });

  it('loi tai hien nguyen thong diep, khac trang thai rong', async () => {
    m.books.mockRejectedValue(new Error('relation "SavingsBooks" does not exist'));
    render(<SavingsPledgeView />);
    expect((await screen.findByRole('alert')).textContent).toContain('relation "SavingsBooks" does not exist');
    expect(screen.queryByText('Khách hàng chưa có sổ tiết kiệm nào.')).toBeNull();
  });

  it('the KPI tien gui va cot lai hang thang', async () => {
    m.books.mockResolvedValue([{ ...SAMPLE.books[0], InterestPaymentMethod: 'periodic' }, SAMPLE.books[1], SAMPLE.books[2]]);
    await renderLoaded();
    const kpis = [...document.querySelectorAll('.workspace-kpi-card')].map((k) => k.textContent);
    expect(kpis).toEqual([
      expect.stringContaining('Tổng tiền gửi'), expect.stringContaining('Tổng lãi nhận'), expect.stringContaining('Tổng nhận cuối kỳ'),
    ]);
    expect(kpis[1]).toContain('35.174.794');
    expect(screen.getByRole('columnheader', { name: 'Lãi hàng tháng' })).toBeTruthy();
    expect(screen.getByRole('row', { name: /^STK-0123-001/ }).textContent).toContain('2.166.667');
  });

  it('khong co so lanh lai hang thang thi khong co cot lai hang thang', async () => {
    await renderLoaded();
    expect(screen.queryByRole('columnheader', { name: 'Lãi hàng tháng' })).toBeNull();
  });

  it('o ngay trong form so cung kieu dang voi cac o nhap khac', async () => {
    await renderLoaded();
    fireEvent.click(screen.getByRole('button', { name: 'Sửa thông tin sổ' }));
    const dialog = await screen.findByRole('dialog');
    const date = within(dialog).getByLabelText('Ngày gửi', { selector: 'input' }) as HTMLInputElement;
    const number = within(dialog).getByLabelText(/Số sổ/, { selector: 'input' }) as HTMLInputElement;
    const base = (c: string) => c.split(/\s+/).filter((x) => x.startsWith('rounded-') || x.startsWith('border') || x === 'px-3' || x === 'py-2' || x === 'text-xs').sort();
    expect(base(date.className)).toEqual(base(number.className));
  });

  it('form khoan vay: mot so thi khong hoi phan goc bao dam, nhieu so moi hoi', async () => {
    await renderLoaded();
    fireEvent.click(screen.getByRole('button', { name: 'Vay cầm cố trên sổ này' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryAllByLabelText(/Phần gốc vay bảo đảm/)).toHaveLength(0);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Thêm sổ' }));
    expect(within(dialog).getAllByLabelText(/Phần gốc vay bảo đảm/)).toHaveLength(2);
  });

  it('trang thai rong', async () => {
    m.books.mockResolvedValue([]);
    m.loans.mockResolvedValue({ loans: [], links: [], repayments: [] });
    render(<SavingsPledgeView />);
    expect(await screen.findByText('Khách hàng chưa có sổ tiết kiệm nào.')).toBeTruthy();
  });
});
