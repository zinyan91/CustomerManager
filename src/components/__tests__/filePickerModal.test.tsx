// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { StorageRepo } from '../../types/storageRepo';
import { createFakeDrive } from '../../lib/drive/__tests__/fakeDrive';

const h = vi.hoisted(() => ({ ctx: null as unknown, listRepos: vi.fn() }));
vi.mock('../../lib/drive/driveToken', () => ({
  get driveContext() {
    return h.ctx;
  },
}));
vi.mock('../../lib/api/storageReposApi', () => ({ listStorageRepos: h.listRepos }));

import { FilePickerModal } from '../dispatch/FilePickerModal';

let drive: ReturnType<typeof createFakeDrive>;
let bm: ReturnType<typeof drive.seedFolder>;

const repo = (over: Partial<StorageRepo>): StorageRepo => ({
  id: 3, name: 'Biểu mẫu', repoId: 'X', kind: 'form', assignedUserId: null, createdAt: '', ...over,
});

beforeEach(() => {
  drive = createFakeDrive();
  h.ctx = drive.ctx;
  bm = drive.seedFolder('Biểu mẫu');
  h.listRepos.mockReset().mockResolvedValue([repo({ repoId: bm.id })]);
});
afterEach(cleanup);

const open = (onPick = vi.fn(), fileKind: 'goc' | 'bieu-mau' = 'bieu-mau') =>
  render(<FilePickerModal fileKind={fileKind} title="t" pickedKeys={new Set()} onPick={onPick} onClose={() => {}} />);

describe('FilePickerModal', () => {
  it('liệt kê tệp và thư mục của kho', async () => {
    const d = drive.seedFolder('2026', bm.id);
    drive.seedFile('mau-01.docx', bm.id);
    drive.seedFile('mau-02.docx', d.id);
    open();

    expect(await screen.findByText('mau-01.docx')).toBeTruthy();
    expect(screen.getByText('2026')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
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

  it('tệp gốc: chỉ mở kho Văn thư, không đụng Kho chung hay kho Biểu mẫu', async () => {
    const vt = drive.seedFolder('Văn thư');
    const chung = drive.seedFolder('Kho chung');
    drive.seedFile('van-ban.pdf', vt.id);
    drive.seedFile('chung.pdf', chung.id);
    drive.seedFile('mau-01.docx', bm.id);
    h.listRepos.mockResolvedValue([repo({ id: 1, kind: 'shared', repoId: chung.id }), repo({ id: 2, kind: 'dispatch', repoId: vt.id }), repo({ repoId: bm.id })]);
    open(vi.fn(), 'goc');

    expect(await screen.findByText('van-ban.pdf')).toBeTruthy();
    expect(screen.getByRole('dialog', { name: 'Chọn tệp từ kho Văn thư' })).toBeTruthy();
    expect(screen.queryByText('chung.pdf')).toBeNull();
    expect(screen.queryByText('mau-01.docx')).toBeNull();
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  it('biểu mẫu: chỉ mở kho Biểu mẫu', async () => {
    const vt = drive.seedFolder('Văn thư');
    drive.seedFile('van-ban.pdf', vt.id);
    drive.seedFile('mau-01.docx', bm.id);
    h.listRepos.mockResolvedValue([repo({ id: 2, kind: 'dispatch', repoId: vt.id }), repo({ repoId: bm.id })]);
    open();

    expect(await screen.findByText('mau-01.docx')).toBeTruthy();
    expect(screen.getByRole('dialog', { name: 'Chọn tệp từ kho Biểu mẫu' })).toBeTruthy();
    expect(screen.queryByText('van-ban.pdf')).toBeNull();
  });

  it('chưa có kho Biểu mẫu thì nói rõ và không gọi Drive', async () => {
    h.listRepos.mockResolvedValue([repo({ id: 1, kind: 'shared' }), repo({ id: 2, kind: 'dispatch' })]);
    open();
    expect((await screen.findByRole('alert')).textContent).toMatch(/Chưa có kho Biểu mẫu\. Liên hệ Master Admin để tạo kho Biểu mẫu/);
    await waitFor(() => expect(h.listRepos).toHaveBeenCalled());
    expect(drive.requests).toHaveLength(0);
  });

  it('chưa có kho Văn thư thì nói rõ cho tệp gốc', async () => {
    h.listRepos.mockResolvedValue([repo({ id: 1, kind: 'shared' })]);
    open(vi.fn(), 'goc');
    expect((await screen.findByRole('alert')).textContent).toMatch(/Chưa có kho Văn thư/);
    expect(drive.requests).toHaveLength(0);
  });
});
