// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { LoadingState, EmptyState, ErrorState } from '../FeedbackStates';

afterEach(cleanup);

describe('FeedbackStates Components', () => {
  it('renders LoadingState with custom text', () => {
    render(<LoadingState text="Đang tải dữ liệu hồ sơ..." />);
    expect(screen.getByText('Đang tải dữ liệu hồ sơ...')).toBeTruthy();
  });

  it('renders EmptyState with title, description and action', () => {
    render(
      <EmptyState
        title="Chưa có khách hàng"
        description="Bấm vào nút bên dưới để thêm mới"
        action={<button>Thêm khách hàng</button>}
      />
    );
    expect(screen.getByText('Chưa có khách hàng')).toBeTruthy();
    expect(screen.getByText('Bấm vào nút bên dưới để thêm mới')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Thêm khách hàng' })).toBeTruthy();
  });

  it('renders ErrorState and triggers onRetry callback', () => {
    const handleRetry = vi.fn();
    render(
      <ErrorState
        title="Lỗi kết nối"
        message="Không thể kết nối tới cơ sở dữ liệu"
        onRetry={handleRetry}
      />
    );
    expect(screen.getByText('Lỗi kết nối')).toBeTruthy();
    expect(screen.getByText('Không thể kết nối tới cơ sở dữ liệu')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });
});
