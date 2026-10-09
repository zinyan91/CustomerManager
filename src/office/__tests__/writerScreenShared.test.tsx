// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

configure({ asyncUtilTimeout: 8000 });
vi.setConfig({ testTimeout: 20_000 });

const h = vi.hoisted(() => {
  class ConflictError extends Error {}
  return {
    ConflictError,
    role: 'editor',
    kind: 'writer',
    serverSeq: 3,
    serverTitle: 'Công văn số 1',
    serverContent: { doc: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bản trên máy chủ' }] }] }, pageSetup: {} } as object,
    saves: [] as Array<{ base: number; title: string; content: { doc: unknown } }>,
    created: [] as Array<{ title: string; content: object }>,
    drafts: [] as Array<{ id: string; title: string; doc: unknown }>,
    subs: new Set<(op: unknown) => void>(),
    editor: null as unknown,
    editable: [] as boolean[],
    setContents: [] as unknown[],
    onChange: null as null | ((editor: unknown) => void),
    json: { type: 'doc', content: [] } as unknown,
    joins: 0,
    versions: [] as Array<{ id: number; seq: number; label: string; createdBy: string; createdAt: string }>,
    versionContent: null as unknown,
    viewed: [] as number[],
  };
});

vi.mock('../collab/collabApi', () => ({
  ConflictError: h.ConflictError,
  canEdit: (role: string) => role === 'owner' || role === 'editor',
  canManageSharing: (role: string) => role === 'owner' || role === 'admin',
  getSharedWriter: async (id: string) => {
    if (h.kind !== 'writer') throw new Error('Không mở được văn bản chung: đây là bảng tính, hãy mở ở màn Bảng tính.');
    return { id, title: h.serverTitle, content: h.serverContent, role: h.role, lastSeq: h.serverSeq };
  },
  saveSharedWriter: async (_id: string, base: number, title: string, content: { doc: unknown }) => {
    h.saves.push({ base, title, content });
    if (base !== h.serverSeq) throw new h.ConflictError('Người khác đã lưu');
    h.serverSeq += 1;
    return h.serverSeq;
  },
  createSharedWriter: async (title: string, content: object) => {
    h.created.push({ title, content });
    return 'new-writer-id';
  },
  listOps: async () => [],
  subscribeOps: (_id: string, onOp: (op: unknown) => void) => {
    h.subs.add(onOp);
    return () => h.subs.delete(onOp);
  },
  saveVersion: async () => 1,
  restoreVersion: async () => 9,
  listVersions: async () => h.versions,
  getVersionContent: async (_id: string, versionId: number) => {
    h.viewed.push(versionId);
    return h.versionContent;
  },
  listInvitableUsers: async () => [],
  listMembers: async () => [],
  setMember: async () => {},
  joinPresence: () => {
    h.joins += 1;
    return { update: () => {}, leave: () => {} };
  },
}));
vi.mock('../writer/services/draftStore', () => ({
  getDraft: async () => null,
  saveDraft: async (draft: { id: string; title: string; doc: unknown }) => {
    h.drafts.push(draft);
  },
  newDraftId: () => 'kept-draft',
}));
vi.mock('../writer/editor/useWriterState', () => ({ useWriterState: () => ({}) }));
vi.mock('../writer/components/WriterRibbon', () => ({ WriterRibbon: () => <div data-testid="ribbon" /> }));
vi.mock('../writer/components/WriterBackstage', () => ({ WriterBackstage: () => null }));
vi.mock('../shared/archive/useArchiveDocument', () => ({ useArchiveDocument: () => ({ link: null, dialog: null, saveToArchive: async () => {}, saveToArchiveAs: async () => {}, openFromArchive: () => {} }) }));
vi.mock('../writer/editor/WriterEditor', async () => {
  const React = await import('react');
  return {
    WriterEditor: (props: { initialContent: unknown; onReady: (editor: unknown) => void; onChange: (editor: unknown) => void }) => {
      React.useEffect(() => {
        props.onReady(h.editor);
        h.onChange = props.onChange;
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return <div data-testid="editor">{JSON.stringify(props.initialContent)}</div>;
    },
  };
});

import { LanguageProvider } from '../../context/LanguageContext';
import { WriterScreen } from '../writer/components/WriterScreen';

const text = (value: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: value }] }] });

const props = (over: Partial<React.ComponentProps<typeof WriterScreen>> = {}) => ({
  docId: null,
  file: null,
  sharedId: 'w1',
  userId: 'u1',
  author: 'Lan',
  onHome: vi.fn(),
  onOpenFile: vi.fn(),
  onNew: vi.fn(),
  onOpenDraft: vi.fn(),
  onDraftId: vi.fn(),
  onOpenShared: vi.fn(),
  onReloadShared: vi.fn(),
  ...over,
});

