// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { TemplateManagerModal } from '../TemplateManagerModal';
import type { InventoryCategoryTemplate } from '../../../data/inventoryTemplates';

afterEach(cleanup);

describe('TemplateManagerModal', () => {
  const sampleTemplates: InventoryCategoryTemplate[] = [
    {
      id: 'tpl-1',
      name: 'Ngành hàng 1',
      items: [
        { code: 'SP1', name: 'Sản phẩm 1', unit: 'Cái', unitPrice: 10000, beginningQty: 10, importQty: 0, exportQty: 0 },
      ],
    },
  ];

  it('khi thêm 1 ngành hàng mẫu mới bấm cập nhật thì gọi onSaveTemplate và đóng popup (onClose)', () => {
    const onSaveTemplate = vi.fn();
    const onClose = vi.fn();

    render(
      <TemplateManagerModal
        isOpen={true}
        onClose={onClose}
        templates={sampleTemplates}
        onSaveTemplate={onSaveTemplate}
        onDeleteTemplate={vi.fn()}
        onResetTemplates={vi.fn()}
      />
    );

    // Click "Tạo Ngành hàng mới"
    const createBtn = screen.getByRole('button', { name: /Tạo Ngành hàng mới/i });
    fireEvent.click(createBtn);

    // Enter name
    const inputName = screen.getByPlaceholderText(/VD: HTK Thiết bị điện gia dụng/i);
    fireEvent.change(inputName, { target: { value: 'Vật liệu xây dựng mới' } });

    // Click "Cập nhật"
    const submitBtn = screen.getByRole('button', { name: /Cập nhật/i });
    fireEvent.click(submitBtn);

    // Verify onSaveTemplate called
    expect(onSaveTemplate).toHaveBeenCalledWith('Vật liệu xây dựng mới', [], undefined);
    // Verify onClose called to close the popup
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('khi chỉnh sửa ngành hàng mẫu và bấm cập nhật thì lưu và đóng popup', () => {
    const onSaveTemplate = vi.fn();
    const onClose = vi.fn();

    render(
      <TemplateManagerModal
        isOpen={true}
        onClose={onClose}
        templates={sampleTemplates}
        onSaveTemplate={onSaveTemplate}
        onDeleteTemplate={vi.fn()}
        onResetTemplates={vi.fn()}
      />
    );

    // Click edit button
    const editBtn = screen.getByTitle('Sửa mẫu này');
    fireEvent.click(editBtn);

    // Change name
    const inputName = screen.getByPlaceholderText(/VD: HTK Thiết bị điện gia dụng/i);
    fireEvent.change(inputName, { target: { value: 'Ngành hàng 1 sửa' } });

    // Click "Cập nhật Ngành hàng"
    const updateBtn = screen.getByRole('button', { name: /Cập nhật Ngành hàng/i });
    fireEvent.click(updateBtn);

    expect(onSaveTemplate).toHaveBeenCalledWith('Ngành hàng 1 sửa', expect.any(Array), 'tpl-1');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('bấm nút Đóng ở footer thì gọi onClose', () => {
    const onClose = vi.fn();

    render(
      <TemplateManagerModal
        isOpen={true}
        onClose={onClose}
        templates={sampleTemplates}
        onSaveTemplate={vi.fn()}
        onDeleteTemplate={vi.fn()}
        onResetTemplates={vi.fn()}
      />
    );

    const closeBtn = screen.getByRole('button', { name: /Đóng/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
