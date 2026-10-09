// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { TransferPanel } from '../storage/TransferPanel';
import type { UploadFileRow } from '../../hooks/useArchiveUpload';

afterEach(cleanup);

const idleZip = { phase: null, fileName: '', progress: null, error: null, message: null, onCancel: vi.fn(), onDismiss: vi.fn() } as const;
const idleUpload: React.ComponentProps<typeof TransferPanel>['upload'] = { running: false, progress: null, summary: null, error: null, files: [], onDismiss: vi.fn() };

const files: UploadFileRow[] = [
  { path: 'VB/a.pdf', size: 2048, state: 'done' },
  { path: 'VB/b.pdf', size: 1024 * 1024, state: 'run' },
  { path: 'VB/c.pdf', size: 10, state: 'wait' },
  { path: 'VB/d.pdf', size: 5, state: 'failed', error: 'Drive đã hết dung lượng.' },
];
const progress = { totalFiles: 4, uploadedFiles: 1, failedFiles: 1, batchIndex: 0, batchCount: 1 };

const show = (over: { upload?: Partial<typeof idleUpload>; zip?: Record<string, unknown> } = {}) =>
  render(<TransferPanel upload={{ ...idleUpload, ...over.upload }} zip={{ ...idleZip, ...over.zip } as never} />);
const rowsOf = () => within(screen.getByRole('list', { name: 'Danh sách truyền tệp' })).getAllByRole('listitem');

