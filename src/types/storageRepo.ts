export type StorageRepoKind = 'shared' | 'personal' | 'dispatch' | 'form';

export const STORAGE_KIND_LABELS: Record<StorageRepoKind, string> = {
  shared: 'Kho chung',
  personal: 'Kho cá nhân',
  dispatch: 'Văn thư',
  form: 'Biểu mẫu',
};

/** Một dataset Hugging Face được đăng ký trong hệ thống. */
export interface StorageRepo {
  id: number;
  name: string;
  /** owner/repo trên Hugging Face */
  repoId: string;
  /** Thư mục gốc trong repo; rỗng = toàn repo */
  folder: string;
  kind: StorageRepoKind;
  /** Chỉ có với kind = 'personal' */
  assignedUserId: string | null;
  createdAt: string;
}
