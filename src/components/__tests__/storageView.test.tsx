// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { Uint8ArrayReader, Uint8ArrayWriter, ZipReader } from '@zip.js/zip.js';
import type { StorageRepo } from '../../types/storageRepo';

const state = vi.hoisted(() => ({
  role: 'user' as string,
  userId: 'u-a',
  archive: null as unknown,
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    role: state.role,
    user: { id: state.userId },
    can: (cap: string) => {
      const granted: Record<string, string[]> = {
        'storage.configure': ['master_admin'],
        'storage.delete': ['master_admin', 'user_admin'],
      };
      return (granted[cap] ?? []).includes(state.role);
    },
  }),
}));
vi.mock('../../context/UserScopeContext', () => ({ useUserScope: () => ({ managedUsers: [] }) }));
vi.mock('../../hooks/useArchive', () => ({ useArchive: () => state.archive }));
vi.mock('../ai/AiChatDialog', () => ({ AiChatDialog: () => null }));
vi.mock('../dispatch/DispatchPreviewModal', () => ({ DispatchPreviewModal: () => null }));
vi.mock('../storage/StorageSettingsModal', () => ({
  StorageSettingsModal: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div>MODAL CẤU HÌNH</div> : null),
}));

const commit = vi.hoisted(() => vi.fn());
vi.mock('@huggingface/hub', () => ({ commit, createRepo: vi.fn() }));

import { StorageManagementView } from '../views/StorageManagementView';

const repo = (over: Partial<StorageRepo>): StorageRepo => ({
  id: 1, name: 'Kho chung', repoId: 'own/chung', folder: '', kind: 'shared', assignedUserId: null, createdAt: '', ...over,
});

const makeArchive = (over: Record<string, unknown> = {}) => {
  const shared = repo({});
  return {
    auth: { token: 'hf_t', username: 'own' },
    allRepos: [shared],
    repos: [shared],
    selectedRepo: shared,
    selectRepo: vi.fn(),
    config: { token: 'hf_t', repoId: 'own/chung', folder: '', isPrivate: true },
    documents: [],
    folders: [],
    status: { kind: 'ready' },
    reload: vi.fn().mockResolvedValue(undefined),
    reloadRepos: vi.fn(),
    setDocuments: vi.fn(),
    ...over,
  };
};

beforeEach(() => {
  state.role = 'user';
  state.userId = 'u-a';
  state.archive = makeArchive();
  commit.mockReset();
});
afterEach(cleanup);

