// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { UploadDuplicateDialog } from '../storage/UploadDuplicateDialog';
import type { DuplicateMatch } from '../../lib/drive/driveDuplicates';

afterEach(cleanup);

const match = (index: number, path: string, sameSize: boolean): DuplicateMatch => ({
  index, path, name: path, newSize: 2048, newModified: Date.UTC(2026, 9, 9), sameSize,
  existing: { name: path, path, size: sameSize ? 2048 : 1024, modifiedTime: '2026-10-08T01:00:00Z' },
});

const open = (over: Partial<React.ComponentProps<typeof UploadDuplicateDialog>> = {}) => {
  const props = { matches: [match(0, 'a.pdf', true), match(2, 'b.pdf', false)], total: 3, onConfirm: vi.fn(), onCancel: vi.fn(), ...over };
  render(<UploadDuplicateDialog {...props} />);
  return { ...props, onConfirm: props.onConfirm as ReturnType<typeof vi.fn>, onCancel: props.onCancel as ReturnType<typeof vi.fn> };
};
const group = (name: string) => screen.getByRole('group', { name });

describe('UploadDuplicateDialog', () => {
  it('nêu số tệp trùng, tệp còn lại, và gợi ý mặc định: cùng dung lượng thì bỏ qua, khác thì giữ cả hai', () => {
    open();
    expect(screen.getByText('2 tệp trùng tên trong thư mục này')).toBeTruthy();
    expect(screen.getByText('1 tệp còn lại không trùng sẽ được tải lên bình thường.')).toBeTruthy();
    expect((within(group('a.pdf')).getByLabelText('Bỏ qua') as HTMLInputElement).checked).toBe(true);
    expect((within(group('b.pdf')).getByLabelText(/Giữ cả hai/) as HTMLInputElement).checked).toBe(true);
    expect(within(group('a.pdf')).getByText('Cùng dung lượng')).toBeTruthy();
    expect(within(group('b.pdf')).getByText('Khác dung lượng')).toBeTruthy();
  });

  it('Tiếp tục gửi đúng lựa chọn của từng tệp theo vị trí trong đợt tải', () => {
    const props = open();
    fireEvent.click(within(group('a.pdf')).getByLabelText(/Giữ cả hai/));
    fireEvent.click(within(group('b.pdf')).getByLabelText('Bỏ qua'));
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));
    expect(props.onConfirm).toHaveBeenCalledTimes(1);
    expect([...(props.onConfirm.mock.calls[0][0] as Map<number, string>)]).toEqual([[0, 'keep'], [2, 'skip']]);
  });

  it('"Áp dụng cho tất cả" dùng lựa chọn của tệp đầu tiên cho mọi tệp', () => {
    const props = open();
    fireEvent.click(screen.getByLabelText('Áp dụng lựa chọn của tệp đầu tiên cho tất cả'));
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));
    expect([...(props.onConfirm.mock.calls[0][0] as Map<number, string>)]).toEqual([[0, 'skip'], [2, 'skip']]);
  });

  it('Hủy tải lên gọi onCancel và không tải gì', () => {
    const props = open();
    fireEvent.click(screen.getByRole('button', { name: 'Hủy tải lên' }));
    expect(props.onCancel).toHaveBeenCalledTimes(1);
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it('toàn bộ tệp đều trùng thì không có dòng "tệp còn lại"', () => {
    open({ total: 2 });
    expect(screen.queryByText(/tệp còn lại không trùng/)).toBeNull();
  });
});
