// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, within, waitFor } from '@testing-library/react';
import type { OfficialDoc } from '../../types/officialDoc';

const state = vi.hoisted(() => ({
  role: 'user',
  hook: null as unknown,
  deleteDoc: vi.fn(),
  saveDoc: vi.fn(),
  fetchBlob: vi.fn(),
  zip: vi.fn(),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    role: state.role,
    user: { id: 'u' },
    can: (cap: string) => {
      const granted: Record<string, string[]> = {
        'storage.delete': ['master_admin', 'user_admin'],
        'dispatch.upload': ['master_admin', 'user_admin'],
      };
      return (granted[cap] ?? []).includes(state.role);
    },
  }),
}));
vi.mock('../../hooks/useOfficialDocs', () => ({ useOfficialDocs: () => state.hook }));
vi.mock('../ai/AiChatDialog', () => ({ AiChatDialog: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div>AI CHAT</div> : null) }));
vi.mock('../dispatch/DispatchPreviewModal', () => ({
  DispatchPreviewModal: ({ document: d, isOpen }: { document: { fileName: string; fileId?: string; fileType: string } | null; isOpen: boolean }) =>
    isOpen && d ? <div role="dialog" aria-label="Xem trước tệp">{d.fileName}|{d.fileId}|{d.fileType}</div> : null,
}));
vi.mock('../dispatch/FilePickerModal', () => ({
  FilePickerModal: () => <div>PICKER</div>,
  pickedKey: (r: string, p: string) => `${r}/${p}`,
}));
vi.mock('../../lib/api/officialDocApi', () => ({
  deleteOfficialDoc: state.deleteDoc,
  saveOfficialDoc: state.saveDoc,
}));
vi.mock('../../lib/officialDoc/docFiles', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/officialDoc/docFiles')>()),
  fetchDocFileBlob: state.fetchBlob,
}));

vi.mock('../../lib/officialDoc/formBundle', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/officialDoc/formBundle')>()),
  zipBlobs: state.zip,
}));

vi.mock('../views/StorageManagementView', () => ({
  StorageManagementView: (p: { scope?: string; embedded?: boolean }) => <div>KHO TỆP {p.scope} {String(p.embedded)}</div>,
}));

import { DispatchManagementView } from '../views/DispatchManagementView';

const doc = (over: Partial<OfficialDoc> = {}): OfficialDoc => ({
  id: '1',
  category: 'van-ban',
  docNumber: '2753/2026/TB-BĐH',
  title: 'Chương trình lãi suất cho vay trung dài hạn KHCN',
  issuedDate: '2026-09-18',
  effectiveFrom: '2026-09-21',
  effectiveTo: '2026-10-31',
  files: [
    { kind: 'goc', repoId: 'o/kho', path: 'vb/2753.pdf', name: '2753.pdf' },
    { kind: 'bieu-mau', repoId: 'o/kho', path: 'vb/BM01.docx', name: 'BM01.docx' },
  ],
  createdAt: '',
  updatedAt: '',
  ...over,
});

const makeHook = (over: Record<string, unknown> = {}) => ({
  filter: { search: '', category: 'all', status: 'all', issuedFrom: '', issuedTo: '' },
  updateFilter: vi.fn(),
  resetFilters: vi.fn(),
  page: 1,
  setPage: vi.fn(),
  sort: { key: 'issuedDate', dir: 'desc' },
  toggleSort: vi.fn(),
  pageCount: 1,
  docs: [doc(), doc({ id: '2', docNumber: 'HD-01', title: 'Hợp đồng mẫu', category: 'hop-dong', files: [] })],
  total: 2,
  counts: { all: 6, 'van-ban': 3, 'hop-dong': 2, 'cong-van': 1, khac: 0 },
  loading: false,
  error: null,
  reload: vi.fn(),
  ...over,
});

beforeEach(() => {
  state.role = 'user';
  state.hook = makeHook();
  state.deleteDoc.mockReset();
  state.saveDoc.mockReset();
  state.fetchBlob.mockReset();
});
afterEach(cleanup);

