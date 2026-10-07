import { describe, it, expect } from 'vitest';
import type { StorageRepo } from '../../types/storageRepo';
import {
  slugifyRepoName,
  buildRepoId,
  suggestPersonalRepoSlug,
  mapRepoRow,
  reposForScope,
  splitStorageRepos,
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
const BM = repo({ id: 5, name: 'Biểu mẫu', kind: 'form', repoId: 'own/cm-bieu-mau' });

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

describe('reposForScope - Kho lưu trữ', () => {
  const all = [OTHER, BM, VT, MINE, SHARED];

  it('user: Kho chung rồi kho của mình, không thấy kho người khác, Văn thư, Biểu mẫu', () => {
    expect(reposForScope(all, 'user', 'u-a', 'storage').map((r) => r.id)).toEqual([1, 2]);
  });

  it('User Admin cũng chỉ có Kho chung và kho của mình: không quản lý Văn thư, Biểu mẫu, kho người khác', () => {
    expect(reposForScope(all, 'user_admin', 'u-a', 'storage').map((r) => r.id)).toEqual([1, 2]);
    expect(reposForScope(all, 'user_admin', 'u-x', 'storage').map((r) => r.id)).toEqual([1]);
  });

  it('Master Admin có thêm kho của người khác (để chọn), nhưng Văn thư và Biểu mẫu đã chuyển sang tab Văn thư', () => {
    expect(reposForScope(all, 'master_admin', 'u-a', 'storage').map((r) => r.id)).toEqual([1, 2, 3]);
    expect(reposForScope(all, 'master_admin', 'u-b', 'storage').map((r) => r.id)).toEqual([1, 3, 2]);
  });

  it('user chưa được gán kho cá nhân chỉ thấy Kho chung', () => {
    expect(reposForScope(all, 'user', 'u-moi', 'storage').map((r) => r.id)).toEqual([1]);
  });

  it('không có vai trò thì chỉ Kho chung theo luật chung, không lộ kho cá nhân', () => {
    expect(reposForScope(all, null, null, 'storage').map((r) => r.id)).toEqual([1]);
  });
});

describe('reposForScope - tab Văn thư', () => {
  const all = [OTHER, BM, VT, MINE, SHARED];

  it('chỉ Master Admin thấy kho Văn thư và Biểu mẫu, Văn thư đứng trước', () => {
    expect(reposForScope(all, 'master_admin', 'u-a', 'dispatch').map((r) => r.id)).toEqual([4, 5]);
  });

  it('User Admin và user không có kho nào ở đây', () => {
    expect(reposForScope(all, 'user_admin', 'u-a', 'dispatch')).toEqual([]);
    expect(reposForScope(all, 'user', 'u-a', 'dispatch')).toEqual([]);
  });
});

describe('splitStorageRepos', () => {
  it('kho hiện sẵn: Kho chung và kho của mình; kho người khác tách riêng để chọn khi cần', () => {
    const list = reposForScope([OTHER, MINE, SHARED], 'master_admin', 'u-a', 'storage');
    const { primary, others } = splitStorageRepos(list, 'u-a');
    expect(primary.map((r) => r.id)).toEqual([1, 2]);
    expect(others.map((r) => r.id)).toEqual([3]);
  });

  it('nhiều người dùng không làm dài danh sách hiện sẵn', () => {
    const many = Array.from({ length: 100 }, (_, i) => repo({ id: 100 + i, kind: 'personal', assignedUserId: `u-${i}`, name: `Kho ${i}` }));
    const { primary, others } = splitStorageRepos(reposForScope([SHARED, ...many], 'master_admin', 'u-a', 'storage'), 'u-a');
    expect(primary.map((r) => r.id)).toEqual([1]);
    expect(others).toHaveLength(100);
  });

  it('kho Văn thư và Biểu mẫu đều là kho hiện sẵn', () => {
    const { primary, others } = splitStorageRepos(reposForScope([VT, BM], 'master_admin', 'm', 'dispatch'), 'm');
    expect(primary.map((r) => r.id)).toEqual([4, 5]);
    expect(others).toEqual([]);
  });
});

describe('repoLabel', () => {
  it('nhãn theo loại và chủ sở hữu', () => {
    expect(repoLabel(SHARED, 'u-a')).toBe('Kho chung');
    expect(repoLabel(VT, 'u-a')).toBe('Văn thư');
    expect(repoLabel(BM, 'u-a')).toBe('Biểu mẫu');
    expect(repoLabel(MINE, 'u-a')).toBe('Kho của tôi');
    expect(repoLabel(OTHER, 'u-a', 'Trần B')).toBe('Kho của Trần B');
    expect(repoLabel(OTHER, 'u-a')).toBe('Kho B');
  });
});

describe('quyền theo repo', () => {
  it('upload: user được ở Kho chung và kho của mình; không ở kho người khác, Văn thư, Biểu mẫu', () => {
    expect(canUploadToRepo('user', 'u-a', SHARED)).toBe(true);
    expect(canUploadToRepo('user', 'u-a', MINE)).toBe(true);
    expect(canUploadToRepo('user', 'u-a', OTHER)).toBe(false);
    expect(canUploadToRepo('user', 'u-a', VT)).toBe(false);
    expect(canUploadToRepo('user', 'u-a', BM)).toBe(false);
  });

  it('upload: User Admin giống user, không quản lý kho Văn thư, Biểu mẫu hay kho người khác', () => {
    expect(canUploadToRepo('user_admin', 'u-a', SHARED)).toBe(true);
    expect(canUploadToRepo('user_admin', 'u-a', MINE)).toBe(true);
    expect(canUploadToRepo('user_admin', 'u-a', OTHER)).toBe(false);
    expect(canUploadToRepo('user_admin', 'u-a', VT)).toBe(false);
    expect(canUploadToRepo('user_admin', 'u-a', BM)).toBe(false);
  });

  it('upload: Master Admin ở mọi repo; thiếu repo hoặc vai trò thì không', () => {
    for (const r of [SHARED, MINE, OTHER, VT, BM]) expect(canUploadToRepo('master_admin', 'x', r)).toBe(true);
    expect(canUploadToRepo('user', 'u-a', null)).toBe(false);
    expect(canUploadToRepo(null, 'u-a', SHARED)).toBe(false);
  });

  it('xóa: user chỉ trong kho cá nhân của mình', () => {
    expect(canDeleteInRepo('user', 'u-a', MINE)).toBe(true);
    expect(canDeleteInRepo('user', 'u-a', SHARED)).toBe(false);
    expect(canDeleteInRepo('user', 'u-a', OTHER)).toBe(false);
    expect(canDeleteInRepo('user', 'u-a', VT)).toBe(false);
    expect(canDeleteInRepo('user', null, repo({ kind: 'personal', assignedUserId: null }))).toBe(false);
  });

  it('xóa: User Admin ở Kho chung và kho của mình, không ở Văn thư, Biểu mẫu, kho người khác; Master Admin mọi repo', () => {
    expect(canDeleteInRepo('user_admin', 'u-a', SHARED)).toBe(true);
    expect(canDeleteInRepo('user_admin', 'u-a', MINE)).toBe(true);
    expect(canDeleteInRepo('user_admin', 'u-a', OTHER)).toBe(false);
    expect(canDeleteInRepo('user_admin', 'u-a', VT)).toBe(false);
    expect(canDeleteInRepo('user_admin', 'u-a', BM)).toBe(false);
    for (const r of [SHARED, MINE, OTHER, VT, BM]) expect(canDeleteInRepo('master_admin', 'x', r)).toBe(true);
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
