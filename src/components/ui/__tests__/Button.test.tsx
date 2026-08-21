// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Button } from '../Button';

afterEach(cleanup);

describe('Button Component', () => {
  it('renders children correctly with default primary variant', () => {
    render(<Button>Bấm vào đây</Button>);
    const btn = screen.getByRole('button', { name: 'Bấm vào đây' });
    expect(btn).toBeTruthy();
    expect(btn.className).toContain('bg-accent');
  });

  it('renders different variants correctly', () => {
    const { rerender } = render(<Button variant="secondary">Nút phụ</Button>);
    expect(screen.getByRole('button').className).toContain('bg-surface');

    rerender(<Button variant="danger">Nút xoá</Button>);
    expect(screen.getByRole('button').className).toContain('text-neg');

    rerender(<Button variant="ghost">Nút ẩn</Button>);
    expect(screen.getByRole('button').className).toContain('bg-transparent');
  });

  it('disables and shows loading spinner when loading is true', () => {
    const handleClick = vi.fn();
    render(<Button loading onClick={handleClick}>Lưu dữ liệu</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toHaveProperty('disabled', true);
    fireEvent.click(btn);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('handles click events normally when enabled', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Bấm</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
