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

const commit = vi.hoisted(() => vi.fn());
vi.mock('@huggingface/hub', () => ({ commit, createRepo: vi.fn() }));

import { StorageManagementView } from '../views/StorageManagementView';

const repo = (over: Partial<StorageRepo>): StorageRepo => ({
  id: 1, name: 'Kho chung', repoId: 'own/chung', provider: 'huggingface', folder: '', kind: 'shared', assignedUserId: null, createdAt: '', ...over,
});

const makeArchive = (over: Record<string, unknown> = {}) => {
  const shared = repo({});
  return {
    auth: { token: 'hf_t', username: 'own' },
    allRepos: [shared],
    repos: [shared],
    selectedRepo: shared,
    selectRepo: vi.fn(),
    config: { token: 'hf_t', repoId: 'own/chung', provider: 'huggingface', folder: '', isPrivate: true },
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

/** Mặc định là dạng bảng; các ca kiểm thư mục dạng thẻ bấm sang dạng lưới trước. */
function renderGrid() {
  const view = render(<StorageManagementView />);
  fireEvent.click(screen.getByRole('button', { name: 'Dạng lưới' }));
  return view;
}

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

  it('user thường không thấy liên kết cấu hình lẫn biểu tượng khóa', () => {
    render(<StorageManagementView />);
    expect(screen.queryByRole('link', { name: 'Cấu hình kho lưu trữ' })).toBeNull();
  });

  it('Master Admin thấy liên kết cấu hình mở trang cấu hình ở khu quản trị bằng tab mới', () => {
    state.role = 'master_admin';
    render(<StorageManagementView />);
    const link = screen.getByRole('link', { name: 'Cấu hình kho lưu trữ' });
    expect(link.getAttribute('href')).toBe('/admin/storage');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('User Admin không thấy cấu hình nhưng được thấy nút xóa tệp', () => {
    state.role = 'user_admin';
    state.archive = makeArchive({
      documents: [{ id: 'hf_1', title: 'a.pdf', fileName: 'a.pdf', fileType: 'application/pdf', fileSize: 10, filePath: 'a.pdf', folderPath: '', documentType: 'khac', updatedAt: '2026-10-01T00:00:00Z' }],
    });
    render(<StorageManagementView />);
    expect(screen.queryByRole('link', { name: 'Cấu hình kho lưu trữ' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Xóa a.pdf' })).toBeTruthy();
  });

  it('user chỉ xóa được trong kho cá nhân của mình, không xóa ở Kho chung', () => {
    const doc = { id: 'hf_1', title: 'a.pdf', fileName: 'a.pdf', fileType: 'application/pdf', fileSize: 10, filePath: 'a.pdf', folderPath: '', documentType: 'khac', updatedAt: '2026-10-01T00:00:00Z' };
    state.archive = makeArchive({ documents: [doc] });
    const { unmount } = render(<StorageManagementView />);
    expect(screen.queryByRole('button', { name: 'Xóa a.pdf' })).toBeNull();
    unmount();

    const mine = repo({ id: 2, name: 'Kho A', kind: 'personal', assignedUserId: 'u-a', repoId: 'own/a' });
    state.archive = makeArchive({ documents: [doc], repos: [repo({}), mine], selectedRepo: mine, config: { token: 'hf_t', repoId: 'own/a', provider: 'huggingface', folder: '' } });
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
    state.archive = makeArchive({ repos: [repo({}), other], selectedRepo: other, config: { token: 'hf_t', repoId: 'own/b', provider: 'huggingface', folder: '' } });
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
    renderGrid();
    expect(screen.getByRole('button', { name: /MY HUE.*3 tệp/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'goc.pdf' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'a.pdf' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'c.pdf' })).toBeNull();
  });

  it('bấm vào thư mục thì đi vào: thấy tệp trực tiếp và thư mục con, hết thấy tệp ở gốc', () => {
    renderGrid();
    fireEvent.click(screen.getByRole('button', { name: /MY HUE.*3 tệp/ }));

    expect(screen.getByRole('button', { name: 'a.pdf' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'b.pdf' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /2026.*1 tệp/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'goc.pdf' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'c.pdf' })).toBeNull();
  });

  it('đi sâu rồi quay về gốc bằng breadcrumb', () => {
    renderGrid();
    fireEvent.click(screen.getByRole('button', { name: /MY HUE.*3 tệp/ }));
    fireEvent.click(screen.getByRole('button', { name: /2026.*1 tệp/ }));
    expect(screen.getByRole('button', { name: 'c.pdf' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Gốc' }));
    expect(screen.getByRole('button', { name: 'goc.pdf' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'c.pdf' })).toBeNull();
  });

  it('tìm kiếm quét toàn kho, trả danh sách phẳng không có thẻ thư mục', () => {
    renderGrid();
    fireEvent.change(screen.getByLabelText('Tìm tệp tin'), { target: { value: 'c.pdf' } });

    expect(screen.getByRole('button', { name: 'c.pdf' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /MY HUE.*tệp/ })).toBeNull();
  });

  it('thư mục gốc cấu hình của repo là "Gốc": thấy ngay nội dung, không phải bấm vào thư mục gốc', () => {
    state.archive = makeArchive({
      config: { token: 'hf_t', repoId: 'own/chung', provider: 'huggingface', folder: 'van-thu' },
      documents: [mk('van-thu/x.pdf'), mk('van-thu/Con/y.pdf')],
      folders: ['van-thu', 'van-thu/Con'],
    });
    renderGrid();
    expect(screen.getByRole('button', { name: 'x.pdf' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Con.*1 tệp/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /van-thu/ })).toBeNull();
  });

  it('thư mục rỗng trên HF vẫn hiện thành thư mục 0 tệp', () => {
    state.archive = makeArchive({ documents: [mk('goc.pdf')], folders: ['Rong'] });
    renderGrid();
    expect(screen.getByRole('button', { name: /Rong.*0 tệp/ })).toBeTruthy();
  });

  it('mặc định hiện dạng bảng, không phải dạng lưới', () => {
    render(<StorageManagementView />);
    expect(screen.getByRole('button', { name: 'Dạng bảng' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Dạng lưới' }).getAttribute('aria-pressed')).toBe('false');
    expect(screen.getAllByRole('row').length).toBeGreaterThan(1);
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

describe('Kho lưu trữ - chọn kho', () => {
  const mine = repo({ id: 2, name: 'Kho của tôi', repoId: 'own/a', kind: 'personal', assignedUserId: 'u-a' });
  const bang = repo({ id: 3, name: 'Kho B', repoId: 'own/b', kind: 'personal', assignedUserId: 'u-b' });
  const hung = repo({ id: 4, name: 'Kho H', repoId: 'own/h', kind: 'personal', assignedUserId: 'u-h' });
  const withRepos = (list: StorageRepo[], selected: StorageRepo) => {
    state.archive = makeArchive({ allRepos: list, repos: list, selectedRepo: selected });
  };

  it('kho của người khác không liệt kê thành tab, chỉ có trong ô chọn', () => {
    state.role = 'master_admin';
    withRepos([repo({}), mine, bang, hung], repo({}));
    render(<StorageManagementView />);
    const tabs = screen.getAllByRole('tab').map((t) => t.textContent);
    expect(tabs).toEqual(['Kho chung', 'Kho của tôi']);
    const select = screen.getByLabelText('Kho của người dùng khác') as HTMLSelectElement;
    expect([...select.options].map((o) => o.value)).toEqual(['', '3', '4']);
  });

  it('chọn một người trong ô chọn thì mở kho của người đó', () => {
    state.role = 'master_admin';
    const archive = makeArchive({ allRepos: [repo({}), mine, bang], repos: [repo({}), mine, bang] });
    state.archive = archive;
    render(<StorageManagementView />);
    fireEvent.change(screen.getByLabelText('Kho của người dùng khác'), { target: { value: '3' } });
    expect(archive.selectRepo).toHaveBeenCalledWith(3);
  });

  it('không có kho nào của người khác thì không hiện ô chọn (User Admin, user)', () => {
    state.role = 'user_admin';
    withRepos([repo({}), mine], repo({}));
    render(<StorageManagementView />);
    expect(screen.queryByLabelText('Kho của người dùng khác')).toBeNull();
  });

  it('nhúng trong tab Văn thư: có tiêu đề riêng và không có trợ lý AI', () => {
    state.role = 'master_admin';
    const vt = repo({ id: 5, name: 'Văn thư', kind: 'dispatch' });
    const bm = repo({ id: 6, name: 'Biểu mẫu', kind: 'form' });
    withRepos([vt, bm], vt);
    render(<StorageManagementView scope="dispatch" embedded />);
    expect(screen.getByRole('heading', { name: 'Kho Văn thư và Biểu mẫu' })).toBeTruthy();
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Văn thư', 'Biểu mẫu']);
    expect(screen.queryByRole('button', { name: /Trợ lý AI/ })).toBeNull();
  });

  it('màn Kho lưu trữ bình thường vẫn có nút Trợ lý AI', () => {
    render(<StorageManagementView />);
    expect(screen.getByRole('heading', { name: 'Kho lưu trữ' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Trợ lý AI/ })).toBeTruthy();
  });
});

describe('Kho lưu trữ - điện thoại', () => {
  beforeEach(() => {
    state.archive = makeArchive({
      documents: [mk('goc.pdf'), mk('MY HUE/a.pdf', 2048), mk('MY HUE/b.pdf'), mk('MY HUE/2026/c.pdf')],
    });
    window.matchMedia = ((q: string) => ({
      matches: q.includes('max-width: 767px'),
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
  });
  afterEach(() => {
    // @ts-expect-error: trả về môi trường không có matchMedia như các test khác
    delete window.matchMedia;
  });

  it('luôn dùng thẻ, không dùng bảng nhiều cột dù mặc định là dạng bảng', () => {
    render(<StorageManagementView />);
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByRole('button', { name: /MY HUE.*3 tệp/ })).toBeTruthy();
  });

  it('có nút mở ngăn Kho và thư mục, bật tắt được', () => {
    render(<StorageManagementView />);
    const toggle = screen.getAllByRole('button').find((b) => b.getAttribute('aria-expanded') !== null) as HTMLElement;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('chọn thư mục thì đóng ngăn để thấy ngay danh sách tệp', () => {
    render(<StorageManagementView />);
    const toggle = screen.getAllByRole('button').find((b) => b.getAttribute('aria-expanded') !== null) as HTMLElement;
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    // Mục trong cây thư mục (khác thẻ thư mục ở khung phải)
    fireEvent.click(screen.getByText('MY HUE', { selector: 'span.truncate' }));
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
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
    renderGrid();

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

describe('Kho lưu trữ - tải lên liên tiếp', () => {
  const folderFiles = () => {
    const mk = (name: string, rel: string) => {
      const f = new File(['x'], name);
      Object.defineProperty(f, 'webkitRelativePath', { value: rel });
      return f;
    };
    return [mk('a.txt', 'Tai-lieu/a.txt'), mk('b.txt', 'Tai-lieu/sub/b.txt')];
  };
  const pick = (label: string, files: File[]) => {
    const input = screen.getByLabelText(label) as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: files, configurable: true });
    fireEvent.change(input);
  };

  it('tải xong một thư mục thì tải tiếp được một tệp, rồi một thư mục nữa', async () => {
    state.role = 'user';
    commit.mockResolvedValue({});
    const reload = vi.fn().mockResolvedValue(undefined);
    state.archive = makeArchive({ reload });
    render(<StorageManagementView />);

    pick('Chọn thư mục để tải lên', folderFiles());
    await waitFor(() => expect(commit).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    await waitFor(() => expect((screen.getByRole('button', { name: /Tải lên tệp/ }) as HTMLButtonElement).disabled).toBe(false));

    pick('Chọn tệp để tải lên', [new File(['y'], 'c.pdf')]);
    await waitFor(() => expect(commit).toHaveBeenCalledTimes(2));
    expect(commit.mock.calls[1][0].operations.map((o: { path: string }) => o.path)).toEqual(['c.pdf']);
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(2));

    pick('Chọn thư mục để tải lên', folderFiles());
    await waitFor(() => expect(commit).toHaveBeenCalledTimes(3));
  });

  it('nạp lại danh sách chậm sau khi tải lên không khóa nút tải lên', async () => {
    commit.mockResolvedValue({});
    let release!: () => void;
    const reload = vi.fn().mockImplementation(() => new Promise<void>((r) => { release = r; }));
    state.archive = makeArchive({ reload });
    render(<StorageManagementView />);

    pick('Chọn thư mục để tải lên', folderFiles());
    await waitFor(() => expect(reload).toHaveBeenCalled());
    // danh sách vẫn đang nạp lại nhưng tệp đã lên xong: nút tải lên phải dùng được
    expect((screen.getByRole('button', { name: /Tải lên tệp/ }) as HTMLButtonElement).disabled).toBe(false);
    release();
  });

  it('tải lên hỏng giữa chừng thì lần sau vẫn tải được', async () => {
    commit.mockRejectedValueOnce(Object.assign(new Error('x'), { statusCode: 500 })).mockResolvedValue({});
    render(<StorageManagementView />);
    pick('Chọn tệp để tải lên', [new File(['y'], 'hong.pdf')]);
    await waitFor(() => expect(commit).toHaveBeenCalledTimes(1));
    await waitFor(() => expect((screen.getByRole('button', { name: /Tải lên tệp/ }) as HTMLButtonElement).disabled).toBe(false));

    pick('Chọn tệp để tải lên', [new File(['z'], 'tot.pdf')]);
    await waitFor(() => expect(commit).toHaveBeenCalledTimes(2));
  });
});

describe('Kho lưu trữ - nạp lại danh sách sau khi tải lên', () => {
  it('nạp lại hỏng: báo rõ đã tải lên nhưng chưa nạp được danh sách, nút tải lên vẫn dùng được', async () => {
    commit.mockResolvedValue({});
    state.archive = makeArchive({ reload: vi.fn().mockRejectedValue(new Error('mạng chập chờn')) });
    render(<StorageManagementView />);
    const input = screen.getByLabelText('Chọn tệp để tải lên') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [new File(['y'], 'a.pdf')], configurable: true });
    fireEvent.change(input);

    expect((await screen.findByText(/Đã tải lên nhưng chưa nạp lại được danh sách: mạng chập chờn/)).textContent).toBeTruthy();
    expect((screen.getByRole('button', { name: /Tải lên tệp/ }) as HTMLButtonElement).disabled).toBe(false);
  });
});
