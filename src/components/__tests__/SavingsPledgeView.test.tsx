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
    expect(within(dialog).getByRole('alert').textContent).toBe('Gốc trả trước một phần phải lớn hơn 0 và nhỏ hơn dư nợ 400.000.000.');
    expect((within(dialog).getByRole('button', { name: 'Ghi nhận trả nợ' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('loi tai hien nguyen thong diep, khac trang thai rong', async () => {
    m.books.mockRejectedValue(new Error('relation "SavingsBooks" does not exist'));
    render(<SavingsPledgeView />);
    expect((await screen.findByRole('alert')).textContent).toContain('relation "SavingsBooks" does not exist');
    expect(screen.queryByText('Khách hàng chưa có sổ tiết kiệm nào.')).toBeNull();
  });

  it('trang thai rong', async () => {
    m.books.mockResolvedValue([]);
    m.loans.mockResolvedValue({ loans: [], links: [], repayments: [] });
    render(<SavingsPledgeView />);
    expect(await screen.findByText('Khách hàng chưa có sổ tiết kiệm nào.')).toBeTruthy();
  });
});
