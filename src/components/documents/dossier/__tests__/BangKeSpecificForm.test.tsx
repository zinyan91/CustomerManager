// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { BangKeSpecificForm } from '../BangKeSpecificForm';
import { emptyCommon } from '../../registry/types';

afterEach(cleanup);

describe('BangKeSpecificForm', () => {
  it('renders radio options for cash and transfer', () => {
    const patch = vi.fn();
    render(
      <BangKeSpecificForm
        common={emptyCommon()}
        specific={{ paymentMethod: 'transfer' }}
        patch={patch}
      />
    );

    const cashRadio = screen.getByLabelText(/Tiền mặt/i);
    const transferRadio = screen.getByLabelText(/Chuyển khoản/i);

    expect((transferRadio as HTMLInputElement).checked).toBe(true);
    expect((cashRadio as HTMLInputElement).checked).toBe(false);

    fireEvent.click(cashRadio);
    expect(patch).toHaveBeenCalledWith({ paymentMethod: 'cash' });
  });

  it('renders description for cash mode when selected', () => {
    const patch = vi.fn();
    render(
      <BangKeSpecificForm
        common={emptyCommon()}
        specific={{ paymentMethod: 'cash' }}
        patch={patch}
      />
    );

    expect(screen.getByText(/thể hiện số CMND\/CCCD của Bên bán/i)).toBeTruthy();
  });
});
