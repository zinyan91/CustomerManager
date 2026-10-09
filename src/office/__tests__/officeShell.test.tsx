// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { MODULE_IDS, type ModuleId } from '../../lib/modules';

const h = vi.hoisted(() => ({
  session: { user: { id: 'u1' } } as unknown,
  loading: false,
  allowed: [] as string[],
  drafts: [] as Array<{ id: string; title: string; updatedAt: number }>,
  writerDrafts: [] as Array<{ id: string; title: string; updatedAt: number }>,
  deleted: [] as string[],
  shared: [] as Array<{ id: string; title: string; ownerId: string; ownerName: string; role: string; updatedAt: string; lastSeq: number; kind?: string }>,
  sharedError: null as null | string,
}));

vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ session: h.session, loading: h.loading }) }));
vi.mock('../../context/ModulesContext', () => ({
  useModules: () => ({ allowed: h.allowed, ready: true, error: null, reload: () => {} }),
}));
vi.mock('../../components/LoginView', () => ({ LoginView: () => <div>DANG NHAP</div> }));
vi.mock('../calc/services/calcDraftStore', () => ({
  listCalcDrafts: async () => h.drafts,
  deleteCalcDraft: async (id: string) => {
    h.deleted.push(id);
    h.drafts = h.drafts.filter((d) => d.id !== id);
  },
}));

vi.mock('../writer/services/draftStore', () => ({
  listDrafts: async () => h.writerDrafts,
  deleteDraft: async (id: string) => {
    h.deleted.push(id);
    h.writerDrafts = h.writerDrafts.filter((d) => d.id !== id);
  },
}));

vi.mock('../collab/collabApi', () => ({
  listSharedDocuments: async () => {
    if (h.sharedError) throw new Error(h.sharedError);
    return h.shared;
  },
  deleteSharedDocument: async (id: string) => {
    h.deleted.push(id);
    h.shared = h.shared.filter((d) => d.id !== id);
  },
  canManageSharing: (role: string) => role === 'owner' || role === 'admin',
}));

import { LanguageProvider } from '../../context/LanguageContext';
import { OfficeIndex, OfficeLayout } from '../OfficeLayout';

function Where() {
  const loc = useLocation();
  return <div data-testid="where">{loc.pathname}{(loc.state as { file?: File } | null)?.file ? '+file' : ''}</div>;
}

