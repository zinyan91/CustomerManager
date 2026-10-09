// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { UploadStatusPanel } from '../storage/UploadStatusPanel';
import type { UploadFileRow } from '../../hooks/useArchiveUpload';

afterEach(cleanup);

const rows: UploadFileRow[] = [
  { path: 'VB/a.pdf', size: 2048, state: 'done' },
  { path: 'VB/b.pdf', size: 1024 * 1024, state: 'run' },
  { path: 'VB/c.pdf', size: 10, state: 'wait' },
  { path: 'VB/d.pdf', size: 5, state: 'failed', error: 'Drive đã hết dung lượng.' },
];
const progress = { totalFiles: 4, uploadedFiles: 1, failedFiles: 1, batchIndex: 0, batchCount: 1 };

describe('UploadStatusPanel - từng tệp', () => {
  it('đang tải: có nút xem từng tệp kèm số liệu; mặc định thu gọn, mở ra thấy trạng thái, dung lượng và lỗi từng tệp', () => {
    render(<UploadStatusPanel running progress={progress} summary={null} error={null} files={rows} onDismiss={vi.fn()} />);
    const toggle = screen.getByRole('button', { name: /Từng tệp \(4: 1 xong, 2 chưa xong, 1 lỗi\)/ });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('list', { name: 'Từng tệp đang tải lên' })).toBeNull();

    fireEvent.click(toggle);
    const items = within(screen.getByRole('list', { name: 'Từng tệp đang tải lên' })).getAllByRole('listitem');
    expect(items.map((i) => i.textContent)).toEqual([
      expect.stringContaining('VB/a.pdf'),
      expect.stringContaining('VB/b.pdf'),
      expect.stringContaining('VB/c.pdf'),
      expect.stringContaining('Drive đã hết dung lượng.'),
    ]);
    expect(items[0].textContent).toContain('Xong');
    expect(items[1].textContent).toContain('Đang tải');
    expect(items[1].textContent).toContain('1.00 MB');
    expect(items[2].textContent).toContain('Đang chờ');
    expect(items[3].textContent).toContain('Lỗi');
  });

  it('xong đợt: danh sách vẫn xem được cùng dòng tóm tắt; một tệp thì không cần danh sách', () => {
    const summary = { uploaded: 3, failed: [], names: ['VB'] };
    const { rerender } = render(<UploadStatusPanel running={false} progress={null} summary={summary} error={null} files={rows} onDismiss={vi.fn()} />);
    expect(screen.getByText(/Đã tải lên 3 tệp/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Từng tệp \(4:/ })).toBeTruthy();

    rerender(<UploadStatusPanel running={false} progress={null} summary={summary} error={null} files={[rows[0]]} onDismiss={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Từng tệp/ })).toBeNull();
  });

  it('không truyền danh sách thì giữ nguyên giao diện cũ', () => {
    render(<UploadStatusPanel running progress={progress} summary={null} error={null} onDismiss={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Từng tệp/ })).toBeNull();
    expect(screen.getByText(/Đang tải lên 2\/4 tệp/)).toBeTruthy();
  });
});
