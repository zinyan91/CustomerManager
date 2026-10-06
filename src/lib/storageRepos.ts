import type { HfConfig } from '../types/huggingface';
import type { StorageRepo, StorageRepoKind } from '../types/storageRepo';
import { isAdminRole, isMasterAdminRole } from './permissions';

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
  AssignedUserId?: string | null;
  CreatedAt?: string;
}): StorageRepo {
  return {
    id: Number(row.Id),
    name: row.Name,
    repoId: row.RepoId,
    folder: (row.Folder ?? '').replace(/^\/+|\/+$/g, ''),
    kind: row.Kind as StorageRepoKind,
    assignedUserId: row.AssignedUserId ?? null,
    createdAt: row.CreatedAt ?? '',
  };
}

/**
 * Repo hiện trong màn Kho lưu trữ.
 * Admin thấy mọi repo, kể cả kho Văn thư (nơi để tệp cho các văn bản); user thấy Kho chung
 * và repo gán cho mình.
 */
export function reposForStorage(repos: StorageRepo[], role: string | null | undefined, userId: string | null): StorageRepo[] {
  const list = repos.filter((r) => {
    if (isAdminRole(role)) return true;
    return r.kind === 'shared' || (r.kind === 'personal' && r.assignedUserId !== null && r.assignedUserId === userId);
  });
  // Kho chung đứng đầu, rồi Văn thư, rồi kho của chính mình, rồi các kho cá nhân khác
  const rank = (r: StorageRepo) => (r.kind === 'shared' ? 0 : r.kind === 'dispatch' ? 1 : r.assignedUserId === userId ? 2 : 3);
  return [...list].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, 'vi'));
}

/** Nhãn hiển thị; ownerName là tên người được gán (dùng cho admin xem kho của người khác). */
export function repoLabel(repo: StorageRepo, userId: string | null, ownerName?: string): string {
  if (repo.kind === 'shared') return 'Kho chung';
  if (repo.kind === 'dispatch') return 'Văn thư';
  if (repo.assignedUserId && repo.assignedUserId === userId) return 'Kho của tôi';
  return ownerName ? `Kho của ${ownerName}` : repo.name;
}

/**
 * Quyền upload theo repo. Lưu ý: đây là quy tắc giao diện — mọi tài khoản đều đọc được token
 * chung nên không thể ép buộc ở tầng HF (xem spec mục Rủi ro).
 */
export function canUploadToRepo(role: string | null | undefined, userId: string | null, repo: StorageRepo | null): boolean {
  if (!repo || !role) return false;
  if (isAdminRole(role)) return true;
  if (repo.kind === 'shared') return true;
  if (repo.kind === 'personal') return repo.assignedUserId !== null && repo.assignedUserId === userId;
  return false;
}

/** Xóa: admin mọi repo; user chỉ xóa trong repo cá nhân của mình. */
export function canDeleteInRepo(role: string | null | undefined, userId: string | null, repo: StorageRepo | null): boolean {
  if (!repo || !role) return false;
  if (isAdminRole(role)) return true;
  return repo.kind === 'personal' && repo.assignedUserId !== null && repo.assignedUserId === userId;
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
}

/** Kiểm tra đầu vào tạo repo; trả thông điệp lỗi hoặc null nếu hợp lệ. */
export function validateRepoInput(input: RepoInput): string | null {
  if (!input.name.trim()) return 'Nhập tên hiển thị của repo.';
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(input.repoId)) {
    return 'Repository ID cần dạng owner/ten-repo, chỉ gồm chữ không dấu, số, "-", "_" hoặc ".".';
  }
  if (input.kind === 'personal' && !input.assignedUserId) return 'Chọn tài khoản được gán repo cá nhân.';
  if (input.kind !== 'personal' && input.assignedUserId) return 'Chỉ repo cá nhân mới gán cho tài khoản.';
  return null;
}

/** Ghép token chung với một repo thành cấu hình kết nối HF. */
export function toHfConfig(token: string, repo: StorageRepo | null): HfConfig | null {
  if (!repo || !token) return null;
  return { token, repoId: repo.repoId, folder: repo.folder, isPrivate: true };
}
