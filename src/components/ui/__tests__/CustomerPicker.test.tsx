// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomerPicker, type CustomerSummaryItem } from '../CustomerPicker';

afterEach(cleanup);

const CUSTOMERS: CustomerSummaryItem[] = [
  { Id: 10, FullName: 'Nguyễn Văn Nam', CifKh: '001010', Phone: '0901234567' },
  { Id: 20, FullName: 'Trần Thị Thuỷ', CifKh: '002020', Phone: '0912345678' },
];

describe('CustomerPicker Component', () => {
  it('renders trigger button and selected customer name', () => {
    render(
      <CustomerPicker
        customers={CUSTOMERS}
        selectedCustomerId={10}
        onSelectCustomer={() => {}}
      />
    );
    expect(screen.getByText('Nguyễn Văn Nam (001010)')).toBeTruthy();
  });

  it('opens popover, searches and selects customer', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();

    render(
      <CustomerPicker
        customers={CUSTOMERS}
        selectedCustomerId={null}
        onSelectCustomer={handleSelect}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Chọn Khách hàng' }));
    expect(screen.getByPlaceholderText('Tìm theo tên, CIF, SĐT...')).toBeTruthy();

    await user.type(screen.getByPlaceholderText('Tìm theo tên, CIF, SĐT...'), 'Thuỷ');
    expect(screen.queryByText('Nguyễn Văn Nam')).toBeNull();
    expect(screen.getByText('Trần Thị Thuỷ')).toBeTruthy();

    await user.click(screen.getByText('Trần Thị Thuỷ'));
    expect(handleSelect).toHaveBeenCalledWith(20);
  });
});