function dung(path = '/office') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LanguageProvider>
        <Routes>
          <Route path="/office" element={<OfficeLayout />}>
            <Route index element={<OfficeIndex />} />
            <Route path="calc" element={<div>MAN BANG TINH MOI</div>} />
            <Route path="calc/shared/:sharedId" element={<div>MAN BANG TINH CHUNG</div>} />
            <Route path="calc/:draftId" element={<div>MAN BANG TINH NHAP</div>} />
            <Route path="writer" element={<div>MAN VAN BAN MOI</div>} />
            <Route path="writer/shared/:sharedId" element={<div>MAN VAN BAN CHUNG</div>} />
            <Route path="writer/:draftId" element={<div>MAN VAN BAN NHAP</div>} />
          </Route>
          <Route path="*" element={<Where />} />
        </Routes>
        <Where />
      </LanguageProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  h.session = { user: { id: 'u1' } };
  h.loading = false;
  h.allowed = [...MODULE_IDS];
  h.drafts = [];
  h.writerDrafts = [];
  h.deleted = [];
  h.shared = [];
  h.sharedError = null;
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('OfficeLayout: khung toàn màn hình của tab Báo cáo', () => {
  it('chưa đăng nhập thì hiện màn đăng nhập, không lộ cổng vào', () => {
    h.session = null;
    dung();
    expect(screen.getByText('DANG NHAP')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Báo cáo' })).toBeNull();
  });

  it('đang nạp phiên thì chưa hiện gì của Báo cáo', () => {
    h.loading = true;
    dung();
    expect(screen.queryByText('DANG NHAP')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Báo cáo' })).toBeNull();
  });

  it('tài khoản không có module Công cụ tính bị đưa về màn đầu được phép, không vào được Báo cáo', async () => {
    h.allowed = ['dispatch'] as ModuleId[];
    dung();
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Báo cáo' })).toBeNull());
    expect(screen.getAllByTestId('where')[0].textContent).toBe('/dispatches');
  });

  it('có module Công cụ tính: thấy cổng vào với hai lối tạo và mở bảng tính', async () => {
    dung();
    expect(await screen.findByRole('heading', { name: 'Báo cáo' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Bảng tính trống/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Mở bảng tính/ })).toBeTruthy();
  });
});

describe('OfficeIndex: cổng vào', () => {
  it('chưa có nháp thì nói chưa có tài liệu, không phải bảng rỗng', async () => {
    dung();
    expect(await screen.findByText('Chưa có tài liệu nào.')).toBeTruthy();
  });

  it('liệt kê nháp mới nhất trước; bấm vào thì mở đúng nháp', async () => {
    h.drafts = [
      { id: 'b2', title: 'Báo cáo quý 3', updatedAt: 2 },
      { id: 'a1', title: '', updatedAt: 1 },
    ];
    dung();
    const list = await screen.findByRole('list', { name: 'Gần đây' });
    const items = within(list).getAllByRole('listitem');
    expect(items[0].textContent).toContain('Báo cáo quý 3');
    expect(items[1].textContent).toContain('Bảng tính không tên');
    fireEvent.click(within(items[0]).getByRole('button', { name: /Mở Báo cáo quý 3/ }));
    expect(await screen.findByText('MAN BANG TINH NHAP')).toBeTruthy();
    expect(screen.getByTestId('where').textContent).toBe('/office/calc/b2');
  });

  it('gộp nháp bảng tính và văn bản theo giờ sửa; bấm nháp văn bản mở màn Văn bản', async () => {
    h.drafts = [{ id: 'c1', title: 'Sổ cái', updatedAt: 1 }];
    h.writerDrafts = [
      { id: 'w1', title: 'Tờ trình', updatedAt: 5 },
      { id: 'w2', title: '', updatedAt: 3 },
    ];
    dung();
    const items = within(await screen.findByRole('list', { name: 'Gần đây' })).getAllByRole('listitem');
    expect(items.map((i) => i.textContent)).toEqual([
      expect.stringContaining('Tờ trình'),
      expect.stringContaining('Tài liệu không tên'),
      expect.stringContaining('Sổ cái'),
    ]);
    fireEvent.click(within(items[0]).getByRole('button', { name: /Mở Tờ trình/ }));
    expect(await screen.findByText('MAN VAN BAN NHAP')).toBeTruthy();
    expect(screen.getByTestId('where').textContent).toBe('/office/writer/w1');
  });

  it('Văn bản trống mở màn văn bản mới, và mở tệp .docx kèm tệp đó', async () => {
    dung();
    fireEvent.click(await screen.findByRole('button', { name: /Văn bản trống/ }));
    expect(await screen.findByText('MAN VAN BAN MOI')).toBeTruthy();
    cleanup();
    dung();
    const input = (await screen.findByLabelText('Mở văn bản', { selector: 'input' })) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'thu.docx')] } });
    expect(await screen.findByText('MAN VAN BAN MOI')).toBeTruthy();
    expect(screen.getByTestId('where').textContent).toBe('/office/writer+file');
  });

  it('Bảng tính trống mở màn bảng tính mới', async () => {
    dung();
    fireEvent.click(await screen.findByRole('button', { name: /Bảng tính trống/ }));
    expect(await screen.findByText('MAN BANG TINH MOI')).toBeTruthy();
  });

  it('mở tệp từ máy chuyển sang màn bảng tính kèm tệp đó', async () => {
    dung();
    const input = (await screen.findByLabelText('Mở bảng tính', { selector: 'input' })) as HTMLInputElement;
    const file = new File(['a,b'], 'so-lieu.csv', { type: 'text/csv' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(await screen.findByText('MAN BANG TINH MOI')).toBeTruthy();
    expect(screen.getByTestId('where').textContent).toBe('/office/calc+file');
  });

  it('xóa nháp: hỏi xác nhận rồi bỏ khỏi danh sách; không xác nhận thì giữ', async () => {
    h.drafts = [{ id: 'a1', title: 'Cần xóa', updatedAt: 1 }];
    dung();
    await screen.findByText('Cần xóa');
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    fireEvent.click(screen.getByRole('button', { name: /Xóa bản nháp: Cần xóa/ }));
    expect(h.deleted).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: /Xóa bản nháp: Cần xóa/ }));
    await waitFor(() => expect(h.deleted).toEqual(['a1']));
    await waitFor(() => expect(screen.queryByText('Cần xóa')).toBeNull());
  });
});

