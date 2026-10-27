// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

const api = vi.hoisted(() => ({
  fetchCustomersStrictAPI: vi.fn(),
  fetchCollateralsStrictAPI: vi.fn(),
  fetchContractsStrictAPI: vi.fn(),
  fetchCardContractsStrictAPI: vi.fn(),
  fetchOutstandingSchedulesAPI: vi.fn(),
  fetchAllCreditContractsAPI: vi.fn(),
  fetchPaidPrincipalMapAPI: vi.fn(),
  fetchAllPledgeLoanBundlesAPI: vi.fn(),
}));
vi.mock('../../lib/api', () => api);
vi.mock('../../context/ConfirmContext', () => ({ useConfirm: () => vi.fn() }));

import { DashboardView } from '../views/DashboardView';

afterEach(cleanup);
beforeEach(() => {
  api.fetchCustomersStrictAPI.mockReset().mockResolvedValue([{ Id: 7, FullName: 'NGÔ NHỊ ĐẠT' }]);
  api.fetchCollateralsStrictAPI.mockReset().mockResolvedValue([]);
  api.fetchContractsStrictAPI.mockReset().mockResolvedValue([]);
  api.fetchCardContractsStrictAPI.mockReset().mockResolvedValue([]);
  api.fetchOutstandingSchedulesAPI.mockReset().mockResolvedValue([]);
  api.fetchAllCreditContractsAPI.mockReset().mockResolvedValue([]);
  api.fetchPaidPrincipalMapAPI.mockReset().mockResolvedValue({});
  api.fetchAllPledgeLoanBundlesAPI.mockReset().mockResolvedValue({ loans: [], links: [], repayments: [], books: [] });
});

const renderDashboard = () => render(<MemoryRouter><DashboardView /></MemoryRouter>);

describe('Dashboard: lỗi nạp dữ liệu', () => {
  it('lỗi server thì hiện nguyên thông điệp, không hiện KPI số 0', async () => {
    api.fetchContractsStrictAPI.mockRejectedValue(new Error('column LoanContracts.MovedToPledgeLoanId does not exist'));
    renderDashboard();
    expect((await screen.findByRole('alert')).textContent).toContain('column LoanContracts.MovedToPledgeLoanId does not exist');
    expect(screen.queryByText('0 khoản nợ')).toBeNull();
  });

  it('bấm Thử lại thì nạp lại và hiện Dashboard', async () => {
    api.fetchCustomersStrictAPI.mockRejectedValueOnce(new Error('mất kết nối'));
    renderDashboard();
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: /Thử lại/ }));
    expect(await screen.findByText('0 khoản nợ')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('nạp được thì không hiện khung lỗi', async () => {
    renderDashboard();
    expect(await screen.findByText('0 khoản nợ')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
