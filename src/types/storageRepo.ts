export type StorageRepoKind = 'shared' | 'personal' | 'dispatch' | 'form';

/** Nơi lưu tệp của repo: Hugging Face (cũ) hoặc Google Drive (Shared Drive). */
export type StorageProviderId = 'huggingface' | 'drive';

export const STORAGE_PROVIDER_LABELS: Record<StorageProviderId, string> = {
  huggingface: 'Hugging Face',
  drive: 'Google Drive',
};

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
  /** Hugging Face: owner/repo. Google Drive: ID thư mục gốc của kho trong Shared Drive. */
  repoId: string;
  provider: StorageProviderId;
  /** Thư mục gốc trong repo; rỗng = toàn repo */
  folder: string;
  kind: StorageRepoKind;
  /** Chỉ có với kind = 'personal' */
  assignedUserId: string | null;
  createdAt: string;
}
