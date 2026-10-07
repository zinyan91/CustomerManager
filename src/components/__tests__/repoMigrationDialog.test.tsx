// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { StorageRepo } from '../../types/storageRepo';
import { createFakeDrive } from '../../lib/drive/__tests__/fakeDrive';
import { MAX_MIGRATE_FILE_BYTES } from '../../lib/drive/driveMigration';

const h = vi.hoisted(() => ({ ctx: null as unknown, listHf: vi.fn(), fetchHf: vi.fn(), switchRepo: vi.fn() }));

vi.mock('../../lib/drive/driveToken', () => ({
  get driveContext() {
    return h.ctx;
  },
}));
vi.mock('../../lib/huggingface/hfClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/huggingface/hfClient')>()),
  listHfTree: h.listHf,
  fetchHfFileBlob: h.fetchHf,
}));
vi.mock('../../lib/api/storageMigrationApi', () => ({ switchRepoToDrive: h.switchRepo }));
vi.mock('../../context/UserScopeContext', () => ({ useUserScope: () => ({ managedUsers: [] }) }));
vi.mock('../../lib/api/storageReposApi', () => ({ createStorageRepo: vi.fn(), removeStorageRepo: vi.fn(), updateStorageRepo: vi.fn() }));

import { RepoMigrationDialog } from '../storage/RepoMigrationDialog';
import { StorageReposSection } from '../storage/StorageReposSection';

const REPO: StorageRepo = { id: 5, name: 'Văn thư', repoId: 'Ying91/van-thu', provider: 'huggingface', folder: 'van-thu', kind: 'dispatch', assignedUserId: null, createdAt: '' };
const CONTENT: Record<string, string> = { 'van-thu/van-ban/1.pdf': 'MOT', 'van-thu/van-ban/2.pdf': 'HAI-HAI' };
const treeOf = (c: Record<string, string>) => [
  { type: 'directory', path: 'van-thu/van-ban', size: 0 },
  ...Object.entries(c).map(([path, text]) => ({ type: 'file', path, size: new TextEncoder().encode(text).length })),
];

let drive: ReturnType<typeof createFakeDrive>;
const onDone = vi.fn();
const onClose = vi.fn();
const open = (token = 'hf_t') => render(<RepoMigrationDialog repo={REPO} hfToken={token} onDone={onDone} onClose={onClose} />);
const writes = () => drive.requests.filter((r) => r.method !== 'GET');

beforeEach(() => {
  drive = createFakeDrive();
  h.ctx = drive.ctx;
  h.listHf.mockReset().mockResolvedValue(treeOf(CONTENT));
  h.fetchHf.mockReset().mockImplementation(async (url: string) => {
    const path = decodeURIComponent(new URL(url).pathname.split('/resolve/main/')[1]);
    return new Blob([CONTENT[path]]);
  });
  h.switchRepo.mockReset().mockResolvedValue({ documents: 4, filesRemapped: 2, filesUnmapped: 1 });
  onDone.mockReset().mockResolvedValue(undefined);
  onClose.mockReset();
});
afterEach(cleanup);

