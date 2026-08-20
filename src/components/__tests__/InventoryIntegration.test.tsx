// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import type { InventoryItem } from '../../lib/inventory';

const mockInventory: InventoryItem[] = [
  {
    id: 'item-1',
    code: 'SP01',
    name: 'Nước hoa Chanel No.5',
    unit: 'Chai',
    unitPrice: 3500000,
    beginningQty: 10,
    importQty: 20,
    exportQty: 5,
  },
  {
    id: 'item-2',
    code: 'SP02',
    name: 'Son dưỡng Dior Lip Glow',
    unit: 'Cây',
    unitPrice: 850000,
    beginningQty: 15,
    importQty: 30,
    exportQty: 12,
  },
];

vi.mock('../../lib/inventoryDb', () => ({
  fetchInventoryItemsDb: vi.fn().mockImplementation(() => Promise.resolve(mockInventory)),
  saveInventoryItemDb: vi.fn().mockImplementation(() => Promise.resolve()),
  deleteInventoryItemDb: vi.fn().mockImplementation(() => Promise.resolve()),
}));

vi.mock('../../lib/statementDb', () => ({
  fetchPurchaseStatementsDb: vi.fn().mockImplementation(() => Promise.resolve([])),
  savePurchaseStatementDb: vi.fn().mockImplementation(() => Promise.resolve()),
  deletePurchaseStatementDb: vi.fn().mockImplementation(() => Promise.resolve()),
  fetchRetailInvoicesDb: vi.fn().mockImplementation(() => Promise.resolve([])),
  saveRetailInvoiceDb: vi.fn().mockImplementation(() => Promise.resolve()),
  deleteRetailInvoiceDb: vi.fn().mockImplementation(() => Promise.resolve()),
}));

import { InventoryItemPickerModal } from '../inventory/InventoryItemPickerModal';
import { PurchaseStatementTab } from '../inventory/PurchaseStatementTab';
import { RetailInvoiceTab } from '../inventory/RetailInvoiceTab';

describe('Inventory Integration Tests', () => {
  afterEach(() => {
    cleanup();
  });
  describe('InventoryItemPickerModal', () => {
    it('should render inventory items and allow selecting and batch adding', async () => {
      const onSelectItems = vi.fn();
      const onClose = vi.fn();

      render(
        <InventoryItemPickerModal
          isOpen={true}
          onClose={onClose}
          onSelectItems={onSelectItems}
          title="CHỌN TỪ KHO"
          defaultQtyType="import"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Nước hoa Chanel No.5')).toBeTruthy();
        expect(screen.getByText('Son dưỡng Dior Lip Glow')).toBeTruthy();
      });

      // Search filtering
      const searchInput = screen.getByPlaceholderText(/Tìm theo mã hàng/i);
      fireEvent.change(searchInput, { target: { value: 'Chanel' } });

      expect(screen.getByText('Nước hoa Chanel No.5')).toBeTruthy();
      expect(screen.queryByText('Son dưỡng Dior Lip Glow')).toBeNull();

      // Clear search
      fireEvent.change(searchInput, { target: { value: '' } });
      expect(screen.getByText('Son dưỡng Dior Lip Glow')).toBeTruthy();

      // Click select all
      const selectAllBtn = screen.getByText(/Chọn tất cả/i);
      fireEvent.click(selectAllBtn);

      // Confirm button
      const confirmBtn = screen.getByText(/Thêm vào danh sách/i);
      fireEvent.click(confirmBtn);

      expect(onSelectItems).toHaveBeenCalledWith([
        {
          code: 'SP01',
          name: 'Nước hoa Chanel No.5',
          unit: 'Chai',
          unitPrice: 3500000,
          qty: 20, // defaultQtyType is import (importQty = 20)
        },
        {
          code: 'SP02',
          name: 'Son dưỡng Dior Lip Glow',
          unit: 'Cây',
          unitPrice: 850000,
          qty: 30, // defaultQtyType is import (importQty = 30)
        },
      ]);
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('PurchaseStatementTab with Central Inventory', () => {
    it('should open picker modal and add items from central inventory', async () => {
      const showNotify = vi.fn();
      render(<PurchaseStatementTab showNotify={showNotify} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Chọn từ Kho hàng/i })).toBeTruthy();
      });

      // Open picker modal
      const pickBtn = screen.getByRole('button', { name: /Chọn từ Kho hàng/i });
      fireEvent.click(pickBtn);

      await waitFor(() => {
        expect(screen.getByText('CHỌN MẶT HÀNG TỪ KHO VÀO BẢNG KÊ MUA BÁN')).toBeTruthy();
      });

      // Select item 1
      const itemRow = screen.getByText('Nước hoa Chanel No.5');
      fireEvent.click(itemRow);

      const addBtn = screen.getByText(/Thêm vào danh sách/i);
      fireEvent.click(addBtn);

      await waitFor(() => {
        expect(screen.getAllByText('Nước hoa Chanel No.5').length).toBeGreaterThanOrEqual(1);
        expect(showNotify).toHaveBeenCalledWith('success', expect.stringContaining('Đã thêm 1 mặt hàng'));
      });
    });

    it('should auto-fill unit and unitPrice when typing an item name matching inventory', async () => {
      const showNotify = vi.fn();
      render(<PurchaseStatementTab showNotify={showNotify} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Chọn từ Kho hàng/i })).toBeTruthy();
      });

      const nameInput = screen.getByPlaceholderText(/Tên hàng hóa \/ dịch vụ \*/i) as HTMLInputElement;
      const unitInput = screen.getByPlaceholderText(/ĐVT/i) as HTMLInputElement;
      const priceInput = screen.getByPlaceholderText(/Đơn giá/i) as HTMLInputElement;

      fireEvent.change(nameInput, { target: { value: 'Son dưỡng Dior Lip Glow' } });

      expect(unitInput.value).toBe('Cây');
      expect(priceInput.value).toBe('850.000');
    });
  });

  describe('RetailInvoiceTab with Central Inventory', () => {
    it('should open picker modal and add items from central inventory', async () => {
      const showNotify = vi.fn();
      render(<RetailInvoiceTab showNotify={showNotify} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Chọn từ Kho hàng/i })).toBeTruthy();
      });

      // Open picker modal
      const pickBtn = screen.getByRole('button', { name: /Chọn từ Kho hàng/i });
      fireEvent.click(pickBtn);

      await waitFor(() => {
        expect(screen.getByText('CHỌN MẶT HÀNG TỪ KHO VÀO HÓA ĐƠN BÁN LẺ')).toBeTruthy();
      });

      // Select item 2
      const itemRow = screen.getByText('Son dưỡng Dior Lip Glow');
      fireEvent.click(itemRow);

      const addBtn = screen.getByText(/Thêm vào danh sách/i);
      fireEvent.click(addBtn);

      await waitFor(() => {
        expect(screen.getAllByText('Son dưỡng Dior Lip Glow').length).toBeGreaterThanOrEqual(1);
        expect(showNotify).toHaveBeenCalledWith('success', expect.stringContaining('Đã thêm 1 mặt hàng'));
      });
    });
  });
});
