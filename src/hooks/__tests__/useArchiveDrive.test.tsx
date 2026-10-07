// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import type { StorageRepo } from '../../types/storageRepo';
import type { DriveFile } from '../../lib/drive/driveTypes';

const m = vi.hoisted(() => ({ listRepos: vi.fn(), hfAuth: vi.fn(), listDrive: vi.fn(), listHf: vi.fn(), access: vi.fn() }));

vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ role: 'master_admin', user: { id: 'u1' } }) }));
vi.mock('../../lib/api/storageReposApi', () => ({ listStorageRepos: m.listRepos }));
vi.mock('../../lib/huggingface/hfConfigApi', () => ({ fetchHfAuth: m.hfAuth }));
vi.mock('../../lib/huggingface/hfClient', async (importOriginal) => ({ ...(await importOriginal<object>()), listHfTree: m.listHf }));
vi.mock('../../lib/drive/driveToken', () => ({ driveContext: { marker: 'ctx', getAccess: m.access } }));
vi.mock('../../lib/drive/driveClient', () => ({ listDriveFiles: m.listDrive }));

import { DriveApiError } from '../../lib/drive/driveErrors';
import { useArchive } from '../useArchive';

const ROOT = '1AbCdEfGhIjKlMnOpQrStUvWxYz012345';
const repo = (over: Partial<StorageRepo>): StorageRepo => ({
  id: 1, name: 'Kho chung', repoId: ROOT, provider: 'drive', folder: '', kind: 'shared', assignedUserId: null, createdAt: '', ...over,
});
const dfile = (id: string, name: string, parents: string[], mimeType = 'application/pdf'): DriveFile => ({
  id, name, mimeType, size: 100, parents, modifiedTime: '2026-10-07T00:00:00Z', createdTime: '2026-10-01T00:00:00Z',
});
const FOLDER = 'application/vnd.google-apps.folder';

beforeEach(() => {
  Object.values(m).forEach((f) => f.mockReset());
  m.hfAuth.mockResolvedValue(null);
  m.access.mockResolvedValue({ accessToken: 't', expiresAt: Date.now() + 3_600_000, access: 'write', driveId: 'DRV' });
  m.listRepos.mockResolvedValue([repo({})]);
  m.listDrive.mockResolvedValue([dfile(ROOT, 'Gốc', ['DRV'], FOLDER), dfile('F1', 'VB', [ROOT], FOLDER), dfile('A', 'a.pdf', ['F1']), dfile('G', 'goc.pdf', [ROOT])]);
});
afterEach(cleanup);

describe('useArchive với kho Google Drive', () => {
  it('nạp cây từ Shared Drive: tài liệu có mã tệp, thư mục kể cả rỗng; không cần token Hugging Face', async () => {
    const { result } = renderHook(() => useArchive('storage'));
    await waitFor(() => expect(result.current.status.kind).toBe('ready'));
    expect(result.current.isDrive).toBe(true);
    expect(result.current.config).toBeNull();
    expect(result.current.documents.map((d) => [d.filePath, d.storageProvider, d.fileId])).toEqual([['goc.pdf', 'drive', 'G'], ['VB/a.pdf', 'drive', 'A']]);
    expect(result.current.folders).toEqual(['VB']);
    expect(m.listDrive).toHaveBeenCalledWith(expect.objectContaining({ marker: 'ctx' }));
    expect(m.listHf).not.toHaveBeenCalled();
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

describe('useArchive giữ hành vi cũ với Hugging Face', () => {
  const HF = repo({ repoId: 'own/chung', provider: 'huggingface' });

  it('chưa có token Hugging Face thì vẫn báo chưa cấu hình', async () => {
    m.listRepos.mockResolvedValue([HF]);
    const { result } = renderHook(() => useArchive('storage'));
    await waitFor(() => expect(result.current.status.kind).toBe('not_configured'));
    expect(result.current.isDrive).toBe(false);
  });

  it('có token thì đọc cây từ Hugging Face, không gọi Drive', async () => {
    m.listRepos.mockResolvedValue([HF]);
    m.hfAuth.mockResolvedValue({ token: 'hf_t' });
    m.listHf.mockResolvedValue([{ path: 'a.pdf', name: 'a.pdf', type: 'file', size: 5, downloadUrl: 'u', lastModified: null }]);
    const { result } = renderHook(() => useArchive('storage'));
    await waitFor(() => expect(result.current.status.kind).toBe('ready'));
    expect(result.current.documents.map((d) => d.storageProvider)).toEqual(['huggingface']);
    expect(result.current.config).toMatchObject({ repoId: 'own/chung', token: 'hf_t' });
    expect(m.listDrive).not.toHaveBeenCalled();
  });

  it('có repo Drive thì không đòi token Hugging Face dù chưa cấu hình', async () => {
    const { result } = renderHook(() => useArchive('storage'));
    await waitFor(() => expect(result.current.status.kind).toBe('ready'));
    expect(m.hfAuth).toHaveBeenCalled();
  });

  it('không có repo nào và chưa có token: vẫn báo chưa cấu hình như cũ', async () => {
    m.listRepos.mockResolvedValue([]);
    const { result } = renderHook(() => useArchive('storage'));
    await waitFor(() => expect(result.current.status.kind).toBe('not_configured'));
  });
});
