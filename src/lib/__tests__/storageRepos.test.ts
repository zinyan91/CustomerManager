import { describe, it, expect } from 'vitest';
import type { StorageRepo } from '../../types/storageRepo';
import {
  slugifyRepoName,
  buildRepoId,
  suggestPersonalRepoSlug,
  mapRepoRow,
  reposForStorage,
  dispatchRepoOf,
  repoLabel,
  canUploadToRepo,
  canDeleteInRepo,
  canManageRepos,
  toHfConfig,
  validateRepoInput,
} from '../storageRepos';

const repo = (over: Partial<StorageRepo>): StorageRepo => ({
  id: 1,
  name: 'R',
  repoId: 'own/r',
  folder: '',
  kind: 'shared',
  assignedUserId: null,
  createdAt: '',
  ...over,
});

const SHARED = repo({ id: 1, name: 'Kho chung', kind: 'shared' });
const MINE = repo({ id: 2, name: 'Kho A', kind: 'personal', assignedUserId: 'u-a' });
const OTHER = repo({ id: 3, name: 'Kho B', kind: 'personal', assignedUserId: 'u-b' });
const VT = repo({ id: 4, name: 'Văn thư', kind: 'dispatch', repoId: 'own/van-thu-tin-dung' });

describe('slugifyRepoName / buildRepoId', () => {
  it('bỏ dấu tiếng Việt, đ thành d, ký tự lạ thành gạch ngang', () => {
    expect(slugifyRepoName('Văn thư Tín dụng')).toBe('van-thu-tin-dung');
    expect(slugifyRepoName('Đặng Thị Ánh!!')).toBe('dang-thi-anh');
    expect(slugifyRepoName('  --a__b--  ')).toBe('a-b');
  });

  it('cắt độ dài 60 và không để gạch ngang ở cuối', () => {
    const s = slugifyRepoName('a'.repeat(59) + ' bbb');
    expect(s.length).toBeLessThanOrEqual(60);
    expect(s.endsWith('-')).toBe(false);
  });

  it('chuỗi chỉ có ký tự lạ cho slug rỗng', () => {
    expect(slugifyRepoName('!!!')).toBe('');
  });

  it('buildRepoId cần cả owner và slug', () => {
    expect(buildRepoId('zinya', 'Văn thư Tín dụng')).toBe('zinya/van-thu-tin-dung');
    expect(buildRepoId('', 'abc')).toBe('');
    expect(buildRepoId('zinya', '!!!')).toBe('');
  });

  it('tên gợi ý cho repo cá nhân, có mặc định khi tên rỗng', () => {
    expect(suggestPersonalRepoSlug('Nguyễn Văn A')).toBe('cm-kho-nguyen-van-a');
    expect(suggestPersonalRepoSlug('')).toBe('cm-kho-user');
  });
});

describe('mapRepoRow', () => {
  it('ép kiểu và bỏ gạch chéo thừa ở thư mục', () => {
    const r = mapRepoRow({ Id: '7', Name: 'N', RepoId: 'a/b', Folder: '/van-thu/', Kind: 'personal', AssignedUserId: 'u', CreatedAt: 't' });
    expect(r).toMatchObject({ id: 7, folder: 'van-thu', kind: 'personal', assignedUserId: 'u' });
    expect(mapRepoRow({ Id: 1, Name: 'N', RepoId: 'a/b', Kind: 'shared' }).folder).toBe('');
    expect(mapRepoRow({ Id: 1, Name: 'N', RepoId: 'a/b', Kind: 'shared' }).assignedUserId).toBeNull();
  });
});

describe('reposForStorage', () => {
  const all = [OTHER, VT, MINE, SHARED];

  it('user: Kho chung rồi kho của mình, không thấy kho người khác và Văn thư', () => {
    expect(reposForStorage(all, 'user', 'u-a').map((r) => r.id)).toEqual([1, 2]);
  });

  it('admin: thấy mọi kho (trừ Văn thư), kho của mình đứng trước kho người khác', () => {
    expect(reposForStorage(all, 'user_admin', 'u-a').map((r) => r.id)).toEqual([1, 2, 3]);
    expect(reposForStorage(all, 'master_admin', 'u-b').map((r) => r.id)).toEqual([1, 3, 2]);
  });

  it('user chưa được gán kho cá nhân chỉ thấy Kho chung', () => {
    expect(reposForStorage(all, 'user', 'u-moi').map((r) => r.id)).toEqual([1]);
  });

  it('dispatchRepoOf lấy repo văn thư hoặc null', () => {
    expect(dispatchRepoOf(all)?.id).toBe(4);
    expect(dispatchRepoOf([SHARED])).toBeNull();
  });
});

