// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { ModuleGate } from '../ModuleGate';

const state = vi.hoisted(() => ({
  value: { allowed: [] as string[], ready: true, error: null as string | null, reload: () => {} },
}));
vi.mock('../../context/ModulesContext', () => ({ useModules: () => state.value }));

afterEach(() => {
  state.value = { allowed: [], ready: true, error: null, reload: () => {} };
  cleanup();
});

function dung(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/dispatches" element={<div>MAN-VAN-THU</div>} />
        <Route path="/settings" element={<div>MAN-CAI-DAT</div>} />
        <Route path="*" element={<ModuleGate><div>NOI-DUNG</div></ModuleGate>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ModuleGate', () => {
  it('đường dẫn thuộc module được cấp thì hiện nội dung', () => {
    state.value.allowed = ['credit'];
    dung('/customers');
    expect(screen.getByText('NOI-DUNG')).toBeTruthy();
  });

  it('đường dẫn thuộc module không có thì chuyển về màn đầu tiên được phép', () => {
    state.value.allowed = ['dispatch'];
    dung('/customers');
    expect(screen.queryByText('NOI-DUNG')).toBeNull();
    expect(screen.getByText('MAN-VAN-THU')).toBeTruthy();
  });

  it('đường dẫn theo khách hàng cũng bị chặn', () => {
    state.value.allowed = ['dispatch'];
    dung('/customers/9/loans');
    expect(screen.getByText('MAN-VAN-THU')).toBeTruthy();
  });

  it('không có module nào thì về Cài đặt', () => {
    state.value.allowed = [];
    dung('/loans');
    expect(screen.getByText('MAN-CAI-DAT')).toBeTruthy();
  });

  it('chưa tra xong cờ thì chỉ hiện trạng thái đang nạp, không lộ nội dung', () => {
    state.value = { allowed: [], ready: false, error: null, reload: () => {} };
    dung('/customers');
    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.queryByText('NOI-DUNG')).toBeNull();
    expect(screen.queryByText('MAN-CAI-DAT')).toBeNull();
  });

  it('lỗi tra cờ hiện nguyên thông điệp lỗi và cho thử lại, không lộ nội dung', () => {
    const reload = vi.fn();
    state.value = { allowed: [], ready: false, error: 'Chưa áp migration 65_user_modules.sql trên Supabase.', reload };
    dung('/customers');
    expect(screen.getByRole('alert').textContent).toContain('Chưa áp migration 65_user_modules.sql trên Supabase.');
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(reload).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('NOI-DUNG')).toBeNull();
  });
});
