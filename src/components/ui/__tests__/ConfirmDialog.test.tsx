// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { ConfirmDialog } from '../ConfirmDialog';
import { ConfirmProvider, useConfirm } from '../../../context/ConfirmContext';

afterEach(cleanup);

describe('ConfirmDialog Component', () => {
  it('renders title, message, cancel and confirm buttons', () => {
    const handleConfirm = vi.fn();
    const handleCancel = vi.fn();

    render(
      <ConfirmDialog
        open
        title="Xoá hợp đồng"
        message="Hành động này không thể hoàn tác"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );

    expect(screen.getByText('Xoá hợp đồng')).toBeTruthy();
    expect(screen.getByText('Hành động này không thể hoàn tác')).toBeTruthy();
    
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận' }));
    expect(handleConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('works seamlessly with useConfirm hook inside ConfirmProvider', async () => {
    function TestConsumer() {
      const confirm = useConfirm();
      const handleClick = async () => {
        const ok = await confirm({
          title: 'Cảnh báo xoá',
          message: 'Bạn có chắc chắn muốn xoá khách hàng này?',
        });
        if (ok) {
          const res = document.createElement('div');
          res.setAttribute('data-testid', 'result');
          res.textContent = 'DELETED';
          document.body.appendChild(res);
        }
      };

      return <button onClick={handleClick}>Kích hoạt xoá</button>;
    }

    render(
      <ConfirmProvider>
        <TestConsumer />
      </ConfirmProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Kích hoạt xoá' }));
    expect(await screen.findByText('Cảnh báo xoá')).toBeTruthy();
    expect(screen.getByText('Bạn có chắc chắn muốn xoá khách hàng này?')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận' }));
    await waitFor(() => {
      expect(screen.getByTestId('result').textContent).toBe('DELETED');
    });
  });
});
