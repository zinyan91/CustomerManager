// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const h = vi.hoisted(() => ({
  versions: [] as Array<{ id: number; seq: number; label: string; createdBy: string; createdAt: string }>,
  fail: null as null | Error,
  reads: 0,
  data: null as unknown,
  viewError: null as null | Error,
  viewed: [] as number[],
}));

vi.mock('../collab/collabApi', () => ({
  listInvitableUsers: async () => [{ id: 'u2', fullName: 'Bình' }],
  getVersionData: async (_doc: string, versionId: number) => {
    h.viewed.push(versionId);
    if (h.viewError) throw h.viewError;
    return h.data;
  },
  listVersions: async () => {
    h.reads += 1;
    if (h.fail) throw h.fail;
    return h.versions;
  },
}));

import { Workbook } from '../calc/model/workbook';
import { LanguageProvider } from '../../context/LanguageContext';
import { HistoryPanel } from '../collab/HistoryPanel';
import { VersionPreview } from '../collab/VersionPreview';

const v = (id: number, label: string, by: string) => ({ id, seq: id, label, createdBy: by, createdAt: '2026-10-09T01:00:00Z' });

function dung(over: Partial<React.ComponentProps<typeof HistoryPanel>> = {}) {
  const props = { docId: 'd1', canWrite: true, me: { id: 'u1', name: 'Lan' }, renderPreview: (p: { versionId: number; name: string; onClose: () => void }) => <VersionPreview docId="d1" versionId={p.versionId} name={p.name} onClose={p.onClose} />, onSave: vi.fn(async () => {}), onRestore: vi.fn(async () => {}), onClose: vi.fn(), ...over };
  render(
    <LanguageProvider>
      <HistoryPanel {...props} />
    </LanguageProvider>,
  );
  return props;
}

beforeEach(() => {
  h.versions = [];
  h.fail = null;
  h.reads = 0;
  h.viewed = [];
  h.viewError = null;
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ngăn Lịch sử', () => {
  it('liệt kê mốc kèm tên mốc (hoặc "không tên"), người lưu và giờ', async () => {
    h.versions = [v(3, 'Chốt quý 3', 'u2'), v(2, '', 'u1')];
    dung();
    const items = within(await screen.findByRole('list')).getAllByRole('listitem');
    expect(items[0].textContent).toContain('Chốt quý 3');
    expect(items[0].textContent).toContain('Bình');
    expect(items[1].textContent).toContain('(mốc không tên)');
    expect(items[1].textContent).toContain('Lan');
  });

  it('lưu mốc: gửi tên đã cắt khoảng trắng, xóa ô nhập và nạp lại danh sách', async () => {
    const props = dung();
    await screen.findByText(/Chưa có mốc nào/);
    fireEvent.change(screen.getByLabelText('Tên mốc (có thể để trống)'), { target: { value: '  Trước họp  ' } });
    h.versions = [v(1, 'Trước họp', 'u1')];
    fireEvent.click(screen.getByRole('button', { name: 'Lưu mốc' }));
    await waitFor(() => expect(props.onSave).toHaveBeenCalledWith('Trước họp'));
    expect(await screen.findByText('Trước họp')).toBeTruthy();
    expect((screen.getByLabelText('Tên mốc (có thể để trống)') as HTMLInputElement).value).toBe('');
    expect(h.reads).toBe(2);
  });

  it('khôi phục: hỏi xác nhận (không đồng ý thì không làm gì), đồng ý thì gọi với đúng mốc', async () => {
    h.versions = [v(5, 'Mốc 5', 'u1')];
    const props = dung();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    const button = await screen.findByRole('button', { name: 'Khôi phục: Mốc 5' });
    fireEvent.click(button);
    expect(props.onRestore).not.toHaveBeenCalled();
    fireEvent.click(button);
    await waitFor(() => expect(props.onRestore).toHaveBeenCalledWith(5));
    expect(confirm.mock.calls[1][0]).toContain('Trước khi khôi phục');
  });

  it('người chỉ xem: thấy danh sách nhưng không có ô lưu mốc và không có nút khôi phục', async () => {
    h.versions = [v(5, 'Mốc 5', 'u1')];
    dung({ canWrite: false });
    await screen.findByText('Mốc 5');
    expect(screen.queryByRole('button', { name: 'Lưu mốc' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Khôi phục/ })).toBeNull();
  });

  it('lỗi khi lưu hoặc khôi phục hiện nguyên trong ngăn, danh sách giữ nguyên', async () => {
    h.versions = [v(5, 'Mốc 5', 'u1')];
    dung({ onRestore: vi.fn(async () => { throw new Error('Tài liệu đã có 50 mốc, không lưu thêm được.'); }) });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click(await screen.findByRole('button', { name: 'Khôi phục: Mốc 5' }));
    expect((await screen.findByRole('alert')).textContent).toContain('50 mốc');
    expect(screen.getByText('Mốc 5')).toBeTruthy();
  });

  it('lỗi tải danh sách không bị nhầm với "chưa có mốc nào"', async () => {
    h.fail = new Error('Không đọc được danh sách mốc: mất mạng');
    dung();
    expect((await screen.findByRole('alert')).textContent).toContain('mất mạng');
    expect(screen.queryByText(/Chưa có mốc nào/)).toBeNull();
  });
});

describe('xem trước một mốc', () => {
  it('không truyền cách dựng xem trước thì không có nút Xem', async () => {
    h.versions = [v(5, 'Mốc 5', 'u1')];
    dung({ renderPreview: undefined });
    await screen.findByText('Mốc 5');
    expect(screen.queryByRole('button', { name: /^Xem:/ })).toBeNull();
  });

  const blank = () => new Workbook().toData();

  it('Xem mở hộp chỉ đọc đúng mốc, người chỉ xem cũng xem được, Escape đóng', async () => {
    h.versions = [v(5, 'Mốc 5', 'u1')];
    h.data = blank();
    dung({ canWrite: false });
    fireEvent.click(await screen.findByRole('button', { name: 'Xem: Mốc 5' }));
    const dialog = await screen.findByRole('dialog', { name: 'Xem mốc: Mốc 5' });
    expect(h.viewed).toEqual([5]);
    await within(dialog).findByRole('tab', { name: 'Sheet1' });
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('lỗi đọc mốc hiện nguyên trong hộp và không có lưới', async () => {
    h.versions = [v(5, 'Mốc 5', 'u1')];
    h.viewError = new Error('Không đọc được nội dung mốc: mất mạng');
    dung();
    fireEvent.click(await screen.findByRole('button', { name: 'Xem: Mốc 5' }));
    const dialog = await screen.findByRole('dialog');
    expect((await within(dialog).findByRole('alert')).textContent).toContain('mất mạng');
    expect(within(dialog).queryByRole('tab')).toBeNull();
  });
});
