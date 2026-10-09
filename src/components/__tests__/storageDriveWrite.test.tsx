// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import type { StorageRepo } from '../../types/storageRepo';
import { createFakeDrive } from '../../lib/drive/__tests__/fakeDrive';
import { listDriveFiles } from '../../lib/drive/driveClient';
import { buildRepoEntries, listingOf } from '../../lib/drive/driveTree';
import { entriesToDocuments } from '../../lib/drive/driveDocuments';

const h = vi.hoisted(() => ({ ctx: null as unknown, role: 'master_admin' as string, archive: null as unknown }));

vi.mock('../../lib/drive/driveToken', () => ({
  get driveContext() {
    return h.ctx;
  },
}));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ role: h.role, user: { id: 'u-a' }, can: () => false }),
}));
vi.mock('../../context/UserScopeContext', () => ({ useUserScope: () => ({ managedUsers: [] }) }));
vi.mock('../../hooks/useArchive', () => ({ useArchive: () => h.archive }));
vi.mock('../ai/AiChatDialog', () => ({ AiChatDialog: () => null }));
vi.mock('../dispatch/DispatchPreviewModal', () => ({ DispatchPreviewModal: () => null }));

import { StorageManagementView } from '../views/StorageManagementView';

type Fake = ReturnType<typeof createFakeDrive>;
let drive: Fake;
let rootId: string;
let reload: ReturnType<typeof vi.fn>;

/** Kho mẫu: Kho/{goc.pdf, VB/{a.pdf, b.pdf}, Rong/}. `seed` gieo thêm dữ liệu trước khi chụp danh sách cho màn hình. */
async function mount(write = true, seed?: (d: Fake, rootId: string) => void) {
  drive = createFakeDrive();
  h.ctx = drive.ctx;
  const root = drive.seedFolder('Kho');
  rootId = root.id;
  const vb = drive.seedFolder('VB', root.id);
  drive.seedFolder('Rong', root.id);
  drive.seedFile('goc.pdf', root.id, 'GOC');
  drive.seedFile('a.pdf', vb.id, 'AAA');
  drive.seedFile('b.pdf', vb.id, 'BBBB');
  seed?.(drive, root.id);

  const entries = buildRepoEntries(await listDriveFiles(drive.ctx), root.id);
  const repo: StorageRepo = { id: 7, name: 'Kho chung', repoId: root.id, kind: 'shared', assignedUserId: null, createdAt: '' };
  reload = vi.fn().mockResolvedValue(undefined);
  h.archive = {
    auth: null, allRepos: [repo], repos: [repo], selectedRepo: repo, isDrive: true, driveRoot: root.id, driveEntries: entries, driveWrite: write,
    selectRepo: vi.fn(), config: null, documents: entriesToDocuments(entries, root.id, '2026-10-08T00:00:00Z'), folders: listingOf(entries).folders,
    status: { kind: 'ready' }, reload, reloadRepos: vi.fn(), setDocuments: vi.fn(),
  };
  drive.requests.length = 0;
  return render(<StorageManagementView />);
}

const row = (name: string) => within(screen.getByRole('table')).getByText(name).closest('tr') as HTMLElement;
const toolbar = () => screen.getByRole('toolbar', { name: 'Thao tác với mục đã chọn' });
const writes = () => drive.requests.filter((r) => r.method !== 'GET');
const live = (name: string) => drive.byName(name).filter((f) => drive.live(f.id));
const menuItem = (name: string) => screen.getByRole('menuitem', { name });

