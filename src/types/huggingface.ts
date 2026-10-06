export interface HfConfig {
  token: string;
  repoId: string; // e.g. 'username/customer-dispatches'
  username?: string;
  isPrivate?: boolean;
}

export interface HfFileItem {
  path: string;
  name: string;
  type: 'file' | 'directory';
  size: number;
  downloadUrl: string;
  lastModified?: string | null;
  sha?: string | null;
}

export interface FolderTreeNode {
  id: string; // Đường dẫn tương đối làm ID duy nhất (vd: '2026/hop-dong')
  name: string; // Tên hiển thị (vd: 'hop-dong')
  path: string; // Đường dẫn đầy đủ
  children: FolderTreeNode[];
  fileCount: number;
  totalBytes: number;
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0 || !Number.isFinite(bytes)) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const unitIndex = Math.min(i, units.length - 1);
  const value = bytes / Math.pow(1024, unitIndex);
  return `${value.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}
