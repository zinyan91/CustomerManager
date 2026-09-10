// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { DisbursementPayeeListView } from '../DisbursementPayeeListView';
import * as db from '../../../lib/disbursementDb';

afterEach(cleanup);

describe('DisbursementPayeeListView', () => {
  const mockPayees: db.DisbursementPayee[] = [
    {
      Id: 'payee_test_1',
      FullName: 'NGUYỄN VĂN AN',
      NationalId: '079090123456',
      IdCardIssueDate: '2023-05-15',
      IdCardIssuePlace: 'CCS QLHC về TTXH',
      AccountNumber: '19033481284',
      BankName: 'Techcombank',
      BankBranch: 'Chi nhánh Sài Gòn',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders disbursement payees list and handles search', async () => {
    vi.spyOn(db, 'fetchDisbursementPayeesDb').mockResolvedValue(mockPayees);

    render(<DisbursementPayeeListView />);

    await waitFor(() => {
      expect(screen.getAllByText('NGUYỄN VĂN AN').length).toBeGreaterThan(0);
      expect(screen.getAllByText('19033481284').length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Techcombank/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText('Chi nhánh Sài Gòn').length).toBeGreaterThan(0);
    });

    // Test search
    const searchInput = screen.getByPlaceholderText(/Tìm theo Họ tên, CCCD, STK/i);
    fireEvent.change(searchInput, { target: { value: 'Không tìm thấy' } });

    expect(screen.queryByText('NGUYỄN VĂN AN')).toBeNull();

    fireEvent.change(searchInput, { target: { value: 'Techcom' } });
    expect(screen.getAllByText('NGUYỄN VĂN AN').length).toBeGreaterThan(0);
  });

  it('opens create modal and saves new payee', async () => {
    vi.spyOn(db, 'fetchDisbursementPayeesDb').mockResolvedValue([]);
    const upsertSpy = vi.spyOn(db, 'upsertDisbursementPayeeDb').mockImplementation(async (payee) => ({
      ...payee,
      Id: 'new_id_123',
    }));

    render(<DisbursementPayeeListView />);

    await waitFor(() => {
      expect(screen.getByText(/THÊM THÔNG TIN MỚI/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByText(/THÊM THÔNG TIN MỚI/i));

    expect(screen.getByText('THÊM THÔNG TIN GIẢI NGÂN MỚI')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText(/VD: NGUYỄN VĂN A/i), {
      target: { value: 'LÊ THỊ THẢO' },
    });
    fireEvent.change(screen.getByPlaceholderText(/VD: 19033481284/i), {
      target: { value: '0071001234567' },
    });

    fireEvent.click(screen.getByRole('button', { name: /LƯU THÔNG TIN/i }));

    await waitFor(() => {
      expect(upsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          FullName: 'LÊ THỊ THẢO',
          AccountNumber: '0071001234567',
        })
      );
    });
  });

  it('allows creating a payee without STK (AccountNumber optional)', async () => {
    vi.spyOn(db, 'fetchDisbursementPayeesDb').mockResolvedValue([]);
    const upsertSpy = vi.spyOn(db, 'upsertDisbursementPayeeDb').mockImplementation(async (payee) => ({
      ...payee,
      Id: 'new_id_456',
    }));

    render(<DisbursementPayeeListView />);

    await waitFor(() => {
      expect(screen.getByText(/THÊM THÔNG TIN MỚI/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByText(/THÊM THÔNG TIN MỚI/i));

    fireEvent.change(screen.getByPlaceholderText(/VD: NGUYỄN VĂN A/i), {
      target: { value: 'TRẦN VĂN BÌNH' },
    });

    // Leave STK blank and click save
    fireEvent.click(screen.getByRole('button', { name: /LƯU THÔNG TIN/i }));

    await waitFor(() => {
      expect(upsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          FullName: 'TRẦN VĂN BÌNH',
          AccountNumber: '',
        })
      );
    });
  });
});
