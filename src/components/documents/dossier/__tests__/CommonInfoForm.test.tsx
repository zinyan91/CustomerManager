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
        Address: '123 Nguyễn Huệ, Q1, TP.HCM',
        MaritalStatus: 'Single',
      },
    ];

    vi.spyOn(api, 'fetchCustomersAPI').mockResolvedValue(mockCustomers as any);

    const patch = vi.fn();
    render(<CommonInfoForm common={emptyCommon()} patch={patch} />);

    // Wait for customer picker trigger to show
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Chọn Khách hàng/i })).toBeTruthy();
    });

    const trigger = screen.getByRole('button', { name: /Chọn Khách hàng/i });
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
      }),
    });
  });
});
