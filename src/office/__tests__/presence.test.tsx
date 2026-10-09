// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, renderHook } from '@testing-library/react';

const h = vi.hoisted(() => ({
  join: vi.fn(),
  update: vi.fn(),
  leave: vi.fn(),
  push: null as null | ((people: unknown[]) => void),
}));

vi.mock('../collab/collabApi', async (importOriginal) => {
  const real = await importOriginal<typeof import('../collab/collabApi')>();
  return {
    ...real,
    joinPresence: (id: string, me: unknown, onPeople: (people: unknown[]) => void) => {
      h.join(id, me);
      h.push = onPeople;
      return { update: h.update, leave: h.leave };
    },
  };
});

import { peopleFromPresence } from '../collab/collabApi';
import { PresenceBar } from '../collab/PresenceBar';
import { initialsOf } from '../collab/initials';
import { usePresence } from '../collab/usePresence';
import { CalcController } from '../calc/controller';

beforeEach(() => {
  vi.useFakeTimers();
  h.join.mockClear();
  h.update.mockClear();
  h.leave.mockClear();
  h.push = null;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('peopleFromPresence', () => {
  it('bỏ chính mình, lấy bản mới nhất của mỗi người và sắp theo tên', () => {
    const people = peopleFromPresence(
      {
        u1: [{ name: 'Lan', sheet: 'S', cell: 'A1' }],
        u3: [{ name: 'Minh', sheet: 'S', cell: 'B1' }, { name: 'Minh', sheet: 'T', cell: 'C3' }],
        u2: [{ name: 'An', sheet: 'S', cell: 'A2' }],
      },
      'u1',
    );
    expect(people).toEqual([
      { userId: 'u2', name: 'An', sheet: 'S', cell: 'A2' },
      { userId: 'u3', name: 'Minh', sheet: 'T', cell: 'C3' },
    ]);
  });

  it('mục thiếu trường hoặc rỗng không làm hỏng danh sách', () => {
    const people = peopleFromPresence({ u2: [{}], u3: [] }, 'u1');
    expect(people).toEqual([{ userId: 'u2', name: '', sheet: '', cell: '' }]);
  });
});

describe('PresenceBar', () => {
  const p = (id: string, name: string, cell = '') => ({ userId: id, name, sheet: 'Sheet1', cell });

  it('lấy chữ cái đầu và gợi ý tên kèm ô đang chọn', () => {
    expect(initialsOf('Nguyễn Văn Lan')).toBe('VL');
    expect(initialsOf('An')).toBe('AN');
    const { container } = render(<PresenceBar people={[p('u2', 'Bình Minh', 'C3'), p('u3', '')]} unnamed="Người dùng" label="Đang mở" />);
    const avatars = container.querySelectorAll('.presence-avatar');
    expect(avatars[0].getAttribute('title')).toBe('Bình Minh · Sheet1!C3');
    expect(avatars[1].getAttribute('title')).toBe('Người dùng');
  });

  it('không có ai thì không vẽ gì; quá 4 người thì gộp phần còn lại', () => {
    const empty = render(<PresenceBar people={[]} unnamed="U" label="L" />);
    expect(empty.container.firstChild).toBeNull();
    const many = render(<PresenceBar people={Array.from({ length: 6 }, (_, i) => p(`u${i}`, `Người ${i}`))} unnamed="U" label="L" />);
    expect(many.container.querySelectorAll('.presence-avatar').length).toBe(5);
    expect(many.container.querySelector('.is-more')?.textContent).toBe('+2');
  });
});

describe('usePresence', () => {
  const me = { id: 'u1', name: 'Lan' };

  it('id rỗng thì không vào kênh', () => {
    renderHook(() => usePresence(null, me, new CalcController()));
    expect(h.join).not.toHaveBeenCalled();
  });

  it('vào kênh, báo ô đang chọn, gộp các lần đổi ô trong 300 ms và rời kênh khi đóng', () => {
    const controller = new CalcController();
    const { result, unmount } = renderHook(() => usePresence('d1', me, controller));
    expect(h.join).toHaveBeenCalledWith('d1', me);
    expect(h.update).toHaveBeenCalledTimes(1);
    expect(h.update).toHaveBeenLastCalledWith(controller.wb.sheets[controller.active].name, 'A1');

    act(() => {
      controller.select(2, 1);
      controller.select(4, 2);
    });
    expect(h.update).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(h.update).toHaveBeenCalledTimes(2);
    expect(h.update).toHaveBeenLastCalledWith(controller.wb.sheets[controller.active].name, 'C5');

    act(() => h.push?.([{ userId: 'u2', name: 'Bình', sheet: 'S', cell: 'A1' }]));
    expect(result.current).toHaveLength(1);

    unmount();
    expect(h.leave).toHaveBeenCalledTimes(1);
  });
});
