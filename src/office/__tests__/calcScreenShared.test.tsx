// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const h = vi.hoisted(() => ({
  role: 'editor' as string,
  appended: [] as Array<{ id: string; clientId: string; patch: unknown[] }>,
  ops: [] as Array<{ seq: number; userId: string; clientId: string; patch: unknown[]; summary: object; createdAt: string }>,
  snapSeq: 7,
  lastSeq: 7,
  created: [] as Array<{ title: string }>,
  drafts: [] as Array<{ id: string; title: string }>,
}));

vi.mock('../collab/collabApi', async () => {
  const { Workbook } = await import('../calc/model/workbook');
  const blank = new Workbook().toData();
  return {
  canEdit: (role: string) => role === 'owner' || role === 'editor',
  canManageSharing: (role: string) => role === 'owner' || role === 'admin',
  getSharedDocument: async (id: string) => ({ id, title: 'Quỹ lương', data: blank, role: h.role, lastSeq: h.lastSeq, snapSeq: h.snapSeq }),
  listOps: async (_id: string, after: number) => h.ops.filter((op) => op.seq > after),
  appendOp: async (id: string, clientId: string, patch: unknown[]) => {
    h.appended.push({ id, clientId, patch });
    return h.lastSeq + h.appended.length;
  },
  saveSnapshot: async () => {},
  subscribeOps: () => () => {},
  createSharedDocument: async (title: string) => {
    h.created.push({ title });
    return 'new-shared-id';
  },
  listMembers: async () => [],
  listInvitableUsers: async () => [],
  setMember: async () => {},
  joinPresence: () => ({ update: () => {}, leave: () => {} }),
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
  h.appended = [];
  h.ops = [];
  h.snapSeq = 7;
  h.lastSeq = 7;
  h.created = [];
  h.drafts = [];
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('Bảng tính chung trong màn Bảng tính', () => {
  it('người được sửa: gõ vào ô thì sau 300 ms gửi một thao tác kèm mã máy, tên bị khóa, hiện "Đã lưu lên hệ thống"', async () => {
    dung(props({ sharedId: 's1' }));
    const title = (await screen.findByLabelText('Tên bảng tính')) as HTMLInputElement;
    expect(title.value).toBe('Quỹ lương');
    expect(title.readOnly).toBe(false);
    const grid = document.querySelector('.calc-grid') as HTMLElement;
    fireEvent.keyDown(grid, { key: '5' });
    fireEvent.keyDown(document.querySelector('.calc-edit-input') as HTMLElement, { key: 'Enter' });
    await waitFor(() => expect(h.appended).toHaveLength(1), { timeout: 3000 });
    expect(h.appended[0].id).toBe('s1');
    expect(h.appended[0].clientId).not.toBe('');
    expect(h.appended[0].patch).toMatchObject([{ t: 'cells', sheet: 'Sheet1' }]);
    expect(await screen.findByText('Đã lưu lên hệ thống')).toBeTruthy();
  });

  it('mở: bản hiện hành là bản chụp cộng các thao tác sau nó trong nhật ký', async () => {
    h.snapSeq = 7;
    h.lastSeq = 9;
    const op = (seq: number, row: number, text: string) => ({ seq, userId: 'u', clientId: 'khác', summary: {}, createdAt: '', patch: [{ t: 'cells', sheet: 'Sheet1', set: [[row * 16384, text, null]], del: [] }] });
    h.ops = [op(6, 0, 'cũ hơn bản chụp'), op(8, 0, 'từ nhật ký 8'), op(9, 1, 'từ nhật ký 9')];
    dung(props({ sharedId: 's1' }));
    expect(await screen.findByText('từ nhật ký 8')).toBeTruthy();
    expect(await screen.findByText('từ nhật ký 9')).toBeTruthy();
    expect(screen.queryByText('cũ hơn bản chụp')).toBeNull();
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
    expect(h.appended).toHaveLength(0);
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
