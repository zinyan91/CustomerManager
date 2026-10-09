// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { StorageRepo } from '../../types/storageRepo';
import type { DriveFile } from '../../lib/drive/driveTypes';

const m = vi.hoisted(() => ({ listRepos: vi.fn(), listDrive: vi.fn(), access: vi.fn() }));

vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ role: 'master_admin', user: { id: 'u1' } }) }));
vi.mock('../../lib/api/storageReposApi', () => ({ listStorageRepos: m.listRepos }));
vi.mock('../../lib/drive/driveToken', () => ({ driveContext: { marker: 'ctx', getAccess: m.access } }));
vi.mock('../../lib/drive/driveClient', () => ({ listDriveFiles: m.listDrive }));

import { DriveApiError } from '../../lib/drive/driveErrors';
import { readCachedEntries, writeCachedEntries } from '../../lib/drive/driveEntriesCache';
import { useArchive } from '../useArchive';

const ROOT = '1AbCdEfGhIjKlMnOpQrStUvWxYz012345';
const repo = (over: Partial<StorageRepo>): StorageRepo => ({
  id: 1, name: 'Kho chung', repoId: ROOT, kind: 'shared', assignedUserId: null, createdAt: '', ...over,
});
const dfile = (id: string, name: string, parents: string[], mimeType = 'application/pdf'): DriveFile => ({
  id, name, mimeType, size: 100, parents, modifiedTime: '2026-10-07T00:00:00Z', createdTime: '2026-10-01T00:00:00Z',
});
const FOLDER = 'application/vnd.google-apps.folder';

beforeEach(() => {
  localStorage.clear();
  Object.values(m).forEach((f) => f.mockReset());
  m.access.mockResolvedValue({ accessToken: 't', expiresAt: Date.now() + 3_600_000, access: 'write', driveId: 'DRV' });
  m.listRepos.mockResolvedValue([repo({})]);
  m.listDrive.mockResolvedValue([dfile(ROOT, 'Gốc', ['DRV'], FOLDER), dfile('F1', 'VB', [ROOT], FOLDER), dfile('A', 'a.pdf', ['F1']), dfile('G', 'goc.pdf', [ROOT])]);
});
afterEach(cleanup);

describe('useArchive', () => {
  it('nạp cây từ Shared Drive: tài liệu có mã tệp, thư mục kể cả rỗng', async () => {
    const { result } = renderHook(() => useArchive('storage'));
    await waitFor(() => expect(result.current.status.kind).toBe('ready'));
    expect(result.current.documents.map((d) => [d.filePath, d.storageProvider, d.fileId])).toEqual([['goc.pdf', 'drive', 'G'], ['VB/a.pdf', 'drive', 'A']]);
    expect(result.current.folders).toEqual(['VB']);
    expect(m.listDrive).toHaveBeenCalledWith(expect.objectContaining({ marker: 'ctx' }));
  });

  it('đưa ra mã thư mục gốc, các mục kèm mã Drive và quyền ghi để màn Kho thao tác', async () => {
    const { result } = renderHook(() => useArchive('storage'));
    await waitFor(() => expect(result.current.status.kind).toBe('ready'));
    expect(result.current.driveRoot).toBe(ROOT);
    expect(result.current.driveWrite).toBe(true);
    expect(result.current.driveEntries.map((e) => [e.path, e.id, e.isFolder]).sort()).toEqual([['VB', 'F1', true], ['VB/a.pdf', 'A', false], ['goc.pdf', 'G', false]]);
  });

  it('token chỉ có quyền đọc thì driveWrite là false', async () => {
    m.access.mockResolvedValue({ accessToken: 't', expiresAt: Date.now() + 3_600_000, access: 'read', driveId: 'DRV' });
    const { result } = renderHook(() => useArchive('storage'));
    await waitFor(() => expect(result.current.status.kind).toBe('ready'));
    expect(result.current.driveWrite).toBe(false);
  });

  it('lấy quyền thất bại thì báo lỗi, không coi là chỉ đọc rồi im lặng', async () => {
    m.access.mockRejectedValue(new Error('Chưa đặt secret GDRIVE_SA_EMAIL cho Edge Function drive-token.'));
    const { result } = renderHook(() => useArchive('storage'));
    await waitFor(() => expect(result.current.status.kind).toBe('error'));
    expect(result.current.driveEntries).toEqual([]);
    expect(result.current.driveWrite).toBe(false);
  });

  it('thư mục gốc của kho không có trong Shared Drive thì báo lỗi nói rõ, không hiện kho rỗng', async () => {
    m.listRepos.mockResolvedValue([repo({ repoId: '1ZyXwVuTsRqPoNmLkJiHgFeDcBa98765' })]);
    const { result } = renderHook(() => useArchive('storage'));
    await waitFor(() => expect(result.current.status.kind).toBe('error'));
    expect((result.current.status as { message: string }).message).toMatch(/Không tìm thấy thư mục gốc của kho/);
    expect(result.current.documents).toEqual([]);
  });

  it('Drive trả lỗi 403 thì thông điệp tiếng Việt về quyền của tài khoản dịch vụ', async () => {
    m.listDrive.mockRejectedValue(new DriveApiError(403, 'forbidden', 'x'));
    const { result } = renderHook(() => useArchive('storage'));
    await waitFor(() => expect(result.current.status.kind).toBe('error'));
    expect((result.current.status as { message: string }).message).toMatch(/Quản lý nội dung/);
  });

  it('lỗi từ Edge Function (chưa đặt secret) hiện nguyên thông điệp', async () => {
    m.listDrive.mockRejectedValue(new Error('Chưa đặt secret GDRIVE_SA_EMAIL cho Edge Function drive-token.'));
    const { result } = renderHook(() => useArchive('storage'));
    await waitFor(() => expect(result.current.status.kind).toBe('error'));
    expect((result.current.status as { message: string }).message).toBe('Chưa đặt secret GDRIVE_SA_EMAIL cho Edge Function drive-token.');
  });

  it('Shared Drive rỗng nhưng có thư mục gốc thì là kho rỗng hợp lệ', async () => {
    m.listDrive.mockResolvedValue([dfile(ROOT, 'Gốc', ['DRV'], FOLDER)]);
    const { result } = renderHook(() => useArchive('storage'));
    await waitFor(() => expect(result.current.status.kind).toBe('ready'));
    expect(result.current.documents).toEqual([]);
  });
});

