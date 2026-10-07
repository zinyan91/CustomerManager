// @vitest-environment jsdom

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { CustomerProgressCell } from '../customers/CustomerProgressCell';

afterEach(cleanup);

describe('CustomerProgressCell', () => {
  it('hiện đúng ba hàng theo thứ tự', () => {
    render(<CustomerProgressCell progress={{ hdtd: true, kunn: true, tsdb: true }} />);
    const rows = within(screen.getByLabelText('Tiến độ hồ sơ')).getAllByRole('listitem');
    expect(rows.map((r) => r.textContent?.replace(/: (đã|chưa) có$/, ''))).toEqual(['Hợp đồng tín dụng', 'Quản lý khoản vay', 'Tài sản bảo đảm']);
  });

  it('đã có thì chữ xanh kèm dấu tích; chưa có thì chữ đỏ kèm dấu chéo', () => {
    render(<CustomerProgressCell progress={{ hdtd: false, kunn: true, tsdb: false }} />);
    const [hdtd, kunn, tsdb] = screen.getAllByRole('listitem');
    expect(hdtd.className).toContain('text-neg');
    expect(kunn.className).toContain('text-pos');
    expect(tsdb.className).toContain('text-neg');
    expect(hdtd.textContent).toContain('chưa có');
    expect(kunn.textContent).toContain('đã có');
  });

  it('khách chưa có HĐTD: riêng hàng Hợp đồng tín dụng đỏ, các hàng khác theo thực tế', () => {
    render(<CustomerProgressCell progress={{ hdtd: false, kunn: false, tsdb: true }} />);
    const items = screen.getAllByRole('listitem');
    expect(items.filter((i) => i.className.includes('text-neg'))).toHaveLength(2);
    expect(items[2].className).toContain('text-pos');
  });

  it('chưa nạp xong thì hiện dấu chờ, không hiện đỏ như thể chưa có hồ sơ', () => {
    render(<CustomerProgressCell progress={null} />);
    expect(screen.getByText('…')).toBeTruthy();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('lỗi nạp thì nói rõ lỗi', () => {
    render(<CustomerProgressCell progress={null} error="permission denied" />);
    expect(screen.getByText('Không nạp được').getAttribute('title')).toBe('permission denied');
  });
});
