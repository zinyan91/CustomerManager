// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { StorageRepo } from '../../types/storageRepo';
import { createFakeDrive } from '../../lib/drive/__tests__/fakeDrive';

const h = vi.hoisted(() => ({ ctx: null as unknown, listRepos: vi.fn(), listHf: vi.fn() }));
vi.mock('../../lib/drive/driveToken', () => ({
  get driveContext() {
    return h.ctx;
  },
}));
vi.mock('../../lib/api/storageReposApi', () => ({ listStorageRepos: h.listRepos }));
vi.mock('../../lib/huggingface/hfClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/huggingface/hfClient')>()),
  listHfTree: h.listHf,
}));

import { HfFilePickerModal } from '../dispatch/HfFilePickerModal';

let drive: ReturnType<typeof createFakeDrive>;
let bm: ReturnType<typeof drive.seedFolder>;

const repo = (over: Partial<StorageRepo>): StorageRepo => ({
  id: 3, name: 'Biểu mẫu', repoId: 'X', provider: 'drive', folder: 'bo-qua', kind: 'form', assignedUserId: null, createdAt: '', ...over,
});

beforeEach(() => {
  drive = createFakeDrive();
  h.ctx = drive.ctx;
  bm = drive.seedFolder('Biểu mẫu');
  h.listRepos.mockReset().mockResolvedValue([repo({ repoId: bm.id })]);
  h.listHf.mockReset();
});
afterEach(cleanup);

const open = (onPick = vi.fn(), token = '') =>
  render(<HfFilePickerModal fileKind="bieu-mau" title="t" token={token} pickedKeys={new Set()} onPick={onPick} onClose={() => {}} />);

describe('HfFilePickerModal với kho Drive', () => {
  it('liệt kê tệp và thư mục của kho Drive mà không cần token Hugging Face', async () => {
    const d = drive.seedFolder('2026', bm.id);
    drive.seedFile('mau-01.docx', bm.id);
    drive.seedFile('mau-02.docx', d.id);
    open();

    expect(await screen.findByText('mau-01.docx')).toBeTruthy();
    expect(screen.getByText('2026')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(h.listHf).not.toHaveBeenCalled();
  });

  it('vào thư mục con rồi chọn tệp: trả kho, đường dẫn, tên và mã Drive', async () => {
    const d = drive.seedFolder('2026', bm.id);
    const f = drive.seedFile('mau-02.docx', d.id);
    const onPick = vi.fn();
    open(onPick);

    fireEvent.click(await screen.findByText('2026'));
    fireEvent.click(await screen.findByText('mau-02.docx'));
    expect(onPick).toHaveBeenCalledWith({ repoId: bm.id, path: '2026/mau-02.docx', name: 'mau-02.docx', fileId: f.id });
  });

  it('tệp Google Docs: giữ kiểu gốc để lần sau xuất ra Word đúng', async () => {
    const g = drive.seedFile('Mẫu soạn', bm.id, 'x', 'application/vnd.google-apps.document');
    const onPick = vi.fn();
    open(onPick);

    fireEvent.click(await screen.findByText('Mẫu soạn.docx'));
    expect(onPick).toHaveBeenCalledWith({
      repoId: bm.id, path: 'Mẫu soạn.docx', name: 'Mẫu soạn.docx', fileId: g.id, nativeMimeType: 'application/vnd.google-apps.document',
    });
  });

  it('thư mục gốc của kho không có trong Shared Drive thì báo lỗi nói rõ, không hiện kho rỗng', async () => {
    h.listRepos.mockResolvedValue([repo({ repoId: '1ZyXwVuTsRqPoNmLkJiHgFeDcBa98765' })]);
    open();
    expect((await screen.findByRole('alert')).textContent).toMatch(/Không tìm thấy thư mục gốc của kho/);
    expect(screen.queryByText('Thư mục trống.')).toBeNull();
  });

  it('Drive từ chối thì hiện thông điệp tiếng Việt', async () => {
    drive.failNext(/^GET \/drive\/v3\/files$/, new Response(JSON.stringify({ error: { code: 403, message: 'x', errors: [{ reason: 'insufficientFilePermissions' }] } }), { status: 403 }));
    open();
    expect((await screen.findByRole('alert')).textContent).toMatch(/không đủ quyền trong Shared Drive/);
  });

  it('kho Hugging Face vẫn cần token như cũ', async () => {
    h.listRepos.mockResolvedValue([repo({ provider: 'huggingface', repoId: 'o/bm', folder: '' })]);
    open(vi.fn(), '');
    expect((await screen.findByRole('alert')).textContent).toMatch(/Chưa cấu hình kho lưu trữ/);
    await waitFor(() => expect(h.listRepos).toHaveBeenCalled());
    expect(h.listHf).not.toHaveBeenCalled();
    expect(drive.requests).toHaveLength(0);
  });
});