describe('useArchive: không có kho', () => {
  it('nạp xong thì lưu danh sách vào máy theo tài khoản và kho, kèm quyền ghi', async () => {
    const { result } = renderHook(() => useArchive('storage'));
    await waitFor(() => expect(result.current.status.kind).toBe('ready'));
    await waitFor(() => expect(result.current.refreshing).toBe(false));
    const cached = readCachedEntries('u1', ROOT);
    expect(cached?.write).toBe(true);
    expect(cached?.entries.map((e) => e.path).sort()).toEqual(['VB', 'VB/a.pdf', 'goc.pdf']);
    expect(result.current.loadedAt).toBe(cached?.savedAt);
  });

  it('mở lần sau: hiện ngay bản đã lưu trong máy khi Drive còn chưa trả lời, rồi thay bằng bản mới', async () => {
    const first = renderHook(() => useArchive('storage'));
    await waitFor(() => expect(first.result.current.status.kind).toBe('ready'));
    await waitFor(() => expect(first.result.current.refreshing).toBe(false));
    first.unmount();

    let release: (files: DriveFile[]) => void = () => {};
    m.listDrive.mockReturnValue(new Promise<DriveFile[]>((resolve) => (release = resolve)));
    const { result } = renderHook(() => useArchive('storage'));
    await waitFor(() => expect(result.current.status.kind).toBe('ready'));
    expect(result.current.documents.map((d) => d.filePath).sort()).toEqual(['VB/a.pdf', 'goc.pdf']);
    expect(result.current.driveWrite).toBe(true);
    expect(result.current.refreshing).toBe(true);

    release([dfile(ROOT, 'Gốc', ['DRV'], FOLDER), dfile('M', 'moi.pdf', [ROOT])]);
    await waitFor(() => expect(result.current.refreshing).toBe(false));
    expect(result.current.documents.map((d) => d.filePath)).toEqual(['moi.pdf']);
    expect(result.current.refreshError).toBeNull();
  });

  it('có bản đã lưu mà lấy bản mới lỗi: giữ danh sách cũ, báo lỗi riêng, không xóa trắng', async () => {
    writeCachedEntries('u1', ROOT, { entries: [{ id: 'X', name: 'cu.pdf', path: 'cu.pdf', isFolder: false, size: 5, modifiedTime: '', mimeType: 'application/pdf', nativeMimeType: '' }], write: false });
    m.listDrive.mockRejectedValue(new DriveApiError(403, 'forbidden', 'x'));
    const { result } = renderHook(() => useArchive('storage'));
    await waitFor(() => expect(result.current.refreshError).toMatch(/Quản lý nội dung/));
    expect(result.current.status.kind).toBe('ready');
    expect(result.current.documents.map((d) => d.filePath)).toEqual(['cu.pdf']);
    expect(result.current.refreshing).toBe(false);
  });

  it('làm mới khi đang hiện danh sách: không chuyển lại sang "đang tải", số tệp cập nhật', async () => {
    const { result } = renderHook(() => useArchive('storage'));
    await waitFor(() => expect(result.current.status.kind).toBe('ready'));
    await waitFor(() => expect(result.current.refreshing).toBe(false));
    m.listDrive.mockResolvedValue([dfile(ROOT, 'Gốc', ['DRV'], FOLDER), dfile('A', 'a.pdf', [ROOT]), dfile('B', 'b.pdf', [ROOT])]);
    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.reload();
    });
    expect(result.current.status.kind).toBe('ready');
    await act(() => pending);
    expect(result.current.documents).toHaveLength(2);
  });

  it('không có repo nào thì báo chưa có repo, không gọi Drive', async () => {
    m.listRepos.mockResolvedValue([]);
    const { result } = renderHook(() => useArchive('storage'));
    await waitFor(() => expect(result.current.status.kind).toBe('no_repo'));
    expect(result.current.driveRoot).toBeNull();
    expect(m.listDrive).not.toHaveBeenCalled();
  });
});
