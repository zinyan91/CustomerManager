// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const h = vi.hoisted(() => ({
  role: 'editor' as string,
  saves: [] as Array<{ id: string; seq: number; title: string }>,
  saveReply: [] as Array<'ok' | 'conflict' | 'fail'>,
  created: [] as Array<{ title: string }>,
  drafts: [] as Array<{ id: string; title: string }>,
  FakeConflict: class FakeConflict extends Error {},
}));

vi.mock('../collab/collabApi', async () => {
  const { Workbook } = await import('../calc/model/workbook');
  const blank = new Workbook().toData();
  return {
  ConflictError: h.FakeConflict,
  canEdit: (role: string) => role === 'owner' || role === 'editor',
  canManageSharing: (role: string) => role === 'owner' || role === 'admin',
  getSharedDocument: async (id: string) => ({ id, title: 'Quỹ lương', data: blank, role: h.role, lastSeq: 7 }),
  saveSharedDocument: async (id: string, seq: number, title: string) => {
    h.saves.push({ id, seq, title });
    const reply = h.saveReply.shift() ?? 'ok';
    if (reply === 'conflict') throw new h.FakeConflict('Người khác đã lưu');
    if (reply === 'fail') throw new Error('mất mạng');
    return seq + 1;
  },
  createSharedDocument: async (title: string) => {
    h.created.push({ title });
    return 'new-shared-id';
  },
  listMembers: async () => [],
  listInvitableUsers: async () => [],
  setMember: async () => {},
  };
});
vi.mock('../calc/services/calcDraftStore', () => ({
  getCalcDraft: async () => null,
  newDraftId: () => 'draft-xyz',
  saveCalcDraft: async (draft: { id: string; title: string }) => {
    h.drafts.push({ id: draft.id, title: draft.title });
  },
  listCalcDrafts: async () => [],
}));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ role: 'user', user: { id: 'u1' } }) }));
vi.mock('../../hooks/useArchive', () => ({ useArchive: () => ({ repos: [], selectedRepo: null, selectRepo: () => {}, documents: [], folders: [], driveEntries: [], driveRoot: null, driveWrite: false, status: { kind: 'no_repo' } }) }));

import { MemoryRouter } from 'react-router';
import { LanguageProvider } from '../../context/LanguageContext';
import { CalcScreen } from '../calc/components/CalcScreen';

const props = (over: Record<string, unknown> = {}) => ({
  docId: null,
  file: null,
  author: 'Tester',
  onHome: vi.fn(),
  onNew: vi.fn(),
  onOpenFile: vi.fn(),
  onOpenDraft: vi.fn(),
  onOpenShared: vi.fn(),
  onReloadShared: vi.fn(),
  onDraftId: vi.fn(),
  ...over,
});

const dung = (p: ReturnType<typeof props>) =>
  render(
    <MemoryRouter>
      <LanguageProvider>
        <CalcScreen {...p} />
      </LanguageProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  h.role = 'editor';
  h.saves = [];
  h.saveReply = [];
  h.created = [];
  h.drafts = [];
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('Bảng tính chung trong màn Bảng tính', () => {
  it('người được sửa: đổi tên rồi tự lưu với số thứ tự đã tải, hiện "Đã lưu lên hệ thống"', async () => {
    dung(props({ sharedId: 's1' }));
    const title = (await screen.findByLabelText('Tên bảng tính')) as HTMLInputElement;
    expect(title.value).toBe('Quỹ lương');
    expect(title.readOnly).toBe(false);
    fireEvent.change(title, { target: { value: 'Quỹ lương T10' } });
    await waitFor(() => expect(h.saves).toEqual([{ id: 's1', seq: 7, title: 'Quỹ lương T10' }]), { timeout: 3000 });
    expect(await screen.findByText('Đã lưu lên hệ thống')).toBeTruthy();
  });

  it('người chỉ xem: khóa tên, hiện quyền, sửa ô bị chặn kèm lý do, không bao giờ gọi lưu; không có nút Chia sẻ', async () => {
    h.role = 'viewer';
    dung(props({ sharedId: 's1' }));
    const title = (await screen.findByLabelText('Tên bảng tính')) as HTMLInputElement;
    expect(title.readOnly).toBe(true);
    expect(screen.getByText('Chỉ xem')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Chia sẻ/ })).toBeNull();
    const grid = document.querySelector('.calc-grid') as HTMLElement;
    fireEvent.keyDown(grid, { key: '5' });
    fireEvent.keyDown(grid, { key: 'Enter' });
    expect((await screen.findAllByText('Bạn chỉ có quyền xem bảng tính này.')).length).toBeGreaterThan(0);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 1000));
    });
    expect(h.saves).toHaveLength(0);
  });

  it('xung đột: hiện cảnh báo với hai lối ra; "Tải lại" dựng lại màn, "Giữ bản của tôi" lưu nháp riêng rồi mở nó', async () => {
    h.saveReply = ['conflict'];
    const p = props({ sharedId: 's1' });
    dung(p);
    fireEvent.change(await screen.findByLabelText('Tên bảng tính'), { target: { value: 'Bản của tôi' } });
    expect((await screen.findByText(/Người khác đã lưu bảng tính này trước bạn/, undefined, { timeout: 3000 })).textContent).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại bản mới nhất' }));
    expect(p.onReloadShared).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Giữ bản của tôi thành nháp riêng' }));
    await waitFor(() => expect(p.onOpenDraft).toHaveBeenCalledWith('draft-xyz'));
    expect(h.drafts).toEqual([{ id: 'draft-xyz', title: 'Bản của tôi' }]);
    // Sau xung đột không lưu lên hệ thống nữa
    fireEvent.change(screen.getByLabelText('Tên bảng tính'), { target: { value: 'Sửa tiếp' } });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 1200));
    });
    expect(h.saves).toHaveLength(1);
  });

  it('nháp riêng bấm Chia sẻ: hỏi xác nhận, không đồng ý thì không tải lên; đồng ý thì tạo và mở bảng tính chung', async () => {
    const p = props();
    dung(p);
    const share = await screen.findByRole('button', { name: /Chia sẻ/ });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    fireEvent.click(share);
    expect(h.created).toHaveLength(0);
    fireEvent.click(share);
    await waitFor(() => expect(p.onOpenShared).toHaveBeenCalledWith('new-shared-id'));
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(h.created).toHaveLength(1);
  });

  it('chủ bảng tính chung bấm Chia sẻ thì mở hộp mời', async () => {
    h.role = 'owner';
    dung(props({ sharedId: 's1' }));
    fireEvent.click(await screen.findByRole('button', { name: /Chia sẻ/ }));
    expect(await screen.findByRole('dialog', { name: 'Chia sẻ bảng tính' })).toBeTruthy();
  });
});
