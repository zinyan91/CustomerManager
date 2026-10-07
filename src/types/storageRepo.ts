export type StorageRepoKind = 'shared' | 'personal' | 'dispatch' | 'form';

export const STORAGE_KIND_LABELS: Record<StorageRepoKind, string> = {
  shared: 'Kho chung',
  personal: 'Kho cá nhân',
  dispatch: 'Văn thư',
  form: 'Biểu mẫu',
};

/** Một kho lưu trữ (thư mục gốc trong Shared Drive) được đăng ký trong hệ thống. */
export interface StorageRepo {
  id: number;
  name: string;
  /** ID thư mục gốc của kho trong Shared Drive. */
  repoId: string;
  kind: StorageRepoKind;
  /** Chỉ có với kind = 'personal' */
  assignedUserId: string | null;
  createdAt: string;
}