describe('RepoMigrationDialog', () => {
  it('Chạy thử chỉ đếm: hiện số tệp, dung lượng, thư mục; không ghi gì lên Drive hay CSDL', async () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Chạy thử' }));

    const list = await screen.findByRole('list', { name: 'Kết quả chạy thử' });
    expect(within(list).getByText(/2 tệp, .*, 1 thư mục/)).toBeTruthy();
    expect(h.listHf).toHaveBeenCalledWith('Ying91/van-thu', 'van-thu', 'hf_t', true);
    expect(writes()).toHaveLength(0);
    expect(h.fetchHf).not.toHaveBeenCalled();
    expect(h.switchRepo).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Bắt đầu chuyển' })).toBeTruthy();
  });

  it('chưa chạy thử thì chưa có nút Bắt đầu chuyển', () => {
    open();
    expect(screen.queryByRole('button', { name: 'Bắt đầu chuyển' })).toBeNull();
  });

  it('Bắt đầu chuyển: chép tệp lên Drive đúng cấu trúc, đối chiếu, gọi hàm đổi repo với mã tệp, báo xong và nạp lại', async () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Chạy thử' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Bắt đầu chuyển' }));

    const done = await screen.findByText(/Đã chuyển sang Google Drive\./);
    expect(done.textContent).toMatch(/Đã chuyển sang Google Drive\. 4 văn bản được trỏ lại bằng mã tệp Drive; 1 tệp .* giữ nguyên\./);
    expect(done.textContent).toContain('Dữ liệu trên Hugging Face không bị xóa');

    const [repoId, destRoot, files] = h.switchRepo.mock.calls[0];
    expect(repoId).toBe(5);
    expect(drive.files.get(destRoot)!.name).toBe('Văn thư');
    expect((files as Array<{ from: string; path: string; fileId: string }>).map((f) => [f.from, f.path]).sort()).toEqual([
      ['van-thu/van-ban/1.pdf', 'van-ban/1.pdf'], ['van-thu/van-ban/2.pdf', 'van-ban/2.pdf'],
    ]);
    for (const f of files as Array<{ fileId: string }>) expect(drive.files.has(f.fileId)).toBe(true);
    expect(onDone).toHaveBeenCalledTimes(1);
    // Nút "Đóng" ở cuối thay cho "Hủy" khi đã xong (cùng dấu X của khung), và không còn Chạy thử
    expect(screen.queryByRole('button', { name: 'Hủy' })).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Đóng' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Chạy thử' })).toBeNull();
  });

  it('chép lỗi một tệp: báo rõ tệp nào, KHÔNG đổi repo trong CSDL, không nạp lại', async () => {
    h.fetchHf.mockImplementation(async (url: string) => {
      if (url.includes('2.pdf')) throw new Error('Không thể tải tệp từ kho lưu trữ (500)');
      return new Blob(['MOT']);
    });
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Chạy thử' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Bắt đầu chuyển' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/1 tệp chưa chép được\. Chưa đổi gì trong hệ thống/);
    expect(alert.textContent).toContain('van-thu/van-ban/2.pdf: Không thể tải tệp từ kho lưu trữ (500)');
    expect(h.switchRepo).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
    // Chạy thử lại được để chép tiếp
    expect(screen.getByRole('button', { name: 'Chạy thử' })).toBeTruthy();
  });

  it('hàm đổi repo báo lỗi (chưa áp migration 69): hiện nguyên thông điệp, không báo xong', async () => {
    h.switchRepo.mockRejectedValue(new Error('Chưa áp migration 69_chuyen_repo_sang_drive.sql trên Supabase.'));
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Chạy thử' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Bắt đầu chuyển' }));

    expect((await screen.findByRole('alert')).textContent).toContain('Chưa áp migration 69');
    expect(screen.queryByText(/Đã chuyển sang Google Drive/)).toBeNull();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('thiếu token Hugging Face: báo rõ, không đụng Hugging Face hay Drive', async () => {
    open('');
    fireEvent.click(screen.getByRole('button', { name: 'Chạy thử' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Chưa có token Hugging Face');
    expect(h.listHf).not.toHaveBeenCalled();
    expect(drive.requests).toHaveLength(0);
  });

  it('có tệp quá lớn: cảnh báo và không cho bắt đầu chuyển', async () => {
    h.listHf.mockResolvedValue([{ type: 'file', path: 'van-thu/to.bin', size: MAX_MIGRATE_FILE_BYTES + 1 }]);
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Chạy thử' }));
    expect((await screen.findByRole('alert')).textContent).toContain('1 tệp quá lớn');
    expect((screen.getByRole('button', { name: 'Bắt đầu chuyển' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('thư mục đích đã có từ lần chạy trước: báo số tệp đã đủ dung lượng sẽ không chép lại', async () => {
    const dest = drive.seedFolder('Văn thư');
    const sub = drive.seedFolder('van-ban', dest.id);
    drive.seedFile('1.pdf', sub.id, 'MOT');
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Chạy thử' }));
    const list = await screen.findByRole('list', { name: 'Kết quả chạy thử' });
    expect(within(list).getByText(/Thư mục đích đã có; 1 tệp đã đủ dung lượng sẽ không chép lại/)).toBeTruthy();
    expect(writes()).toHaveLength(0);
  });

  it('Hủy đóng hộp thoại khi chưa chạy', () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('nút chuyển trong danh sách repo', () => {
  const drv: StorageRepo = { ...REPO, id: 6, name: 'Kho chung', repoId: '1AbCdEfGhIjKlMnOpQrStUvWxYz012345', provider: 'drive', kind: 'shared', folder: '' };

  it('chỉ repo Hugging Face có nút chuyển; bấm mở hộp thoại của đúng repo', async () => {
    render(<StorageReposSection auth={{ token: 'hf_t', username: 'Ying91' }} repos={[REPO, drv]} onChanged={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Chuyển Kho chung sang Google Drive' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Chuyển Văn thư sang Google Drive' }));
    expect(await screen.findByRole('heading', { name: 'Chuyển Văn thư sang Google Drive' })).toBeTruthy();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Chạy thử' })).toBeTruthy());
  });
});