describe('tài liệu chung trên cổng Báo cáo', () => {
  const doc = (over: Record<string, unknown> = {}) => ({ id: 's1', title: 'Quỹ lương', ownerId: 'o', ownerName: 'Lan', role: 'editor', updatedAt: '2026-10-08T01:00:00Z', lastSeq: 3, ...over });

  it('liệt kê bảng tính chung kèm quyền và chủ; bấm vào thì mở đúng bảng tính chung', async () => {
    h.shared = [doc(), doc({ id: 's2', title: '', role: 'viewer', ownerName: '' })];
    dung();
    const items = within(await screen.findByRole('list', { name: 'Tài liệu chung' })).getAllByRole('listitem');
    expect(items[0].textContent).toContain('Quỹ lương');
    expect(items[0].textContent).toContain('của Lan');
    expect(items[0].textContent).toContain('Được sửa');
    expect(items[1].textContent).toContain('Chỉ xem');
    fireEvent.click(within(items[0]).getByRole('button', { name: /Mở Quỹ lương/ }));
    expect(await screen.findByText('MAN BANG TINH CHUNG')).toBeTruthy();
    expect(screen.getByTestId('where').textContent).toBe('/office/calc/shared/s1');
  });

  it('văn bản chung mở ở màn Văn bản, bảng tính chung mở ở màn Bảng tính, theo loại', async () => {
    h.shared = [doc({ id: 'w1', title: 'Công văn', kind: 'writer' }), doc({ id: 's1', title: 'Quỹ lương', kind: 'calc' }), doc({ id: 'w2', title: '', kind: 'writer' })];
    dung();
    const list = await screen.findByRole('list', { name: 'Tài liệu chung' });
    fireEvent.click(within(list).getByRole('button', { name: /Mở Công văn/ }));
    expect(await screen.findByText('MAN VAN BAN CHUNG')).toBeTruthy();
    expect(screen.getByTestId('where').textContent).toBe('/office/writer/shared/w1');
  });

  it('văn bản chung không có tên hiện tên mặc định của Văn bản, không phải của Bảng tính', async () => {
    h.shared = [doc({ id: 'w2', title: '', kind: 'writer' })];
    dung();
    const item = within(await screen.findByRole('list', { name: 'Tài liệu chung' })).getAllByRole('listitem')[0];
    expect(item.textContent).toContain('Tài liệu không tên');
  });

  it('chỉ chủ hoặc Master Admin thấy nút xóa; xóa phải xác nhận', async () => {
    h.shared = [doc({ role: 'owner' }), doc({ id: 's2', title: 'Của người khác', role: 'editor' })];
    dung();
    await screen.findByText('Quỹ lương');
    expect(screen.queryByRole('button', { name: /Xóa bản nháp: Của người khác/ })).toBeNull();
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole('button', { name: /Xóa bản nháp: Quỹ lương/ }));
    expect(h.deleted).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: /Xóa bản nháp: Quỹ lương/ }));
    await waitFor(() => expect(h.deleted).toEqual(['s1']));
  });

  it('lỗi khi nạp bảng tính chung hiện nguyên trong mục của nó, không che danh sách nháp trong trình duyệt', async () => {
    h.drafts = [{ id: 'a1', title: 'Nháp của tôi', updatedAt: 1 }];
    h.sharedError = 'Không đọc được danh sách bảng tính chung: máy chủ chưa có tính năng chia sẻ (cần áp migration 71 trên Supabase).';
    dung();
    expect((await screen.findAllByRole('alert')).map((a) => a.textContent).join(' ')).toContain('cần áp migration 71');
    expect(await screen.findByText('Nháp của tôi')).toBeTruthy();
  });

  it('chưa có tài liệu chung thì nói rõ, không nhầm với lỗi', async () => {
    dung();
    expect(await screen.findByText('Chưa có tài liệu chung nào.')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
