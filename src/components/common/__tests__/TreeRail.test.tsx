// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { TreeRail } from '../TreeRail';
import type { TreeNode } from '../../../lib/tree/treeNodes';

afterEach(cleanup);

const NODES: TreeNode[] = [
  { id: 'a', label: 'Thư mục A', children: [{ id: 'a/1', label: 'Lá A1' }, { id: 'a/2', label: 'Lá A2', disabled: true }] },
  { id: 'b', label: 'Thư mục B', children: [{ id: 'b/1', label: 'Lá B1', optional: true }] },
];

const ve = (over: Partial<React.ComponentProps<typeof TreeRail>> = {}) => {
  const props = { title: 'Bộ hồ sơ', nodes: NODES, selectedId: 'a/1', onSelect: vi.fn(), onCollapse: vi.fn(), ...over };
  render(<TreeRail {...props} />);
  return props;
};

describe('TreeRail', () => {
  it('thư mục chứa nút đang chọn mở sẵn, thư mục khác đóng', () => {
    ve();
    expect(screen.getByRole('button', { name: 'Thư mục A' }).getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('button', { name: 'Thư mục B' }).getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('button', { name: 'Lá B1' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Lá A1' }).getAttribute('aria-current')).toBe('true');
  });

  it('chọn sang thư mục khác thì thư mục cũ vẫn mở như Drive', () => {
    const props = { title: 'Bộ hồ sơ', nodes: NODES, onSelect: vi.fn(), onCollapse: vi.fn() };
    const { rerender } = render(<TreeRail {...props} selectedId="a/1" />);
    rerender(<TreeRail {...props} selectedId="b/1" />);
    expect(screen.getByRole('button', { name: 'Thư mục A' }).getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('button', { name: 'Thư mục B' }).getAttribute('aria-expanded')).toBe('true');
  });

  it('bấm thư mục để mở/đóng', () => {
    ve();
    fireEvent.click(screen.getByRole('button', { name: 'Thư mục B' }));
    expect(screen.getByRole('button', { name: 'Lá B1' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Thư mục B' }));
    expect(screen.queryByRole('button', { name: 'Lá B1' })).toBeNull();
  });

  it('bấm lá gọi onSelect với id của lá; lá bị loại không bấm được', () => {
    const p = ve();
    fireEvent.click(screen.getByRole('button', { name: 'Thư mục B' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lá B1' }));
    expect(p.onSelect).toHaveBeenCalledWith('b/1');
    expect((screen.getByRole('button', { name: 'Lá A2' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('nút ẩn gọi onCollapse', () => {
    const p = ve();
    fireEvent.click(screen.getByRole('button', { name: 'Ẩn Bộ hồ sơ' }));
    expect(p.onCollapse).toHaveBeenCalled();
  });

  it('renderTrailing hiện cạnh lá', () => {
    ve({ renderTrailing: n => (n.optional ? <span>gồm-{n.id}</span> : null), selectedId: 'b/1' });
    expect(screen.getByText('gồm-b/1')).toBeTruthy();
  });
});
