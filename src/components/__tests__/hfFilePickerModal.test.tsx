// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import type { StorageRepo } from '../../types/storageRepo';

const m = vi.hoisted(() => ({ listRepos: vi.fn(), listTree: vi.fn() }));

vi.mock('../../lib/api/storageReposApi', () => ({ listStorageRepos: m.listRepos }));
vi.mock('../../lib/huggingface/hfClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/huggingface/hfClient')>()),
  listHfTree: m.listTree,
}));

import { HfFilePickerModal } from '../dispatch/HfFilePickerModal';

const repo = (id: number, kind: StorageRepo['kind'], name: string): StorageRepo => ({
  id, name, repoId: `o/r${id}`, folder: '', kind, assignedUserId: null, createdAt: '',
});
const entry = (path: string) => ({ type: 'file', name: path.split('/').pop(), path, size: 10, downloadUrl: '' });

const ALL = [repo(1, 'shared', 'Kho chung'), repo(2, 'dispatch', 'Văn thư'), repo(3, 'form', 'Biểu mẫu')];

beforeEach(() => {
  m.listRepos.mockReset().mockResolvedValue(ALL);
  m.listTree.mockReset().mockImplementation(async (repoId: string) =>
    repoId === 'o/r2' ? [entry('van-ban.pdf')] : repoId === 'o/r3' ? [entry('mau-01.docx')] : [entry('chung.pdf')]
  );
});
afterEach(cleanup);

const open = (fileKind: 'goc' | 'bieu-mau') =>
  render(<HfFilePickerModal fileKind={fileKind} title="t" token="tok" pickedKeys={new Set()} onPick={() => {}} onClose={() => {}} />);

describe('HfFilePickerModal theo loại tệp', () => {
  it('tệp gốc: chỉ mở kho Văn thư, không đụng Kho chung hay kho Biểu mẫu', async () => {
    open('goc');
    expect(await screen.findByText('van-ban.pdf')).toBeTruthy();
    expect(screen.getByRole('dialog', { name: 'Chọn tệp từ kho Văn thư' })).toBeTruthy();
    expect(m.listTree).toHaveBeenCalledTimes(1);
    expect(m.listTree.mock.calls[0][0]).toBe('o/r2');
    expect(screen.queryByText('chung.pdf')).toBeNull();
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  it('biểu mẫu: chỉ mở kho Biểu mẫu', async () => {
    open('bieu-mau');
    expect(await screen.findByText('mau-01.docx')).toBeTruthy();
    expect(screen.getByRole('dialog', { name: 'Chọn tệp từ kho Biểu mẫu' })).toBeTruthy();
    expect(m.listTree.mock.calls.map((c) => c[0])).toEqual(['o/r3']);
  });

  it('chọn tệp trả đúng kho, đường dẫn và tên', async () => {
    const onPick = vi.fn();
    render(<HfFilePickerModal fileKind="bieu-mau" title="t" token="tok" pickedKeys={new Set()} onPick={onPick} onClose={() => {}} />);
    fireEvent.click(await screen.findByText('mau-01.docx'));
    expect(onPick).toHaveBeenCalledWith({ repoId: 'o/r3', path: 'mau-01.docx', name: 'mau-01.docx' });
  });

  it('chưa có kho Biểu mẫu thì nói rõ và không nạp kho nào', async () => {
    m.listRepos.mockResolvedValue([repo(1, 'shared', 'Kho chung'), repo(2, 'dispatch', 'Văn thư')]);
    open('bieu-mau');
    expect((await screen.findByRole('alert')).textContent).toMatch(/Chưa có kho Biểu mẫu\. Liên hệ Master Admin để tạo kho Biểu mẫu/);
    await waitFor(() => expect(m.listRepos).toHaveBeenCalled());
    expect(m.listTree).not.toHaveBeenCalled();
  });

  it('chưa có kho Văn thư thì nói rõ cho tệp gốc', async () => {
    m.listRepos.mockResolvedValue([repo(1, 'shared', 'Kho chung')]);
    open('goc');
    expect((await screen.findByRole('alert')).textContent).toMatch(/Chưa có kho Văn thư/);
    expect(m.listTree).not.toHaveBeenCalled();
  });
});
