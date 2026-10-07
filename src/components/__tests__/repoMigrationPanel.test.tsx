// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { StorageRepo } from '../../types/storageRepo';
import { createFakeDrive } from '../../lib/drive/__tests__/fakeDrive';
import { MAX_MIGRATE_FILE_BYTES } from '../../lib/drive/driveMigration';

type Opts = { onBytes?: (n: number) => void; signal?: AbortSignal };
const h = vi.hoisted(() => ({
  ctx: null as unknown,
  listHf: vi.fn(),
  fetchHf: vi.fn(),
  switchRepo: vi.fn(),
  hold: false,
  releases: [] as Array<() => void>,
}));

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

import { RepoMigrationPanel } from '../storage/RepoMigrationPanel';
import { StorageReposSection } from '../storage/StorageReposSection';

const REPO: StorageRepo = { id: 5, name: 'Văn thư', repoId: 'Ying91/van-thu', provider: 'huggingface', folder: 'van-thu', kind: 'dispatch', assignedUserId: null, createdAt: '' };
const CONTENT: Record<string, string> = { 'van-thu/van-ban/1.pdf': 'MOT-MOT-MOT', 'van-thu/van-ban/2.pdf': 'HAI-HAI-HAI' };
const treeOf = (c: Record<string, string>) => [
  { type: 'directory', path: 'van-thu/van-ban', size: 0 },
  ...Object.entries(c).map(([path, text]) => ({ type: 'file', path, size: new TextEncoder().encode(text).length })),
];
const pathOf = (url: string) => decodeURIComponent(new URL(url).pathname.split('/resolve/main/')[1]);