describe('TransferPanel', () => {
  it('chưa có việc nào thì không hiện gì', () => {
    const { container } = show();
    expect(container.firstChild).toBeNull();
  });

  it('đang tải lên: tab kèm số lượng, từng tệp có trạng thái, dung lượng, lỗi; có dòng tiến độ chung và tổng', () => {
    show({ upload: { running: true, progress, files } });
    expect(screen.getByRole('tab', { name: 'Tất cả (4)' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Đang chạy (2)' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Hoàn tất (1)' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Bỏ qua / Lỗi (1)' })).toBeTruthy();
    expect(screen.getByText('Đang tải lên 2/4 tệp')).toBeTruthy();

    const rows = rowsOf();
    expect(rows).toHaveLength(4);
    expect(rows[0].textContent).toContain('Hoàn tất');
    expect(rows[1].textContent).toContain('Đang chạy');
    expect(rows[1].textContent).toContain('1.00 MB');
    expect(rows[2].textContent).toContain('Đang chờ');
    expect(rows[3].textContent).toContain('Drive đã hết dung lượng.');
    expect(screen.getByText(/Tổng 4 tệp/)).toBeTruthy();
    expect(screen.getByText('Đang truyền 1 tệp')).toBeTruthy();
  });

  it('cột tốc độ chỉ hiện ở tệp đang chạy; tệp đang chạy có nút Hủy đúng đường dẫn', () => {
    const cancel = vi.fn();
    show({ upload: { running: true, progress, files: [{ path: 'VB/b.pdf', size: 4 * 1024 * 1024, state: 'run', loaded: 1024 * 1024, speed: 1536 * 1024 }, files[0]], onCancelFile: cancel } });
    const [run, done] = rowsOf();
    expect(run.textContent).toContain('1.50 MB/s');
    expect(run.textContent).toContain('Đang chạy');
    expect(within(run).getByRole('progressbar').getAttribute('aria-valuenow')).toBe('25');
    expect(within(done).queryByRole('button', { name: /Hủy/ })).toBeNull();
    fireEvent.click(within(run).getByRole('button', { name: 'Hủy VB/b.pdf' }));
    expect(cancel).toHaveBeenCalledWith('VB/b.pdf');
  });

  it('tệp lỗi và đã hủy có nút Thử lại khi còn tệp gốc; khóa khi đang chạy; không có khi mất tệp gốc', () => {
    const retry = vi.fn();
    const rowsMix: UploadFileRow[] = [
      { path: 'a.pdf', size: 1, state: 'failed', error: 'Mất mạng' },
      { path: 'b.pdf', size: 1, state: 'cancelled' },
      { path: 'c.pdf', size: 1, state: 'failed', error: 'x' },
    ];
    show({ upload: { files: rowsMix, onRetryFile: retry, retryable: new Set(['a.pdf', 'b.pdf']) } });
    const [a, b, c] = rowsOf();
    expect(b.textContent).toContain('Đã hủy');
    fireEvent.click(within(a).getByRole('button', { name: 'Thử lại a.pdf' }));
    expect(retry).toHaveBeenCalledWith('a.pdf');
    expect(within(b).getByRole('button', { name: 'Thử lại b.pdf' })).toBeTruthy();
    expect(within(c).queryByRole('button', { name: /Thử lại/ })).toBeNull();
    cleanup();

    show({ upload: { running: true, progress, files: rowsMix, onRetryFile: retry, retryable: new Set(['a.pdf']) } });
    expect((screen.getByRole('button', { name: 'Thử lại a.pdf' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('tóm tắt nêu số tệp đã hủy', () => {
    show({ upload: { summary: { uploaded: 2, failed: [], names: [], cancelled: 1 } } });
    expect(screen.getByRole('status').textContent).toContain('Đã tải lên 2 tệp, 1 tệp đã hủy.');
  });

  it('chuyển tab lọc đúng các dòng; tab rỗng nói rõ', () => {
    show({ upload: { files } });
    fireEvent.click(screen.getByRole('tab', { name: 'Hoàn tất (1)' }));
    expect(rowsOf().map((r) => r.textContent)).toEqual([expect.stringContaining('VB/a.pdf')]);
    fireEvent.click(screen.getByRole('tab', { name: 'Bỏ qua / Lỗi (1)' }));
    expect(rowsOf()[0].textContent).toContain('VB/d.pdf');

    cleanup();
    show({ upload: { files: [files[0]] } });
    fireEvent.click(screen.getByRole('tab', { name: 'Bỏ qua / Lỗi (0)' }));
    expect(screen.getByText('Chưa có tệp nào trong mục này.')).toBeTruthy();
  });

  it('xong đợt: dòng tóm tắt giữ nguyên chữ cũ kèm số tệp bỏ qua; tệp bỏ qua hiện ở tab Bỏ qua / Lỗi', () => {
    const summary = { uploaded: 3, failed: [], names: ['VB'], skipped: ['VB/x.pdf'] };
    show({ upload: { summary, files: [files[0]] } });
    expect(screen.getByRole('status').textContent).toContain('Đã tải lên 3 tệp: VB. Đã bỏ qua 1 tệp trùng tên.');
    fireEvent.click(screen.getByRole('tab', { name: 'Bỏ qua / Lỗi (1)' }));
    expect(rowsOf()[0].textContent).toContain('Đã bỏ qua');
    expect(rowsOf()[0].textContent).toContain('Trùng với tệp đã có trong kho');
  });

  it('bỏ qua hết thì nói không có tệp nào được tải lên; lỗi chung của đợt là một cảnh báo duy nhất có nút đóng', () => {
    const dismiss = vi.fn();
    show({ upload: { summary: { uploaded: 0, failed: [], names: [], skipped: ['a.pdf'] } } });
    expect(screen.getByText(/Không có tệp nào được tải lên\. Đã bỏ qua 1 tệp trùng tên\./)).toBeTruthy();
    cleanup();

    show({ upload: { error: 'Chưa có kho lưu trữ để tải lên.', onDismiss: dismiss } });
    expect(screen.getByRole('alert').textContent).toContain('Chưa có kho lưu trữ để tải lên.');
    fireEvent.click(screen.getByRole('button', { name: 'Đóng thông báo' }));
    expect(dismiss).toHaveBeenCalled();
  });

  it('tải thư mục ZIP: dòng tải xuống có phần trăm và nút Hủy; hủy gọi onCancel', () => {
    const cancel = vi.fn();
    show({ zip: { phase: 'downloading', fileName: 'Van-thu.zip', progress: { completed: 2, total: 5, loadedBytes: 50, totalBytes: 200, currentName: 'a.pdf' }, onCancel: cancel } });
    const row = rowsOf()[0];
    expect(row.textContent).toContain('Van-thu.zip');
    expect(row.textContent).toContain('Máy của tôi');
    expect(row.textContent).toContain('2/5 tệp · a.pdf');
    expect(within(row).getByRole('progressbar').getAttribute('aria-valuenow')).toBe('25');
    fireEvent.click(within(row).getByRole('button', { name: 'Hủy' }));
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('chọn nơi lưu và đang lưu hiện dòng trạng thái; lỗi ZIP là cảnh báo; thành công là thông báo có nút đóng', () => {
    show({ zip: { phase: 'choosing', fileName: 'K.zip' } });
    expect(screen.getByRole('status').textContent).toContain('Chọn nơi lưu K.zip...');
    cleanup();
    show({ zip: { phase: 'saving', fileName: 'K.zip' } });
    expect(screen.getByRole('status').textContent).toContain('Đang lưu K.zip...');
    cleanup();
    show({ zip: { fileName: 'K.zip', error: 'Không tìm thấy tệp "a.pdf".' } });
    expect(screen.getByRole('alert').textContent).toContain('Không tìm thấy tệp "a.pdf".');
    cleanup();
    show({ zip: { fileName: 'K.zip', message: 'Đã tải K.zip' } });
    expect(screen.getByRole('status').textContent).toContain('Đã tải K.zip');
  });

  it('"Xóa danh sách đã xong" xóa cả tải lên và tải xuống, và bị khóa khi còn đang chạy', () => {
    const up = vi.fn();
    const down = vi.fn();
    show({ upload: { files, onDismiss: up }, zip: { fileName: 'K.zip', message: 'xong', onDismiss: down } });
    fireEvent.click(screen.getByRole('button', { name: 'Xóa danh sách đã xong' }));
    expect(up).toHaveBeenCalled();
    expect(down).toHaveBeenCalled();
    cleanup();

    show({ upload: { running: true, progress, files } });
    expect((screen.getByRole('button', { name: 'Xóa danh sách đã xong' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
