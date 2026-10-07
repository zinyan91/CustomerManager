// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createFakeDrive } from '../../lib/drive/__tests__/fakeDrive';

const h = vi.hoisted(() => ({ ctx: null as unknown }));

vi.mock('../../lib/drive/driveToken', () => ({
  get driveContext() {
    return h.ctx;
  },
}));

import { DriveConnectionSection } from '../storage/DriveConnectionSection';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('DriveConnectionSection', () => {
  it('bấm kiểm tra: hiện từng bước đạt và kết luận kết nối hoạt động đầy đủ', async () => {
    h.ctx = createFakeDrive().ctx;
    render(<DriveConnectionSection />);
    expect(screen.queryByRole('list', { name: 'Kết quả kiểm tra kết nối' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra kết nối Google Drive' }));

    expect((await screen.findByRole('status')).textContent).toBe('Kết nối Google Drive hoạt động đầy đủ.');
    const list = screen.getByRole('list', { name: 'Kết quả kiểm tra kết nối' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(10);
    expect(within(list).getAllByLabelText('Đạt')).toHaveLength(10);
    expect(within(list).queryByLabelText('Không đạt')).toBeNull();
  });

  it('nút bị khóa trong lúc chạy, chạy xong dùng lại được', async () => {
    h.ctx = createFakeDrive().ctx;
    render(<DriveConnectionSection />);
    const btn = screen.getByRole('button', { name: 'Kiểm tra kết nối Google Drive' }) as HTMLButtonElement;
    fireEvent.click(btn);
    expect(btn.disabled).toBe(true);
    await screen.findByRole('status');
    expect(btn.disabled).toBe(false);
  });

  it('hỏng ở một bước: hiện đúng bước lỗi với thông điệp tiếng Việt và kết luận chưa đạt', async () => {
    const drive = createFakeDrive();
    drive.failNext(/^POST \/drive\/v3\/files$/, new Response(JSON.stringify({ error: { code: 403, message: 'x', errors: [{ reason: 'insufficientFilePermissions' }] } }), { status: 403 }));
    h.ctx = drive.ctx;
    render(<DriveConnectionSection />);
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra kết nối Google Drive' }));

    expect((await screen.findByRole('status')).textContent).toBe('Kết nối chưa đạt. Xem bước lỗi ở trên.');
    const list = screen.getByRole('list', { name: 'Kết quả kiểm tra kết nối' });
    const bad = within(list).getByLabelText('Không đạt').closest('li') as HTMLElement;
    expect(bad.textContent).toContain('Tạo thư mục thử');
    expect(bad.textContent).toContain('Quản lý nội dung');
  });

  it('chưa lấy được quyền (Edge Function chưa triển khai hay thiếu secret): nêu nguyên thông điệp', async () => {
    const drive = createFakeDrive();
    drive.ctx.getAccess = async () => {
      throw new Error('Chưa đặt secret GDRIVE_SA_EMAIL cho Edge Function drive-token.');
    };
    h.ctx = drive.ctx;
    render(<DriveConnectionSection />);
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra kết nối Google Drive' }));
    await waitFor(() => expect(screen.getByRole('list', { name: 'Kết quả kiểm tra kết nối' }).textContent).toContain('Chưa đặt secret GDRIVE_SA_EMAIL'));
  });
});
