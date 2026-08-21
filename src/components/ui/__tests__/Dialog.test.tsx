// @vitest-environment jsdom

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '../Dialog';

afterEach(cleanup);

describe('Dialog Component', () => {
  it('opens and displays content when trigger is clicked', () => {
    render(
      <Dialog>
        <DialogTrigger>Mở hộp thoại</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tiêu đề hộp thoại</DialogTitle>
            <DialogDescription>Mô tả chi tiết</DialogDescription>
          </DialogHeader>
          <div>Nội dung bên trong</div>
          <DialogFooter>
            <DialogClose>Đóng</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );

    expect(screen.queryByText('Tiêu đề hộp thoại')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Mở hộp thoại' }));
    expect(screen.getByText('Tiêu đề hộp thoại')).toBeTruthy();
    expect(screen.getByText('Mô tả chi tiết')).toBeTruthy();
    expect(screen.getByText('Nội dung bên trong')).toBeTruthy();
  });

  it('renders drawer variant with slide-in styling', () => {
    render(
      <Dialog open>
        <DialogContent variant="drawer">
          <DialogTitle>Ngăn kéo hồ sơ</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    expect(screen.getByText('Ngăn kéo hồ sơ')).toBeTruthy();
    const content = screen.getByRole('dialog');
    expect(content.className).toContain('inset-y-0');
    expect(content.className).toContain('right-0');
  });
});