beforeEach(() => {
  h.role = 'master_admin';
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Kho Google Drive: quyền', () => {
  it('có quyền ghi: hiện nút tải lên và nút xóa', async () => {
    await mount(true);
    expect(screen.getByRole('button', { name: /Tải lên tệp/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Xóa goc.pdf' })).toBeTruthy();
  });

  it('token chỉ đọc: không có nút tải lên, xóa, đổi tên, di chuyển, thư mục mới', async () => {
    await mount(false);
    expect(screen.queryByRole('button', { name: /Tải lên tệp/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Xóa goc.pdf' })).toBeNull();
    fireEvent.contextMenu(row('goc.pdf'));
    expect(screen.getByRole('menuitem', { name: 'Sao chép' })).toBeTruthy();
    for (const name of ['Đổi tên', 'Di chuyển', 'Xóa']) expect(screen.queryByRole('menuitem', { name })).toBeNull();
  });

  it('người dùng thường không được xóa trong Kho chung dù token có quyền ghi', async () => {
    h.role = 'user';
    await mount(true);
    expect(screen.queryByRole('button', { name: 'Xóa goc.pdf' })).toBeNull();
    expect(screen.getByRole('button', { name: /Tải lên tệp/ })).toBeTruthy();
  });
});

describe('Kho Google Drive: tải lên', () => {
  it('chọn tệp thì tải lên gốc kho đúng nội dung rồi nạp lại danh sách', async () => {
    await mount();
    const input = screen.getByLabelText('Chọn tệp để tải lên') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['Xin chào'], 'moi.pdf', { type: 'application/pdf' })] } });

    await waitFor(() => expect(reload).toHaveBeenCalled());
    const created = live('moi.pdf');
    expect(created).toHaveLength(1);
    expect(created[0].parents).toEqual([rootId]);
    expect(new TextDecoder().decode(created[0].bytes)).toBe('Xin chào');
  });

  it('tệp trùng tên tệp đã có: hỏi trước; chọn giữ cả hai thì lên với tên mới, tệp cũ còn nguyên', async () => {
    await mount();
    const input = screen.getByLabelText('Chọn tệp để tải lên') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['MOI-DAI-HON'], 'goc.pdf', { type: 'application/pdf' })] } });

    expect(await screen.findByText('1 tệp trùng tên trong thư mục này')).toBeTruthy();
    expect(live('goc-2.pdf')).toHaveLength(0);
    fireEvent.click(screen.getByLabelText(/Giữ cả hai/));
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));

    await waitFor(() => expect(live('goc-2.pdf')).toHaveLength(1));
    expect(new TextDecoder().decode(live('goc.pdf')[0].bytes)).toBe('GOC');
  });

  it('tệp trùng tên và cùng dung lượng: mặc định bỏ qua, không tạo thêm tệp nào, báo đã bỏ qua', async () => {
    await mount();
    const input = screen.getByLabelText('Chọn tệp để tải lên') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['MOI'], 'goc.pdf', { type: 'application/pdf' })] } });

    await screen.findByText('1 tệp trùng tên trong thư mục này');
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));

    expect(await screen.findByText(/Đã bỏ qua 1 tệp trùng tên/)).toBeTruthy();
    expect(live('goc-2.pdf')).toHaveLength(0);
    expect(live('goc.pdf')).toHaveLength(1);
  });

  it('chọn Ghi đè: nội dung tệp cũ được thay, vẫn một tệp cùng mã, không tạo goc-2.pdf', async () => {
    await mount();
    const before = live('goc.pdf')[0].id;
    const input = screen.getByLabelText('Chọn tệp để tải lên') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['NOI-DUNG-MOI-DAI'], 'goc.pdf', { type: 'application/pdf' })] } });

    await screen.findByText('1 tệp trùng tên trong thư mục này');
    fireEvent.click(screen.getByLabelText('Ghi đè'));
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));

    await waitFor(() => expect(new TextDecoder().decode(live('goc.pdf')[0].bytes)).toBe('NOI-DUNG-MOI-DAI'));
    expect(live('goc.pdf')).toHaveLength(1);
    expect(live('goc.pdf')[0].id).toBe(before);
    expect(live('goc-2.pdf')).toHaveLength(0);
  });

  it('hủy ở hộp tệp trùng: không tải gì', async () => {
    await mount();
    const input = screen.getByLabelText('Chọn tệp để tải lên') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['MOI'], 'goc.pdf', { type: 'application/pdf' })] } });

    await screen.findByText('1 tệp trùng tên trong thư mục này');
    fireEvent.click(screen.getByRole('button', { name: 'Hủy tải lên' }));
    await waitFor(() => expect(screen.queryByText('1 tệp trùng tên trong thư mục này')).toBeNull());
    expect(live('goc-2.pdf')).toHaveLength(0);
  });

  it('tải vào thư mục đang mở', async () => {
    await mount();
    fireEvent.click(within(screen.getByRole('table')).getByRole('button', { name: 'VB' }));
    const input = screen.getByLabelText('Chọn tệp để tải lên') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'c.pdf', { type: 'application/pdf' })] } });

    await waitFor(() => expect(live('c.pdf')).toHaveLength(1));
    expect(live('c.pdf')[0].parents).toEqual([live('VB')[0].id]);
  });

  it('Drive từ chối (hết dung lượng): hiện thông điệp tiếng Việt, không nạp lại vì chưa có tệp nào lên', async () => {
    await mount();
    drive.failNext(/^POST \/upload\/drive\/v3\/files$/, new Response(JSON.stringify({ error: { code: 403, message: 'x', errors: [{ reason: 'storageQuotaExceeded' }] } }), { status: 403 }));
    const input = screen.getByLabelText('Chọn tệp để tải lên') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'moi.pdf', { type: 'application/pdf' })] } });

    expect(await screen.findByText(/Shared Drive đã hết dung lượng/)).toBeTruthy();
    expect(reload).not.toHaveBeenCalled();
  });
});