const dung = (p: ReturnType<typeof props>) =>
  render(
    <MemoryRouter>
      <LanguageProvider>
        <WriterScreen {...p} />
      </LanguageProvider>
    </MemoryRouter>,
  );

const typeText = (value: string) => {
  h.json = text(value);
  act(() => h.onChange?.(h.editor));
};

beforeEach(() => {
  h.role = 'editor';
  h.kind = 'writer';
  h.serverSeq = 3;
  h.serverTitle = 'Công văn số 1';
  h.saves = [];
  h.created = [];
  h.drafts = [];
  h.subs.clear();
  h.editable = [];
  h.setContents = [];
  h.joins = 0;
  h.versions = [];
  h.versionContent = null;
  h.viewed = [];
  h.json = text('Bản trên máy chủ');
  h.editor = {
    isDestroyed: false,
    getJSON: () => h.json,
    getHTML: () => '<p></p>',
    setEditable: (value: boolean) => h.editable.push(value),
    commands: {
      setContent: (content: unknown) => {
        h.setContents.push(content);
        h.json = content;
      },
    },
    on: () => {},
    off: () => {},
    state: { selection: { from: 0 } },
  };
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Văn bản chung trong màn Văn bản', () => {
  it('mở: nội dung và tên lấy từ hệ thống, người được sửa gõ thì tự lưu một lần đúng số thứ tự đang giữ', async () => {
    dung(props());
    expect(((await screen.findByLabelText('Tên tài liệu')) as HTMLInputElement).value).toBe('Công văn số 1');
    expect(screen.getByTestId('editor').textContent).toContain('Bản trên máy chủ');
    typeText('Đã sửa');
    await waitFor(() => expect(h.saves).toHaveLength(1), { timeout: 8000 });
    expect(h.saves[0]).toMatchObject({ base: 3, title: 'Công văn số 1' });
    expect(h.saves[0].content.doc).toEqual(text('Đã sửa'));
    expect(await screen.findByText('Đã lưu lên hệ thống')).toBeTruthy();
  });

  it('người chỉ xem: tên khóa, trình soạn khóa, dải lệnh bị vô hiệu, không bao giờ lưu, hiện quyền của mình', async () => {
    h.role = 'viewer';
    dung(props());
    const title = (await screen.findByLabelText('Tên tài liệu')) as HTMLInputElement;
    expect(title.readOnly).toBe(true);
    await waitFor(() => expect(h.editable).toContain(false));
    expect(screen.getByTestId('ribbon').parentElement?.hasAttribute('inert')).toBe(true);
    typeText('cố sửa');
    await new Promise((resolve) => setTimeout(resolve, 1800));
    expect(h.saves).toHaveLength(0);
    expect(screen.getByText('Chỉ xem')).toBeTruthy();
  });

  it('mở nhầm loại: báo lỗi nguyên văn từ máy chủ, không dựng trình soạn', async () => {
    h.kind = 'calc';
    dung(props());
    expect((await screen.findByRole('alert')).textContent).toContain('đây là bảng tính');
    expect(screen.queryByTestId('editor')).toBeNull();
  });

  it('xung đột: hiện banner có hai lựa chọn, không ghi đè; "Giữ bản của tôi" cất nháp rồi nạp bản mới', async () => {
    dung(props());
    await screen.findByLabelText('Tên tài liệu');
    h.serverSeq = 4;
    h.serverContent = { doc: text('Bản của người khác'), pageSetup: {} };
    h.serverTitle = 'Tên mới';
    typeText('Bản của tôi');
    const banner = await screen.findByText(/Người khác đã lưu bản mới hơn/, undefined, { timeout: 8000 });
    expect(h.saves).toHaveLength(1);
    fireEvent.click(within(banner.parentElement as HTMLElement).getByRole('button', { name: 'Giữ bản của tôi thành nháp' }));
    await waitFor(() => expect(h.drafts).toHaveLength(1));
    expect(h.drafts[0]).toMatchObject({ id: 'kept-draft', doc: text('Bản của tôi') });
    await waitFor(() => expect(h.setContents).toEqual([text('Bản của người khác')]));
    expect(((await screen.findByLabelText('Tên tài liệu')) as HTMLInputElement).value).toBe('Tên mới');
    expect(screen.queryByText(/Người khác đã lưu bản mới hơn/)).toBeNull();
    expect(screen.getByText('Đã giữ bản của bạn thành nháp trong trình duyệt.')).toBeTruthy();
  });

  it('xung đột rồi chọn "Tải bản mới": bỏ phần chưa lưu, nạp bản máy chủ, không cất nháp', async () => {
    dung(props());
    await screen.findByLabelText('Tên tài liệu');
    h.serverSeq = 4;
    h.serverContent = { doc: text('Bản của người khác'), pageSetup: {} };
    typeText('Bản của tôi');
    fireEvent.click(await screen.findByRole('button', { name: 'Tải bản mới' }, { timeout: 8000 }));
    await waitFor(() => expect(h.setContents).toEqual([text('Bản của người khác')]));
    expect(h.drafts).toHaveLength(0);
  });

  it('rời đi khi còn xung đột: phải xác nhận, không đồng ý thì ở lại', async () => {
    const p = props();
    dung(p);
    await screen.findByLabelText('Tên tài liệu');
    h.serverSeq = 4;
    typeText('Chưa lưu được');
    await screen.findByRole('button', { name: 'Tải bản mới' }, { timeout: 8000 });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole('button', { name: 'Trang chủ Báo cáo' }));
    expect(p.onHome).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Trang chủ Báo cáo' }));
    await waitFor(() => expect(p.onHome).toHaveBeenCalledTimes(1));
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  it('Lịch sử của văn bản có nút Xem: mở bản chụp ở trình soạn chỉ đọc đúng mốc, không đụng nội dung đang soạn', async () => {
    h.versions = [{ id: 4, seq: 2, label: 'Chốt tháng 9', createdBy: 'u1', createdAt: '2026-10-09T01:00:00Z' }];
    h.versionContent = { doc: text('Bản của mốc'), pageSetup: {} };
    dung(props());
    await screen.findByLabelText('Tên tài liệu');
    fireEvent.click(screen.getByRole('button', { name: /Lịch sử/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Xem: Chốt tháng 9' }));
    const dialog = await screen.findByRole('dialog', { name: 'Xem mốc: Chốt tháng 9' });
    expect(h.viewed).toEqual([4]);
    await waitFor(() => expect(within(dialog).getByTestId('editor').textContent).toContain('Bản của mốc'));
    expect(h.setContents).toEqual([]);
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('có thanh Nhật ký, Lịch sử và (cho chủ) Chia sẻ', async () => {
    h.role = 'owner';
    dung(props());
    await screen.findByLabelText('Tên tài liệu');
    expect(screen.getByRole('button', { name: /Nhật ký/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Chia sẻ/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Lịch sử/ }));
    expect(await screen.findByRole('complementary', { name: 'Lịch sử' })).toBeTruthy();
    expect(h.joins).toBeGreaterThan(0);
  });

  it('người chỉ được sửa không thấy nút Chia sẻ', async () => {
    dung(props());
    await screen.findByLabelText('Tên tài liệu');
    expect(screen.queryByRole('button', { name: /Chia sẻ/ })).toBeNull();
  });
});

describe('Nháp văn bản đưa lên hệ thống', () => {
  it('Chia sẻ nháp: hỏi xác nhận (không đồng ý thì không tạo), đồng ý thì tạo văn bản chung kèm cả cây tài liệu và mở bản chung', async () => {
    const p = props({ sharedId: null });
    dung(p);
    const share = await screen.findByRole('button', { name: /Chia sẻ/ });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    fireEvent.click(share);
    expect(h.created).toHaveLength(0);
    fireEvent.click(share);
    await waitFor(() => expect(p.onOpenShared).toHaveBeenCalledWith('new-writer-id'));
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(h.created[0].content).toMatchObject({ doc: h.json, pageSetup: { paper: 'a4' } });
  });
});

describe('Nháp văn bản quá lớn', () => {
  it('Chia sẻ nháp quá 5 MB: báo lý do ngay, không gọi máy chủ và không chuyển sang bản chung', async () => {
    const p = props({ sharedId: null });
    dung(p);
    const share = await screen.findByRole('button', { name: /Chia sẻ/ });
    typeText('x'.repeat(5 * 1024 * 1024 + 100));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click(share);
    expect((await screen.findByRole('alert')).textContent).toContain('vượt giới hạn 5 MB');
    expect(h.created).toHaveLength(0);
    expect(p.onOpenShared).not.toHaveBeenCalled();
  });
});

describe('Văn bản chung: bản mới của người khác', () => {
  it('người khác lưu khi mình chưa sửa gì: nội dung được thay bằng bản mới, không báo xung đột', async () => {
    dung(props());
    await screen.findByLabelText('Tên tài liệu');
    await waitFor(() => expect(h.subs.size).toBe(1));
    h.serverSeq = 4;
    h.serverContent = { doc: text('Người khác vừa lưu'), pageSetup: {} };
    act(() => h.subs.forEach((sub) => sub({ seq: 4, userId: 'u2', clientId: '', patch: [{ t: 'reset' }], summary: { kind: 'save' }, createdAt: '' })));
    await waitFor(() => expect(h.setContents).toEqual([text('Người khác vừa lưu')]));
    expect(screen.queryByText(/Người khác đã lưu bản mới hơn/)).toBeNull();
  });
});
