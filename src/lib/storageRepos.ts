import type { HfConfig } from '../types/huggingface';
import type { StorageProviderId, StorageRepo, StorageRepoKind } from '../types/storageRepo';
import { isMasterAdminRole } from './permissions';

const VI_MAP: Record<string, string> = { đ: 'd', Đ: 'd' };

/** Chuẩn hóa tên thành slug hợp lệ cho repo HF: chữ thường, không dấu, nối bằng "-". */
export function slugifyRepoName(input: string): string {
  const slug = input
    .replace(/[đĐ]/g, (c) => VI_MAP[c])
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
  return slug;
}

/** Tên repo HF đầy đủ owner/slug. Trả chuỗi rỗng nếu thiếu owner hoặc slug rỗng. */
export function buildRepoId(namespace: string, slug: string): string {
  const ns = namespace.trim();
  const s = slugifyRepoName(slug);
  return ns && s ? `${ns}/${s}` : '';
}

/** Tên gợi ý cho repo cá nhân của một user. */
export function suggestPersonalRepoSlug(fullName: string): string {
  const base = slugifyRepoName(fullName) || 'user';
  return `cm-kho-${base}`;
}

export function mapRepoRow(row: {
  Id: number | string;
  Name: string;
  RepoId: string;
  Folder?: string | null;
  Kind: string;
  Provider?: string | null;
  AssignedUserId?: string | null;
  CreatedAt?: string;
}): StorageRepo {
  return {
    id: Number(row.Id),
    name: row.Name,
    repoId: row.RepoId,
    provider: row.Provider === 'drive' ? 'drive' : 'huggingface',
    folder: (row.Folder ?? '').replace(/^\/+|\/+$/g, ''),
    kind: row.Kind as StorageRepoKind,
    assignedUserId: row.AssignedUserId ?? null,
    createdAt: row.CreatedAt ?? '',
  };
}

/** Màn dùng kho: Kho lưu trữ (kho chung, kho cá nhân) hoặc Văn thư (kho Văn thư, kho Biểu mẫu). */
export type StorageScope = 'storage' | 'dispatch';

const isOwnPersonal = (r: StorageRepo, userId: string | null) => r.kind === 'personal' && r.assignedUserId !== null && r.assignedUserId === userId;

/**
 * Repo dùng được trong một màn.
 * Kho lưu trữ: ai cũng có Kho chung và kho của mình; Master Admin có thêm kho của người khác (chỉ để chọn khi cần).
 * Văn thư: kho Văn thư và kho Biểu mẫu, chỉ Master Admin; các vai trò khác dùng chúng qua danh mục văn bản.
 */
export function reposForScope(repos: StorageRepo[], role: string | null | undefined, userId: string | null, scope: StorageScope): StorageRepo[] {
  const master = isMasterAdminRole(role);
  const list = repos.filter((r) => {
    if (scope === 'dispatch') return master && (r.kind === 'dispatch' || r.kind === 'form');
    if (r.kind === 'shared') return true;
    if (r.kind === 'personal') return master || isOwnPersonal(r, userId);
    return false;
  });
  // Kho chung đứng đầu, rồi Văn thư, Biểu mẫu, rồi kho của chính mình, rồi các kho cá nhân khác
  const rank = (r: StorageRepo) =>
    r.kind === 'shared' ? 0 : r.kind === 'dispatch' ? 1 : r.kind === 'form' ? 2 : r.assignedUserId === userId ? 3 : 4;
  return [...list].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, 'vi'));
}

/** Kho hiện sẵn thành tab, và kho của người khác (nhiều, chỉ hiện khi cần chọn). */
export function splitStorageRepos(repos: StorageRepo[], userId: string | null): { primary: StorageRepo[]; others: StorageRepo[] } {
  const primary = repos.filter((r) => r.kind !== 'personal' || isOwnPersonal(r, userId));
  return { primary, others: repos.filter((r) => !primary.includes(r)) };
}

/** Nhãn hiển thị; ownerName là tên người được gán (dùng cho admin xem kho của người khác). */
export function repoLabel(repo: StorageRepo, userId: string | null, ownerName?: string): string {
  if (repo.kind === 'shared') return 'Kho chung';
  if (repo.kind === 'dispatch') return 'Văn thư';
  if (repo.kind === 'form') return 'Biểu mẫu';
  if (repo.assignedUserId && repo.assignedUserId === userId) return 'Kho của tôi';
  return ownerName ? `Kho của ${ownerName}` : repo.name;
}

/**
 * Quyền upload theo repo. Lưu ý: đây là quy tắc giao diện — mọi tài khoản đều đọc được token
 * chung nên không thể ép buộc ở tầng HF (xem spec mục Rủi ro).
 * Master Admin ở mọi repo; các vai trò khác chỉ ở Kho chung và kho cá nhân của mình
 * (User Admin không quản lý kho Văn thư, kho Biểu mẫu hay kho của người khác).
 */
export function canUploadToRepo(role: string | null | undefined, userId: string | null, repo: StorageRepo | null): boolean {
  if (!repo || !role) return false;
  if (isMasterAdminRole(role)) return true;
  return repo.kind === 'shared' || isOwnPersonal(repo, userId);
}

/** Xóa: Master Admin mọi repo; User Admin ở Kho chung và kho của mình; user chỉ trong kho cá nhân của mình. */
export function canDeleteInRepo(role: string | null | undefined, userId: string | null, repo: StorageRepo | null): boolean {
  if (!repo || !role) return false;
  if (isMasterAdminRole(role)) return true;
  if (isOwnPersonal(repo, userId)) return true;
  return role === 'user_admin' && repo.kind === 'shared';
}

/** Chỉ Master Admin tạo và gán repo. */
export function canManageRepos(role: string | null | undefined): boolean {
  return isMasterAdminRole(role);
}

export interface RepoInput {
  name: string;
  repoId: string;
  kind: StorageRepoKind;
  assignedUserId?: string | null;
  /** Mặc định Hugging Face. */
  provider?: StorageProviderId;
}

export const DRIVE_FOLDER_ID_PATTERN = /^[A-Za-z0-9_-]{10,}$/;

/** Kiểm tra đầu vào tạo repo; trả thông điệp lỗi hoặc null nếu hợp lệ. */
export function validateRepoInput(input: RepoInput): string | null {
  if (!input.name.trim()) return 'Nhập tên hiển thị của repo.';
  if (input.provider === 'drive') {
    if (!DRIVE_FOLDER_ID_PATTERN.test(input.repoId)) {
      return 'ID thư mục Google Drive chỉ gồm chữ không dấu, số, "-" hoặc "_" (từ 10 ký tự).';
    }
  } else if (!/^[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(input.repoId)) {
    return 'Repository ID cần dạng owner/ten-repo, chỉ gồm chữ không dấu, số, "-", "_" hoặc ".".';
  }
  if (input.kind === 'personal' && !input.assignedUserId) return 'Chọn tài khoản được gán repo cá nhân.';
  if (input.kind !== 'personal' && input.assignedUserId) return 'Chỉ repo cá nhân mới gán cho tài khoản.';
  return null;
}

/** Ghép token chung với một repo thành cấu hình kết nối HF. */
export function toHfConfig(token: string, repo: StorageRepo | null): HfConfig | null {
  // Repo Google Drive không dùng token Hugging Face
  if (!repo || !token || repo.provider !== 'huggingface') return null;
  return { token, repoId: repo.repoId, folder: repo.folder, isPrivate: true };
}
