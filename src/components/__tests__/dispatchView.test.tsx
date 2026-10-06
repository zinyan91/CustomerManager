// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import type { DispatchDocument } from '../../types/dispatch';

const state = vi.hoisted(() => ({ role: 'user', archive: null as unknown }));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    role: state.role,
    user: { id: 'u' },
    can: (cap: string) => {
      const granted: Record<string, string[]> = {
        'storage.configure': ['master_admin'],
        'storage.delete': ['master_admin', 'user_admin'],
        'dispatch.upload': ['master_admin', 'user_admin'],
      };
      return (granted[cap] ?? []).includes(state.role);
    },
  }),
}));
vi.mock('../../hooks/useArchive', () => ({ useArchive: () => state.archive }));
vi.mock('../ai/AiChatDialog', () => ({ AiChatDialog: () => null }));
vi.mock('../dispatch/DispatchPreviewModal', () => ({ DispatchPreviewModal: () => null }));
vi.mock('../dispatch/DispatchUploadModal', () => ({
  DispatchUploadModal: (p: { isOpen: boolean; defaultCategory: string; rootFolder: string }) =>
    p.isOpen ? <div>UPLOAD {p.defaultCategory} @{p.rootFolder}</div> : null,
}));
vi.mock('../storage/StorageSettingsModal', () => ({
  StorageSettingsModal: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div>MODAL CẤU HÌNH</div> : null),
}));
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
    }),
  },
}));

import { DispatchManagementView } from '../views/DispatchManagementView';

const doc = (id: string, title: string, folderPath: string, documentType: DispatchDocument['documentType']): DispatchDocument => ({
  id,
  documentNumber: `S${id}`,
  title,
  documentType,
  issuer: 'NH',
  documentDate: '2026-01-01',
  receivedDate: '2026-01-02',
  customerId: null,
  fileName: `${title}.pdf`,
  fileSize: 1024,
  fileType: 'application/pdf',
  fileUrl: 'u',
  filePath: `${folderPath}/${title}.pdf`,
  folderPath,
  repoId: 'own/van-thu-tin-dung',
  storageProvider: 'huggingface',
  createdAt: '',
  updatedAt: '',
});

const DOCS = [
  doc('1', 'Quyết định 112', 'van-thu/van-ban/2026', 'quyet_dinh'),
  doc('2', 'Hợp đồng Alpha', 'van-thu/hop-dong/2026', 'hop_dong'),
  doc('3', 'Hợp đồng Beta', 'van-thu/hop-dong/2025', 'hop_dong'),
  doc('4', 'Công văn 9', 'van-thu/cong-van/2026', 'cong_van'),
];

beforeEach(() => {
  state.role = 'user';
  state.archive = {
    auth: { token: 't' },
    allRepos: [],
    config: { token: 't', repoId: 'own/van-thu-tin-dung', folder: 'van-thu' },
    documents: DOCS,
    setDocuments: vi.fn(),
    status: { kind: 'ready' },
    reload: vi.fn().mockResolvedValue(undefined),
    reloadRepos: vi.fn(),
  };
});
afterEach(cleanup);

const nav = () => screen.getByRole('navigation', { name: 'Mục văn thư' });

describe('Văn thư - sidebar riêng', () => {
  it('có đủ Tất cả, Văn bản, Hợp đồng, Công văn, Khác kèm số lượng', () => {
    render(<DispatchManagementView />);
    const items = within(nav()).getAllByRole('button').map((b) => b.textContent);
    expect(items).toEqual(['Tất cả4', 'Văn bản1', 'Hợp đồng2', 'Công văn1', 'Khác0']);
  });

  it('chọn một mục thì chỉ còn văn bản của mục đó', () => {
    render(<DispatchManagementView />);
    fireEvent.click(within(nav()).getByRole('button', { name: /Hợp đồng/ }));

    expect(screen.getByText('Hợp đồng Alpha')).toBeTruthy();
    expect(screen.getByText('Hợp đồng Beta')).toBeTruthy();
    expect(screen.queryByText('Quyết định 112')).toBeNull();
    expect(screen.queryByText('Công văn 9')).toBeNull();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Hợp đồng');
  });

  it('mục đang chọn được đánh dấu aria-current', () => {
    render(<DispatchManagementView />);
    fireEvent.click(within(nav()).getByRole('button', { name: /Công văn/ }));
    expect(within(nav()).getByRole('button', { name: /Công văn/ }).getAttribute('aria-current')).toBe('page');
    expect(within(nav()).getByRole('button', { name: /Tất cả/ }).getAttribute('aria-current')).toBeNull();
  });
});

describe('Văn thư - phân quyền', () => {
  it('user chỉ xem và tải: không có nút tải lên, không có nút xóa, không có cấu hình', () => {
    render(<DispatchManagementView />);
    expect(screen.queryByRole('button', { name: /Tải văn thư mới/ })).toBeNull();
    expect(screen.queryByTitle('Xóa văn bản này')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cấu hình kho lưu trữ' })).toBeNull();
  });

  it('User Admin upload được và nơi bỏ vào mặc định theo mục đang chọn; không có cấu hình', () => {
    state.role = 'user_admin';
    render(<DispatchManagementView />);
    fireEvent.click(within(nav()).getByRole('button', { name: /Hợp đồng/ }));
    fireEvent.click(screen.getByRole('button', { name: /Tải văn thư mới/ }));

    expect(screen.getByText('UPLOAD hop-dong @van-thu')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Cấu hình kho lưu trữ' })).toBeNull();
    expect(screen.getAllByTitle('Xóa văn bản này').length).toBeGreaterThan(0);
  });

  it('mục Tất cả thì mặc định bỏ vào Văn bản', () => {
    state.role = 'master_admin';
    render(<DispatchManagementView />);
    fireEvent.click(screen.getByRole('button', { name: /Tải văn thư mới/ }));
    expect(screen.getByText('UPLOAD van-ban @van-thu')).toBeTruthy();
  });

  it('chỉ Master Admin thấy nút cấu hình', () => {
    state.role = 'master_admin';
    render(<DispatchManagementView />);
    fireEvent.click(screen.getByRole('button', { name: 'Cấu hình kho lưu trữ' }));
    expect(screen.getByText('MODAL CẤU HÌNH')).toBeTruthy();
  });

  it('chưa cấu hình repo: admin không có nút tải lên và thấy hướng dẫn tạo repo', () => {
    state.role = 'master_admin';
    state.archive = { ...(state.archive as object), config: null, status: { kind: 'no_repo' }, documents: [] };
    render(<DispatchManagementView />);
    expect(screen.queryByRole('button', { name: /Tải văn thư mới/ })).toBeNull();
    expect(screen.getByRole('alert').textContent).toMatch(/tạo repo/);
  });
});
