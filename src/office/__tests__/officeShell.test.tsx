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
            <Route path="calc/:draftId" element={<div>MAN BANG TINH NHAP</div>} />
            <Route path="writer" element={<div>MAN VAN BAN MOI</div>} />
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
    const list = await screen.findByRole('list');
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
    const items = within(await screen.findByRole('list')).getAllByRole('listitem');
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