describe('Kho Google Drive: thư mục mới', () => {
  it('chuột phải vùng trống, đặt tên, tạo thư mục thật trong thư mục đang mở', async () => {
    await mount();
    // Chân bảng không có menu riêng nên sự kiện nổi lên khung thả, chính là vùng trống của danh sách
    fireEvent.contextMenu(screen.getByText(/TỔNG CỘNG/));
    fireEvent.click(menuItem('Thư mục mới'));

    fireEvent.change(screen.getByLabelText('Tên thư mục'), { target: { value: 'Hồ sơ 2026' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo thư mục' }));

    await waitFor(() => expect(live('Hồ sơ 2026')).toHaveLength(1));
    expect(live('Hồ sơ 2026')[0].parents).toEqual([rootId]);
    expect(reload).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('trùng tên thì báo ngay trong hộp thoại, hộp thoại còn mở, không gọi Google', async () => {
    await mount();
    fireEvent.contextMenu(row('VB'));
    fireEvent.click(menuItem('Thư mục mới'));
    fireEvent.change(screen.getByLabelText('Tên thư mục'), { target: { value: 'a.pdf' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo thư mục' }));

    expect((await screen.findByRole('alert')).textContent).toBe('Đã có mục tên "a.pdf" ở thư mục này.');
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(writes()).toHaveLength(0);
  });

  it('từ menu của một thư mục thì tạo bên trong thư mục đó', async () => {
    await mount();
    fireEvent.contextMenu(row('VB'));
    fireEvent.click(menuItem('Thư mục mới'));
    fireEvent.change(screen.getByLabelText('Tên thư mục'), { target: { value: 'Con' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo thư mục' }));

    await waitFor(() => expect(live('Con')).toHaveLength(1));
    expect(live('Con')[0].parents).toEqual([live('VB')[0].id]);
  });
});

describe('Kho Google Drive: đổi tên', () => {
  it('đổi tên tệp trên Drive và nạp lại danh sách', async () => {
    await mount();
    fireEvent.contextMenu(row('goc.pdf'));
    fireEvent.click(menuItem('Đổi tên'));
    const input = screen.getByLabelText('Tên mới') as HTMLInputElement;
    expect(input.value).toBe('goc.pdf');
    fireEvent.change(input, { target: { value: 'Công văn 01.pdf' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu tên' }));

    await waitFor(() => expect(live('Công văn 01.pdf')).toHaveLength(1));
    expect(live('goc.pdf')).toHaveLength(0);
    expect(reload).toHaveBeenCalled();
  });

  it('tên trùng mục khác thì báo trong hộp thoại, không đổi gì', async () => {
    await mount();
    fireEvent.contextMenu(row('VB'));
    fireEvent.click(menuItem('Đổi tên'));
    fireEvent.change(screen.getByLabelText('Tên mới'), { target: { value: 'Rong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu tên' }));

    expect((await screen.findByRole('alert')).textContent).toBe('Đã có mục tên "Rong" ở thư mục này.');
    expect(live('VB')).toHaveLength(1);
    expect(writes()).toHaveLength(0);
  });

  it('chỉ có mục Đổi tên khi chọn đúng một mục', async () => {
    await mount();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Chọn goc.pdf' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Chọn thư mục VB' }));
    fireEvent.contextMenu(row('goc.pdf'));
    expect(screen.queryByRole('menuitem', { name: 'Đổi tên' })).toBeNull();
    expect(screen.getByRole('menuitem', { name: 'Di chuyển' })).toBeTruthy();
  });
});

describe('Kho Google Drive: di chuyển', () => {
  it('chọn thư mục đích rồi di chuyển; thư mục đích không gồm chính thư mục đang chuyển', async () => {
    await mount();
    fireEvent.contextMenu(row('VB'));
    fireEvent.click(menuItem('Di chuyển'));

    const group = screen.getByRole('radiogroup', { name: 'Thư mục đích' });
    expect(within(group).queryByRole('radio', { name: 'VB' })).toBeNull();
    expect(within(group).getByRole('radio', { name: 'Gốc' })).toBeTruthy();
    const submit = screen.getByRole('button', { name: 'Di chuyển vào đây' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);

    fireEvent.click(within(group).getByRole('radio', { name: 'Rong' }));
    fireEvent.click(submit);

    await waitFor(() => expect(live('VB')[0].parents).toEqual([live('Rong')[0].id]));
    expect(reload).toHaveBeenCalled();
  });

  it('chuyển cả nhóm đã chọn từ thanh công cụ, về gốc kho', async () => {
    await mount();
    // Chuyển a.pdf (ở VB) về gốc
    fireEvent.click(within(screen.getByRole('table')).getByRole('button', { name: 'VB' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Chọn a.pdf' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Chọn b.pdf' }));
    fireEvent.click(within(toolbar()).getByRole('button', { name: 'Di chuyển' }));
    fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Thư mục đích' })).getByRole('radio', { name: 'Gốc' }));
    fireEvent.click(screen.getByRole('button', { name: 'Di chuyển vào đây' }));

    await waitFor(() => expect(live('a.pdf')[0].parents).toEqual([rootId]));
    expect(live('b.pdf')[0].parents).toEqual([rootId]);
  });

  it('đích đã có mục cùng tên thì báo trong hộp thoại và không di chuyển', async () => {
    await mount(true, (d, root) => d.seedFile('a.pdf', root));
    fireEvent.contextMenu(row('a.pdf'));
    fireEvent.click(menuItem('Di chuyển'));
    fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Thư mục đích' })).getByRole('radio', { name: 'VB' }));
    fireEvent.click(screen.getByRole('button', { name: 'Di chuyển vào đây' }));

    expect((await screen.findByRole('alert')).textContent).toBe('Thư mục đích đã có mục tên "a.pdf".');
    expect(writes()).toHaveLength(0);
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});

describe('Kho Google Drive: xóa vào thùng rác', () => {
  it('nút xóa của tệp: hỏi xác nhận rồi đưa vào thùng rác, không xóa vĩnh viễn', async () => {
    await mount();
    fireEvent.click(screen.getByRole('button', { name: 'Xóa goc.pdf' }));

    await waitFor(() => expect(drive.byName('goc.pdf')[0].trashed).toBe(true));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Xóa tệp "goc.pdf"?'));
    expect(drive.requests.some((r) => r.method === 'DELETE')).toBe(false);
    expect(reload).toHaveBeenCalled();
  });

  it('không xác nhận thì không đụng tới Drive', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await mount();
    fireEvent.click(screen.getByRole('button', { name: 'Xóa goc.pdf' }));
    await Promise.resolve();
    expect(writes()).toHaveLength(0);
    expect(reload).not.toHaveBeenCalled();
  });

  it('menu của thư mục: xác nhận nói rõ xóa cả nội dung, thư mục và tệp bên trong vào thùng rác', async () => {
    await mount();
    fireEvent.contextMenu(row('VB'));
    fireEvent.click(menuItem('Xóa'));

    await waitFor(() => expect(drive.byName('VB')[0].trashed).toBe(true));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Xóa thư mục "VB" cùng toàn bộ nội dung bên trong?'));
    expect(drive.live(drive.byName('a.pdf')[0].id)).toBe(false);
  });

  it('chọn nhiều mục rồi Xóa trên thanh công cụ: một câu hỏi cho cả nhóm', async () => {
    await mount();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Chọn goc.pdf' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Chọn thư mục Rong' }));
    fireEvent.click(within(toolbar()).getByRole('button', { name: 'Xóa' }));

    await waitFor(() => expect(drive.byName('goc.pdf')[0].trashed).toBe(true));
    expect(drive.byName('Rong')[0].trashed).toBe(true);
    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Xóa 2 mục đã chọn?'));
  });

  it('Drive từ chối (không đủ quyền): hiện thông điệp tiếng Việt, không im lặng', async () => {
    await mount();
    drive.failNext(/^PATCH \/drive\/v3\/files\//, new Response(JSON.stringify({ error: { code: 403, message: 'x', errors: [{ reason: 'insufficientFilePermissions' }] } }), { status: 403 }));
    fireEvent.click(screen.getByRole('button', { name: 'Xóa goc.pdf' }));

    expect((await screen.findByRole('alert')).textContent).toMatch(/Xóa không được: tài khoản dịch vụ không đủ quyền/);
  });
});

describe('Kho Google Drive: sao chép và dán trong cùng Drive', () => {
  it('dán vào một thư mục: Google tự sao chép, tệp không tải về trình duyệt, bản gốc còn', async () => {
    await mount();
    fireEvent.contextMenu(row('goc.pdf'));
    fireEvent.click(menuItem('Sao chép'));
    fireEvent.contextMenu(row('Rong'));
    fireEvent.click(menuItem('Dán vào "Rong"'));

    await waitFor(() => expect(live('goc.pdf')).toHaveLength(2));
    const copy = live('goc.pdf').find((f) => f.parents[0] === live('Rong')[0].id)!;
    expect(new TextDecoder().decode(copy.bytes)).toBe('GOC');
    expect(drive.requests.some((r) => r.url.includes('alt=media') || r.url.includes('/upload/'))).toBe(false);
    expect(reload).toHaveBeenCalled();
  });

  it('dán thư mục: tạo lại cấu trúc thư mục ở đích và chép mọi tệp bên trong', async () => {
    await mount();
    fireEvent.contextMenu(row('VB'));
    fireEvent.click(menuItem('Sao chép'));
    fireEvent.contextMenu(row('Rong'));
    fireEvent.click(menuItem('Dán vào "Rong"'));

    await waitFor(() => expect(live('a.pdf')).toHaveLength(2));
    expect(live('b.pdf')).toHaveLength(2);
    const newVb = live('VB').find((f) => f.parents[0] === live('Rong')[0].id)!;
    expect(live('a.pdf').some((f) => f.parents[0] === newVb.id)).toBe(true);
  });

  it('dán vào chính thư mục nguồn thì đổi tên thành -2, không ghi đè', async () => {
    await mount();
    fireEvent.contextMenu(row('goc.pdf'));
    fireEvent.click(menuItem('Sao chép'));
    fireEvent.click(within(toolbar()).getByRole('button', { name: 'Dán vào thư mục này' }));

    await waitFor(() => expect(live('goc-2.pdf')).toHaveLength(1));
    expect(live('goc.pdf')).toHaveLength(1);
  });

  it('lỗi giữa chừng: báo số tệp đã chép và tệp lỗi', async () => {
    await mount();
    drive.failNext(/\/copy$/, new Response(JSON.stringify({ error: { code: 404, message: 'x', errors: [{ reason: 'notFound' }] } }), { status: 404 }));
    fireEvent.contextMenu(row('goc.pdf'));
    fireEvent.click(menuItem('Sao chép'));
    fireEvent.contextMenu(row('Rong'));
    fireEvent.click(menuItem('Dán vào "Rong"'));

    expect((await screen.findByRole('alert')).textContent).toMatch(/Sao chép được 0\/1 tệp\. Lỗi ở "Rong\/goc\.pdf": Sao chép "goc\.pdf" không được: không tìm thấy/);
  });
});