describe('repoLabel', () => {
  it('nhãn theo loại và chủ sở hữu', () => {
    expect(repoLabel(SHARED, 'u-a')).toBe('Kho chung');
    expect(repoLabel(VT, 'u-a')).toBe('Văn thư');
    expect(repoLabel(MINE, 'u-a')).toBe('Kho của tôi');
    expect(repoLabel(OTHER, 'u-a', 'Trần B')).toBe('Kho của Trần B');
    expect(repoLabel(OTHER, 'u-a')).toBe('Kho B');
  });
});

describe('quyền theo repo', () => {
  it('upload: user được ở Kho chung và kho của mình; không ở kho người khác hay Văn thư', () => {
    expect(canUploadToRepo('user', 'u-a', SHARED)).toBe(true);
    expect(canUploadToRepo('user', 'u-a', MINE)).toBe(true);
    expect(canUploadToRepo('user', 'u-a', OTHER)).toBe(false);
    expect(canUploadToRepo('user', 'u-a', VT)).toBe(false);
  });

  it('upload: admin được ở mọi repo; thiếu repo hoặc vai trò thì không', () => {
    for (const r of [SHARED, MINE, OTHER, VT]) {
      expect(canUploadToRepo('master_admin', 'x', r)).toBe(true);
      expect(canUploadToRepo('user_admin', 'x', r)).toBe(true);
    }
    expect(canUploadToRepo('user', 'u-a', null)).toBe(false);
    expect(canUploadToRepo(null, 'u-a', SHARED)).toBe(false);
  });

  it('xóa: user chỉ trong kho cá nhân của mình; admin mọi repo', () => {
    expect(canDeleteInRepo('user', 'u-a', MINE)).toBe(true);
    expect(canDeleteInRepo('user', 'u-a', SHARED)).toBe(false);
    expect(canDeleteInRepo('user', 'u-a', OTHER)).toBe(false);
    expect(canDeleteInRepo('user', 'u-a', VT)).toBe(false);
    expect(canDeleteInRepo('user_admin', 'x', SHARED)).toBe(true);
    expect(canDeleteInRepo('master_admin', 'x', VT)).toBe(true);
    expect(canDeleteInRepo('user', null, repo({ kind: 'personal', assignedUserId: null }))).toBe(false);
  });

  it('chỉ Master Admin quản lý repo', () => {
    expect(canManageRepos('master_admin')).toBe(true);
    expect(canManageRepos('user_admin')).toBe(false);
    expect(canManageRepos('user')).toBe(false);
    expect(canManageRepos(null)).toBe(false);
  });
});

describe('toHfConfig', () => {
  it('ghép token với repo, null khi thiếu một trong hai', () => {
    expect(toHfConfig('hf_t', repo({ repoId: 'o/r', folder: 'f' }))).toEqual({ token: 'hf_t', repoId: 'o/r', folder: 'f', isPrivate: true });
    expect(toHfConfig('', SHARED)).toBeNull();
    expect(toHfConfig('hf_t', null)).toBeNull();
  });
});

describe('validateRepoInput', () => {
  const ok = { name: 'Kho A', repoId: 'own/cm-kho-a', kind: 'personal' as const, assignedUserId: 'u-a' };

  it('đầu vào đúng thì hợp lệ', () => {
    expect(validateRepoInput(ok)).toBeNull();
    expect(validateRepoInput({ name: 'Chung', repoId: 'own/Chung_1.v2', kind: 'shared' })).toBeNull();
  });

  it('thiếu tên hoặc repoId sai dạng', () => {
    expect(validateRepoInput({ ...ok, name: '  ' })).toMatch(/tên/);
    for (const bad of ['', 'own', 'own/', '/r', 'own/r/x', 'own/có dấu', 'own /r', '-own/r']) {
      expect(validateRepoInput({ ...ok, repoId: bad }), bad).toMatch(/owner/);
    }
  });

  it('repo cá nhân bắt buộc có người được gán; loại khác thì không được gán', () => {
    expect(validateRepoInput({ ...ok, assignedUserId: null })).toMatch(/tài khoản/);
    expect(validateRepoInput({ name: 'C', repoId: 'o/c', kind: 'shared', assignedUserId: 'u' })).toMatch(/Chỉ repo cá nhân/);
    expect(validateRepoInput({ name: 'V', repoId: 'o/v', kind: 'dispatch', assignedUserId: 'u' })).toMatch(/Chỉ repo cá nhân/);
  });
});