const nav = () => screen.getByRole('navigation', { name: 'Mục văn thư' });

describe('Văn thư - sidebar và danh sách', () => {
  it('sidebar có Tất cả và bốn mục kèm số lượng từ máy chủ', () => {
    render(<DispatchManagementView />);
    const items = within(nav()).getAllByRole('button').map((b) => b.textContent);
    expect(items).toEqual(['Tất cả6', 'Văn bản3', 'Hợp đồng2', 'Công văn1', 'Khác0']);
  });

  it('chọn mục thì đổi bộ lọc mục', () => {
    const hook = makeHook();
    state.hook = hook;
    render(<DispatchManagementView />);
    fireEvent.click(within(nav()).getByRole('button', { name: /Hợp đồng/ }));
    expect(hook.updateFilter).toHaveBeenCalledWith({ category: 'hop-dong' });
  });

  it('mục đang chọn được đánh dấu và đặt làm tiêu đề trang', () => {
    state.hook = makeHook({ filter: { ...makeHook().filter, category: 'cong-van' } });
    render(<DispatchManagementView />);
    expect(within(nav()).getByRole('button', { name: /Công văn/ }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Công văn');
  });

  it('hiện số hiệu, loại, ba ngày và tình trạng của từng văn bản', () => {
    render(<DispatchManagementView />);
    const row = screen.getByText('2753/2026/TB-BĐH').closest('tr') as HTMLElement;
    expect(screen.queryByText('Loại văn bản')).toBeNull();
    expect(within(row).getByText('18/09/2026')).toBeTruthy();
    expect(within(row).getByText('21/09/2026')).toBeTruthy();
    expect(within(row).getByText('31/10/2026')).toBeTruthy();
  });

  it('gõ vào ô tìm kiếm và đổi bộ lọc loại, tình trạng gọi updateFilter', () => {
    const hook = makeHook();
    state.hook = hook;
    render(<DispatchManagementView />);
    fireEvent.change(screen.getByLabelText('Tìm văn bản'), { target: { value: 'lai suat' } });
    fireEvent.change(screen.getByLabelText('Lọc tình trạng'), { target: { value: 'expired' } });
    expect(hook.updateFilter).toHaveBeenCalledWith({ search: 'lai suat' });
    expect(screen.queryByLabelText('Lọc loại văn bản')).toBeNull();
    expect(hook.updateFilter).toHaveBeenCalledWith({ status: 'expired' });
  });

  it('phân trang gọi setPage và khóa nút ở trang đầu/cuối', () => {
    const hook = makeHook({ page: 2, pageCount: 3, total: 40 });
    state.hook = hook;
    render(<DispatchManagementView />);
    fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
    fireEvent.click(screen.getByRole('button', { name: 'Trang trước' }));
    expect(hook.setPage).toHaveBeenNthCalledWith(1, 3);
    expect(hook.setPage).toHaveBeenNthCalledWith(2, 1);
    expect(screen.getByText('Trang 2/3')).toBeTruthy();
  });

  it('danh sách rỗng và đang tải hiện thông báo tương ứng', () => {
    state.hook = makeHook({ docs: [], total: 0, loading: true });
    const { unmount } = render(<DispatchManagementView />);
    expect(screen.getByText(/Đang tải văn bản/)).toBeTruthy();
    unmount();
    state.hook = makeHook({ docs: [], total: 0 });
    render(<DispatchManagementView />);
    expect(screen.getByText(/Không có văn bản nào phù hợp/)).toBeTruthy();
  });

  it('lỗi từ máy chủ được hiện rõ, không để danh sách rỗng im lặng', () => {
    state.hook = makeHook({ docs: [], total: 0, error: 'Không tìm được văn bản: boom' });
    render(<DispatchManagementView />);
    expect(screen.getByRole('alert').textContent).toMatch(/boom/);
  });
});

describe('Văn thư - phân quyền', () => {
  it('user chỉ xem: không có Thêm, Sửa, Xóa', () => {
    render(<DispatchManagementView />);
    expect(screen.queryByRole('button', { name: /Thêm văn bản/ })).toBeNull();
    expect(screen.queryByTitle('Sửa văn bản')).toBeNull();
    expect(screen.queryByTitle('Xóa văn bản này')).toBeNull();
  });

  it('User Admin thêm, sửa, xóa được', () => {
    state.role = 'user_admin';
    render(<DispatchManagementView />);
    expect(screen.getByRole('button', { name: /Thêm văn bản/ })).toBeTruthy();
    expect(screen.getAllByTitle('Sửa văn bản')).toHaveLength(2);
    expect(screen.getAllByTitle('Xóa văn bản này')).toHaveLength(2);
  });

  it('thêm văn bản mở form với mục mặc định theo mục đang xem', () => {
    state.role = 'master_admin';
    state.hook = makeHook({ filter: { ...makeHook().filter, category: 'hop-dong' } });
    render(<DispatchManagementView />);
    fireEvent.click(screen.getByRole('button', { name: /Thêm văn bản/ }));
    expect((screen.getByLabelText('Mục') as HTMLSelectElement).value).toBe('hop-dong');
  });

  it('lưu form gọi API rồi tải lại danh sách', async () => {
    state.role = 'master_admin';
    const hook = makeHook();
    state.hook = hook;
    state.saveDoc.mockResolvedValue(doc());
    render(<DispatchManagementView />);
    fireEvent.click(screen.getByRole('button', { name: /Thêm văn bản/ }));
    fireEvent.change(screen.getByLabelText('Số hiệu'), { target: { value: 'S1' } });
    fireEvent.change(screen.getByLabelText('Tiêu đề'), { target: { value: 'Tiêu đề 1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu văn bản' }));

    await waitFor(() => expect(hook.reload).toHaveBeenCalled());
    expect(state.saveDoc).toHaveBeenCalledWith(null, expect.objectContaining({ docNumber: 'S1', title: 'Tiêu đề 1' }));
    expect(screen.queryByRole('dialog', { name: 'Thêm văn bản' })).toBeNull();
  });

  it('xóa: xác nhận rồi gọi API và tải lại; không xác nhận thì không xóa', async () => {
    state.role = 'user_admin';
    const hook = makeHook();
    state.hook = hook;
    state.deleteDoc.mockResolvedValue(undefined);
    const confirm = vi.spyOn(window, 'confirm');

    confirm.mockReturnValueOnce(false);
    render(<DispatchManagementView />);
    fireEvent.click(screen.getAllByTitle('Xóa văn bản này')[0]);
    expect(state.deleteDoc).not.toHaveBeenCalled();

    confirm.mockReturnValueOnce(true);
    fireEvent.click(screen.getAllByTitle('Xóa văn bản này')[0]);
    await waitFor(() => expect(hook.reload).toHaveBeenCalled());
    expect(state.deleteDoc).toHaveBeenCalledWith('1');
    confirm.mockRestore();
  });

  it('xóa bị từ chối (RLS) thì hiện lỗi và không tải lại', async () => {
    state.role = 'user_admin';
    const hook = makeHook();
    state.hook = hook;
    state.deleteDoc.mockRejectedValue(new Error('Không xóa được văn bản: không đủ quyền'));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<DispatchManagementView />);
    fireEvent.click(screen.getAllByTitle('Xóa văn bản này')[0]);
    expect((await screen.findByRole('alert')).textContent).toMatch(/không đủ quyền/);
    expect(hook.reload).not.toHaveBeenCalled();
  });
});

describe('Văn thư - xem chi tiết và mở tệp', () => {
  const openDetail = () => {
    render(<DispatchManagementView />);
    fireEvent.click(screen.getByRole('button', { name: 'Xem văn bản 2753/2026/TB-BĐH' }));
    return screen.getByRole('dialog', { name: 'Xem văn bản' });
  };

  it('hiện đủ các trường và hai nhóm tệp', () => {
    const dlg = openDetail();
    expect(within(dlg).getByText('2753/2026/TB-BĐH')).toBeTruthy();
    expect(within(dlg).queryByText('Loại văn bản')).toBeNull();
    expect(within(dlg).getByText('File văn bản gốc')).toBeTruthy();
    expect(within(dlg).getByText('File biểu mẫu')).toBeTruthy();
    expect(within(dlg).getByText('31/10/2026')).toBeTruthy();
  });

  it('PDF có Xem và Tải về, tệp Word chỉ có Tải về', () => {
    const dlg = openDetail();
    const pdf = within(dlg).getByText('2753.pdf').closest('li') as HTMLElement;
    const word = within(dlg).getByText('BM01.docx').closest('li') as HTMLElement;
    expect(within(pdf).getByRole('button', { name: 'Xem' })).toBeTruthy();
    expect(within(pdf).getByRole('button', { name: 'Tải về' })).toBeTruthy();
    expect(within(word).queryByRole('button', { name: 'Xem' })).toBeNull();
    expect(within(word).getByRole('button', { name: 'Tải về' })).toBeTruthy();
  });

  it('Xem mở khung xem trước ngay trong ứng dụng, không mở tab mới (trình duyệt hay chặn)', () => {
    const open = vi.spyOn(window, 'open');
    const dlg = openDetail();
    fireEvent.click(within(within(dlg).getByText('2753.pdf').closest('li') as HTMLElement).getByRole('button', { name: 'Xem' }));
    const preview = screen.getByRole('dialog', { name: 'Xem trước tệp' });
    expect(preview.textContent).toContain('2753.pdf');
    expect(preview.textContent).toContain('application/pdf');
    expect(open).not.toHaveBeenCalled();
  });

  it('đóng chi tiết', () => {
    const dlg = openDetail();
    fireEvent.click(within(dlg).getByRole('button', { name: 'Đóng' }));
    expect(screen.queryByRole('dialog', { name: 'Xem văn bản' })).toBeNull();
  });
});

describe('Văn thư - nút Tải về ở cột Thao tác', () => {
  const stubUrl = () => {
    const original = URL.createObjectURL;
    URL.createObjectURL = vi.fn().mockReturnValue('blob:dl');
    return () => {
      URL.createObjectURL = original;
    };
  };

  it('tiêu đề là chữ thường, không còn là liên kết; Xem và Tải về là nút ở cột Thao tác', () => {
    render(<DispatchManagementView />);
    const row = screen.getByText('2753/2026/TB-BĐH').closest('tr') as HTMLElement;
    expect(within(row).getByText('Chương trình lãi suất cho vay trung dài hạn KHCN').closest('button')).toBeNull();
    expect(within(row).getByRole('button', { name: 'Xem văn bản 2753/2026/TB-BĐH' })).toBeTruthy();
    expect(within(row).getByRole('button', { name: 'Tải về văn bản 2753/2026/TB-BĐH' })).toBeTruthy();
  });

  it('bấm Tải về lấy tệp gốc từ Kho rồi tải xuống', async () => {
    const restore = stubUrl();
    state.fetchBlob.mockResolvedValue(new Blob(['x']));
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    try {
      render(<DispatchManagementView />);
      fireEvent.click(screen.getByRole('button', { name: 'Tải về văn bản 2753/2026/TB-BĐH' }));
      await waitFor(() => expect(click).toHaveBeenCalled());
      expect(state.fetchBlob).toHaveBeenCalledWith(expect.objectContaining({ kind: 'goc', path: 'vb/2753.pdf' }));
    } finally {
      click.mockRestore();
      restore();
    }
  });

  it('văn bản chưa có tệp thì nút Tải về bị khóa', () => {
    render(<DispatchManagementView />);
    const btn = screen.getByRole('button', { name: 'Tải về văn bản HD-01' }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);
    expect(state.fetchBlob).not.toHaveBeenCalled();
  });

  it('tệp đã bị xóa khỏi Kho: hiện lỗi rõ ràng ở đầu trang', async () => {
    state.fetchBlob.mockRejectedValue(new Error('Tệp "2753.pdf" không còn trong Kho lưu trữ.'));
    render(<DispatchManagementView />);
    fireEvent.click(screen.getByRole('button', { name: 'Tải về văn bản 2753/2026/TB-BĐH' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/không còn trong Kho lưu trữ/);
  });
});

describe('Văn thư - sắp xếp theo cột', () => {
  it('mặc định đánh dấu cột Ban hành giảm dần, cột khác chưa sắp', () => {
    state.hook = makeHook();
    render(<DispatchManagementView />);
    const col = (name: string) => screen.getByRole('columnheader', { name });
    expect(col('Ban hành').getAttribute('aria-sort')).toBe('descending');
    expect(col('Số hiệu').getAttribute('aria-sort')).toBe('none');
  });

  it('bấm tiêu đề cột gọi sắp xếp đúng khóa', () => {
    const hook = makeHook();
    state.hook = hook;
    render(<DispatchManagementView />);
    fireEvent.click(within(screen.getByRole('columnheader', { name: 'Số hiệu' })).getByRole('button'));
    fireEvent.click(within(screen.getByRole('columnheader', { name: 'Hết hiệu lực' })).getByRole('button'));
    expect(hook.toggleSort).toHaveBeenNthCalledWith(1, 'docNumber');
    expect(hook.toggleSort).toHaveBeenNthCalledWith(2, 'effectiveTo');
  });

  it('cột Tình trạng và Thao tác không sắp xếp', () => {
    state.hook = makeHook();
    render(<DispatchManagementView />);
    expect(within(screen.getByRole('columnheader', { name: 'Tình trạng' })).queryByRole('button')).toBeNull();
  });
});

describe('Văn thư - tải cả bộ tệp dạng ZIP', () => {
  const bundle = doc({
    files: [
      { kind: 'goc', repoId: 'o/vt', path: 'vb/2753.pdf', name: '2753.pdf' },
      { kind: 'bieu-mau', repoId: 'o/bm', path: 'bm/to-trinh.docx', name: 'to-trinh.docx' },
      { kind: 'bieu-mau', repoId: 'o/bm', path: 'bm/hop-dong.docx', name: 'hop-dong.docx' },
      { kind: 'bieu-mau', repoId: 'o/bm', path: 'bm/phu-luc.xlsx', name: 'phu-luc.xlsx' },
    ],
  });

  const openBundle = () => {
    state.hook = makeHook({ docs: [bundle], total: 1 });
    render(<DispatchManagementView />);
    fireEvent.click(screen.getByRole('button', { name: 'Xem văn bản 2753/2026/TB-BĐH' }));
    return screen.getByRole('dialog', { name: 'Xem văn bản' });
  };

  it('chỉ nhóm có nhiều tệp mới có nút Tải tất cả (ZIP)', () => {
    const dlg = openBundle();
    expect(within(dlg).getAllByRole('button', { name: 'Tải tất cả (ZIP)' })).toHaveLength(1);
  });

  it('một tệp mỗi nhóm thì không có nút Tải tất cả', () => {
    state.hook = makeHook();
    render(<DispatchManagementView />);
    fireEvent.click(screen.getByRole('button', { name: 'Xem văn bản 2753/2026/TB-BĐH' }));
    expect(screen.queryByRole('button', { name: 'Tải tất cả (ZIP)' })).toBeNull();
  });

  it('bấm Tải tất cả: tải từng biểu mẫu từ Kho, nén một ZIP đặt theo số hiệu và lưu về máy', async () => {
    state.fetchBlob.mockImplementation(async (f: { name: string }) => new Blob([f.name]));
    state.zip.mockResolvedValue(new Blob(['zip']));
    const original = URL.createObjectURL;
    URL.createObjectURL = vi.fn().mockReturnValue('blob:zip');
    const names: string[] = [];
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      names.push(this.download);
    });
    try {
      const dlg = openBundle();
      fireEvent.click(within(dlg).getByRole('button', { name: 'Tải tất cả (ZIP)' }));
      await waitFor(() => expect(names).toEqual(['2753-2026-tb-bdh-bieu-mau.zip']));
      expect(state.fetchBlob).toHaveBeenCalledTimes(3);
      expect(state.zip).toHaveBeenCalledWith([
        { name: 'to-trinh.docx', blob: expect.any(Blob) },
        { name: 'hop-dong.docx', blob: expect.any(Blob) },
        { name: 'phu-luc.xlsx', blob: expect.any(Blob) },
      ]);
    } finally {
      URL.createObjectURL = original;
      clickSpy.mockRestore();
    }
  });

  it('một tệp tải lỗi thì báo rõ và không đưa ZIP thiếu', async () => {
    state.zip.mockClear();
    state.fetchBlob.mockImplementation(async (f: { name: string }) => {
      if (f.name === 'hop-dong.docx') throw new Error('Tệp "hop-dong.docx" không còn trong Kho lưu trữ.');
      return new Blob(['x']);
    });
    const dlg = openBundle();
    fireEvent.click(within(dlg).getByRole('button', { name: 'Tải tất cả (ZIP)' }));
    expect((await within(dlg).findByRole('alert')).textContent).toMatch(/"hop-dong.docx" không còn trong Kho/);
    expect(state.zip).not.toHaveBeenCalled();
  });
});

describe('Văn thư - điện thoại', () => {
  beforeEach(() => {
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

  it('hiện thẻ thay cho bảng, vẫn đủ số hiệu, tiêu đề, ngày, tình trạng', () => {
    state.hook = makeHook();
    render(<DispatchManagementView />);
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText('2753/2026/TB-BĐH')).toBeTruthy();
    expect(screen.getByText('Chương trình lãi suất cho vay trung dài hạn KHCN')).toBeTruthy();
    expect(screen.getAllByText('Ban hành').length).toBeGreaterThan(0);
  });

  it('thẻ có đủ nút Xem, Tải về như bảng', () => {
    state.hook = makeHook();
    render(<DispatchManagementView />);
    expect(screen.getByRole('button', { name: 'Xem văn bản 2753/2026/TB-BĐH' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tải về văn bản 2753/2026/TB-BĐH' })).toBeTruthy();
  });

  it('thanh sắp xếp: đổi cột và đảo chiều', () => {
    const hook = makeHook();
    state.hook = hook;
    render(<DispatchManagementView />);
    fireEvent.change(screen.getByLabelText('Sắp xếp'), { target: { value: 'docNumber' } });
    expect(hook.toggleSort).toHaveBeenLastCalledWith('docNumber');
    fireEvent.click(screen.getByRole('button', { name: /Đang giảm dần/ }));
    expect(hook.toggleSort).toHaveBeenLastCalledWith('issuedDate');
  });

  it('không có văn bản thì báo trống, không phải bảng rỗng', () => {
    state.hook = makeHook({ docs: [], total: 0 });
    render(<DispatchManagementView />);
    expect(screen.getByText('Không có văn bản nào phù hợp.')).toBeTruthy();
  });
});

describe('Văn thư - mục Kho tệp (kho Văn thư và Biểu mẫu)', () => {
  it('Master Admin có mục Kho tệp, bấm vào thì mở kho Văn thư/Biểu mẫu nhúng trong tab', () => {
    state.role = 'master_admin';
    state.hook = makeHook();
    render(<DispatchManagementView />);
    fireEvent.click(screen.getByRole('button', { name: 'Kho tệp' }));
    expect(screen.getByText('KHO TỆP dispatch true')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('bấm lại một mục văn bản thì về danh mục', () => {
    state.role = 'master_admin';
    state.hook = makeHook();
    render(<DispatchManagementView />);
    fireEvent.click(screen.getByRole('button', { name: 'Kho tệp' }));
    fireEvent.click(screen.getByRole('button', { name: /Tất cả/ }));
    expect(screen.queryByText(/KHO TỆP/)).toBeNull();
    expect(screen.getByRole('table')).toBeTruthy();
  });

  it('User Admin và user không có mục Kho tệp', () => {
    for (const role of ['user_admin', 'user']) {
      state.role = role;
      state.hook = makeHook();
      const { unmount } = render(<DispatchManagementView />);
      expect(screen.queryByRole('button', { name: 'Kho tệp' }), role).toBeNull();
      unmount();
    }
  });
});