let drive: ReturnType<typeof createFakeDrive>;
const onDone = vi.fn();
const onClose = vi.fn();
const open = (token = 'hf_t') => render(<RepoMigrationPanel repo={REPO} hfToken={token} onDone={onDone} onClose={onClose} />);
const writes = () => drive.requests.filter((r) => r.method !== 'GET');
const fileTable = () => screen.getByRole('table', { name: 'Tệp của repo' });
const ready = () => screen.findByRole('button', { name: 'Chuyển ngay' });
const start = async () => {
  const btn = await ready();
  await waitFor(() => expect((btn as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(btn);
};

beforeEach(() => {
  drive = createFakeDrive();
  h.ctx = drive.ctx;
  h.hold = false;
  h.releases = [];
  h.listHf.mockReset().mockResolvedValue(treeOf(CONTENT));
  h.fetchHf.mockReset().mockImplementation(async (url: string, _token: string, opts: Opts = {}) => {
    const text = CONTENT[pathOf(url)];
    const size = new TextEncoder().encode(text).length;
    opts.onBytes?.(Math.floor(size / 2));
    if (h.hold) {
      await new Promise<void>((resolve, reject) => {
        h.releases.push(resolve);
        opts.signal?.addEventListener('abort', () => reject(new DOMException('Đã hủy', 'AbortError')));
      });
    }
    opts.onBytes?.(size);
    return new Blob([text]);
  });
  h.switchRepo.mockReset().mockResolvedValue({ documents: 4, filesRemapped: 2, filesUnmapped: 1 });
  onDone.mockReset().mockResolvedValue(undefined);
  onClose.mockReset();
});
afterEach(cleanup);

describe('RepoMigrationPanel: mở ra là đọc nguồn và hiện kế hoạch', () => {
  it('không còn nút Chạy thử; tự đọc nguồn, hiện số tệp, dung lượng, thư mục; chưa ghi gì và chưa chép gì', async () => {
    open();
    const plan = await screen.findByRole('list', { name: 'Kế hoạch chuyển' });
    expect(within(plan).getByText(/2 tệp, .*, 1 thư mục/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Chạy thử' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Bắt đầu chuyển' })).toBeNull();
    expect(h.listHf).toHaveBeenCalledWith('Ying91/van-thu', 'van-thu', 'hf_t', true);
    expect(writes()).toHaveLength(0);
    expect(h.fetchHf).not.toHaveBeenCalled();
    expect(h.switchRepo).not.toHaveBeenCalled();
    expect(await ready()).toBeTruthy();
  });

  it('bảng liệt kê đủ tệp ở trạng thái Chờ, dung lượng và tiến độ chưa có', async () => {
    open();
    await ready();
    const rows = within(fileTable()).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('van-ban/1.pdf')).toBeTruthy();
    expect(within(rows[0]).getByText('Chờ')).toBeTruthy();
  });

  it('thiếu token Hugging Face: báo rõ, không đụng Hugging Face hay Drive, không có nút Chuyển ngay', async () => {
    open('');
    expect((await screen.findByRole('alert')).textContent).toContain('Chưa có token Hugging Face');
    expect(h.listHf).not.toHaveBeenCalled();
    expect(drive.requests).toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'Chuyển ngay' })).toBeNull();
  });

  it('có tệp quá lớn: cảnh báo và không cho chuyển', async () => {
    h.listHf.mockResolvedValue([{ type: 'file', path: 'van-thu/to.bin', size: MAX_MIGRATE_FILE_BYTES + 1 }]);
    open();
    expect((await screen.findByRole('alert')).textContent).toContain('1 tệp quá lớn');
    expect((screen.getByRole('button', { name: 'Chuyển ngay' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('thư mục đích đã có từ lần trước: báo trước và đánh dấu các tệp đã đủ dung lượng là Đã có sẵn', async () => {
    const dest = drive.seedFolder('Văn thư');
    const sub = drive.seedFolder('van-ban', dest.id);
    drive.seedFile('1.pdf', sub.id, 'MOT-MOT-MOT');
    open();
    const plan = await screen.findByRole('list', { name: 'Kế hoạch chuyển' });
    expect(within(plan).getByText(/Thư mục đích đã có/)).toBeTruthy();
    const rows = within(fileTable()).getAllByRole('row').slice(1);
    expect(within(rows[0]).getByText('Đã có sẵn')).toBeTruthy();
    expect(within(rows[1]).getByText('Chờ')).toBeTruthy();
    expect(writes()).toHaveLength(0);
  });

  it('là khung ngay trên trang, không phải hộp thoại; nút Đóng gọi onClose', async () => {
    open();
    await ready();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Chuyển Văn thư sang Google Drive' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('đang chép thì không đóng được và rời trang thì trình duyệt hỏi lại', async () => {
    h.hold = true;
    open();
    await start();
    await screen.findByRole('button', { name: 'Dừng chuyển' });
    expect(screen.queryByRole('button', { name: 'Đóng' })).toBeNull();
    const ev = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    h.releases.forEach((release) => release());
    await screen.findByText(/Đã chuyển sang Google Drive\./);
    const after = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(false);
  });

  it('rời trang (gỡ khung) giữa lúc chép thì dừng việc chép, không đổi repo', async () => {
    h.hold = true;
    const view = open();
    await start();
    await screen.findByRole('button', { name: 'Dừng chuyển' });
    view.unmount();
    await new Promise((r) => setTimeout(r, 50));
    expect(h.switchRepo).not.toHaveBeenCalled();
  });
});

describe('RepoMigrationPanel: chuyển', () => {
  it('Chuyển ngay: chép lên Drive đúng cấu trúc, mọi tệp Xong, gọi hàm đổi repo với mã tệp, báo xong và nạp lại', async () => {
    open();
    await start();

    const done = await screen.findByText(/Đã chuyển sang Google Drive\./);
    expect(done.textContent).toMatch(/4 văn bản được trỏ lại bằng mã tệp Drive; 1 tệp .* giữ nguyên\./);
    expect(done.textContent).toContain('Dữ liệu trên Hugging Face không bị xóa');

    const [repoId, destRoot, files] = h.switchRepo.mock.calls[0];
    expect(repoId).toBe(5);
    expect(drive.files.get(destRoot)!.name).toBe('Văn thư');
    expect((files as Array<{ from: string; path: string }>).map((f) => f.path).sort()).toEqual(['van-ban/1.pdf', 'van-ban/2.pdf']);
    for (const f of files as Array<{ fileId: string }>) expect(drive.files.has(f.fileId)).toBe(true);
    expect(onDone).toHaveBeenCalledTimes(1);

    const rows = within(fileTable()).getAllByRole('row').slice(1);
    for (const r of rows) {
      expect(within(r).getByText('Xong')).toBeTruthy();
      expect(within(r).getByText('100%')).toBeTruthy();
    }
    expect(screen.queryByRole('button', { name: 'Chuyển ngay' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Dừng chuyển' })).toBeNull();
    expect(screen.getByRole('progressbar', { name: 'Tiến độ chuyển' }).getAttribute('aria-valuenow')).toBe('100');
  });

  it('khi đang chạy: hiện các tệp đang chuyển kèm phần trăm và dung lượng, tốc độ tải xuống/tải lên, nút Dừng chuyển', async () => {
    h.hold = true;
    open();
    await start();

    const now = await screen.findByRole('region', { name: 'Tệp đang chuyển' });
    expect(within(now).getByRole('heading', { name: 'Đang chuyển (2)' })).toBeTruthy();
    expect(within(now).getByText('1.pdf')).toBeTruthy();
    expect(within(now).getAllByText(/Đang tải xuống \d+% · \d+(\.\d+)? B\/11 B|Đang tải xuống \d+%/).length).toBe(2);
    expect(screen.getByRole('button', { name: 'Dừng chuyển' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Chuyển ngay' })).toBeNull();
    expect(screen.getByText('Tải xuống').nextSibling?.textContent).toMatch(/\/s$/);
    expect(screen.getByText('Tải lên').nextSibling?.textContent).toMatch(/\/s$/);
    expect(within(fileTable()).getAllByText('Đang tải xuống')).toHaveLength(2);

    h.releases.forEach((release) => release());
    await screen.findByText(/Đã chuyển sang Google Drive\./);
  });

  it('Dừng chuyển: tệp đang chạy trở về Chờ (không phải lỗi), báo đã dừng và cho Chuyển ngay để chép tiếp; chưa đổi repo', async () => {
    h.hold = true;
    open();
    await start();
    fireEvent.click(await screen.findByRole('button', { name: 'Dừng chuyển' }));

    expect((await screen.findByRole('alert')).textContent).toMatch(/Đã dừng/);
    expect(await ready()).toBeTruthy();
    const rows = within(fileTable()).getAllByRole('row').slice(1);
    for (const r of rows) expect(within(r).getByText('Chờ')).toBeTruthy();
    expect(within(fileTable()).queryByText('Lỗi')).toBeNull();
    expect(h.switchRepo).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });
});

describe('RepoMigrationPanel: lỗi và thử lại', () => {
  const failSecond = (fail: { on: boolean }) =>
    h.fetchHf.mockImplementation(async (url: string, _t: string, opts: Opts = {}) => {
      if (fail.on && pathOf(url).endsWith('2.pdf')) throw new Error('Không thể tải tệp từ kho lưu trữ (500)');
      const text = CONTENT[pathOf(url)];
      opts.onBytes?.(new TextEncoder().encode(text).length);
      return new Blob([text]);
    });

  it('một tệp lỗi: dòng đó báo Lỗi kèm lý do, tệp kia vẫn Xong, chưa đổi repo; nút là Thử lại tệp lỗi', async () => {
    failSecond({ on: true });
    open();
    await start();

    const retry = await screen.findByRole('button', { name: 'Thử lại tệp lỗi' });
    expect(retry).toBeTruthy();
    const rows = within(fileTable()).getAllByRole('row').slice(1);
    expect(within(rows[0]).getByText('Xong')).toBeTruthy();
    expect(within(rows[1]).getByText('Lỗi')).toBeTruthy();
    expect(within(rows[1]).getByText(/Không thể tải tệp từ kho lưu trữ \(500\)/)).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toMatch(/1 tệp chưa chép được\. Chưa đổi gì trong hệ thống/);
    expect(h.switchRepo).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('Thử lại tệp lỗi: chỉ chép lại tệp lỗi (tệp xong không chép lại), rồi đổi repo', async () => {
    const fail = { on: true };
    failSecond(fail);
    open();
    await start();
    fireEvent.click(await screen.findByRole('button', { name: 'Thử lại tệp lỗi' }));
    fail.on = false;
    h.fetchHf.mockClear();
    failSecond(fail);

    await screen.findByText(/Đã chuyển sang Google Drive\./);
    expect(h.fetchHf.mock.calls.map((c) => pathOf(c[0] as string))).toEqual(['van-thu/van-ban/2.pdf']);
    const rows = within(fileTable()).getAllByRole('row').slice(1);
    for (const r of rows) expect(within(r).getByText('Xong')).toBeTruthy();
    expect(h.switchRepo).toHaveBeenCalledTimes(1);
  });

  it('bộ lọc Lỗi chỉ hiện các tệp lỗi; Tất cả hiện lại đủ', async () => {
    failSecond({ on: true });
    open();
    await start();
    await screen.findByRole('button', { name: 'Thử lại tệp lỗi' });

    fireEvent.click(screen.getByRole('tab', { name: /^Lỗi \(1\)$/ }));
    expect(within(fileTable()).getAllByRole('row').slice(1)).toHaveLength(1);
    expect(within(fileTable()).getByText('van-ban/2.pdf')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: /^Tất cả \(2\)$/ }));
    expect(within(fileTable()).getAllByRole('row').slice(1)).toHaveLength(2);
  });

  it('hàm đổi repo báo lỗi (chưa áp migration 69): hiện nguyên thông điệp, không báo xong, vẫn Chuyển ngay lại được', async () => {
    h.switchRepo.mockRejectedValue(new Error('Chưa áp migration 69_chuyen_repo_sang_drive.sql trên Supabase.'));
    open();
    await start();

    expect((await screen.findByRole('alert')).textContent).toContain('Chưa áp migration 69');
    expect(screen.queryByText(/Đã chuyển sang Google Drive/)).toBeNull();
    expect(onDone).not.toHaveBeenCalled();
    expect(await ready()).toBeTruthy();
  });
});

describe('nút chuyển trong danh sách repo', () => {
  const drv: StorageRepo = { ...REPO, id: 6, name: 'Kho chung', repoId: '1AbCdEfGhIjKlMnOpQrStUvWxYz012345', provider: 'drive', kind: 'shared', folder: '' };
  const auth = { token: 'hf_t', username: 'Ying91' };

  it('chỉ repo Hugging Face có nút chuyển; bấm gọi onMigrate với đúng repo', () => {
    const onMigrate = vi.fn();
    render(<StorageReposSection auth={auth} repos={[REPO, drv]} onChanged={vi.fn()} onMigrate={onMigrate} />);
    expect(screen.queryByRole('button', { name: 'Chuyển Kho chung sang Google Drive' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Chuyển Văn thư sang Google Drive' }));
    expect(onMigrate).toHaveBeenCalledWith(REPO);
  });

  it('không truyền onMigrate thì không có nút chuyển', () => {
    render(<StorageReposSection auth={auth} repos={[REPO]} onChanged={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /sang Google Drive/ })).toBeNull();
  });
});
