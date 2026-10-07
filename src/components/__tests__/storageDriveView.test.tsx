// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { Uint8ArrayReader, Uint8ArrayWriter, ZipReader } from '@zip.js/zip.js';
import type { StorageRepo } from '../../types/storageRepo';

const driveFetch = vi.hoisted(() => vi.fn());
vi.mock('../../lib/drive/driveToken', () => ({
  driveContext: {
    getAccess: async () => ({ accessToken: 'drive-tok', expiresAt: Date.now() + 3_600_000, access: 'write', driveId: 'DRV' }),
    invalidate: () => {},
    fetchFn: (...args: unknown[]) => driveFetch(...args),
    sleep: async () => {},
  },
}));

const state = vi.hoisted(() => ({ role: 'master_admin' as string, userId: 'u-a', archive: null as unknown }));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    role: state.role,
    user: { id: state.userId },
    can: (cap: string) => (cap === 'storage.configure' ? state.role === 'master_admin' : false),
  }),
}));
vi.mock('../../context/UserScopeContext', () => ({ useUserScope: () => ({ managedUsers: [] }) }));
vi.mock('../../hooks/useArchive', () => ({ useArchive: () => state.archive }));
vi.mock('../ai/AiChatDialog', () => ({ AiChatDialog: () => null }));
vi.mock('../dispatch/DispatchPreviewModal', () => ({ DispatchPreviewModal: () => null }));


import { StorageManagementView } from '../views/StorageManagementView';

const ROOT = '1AbCdEfGhIjKlMnOpQrStUvWxYz012345';
const repo = (over: Partial<StorageRepo>): StorageRepo => ({
  id: 1, name: 'Kho chung', repoId: 'own/chung', kind: 'shared', assignedUserId: null, createdAt: '', ...over,
});
const mk = (filePath: string, fileSize: number, extra: { fileId?: string; storageProvider?: string; repoId?: string } = {}) => {
  const i = filePath.lastIndexOf('/');
  const fileName = filePath.slice(i + 1);
  return {
    id: `d_${filePath}`, title: fileName, fileName, fileType: 'application/pdf', fileSize, filePath,
    folderPath: i === -1 ? '' : filePath.slice(0, i), documentType: 'khac', updatedAt: '2026-10-01T00:00:00Z', ...extra,
  };
};
const makeArchive = (over: Record<string, unknown> = {}) => {
  const shared = repo({});
  return {
    allRepos: [shared], repos: [shared], selectedRepo: shared, selectRepo: vi.fn(),
    driveRoot: null, driveEntries: [], driveWrite: false,
    documents: [], folders: [], status: { kind: 'ready' }, reload: vi.fn().mockResolvedValue(undefined), reloadRepos: vi.fn(), setDocuments: vi.fn(),
    ...over,
  };
};

const driveRepo = repo({ id: 7, repoId: ROOT });
const DOCS = [
  mk('goc.pdf', 5, { storageProvider: 'drive', fileId: 'ID-GOC', repoId: ROOT }),
  mk('VB/a.pdf', 30, { storageProvider: 'drive', fileId: 'ID-A', repoId: ROOT }),
  mk('VB/b.pdf', 10, { storageProvider: 'drive', fileId: 'ID-B', repoId: ROOT }),
];

const fetchMock = vi.fn();
const toolbar = () => screen.getByRole('toolbar', { name: 'Thao tác với mục đã chọn' });
const idOf = (call: unknown[]) => decodeURIComponent(new URL(String(call[0])).pathname.split('/files/')[1]);

