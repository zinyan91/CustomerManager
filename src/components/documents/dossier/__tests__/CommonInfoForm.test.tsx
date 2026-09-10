// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { CommonInfoForm } from '../CommonInfoForm';
import { emptyCommon } from '../../registry/types';
import * as api from '../../../../lib/api';

afterEach(cleanup);

describe('CommonInfoForm', () => {
  it('loads customers and allows selecting customer for Bên A', async () => {
    const mockCustomers = [
      {
        Id: 10,
        FullName: 'HOÀNG VĂN THÁI',
        CifKh: 'CIF123',
        NationalId: '079090123456',
        IdCardIssueDate: '2023-05-25',
        IdCardIssuePlace: 'Cục Cảnh sát QLHC về TTXH',
        Address: '123 Nguyễn Huệ, Q1, TP.HCM',
        MaritalStatus: 'Single',
      },
    ];

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
        cccdPlace: 'Cục Cảnh sát QLHC về TTXH',
      }),
    });
  });
});