describe('Kho lưu trữ - giao diện', () => {
  it('tiêu đề chỉ là "Kho lưu trữ", không còn nhãn quyền hay chữ Hugging Face/Dataset Repo', () => {
    render(<StorageManagementView />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Kho lưu trữ');
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/Quyền Người dùng|Upload & Download|Master Admin|User Admin|Dataset Repo|Hugging Face/);
  });

  it('không còn tooltip (thuộc tính title) ở bất kỳ phần tử nào', () => {
    state.role = 'master_admin';
    render(<StorageManagementView />);
    expect(document.querySelectorAll('[title]')).toHaveLength(0);
  });

  it('user thường không thấy nút cấu hình lẫn biểu tượng khóa', () => {
    render(<StorageManagementView />);
    expect(screen.queryByRole('button', { name: 'Cấu hình kho lưu trữ' })).toBeNull();
  });

  it('Master Admin thấy nút cấu hình và mở được modal', () => {
    state.role = 'master_admin';
    render(<StorageManagementView />);
    fireEvent.click(screen.getByRole('button', { name: 'Cấu hình kho lưu trữ' }));
    expect(screen.getByText('MODAL CẤU HÌNH')).toBeTruthy();
  });

  it('User Admin không thấy cấu hình nhưng được thấy nút xóa tệp', () => {
    state.role = 'user_admin';
    state.archive = makeArchive({
      documents: [{ id: 'hf_1', title: 'a.pdf', fileName: 'a.pdf', fileType: 'application/pdf', fileSize: 10, filePath: 'a.pdf', folderPath: '', documentType: 'khac', updatedAt: '2026-10-01T00:00:00Z' }],
    });
    render(<StorageManagementView />);
    expect(screen.queryByRole('button', { name: 'Cấu hình kho lưu trữ' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Xóa a.pdf' })).toBeTruthy();
  });

  it('user chỉ xóa được trong kho cá nhân của mình, không xóa ở Kho chung', () => {
    const doc = { id: 'hf_1', title: 'a.pdf', fileName: 'a.pdf', fileType: 'application/pdf', fileSize: 10, filePath: 'a.pdf', folderPath: '', documentType: 'khac', updatedAt: '2026-10-01T00:00:00Z' };
    state.archive = makeArchive({ documents: [doc] });
    const { unmount } = render(<StorageManagementView />);
    expect(screen.queryByRole('button', { name: 'Xóa a.pdf' })).toBeNull();
    unmount();

    const mine = repo({ id: 2, name: 'Kho A', kind: 'personal', assignedUserId: 'u-a', repoId: 'own/a' });
    state.archive = makeArchive({ documents: [doc], repos: [repo({}), mine], selectedRepo: mine, config: { token: 'hf_t', repoId: 'own/a', folder: '' } });
    render(<StorageManagementView />);
    expect(screen.getByRole('button', { name: 'Xóa a.pdf' })).toBeTruthy();
  });

  it('có nút tải lên tệp và tải lên thư mục khi được phép; thư mục dùng webkitdirectory', () => {
    render(<StorageManagementView />);
    expect(screen.getByRole('button', { name: /Tải lên tệp/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Tải lên thư mục/ })).toBeTruthy();
    const folderInput = screen.getByLabelText('Chọn thư mục để tải lên');
    expect(folderInput.hasAttribute('webkitdirectory')).toBe(true);
    expect(screen.getByLabelText('Chọn tệp để tải lên').hasAttribute('webkitdirectory')).toBe(false);
  });

  it('chưa cấu hình: user được bảo liên hệ Master Admin và không có nút tải lên', () => {
    state.archive = makeArchive({ status: { kind: 'not_configured' }, config: null, selectedRepo: null, repos: [] });
    render(<StorageManagementView />);
    expect(screen.getByRole('alert').textContent).toMatch(/Liên hệ Master Admin/);
    expect(screen.queryByRole('button', { name: /Tải lên tệp/ })).toBeNull();
  });

  it('user chỉ thấy repo mà useArchive trả về, đánh dấu kho đang chọn', () => {
    const mine = repo({ id: 2, name: 'Kho A', kind: 'personal', assignedUserId: 'u-a', repoId: 'own/a' });
    state.archive = makeArchive({ repos: [repo({}), mine], selectedRepo: mine });
    render(<StorageManagementView />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Kho chung', 'Kho của tôi']);
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
  });

  it('thả tệp vào vùng danh sách thì commit lên đúng dataset rồi nạp lại', async () => {
    commit.mockResolvedValue({});
    const archive = makeArchive();
    state.archive = archive;
    render(<StorageManagementView />);

    const zone = screen.getByText(/Thư mục này chưa có tệp tin nào/).closest('.custom-scrollbar')!;
    const f = new File(['x'], 'nen.zip');
    const entry = { isFile: true, isDirectory: false, name: 'nen.zip', file: (ok: (f: File) => void) => ok(f) };
    fireEvent.drop(zone, {
      dataTransfer: {
        types: ['Files'],
        items: [{ kind: 'file', webkitGetAsEntry: () => entry, getAsFile: () => f }],
        files: [f],
      },
    });

    await waitFor(() => expect(commit).toHaveBeenCalledTimes(1));
    const arg = commit.mock.calls[0][0];
    expect(arg.repo).toEqual({ type: 'dataset', name: 'own/chung' });
    expect(arg.operations[0].path).toBe('nen.zip');
    await waitFor(() => expect((archive as { reload: ReturnType<typeof vi.fn> }).reload).toHaveBeenCalled());
  });

  it('không có quyền tải lên (kho cá nhân của người khác) thì thả tệp không gọi HF', async () => {
    const other = repo({ id: 3, name: 'Kho B', kind: 'personal', assignedUserId: 'u-b', repoId: 'own/b' });
    state.archive = makeArchive({ repos: [repo({}), other], selectedRepo: other, config: { token: 'hf_t', repoId: 'own/b', folder: '' } });
    render(<StorageManagementView />);
    expect(screen.queryByRole('button', { name: /Tải lên tệp/ })).toBeNull();

    const zone = screen.getByText(/Thư mục này chưa có tệp tin nào/).closest('.custom-scrollbar')!;
    const f = new File(['x'], 'a.pdf');
    fireEvent.drop(zone, { dataTransfer: { types: ['Files'], items: [], files: [f] } });
    await new Promise((r) => setTimeout(r, 20));
    expect(commit).not.toHaveBeenCalled();
  });
});

const mk = (filePath: string, fileSize = 1024) => {
  const i = filePath.lastIndexOf('/');
  const fileName = filePath.slice(i + 1);
  return {
    id: `hf_${filePath}`, title: fileName, fileName, fileType: 'application/pdf', fileSize, filePath,
    folderPath: i === -1 ? '' : filePath.slice(0, i), documentType: 'khac', updatedAt: '2026-10-01T00:00:00Z',
  };
};

describe('Kho lưu trữ - duyệt thư mục kiểu trình quản lý tệp', () => {
  beforeEach(() => {
    state.archive = makeArchive({
      documents: [mk('goc.pdf'), mk('MY HUE/a.pdf', 2048), mk('MY HUE/b.pdf'), mk('MY HUE/2026/c.pdf')],
    });
  });

  it('ở gốc: thư mục hiện thành thư mục kèm số tệp, tệp cấp sâu không lẫn ra ngoài', () => {
    render(<StorageManagementView />);
    expect(screen.getByRole('button', { name: /MY HUE.*3 tệp/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'goc.pdf' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'a.pdf' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'c.pdf' })).toBeNull();
  });

  it('bấm vào thư mục thì đi vào: thấy tệp trực tiếp và thư mục con, hết thấy tệp ở gốc', () => {
    render(<StorageManagementView />);
    fireEvent.click(screen.getByRole('button', { name: /MY HUE.*3 tệp/ }));

    expect(screen.getByRole('button', { name: 'a.pdf' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'b.pdf' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /2026.*1 tệp/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'goc.pdf' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'c.pdf' })).toBeNull();
  });

  it('đi sâu rồi quay về gốc bằng breadcrumb', () => {
    render(<StorageManagementView />);
    fireEvent.click(screen.getByRole('button', { name: /MY HUE.*3 tệp/ }));
    fireEvent.click(screen.getByRole('button', { name: /2026.*1 tệp/ }));
    expect(screen.getByRole('button', { name: 'c.pdf' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Gốc' }));
    expect(screen.getByRole('button', { name: 'goc.pdf' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'c.pdf' })).toBeNull();
  });

  it('tìm kiếm quét toàn kho, trả danh sách phẳng không có thẻ thư mục', () => {
    render(<StorageManagementView />);
    fireEvent.change(screen.getByLabelText('Tìm tệp tin'), { target: { value: 'c.pdf' } });

    expect(screen.getByRole('button', { name: 'c.pdf' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /MY HUE.*tệp/ })).toBeNull();
  });

  it('thư mục gốc cấu hình của repo là "Gốc": thấy ngay nội dung, không phải bấm vào thư mục gốc', () => {
    state.archive = makeArchive({
      config: { token: 'hf_t', repoId: 'own/chung', folder: 'van-thu' },
      documents: [mk('van-thu/x.pdf'), mk('van-thu/Con/y.pdf')],
      folders: ['van-thu', 'van-thu/Con'],
    });
    render(<StorageManagementView />);
    expect(screen.getByRole('button', { name: 'x.pdf' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Con.*1 tệp/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /van-thu/ })).toBeNull();
  });

  it('thư mục rỗng trên HF vẫn hiện thành thư mục 0 tệp', () => {
    state.archive = makeArchive({ documents: [mk('goc.pdf')], folders: ['Rong'] });
    render(<StorageManagementView />);
    expect(screen.getByRole('button', { name: /Rong.*0 tệp/ })).toBeTruthy();
  });

  it('dạng bảng: dòng thư mục đứng trước các tệp và tổng cộng tính cả nội dung thư mục', () => {
    render(<StorageManagementView />);
    fireEvent.click(screen.getByRole('button', { name: 'Dạng bảng' }));

    const rows = screen.getAllByRole('row');
    const names = rows.map((r) => r.textContent ?? '');
    const folderRow = names.findIndex((t) => t.startsWith('MY HUE'));
    const fileRow = names.findIndex((t) => t.startsWith('goc.pdf'));
    expect(folderRow).toBeGreaterThan(0);
    expect(fileRow).toBeGreaterThan(folderRow);
    expect(within(rows[rows.length - 1]).getByText(/TỔNG CỘNG \(4 tệp\)/)).toBeTruthy();
  });
});

type PickerWindow = { showSaveFilePicker?: unknown };

function fileSink() {
  const chunks: Uint8Array[] = [];
  const events: string[] = [];
  const writable = new WritableStream<Uint8Array>({
    write: (c) => void chunks.push(c),
    close: () => void events.push('close'),
    abort: () => void events.push('abort'),
  });
  const bytes = () => {
    const out = new Uint8Array(chunks.reduce((n, c) => n + c.byteLength, 0));
    let o = 0;
    for (const c of chunks) { out.set(c, o); o += c.byteLength; }
    return out;
  };
  return { writable, events, bytes };
}

async function zipNames(bytes: Uint8Array): Promise<Record<string, number>> {
  const reader = new ZipReader(new Uint8ArrayReader(bytes));
  const out: Record<string, number> = {};
  for (const e of await reader.getEntries()) {
    if (!e.directory) out[e.filename] = (await (e as unknown as { getData: (w: Uint8ArrayWriter) => Promise<Uint8Array> }).getData(new Uint8ArrayWriter())).byteLength;
  }
  await reader.close();
  return out;
}

const fetchBySize = (docs: Array<{ filePath: string; fileSize: number }>) =>
  vi.fn(async (url: RequestInfo | URL) => {
    const path = decodeURIComponent(new URL(String(url)).pathname.replace('/datasets/own/chung/resolve/main/', ''));
    const doc = docs.find((d) => d.filePath === path);
    return doc ? new Response(new Uint8Array(doc.fileSize), { status: 200 }) : new Response('', { status: 404 });
  });

describe('Kho lưu trữ - tải thư mục về dạng ZIP', () => {
  const DOCS = [mk('goc.pdf', 5), mk('MY HUE/a.pdf', 2048), mk('MY HUE/b.pdf', 10), mk('MY HUE/2026/c.pdf', 300)];

  beforeEach(() => {
    state.archive = makeArchive({ documents: DOCS });
  });
  afterEach(() => {
    delete (window as unknown as PickerWindow).showSaveFilePicker;
    vi.unstubAllGlobals();
  });

  it('hộp Lưu thành mở ngay trong lúc click, rồi zip ghi ra đủ tệp với cấu trúc thư mục', async () => {
    const sink = fileSink();
    const picker = vi.fn(async () => ({ createWritable: async () => sink.writable }));
    (window as unknown as PickerWindow).showSaveFilePicker = picker;
    vi.stubGlobal('fetch', fetchBySize(DOCS));
    render(<StorageManagementView />);

    fireEvent.click(screen.getByRole('button', { name: 'Tải thư mục MY HUE (ZIP)' }));
    // user activation: phải gọi đồng bộ, trước mọi await
    expect(picker).toHaveBeenCalledTimes(1);
    expect((picker.mock.calls[0] as unknown as [{ suggestedName: string }])[0].suggestedName).toBe('MY HUE.zip');

    await waitFor(() => expect(sink.events).toEqual(['close']));
    expect(await zipNames(sink.bytes())).toEqual({
      'MY HUE/2026/c.pdf': 300,
      'MY HUE/a.pdf': 2048,
      'MY HUE/b.pdf': 10,
    });
    await waitFor(() => expect(screen.getByText('Đã tải xong MY HUE.zip.')).toBeTruthy());
  });

  it('nút "Tải thư mục này" trên thanh công cụ nén đúng thư mục đang xem', async () => {
    const sink = fileSink();
    (window as unknown as PickerWindow).showSaveFilePicker = vi.fn(async () => ({ createWritable: async () => sink.writable }));
    vi.stubGlobal('fetch', fetchBySize(DOCS));
    render(<StorageManagementView />);

    fireEvent.click(screen.getByRole('button', { name: /MY HUE.*3 tệp/ }));
    fireEvent.click(screen.getByRole('button', { name: /Tải thư mục này \(ZIP\)/ }));

    await waitFor(() => expect(sink.events).toEqual(['close']));
    expect(Object.keys(await zipNames(sink.bytes())).sort()).toEqual(['MY HUE/2026/c.pdf', 'MY HUE/a.pdf', 'MY HUE/b.pdf']);
  });

  it('người dùng đóng hộp Lưu thành: không tải gì và không báo lỗi', async () => {
    (window as unknown as PickerWindow).showSaveFilePicker = vi.fn(async () => {
      throw new DOMException('The user aborted a request.', 'AbortError');
    });
    const fetchMock = fetchBySize(DOCS);
    vi.stubGlobal('fetch', fetchMock);
    render(<StorageManagementView />);

    fireEvent.click(screen.getByRole('button', { name: 'Tải thư mục MY HUE (ZIP)' }));
    await new Promise((r) => setTimeout(r, 30));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText(/Đã hủy tải thư mục/)).toBeNull();
  });

  it('tệp đã bị xóa trên HF: báo rõ tên tệp và hủy đích ghi, không chốt zip dở', async () => {
    const sink = fileSink();
    (window as unknown as PickerWindow).showSaveFilePicker = vi.fn(async () => ({ createWritable: async () => sink.writable }));
    vi.stubGlobal('fetch', fetchBySize(DOCS.filter((d) => d.filePath !== 'MY HUE/b.pdf')));
    render(<StorageManagementView />);

    fireEvent.click(screen.getByRole('button', { name: 'Tải thư mục MY HUE (ZIP)' }));

    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/Không tìm thấy tệp "MY HUE\/b\.pdf"/));
    expect(sink.events).toEqual(['abort']);
  });

  it('trình duyệt không có hộp Lưu thành: gom vào bộ nhớ rồi tải xuống bằng liên kết', async () => {
    const created = vi.fn(() => 'blob:zip');
    const urlApi = URL as unknown as { createObjectURL?: unknown; revokeObjectURL?: unknown };
    const original = { create: urlApi.createObjectURL, revoke: urlApi.revokeObjectURL };
    urlApi.createObjectURL = created;
    urlApi.revokeObjectURL = vi.fn();
    const clicked: string[] = [];
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this.download);
    });
    vi.stubGlobal('fetch', fetchBySize(DOCS));
    render(<StorageManagementView />);

    fireEvent.click(screen.getByRole('button', { name: 'Tải thư mục MY HUE (ZIP)' }));

    await waitFor(() => expect(clicked).toEqual(['MY HUE.zip']));
    expect(created).toHaveBeenCalledTimes(1);
    clickSpy.mockRestore();
    urlApi.createObjectURL = original.create;
    urlApi.revokeObjectURL = original.revoke;
  });

  it('không có hộp Lưu thành và thư mục quá lớn: từ chối, không tải gì', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    state.archive = makeArchive({ documents: [mk('Lon/x.bin', 600 * 1024 * 1024)] });
    render(<StorageManagementView />);

    fireEvent.click(screen.getByRole('button', { name: 'Tải thư mục Lon (ZIP)' }));

    expect(screen.getByRole('alert').textContent).toMatch(/Chrome hoặc Edge/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('thư mục rỗng thì không có nút tải', () => {
    state.archive = makeArchive({ documents: [mk('goc.pdf')], folders: ['Rong'] });
    render(<StorageManagementView />);
    expect((screen.getByRole('button', { name: 'Tải thư mục Rong (ZIP)' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