function useDrive() {
  state.archive = makeArchive({ repos: [driveRepo], allRepos: [driveRepo], selectedRepo: driveRepo, driveRoot: ROOT, driveEntries: [], driveWrite: false, documents: DOCS, folders: ['VB'] });
}
function driveBytes() {
  driveFetch.mockImplementation(async (url: RequestInfo | URL) => {
    const doc = DOCS.find((d) => d.fileId === decodeURIComponent(new URL(String(url)).pathname.split('/files/')[1]));
    return doc ? new Response(new Uint8Array(doc.fileSize)) : new Response('', { status: 404 });
  });
}
function sink() {
  const chunks: Uint8Array[] = [];
  const events: string[] = [];
  const writable = new WritableStream<Uint8Array>({ write: (c) => void chunks.push(c), close: () => void events.push('close'), abort: () => void events.push('abort') });
  (window as unknown as { showSaveFilePicker: unknown }).showSaveFilePicker = vi.fn(async () => ({ createWritable: async () => writable }));
  const names = async () => {
    const bytes = new Uint8Array(chunks.reduce((n, c) => n + c.byteLength, 0));
    let o = 0;
    for (const c of chunks) { bytes.set(c, o); o += c.byteLength; }
    const reader = new ZipReader(new Uint8ArrayReader(bytes));
    const out: Record<string, number> = {};
    for (const e of await reader.getEntries()) {
      if (!e.directory) out[e.filename] = (await (e as unknown as { getData: (w: Uint8ArrayWriter) => Promise<Uint8Array> }).getData(new Uint8ArrayWriter())).byteLength;
    }
    await reader.close();
    return out;
  };
  return { events, names };
}

beforeEach(() => {
  state.role = 'master_admin';
  driveFetch.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  useDrive();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  delete (window as unknown as { showSaveFilePicker?: unknown }).showSaveFilePicker;
});

describe('Kho lưu trữ - kho Google Drive', () => {
  it('hiện tệp và thư mục của kho Drive; token chỉ đọc thì không có nút tải lên và nút xóa', () => {
    render(<StorageManagementView />);
    expect(within(screen.getByRole('table')).getByText('goc.pdf')).toBeTruthy();
    expect(within(screen.getByRole('table')).getByText('VB')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Tải lên tệp/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Xóa goc.pdf' })).toBeNull();
  });

  it('tải thư mục ZIP đọc từng tệp bằng mã tệp Drive kèm token, giữ cấu trúc', async () => {
    const out = sink();
    driveBytes();
    render(<StorageManagementView />);

    fireEvent.click(screen.getByRole('button', { name: 'Tải thư mục VB (ZIP)' }));
    await waitFor(() => expect(out.events).toEqual(['close']));

    expect(await out.names()).toEqual({ 'VB/a.pdf': 30, 'VB/b.pdf': 10 });
    expect(driveFetch.mock.calls.map(idOf).sort()).toEqual(['ID-A', 'ID-B']);
    expect((driveFetch.mock.calls[0][1] as { headers: Headers }).headers.get('Authorization')).toBe('Bearer drive-tok');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('tệp Drive bị xóa giữa chừng: báo rõ tên tệp, không chốt ZIP dở', async () => {
    const out = sink();
    driveFetch.mockImplementation(async () => new Response(JSON.stringify({ error: { code: 404, message: 'x', errors: [{ reason: 'notFound' }] } }), { status: 404 }));
    render(<StorageManagementView />);

    fireEvent.click(screen.getByRole('button', { name: 'Tải thư mục VB (ZIP)' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/Tải "VB\/a\.pdf" không được: không tìm thấy/);
    expect(out.events).toEqual(['abort']);
  });

  it('chọn nhiều mục rồi Tải về: nén một ZIP, mọi tệp lấy bằng mã tệp Drive', async () => {
    const out = sink();
    driveBytes();
    render(<StorageManagementView />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Chọn goc.pdf' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Chọn thư mục VB' }));
    fireEvent.click(within(toolbar()).getByRole('button', { name: 'Tải về' }));

    await waitFor(() => expect(out.events).toEqual(['close']));
    expect(Object.keys(await out.names()).sort()).toEqual(['Kho chung/VB/a.pdf', 'Kho chung/VB/b.pdf', 'Kho chung/goc.pdf']);
    expect(driveFetch.mock.calls.map(idOf).sort()).toEqual(['ID-A', 'ID-B', 'ID-GOC']);
  });
});
