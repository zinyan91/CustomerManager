// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const h = vi.hoisted(() => ({
  members: [] as Array<{ userId: string; fullName: string; role: 'editor' | 'viewer' }>,
  users: [] as Array<{ id: string; fullName: string }>,
  calls: [] as Array<[string, string, string | null]>,
  fail: null as null | Error,
}));

vi.mock('../collab/collabApi', () => ({
  listMembers: async () => h.members.map((m) => ({ ...m })),
  listInvitableUsers: async () => h.users,
  setMember: async (doc: string, user: string, role: 'editor' | 'viewer' | null) => {
    h.calls.push([doc, user, role]);
    if (h.fail) throw h.fail;
    h.members = h.members.filter((m) => m.userId !== user);
    if (role) h.members.push({ userId: user, fullName: h.users.find((u) => u.id === user)?.fullName ?? '', role });
  },
}));

import { LanguageProvider } from '../../context/LanguageContext';
import { ShareDialog } from '../collab/ShareDialog';

const dung = (onClose = () => {}) =>
  render(
    <LanguageProvider>
      <ShareDialog docId="doc1" onClose={onClose} />
    </LanguageProvider>,
  );

beforeEach(() => {
  h.members = [{ userId: 'u1', fullName: 'An', role: 'viewer' }];
  h.users = [
    { id: 'u1', fullName: 'An' },
    { id: 'u2', fullName: 'Bình' },
    { id: 'u3', fullName: '' },
  ];
  h.calls = [];
  h.fail = null;
});
afterEach(cleanup);

describe('hộp chia sẻ', () => {
  it('liệt kê người đã được chia sẻ với quyền; danh sách mời không có người đã có trong đó', async () => {
    dung();
    const list = await screen.findByRole('list');
    expect(within(list).getByText('An')).toBeTruthy();
    expect((within(list).getByLabelText('An: Chỉ xem') as HTMLSelectElement).value).toBe('viewer');
    const options = [...(screen.getByLabelText('Chọn tài khoản') as HTMLSelectElement).options].map((o) => o.textContent);
    expect(options).toEqual(['Chọn tài khoản', 'Bình', '(chưa có tên)']);
  });

  it('mời một tài khoản với quyền đã chọn rồi nạp lại danh sách', async () => {
    dung();
    await screen.findByRole('list');
    const invite = screen.getByRole('button', { name: 'Mời' }) as HTMLButtonElement;
    expect(invite.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Chọn tài khoản'), { target: { value: 'u2' } });
    fireEvent.change(screen.getByLabelText('Được sửa', { selector: '.share-invite select' }), { target: { value: 'viewer' } });
    fireEvent.click(invite);
    await waitFor(() => expect(h.calls).toEqual([['doc1', 'u2', 'viewer']]));
    expect(await screen.findByText('Bình')).toBeTruthy();
  });

  it('đổi quyền và gỡ gọi đúng hàm', async () => {
    dung();
    fireEvent.change(await screen.findByLabelText('An: Chỉ xem'), { target: { value: 'editor' } });
    await waitFor(() => expect(h.calls).toEqual([['doc1', 'u1', 'editor']]));
    fireEvent.click(await screen.findByRole('button', { name: 'Gỡ' }));
    await waitFor(() => expect(h.calls[1]).toEqual(['doc1', 'u1', null]));
    expect(await screen.findByText('Chưa chia sẻ cho ai.')).toBeTruthy();
  });

  it('lỗi từ máy chủ hiện nguyên trong hộp và danh sách không đổi', async () => {
    dung();
    await screen.findByRole('list');
    h.fail = new Error('Chỉ chủ tài liệu hoặc Master Admin đổi được việc chia sẻ.');
    fireEvent.click(screen.getByRole('button', { name: 'Gỡ' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Chỉ chủ tài liệu');
    expect(screen.getByText('An')).toBeTruthy();
  });

  it('hết người để mời thì nói rõ; Esc và nút Đóng đóng hộp', async () => {
    h.users = [{ id: 'u1', fullName: 'An' }];
    const onClose = vi.fn();
    dung(onClose);
    expect(await screen.findByText('Không còn tài khoản nào để mời.')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
