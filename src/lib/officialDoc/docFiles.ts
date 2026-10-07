import type { OfficialDocFile, OfficialDocFileKind } from '../../types/officialDoc';
import type { StorageRepo, StorageRepoKind } from '../../types/storageRepo';
import { HfApiError, fetchHfFileBlob, hfFileUrl } from '../huggingface/hfClient';
import { guessMime } from '../dispatch/mergeArchive';

export const FILE_KIND_LABELS: Record<OfficialDocFileKind, string> = {
  goc: 'File văn bản gốc',
  'bieu-mau': 'File biểu mẫu',
};

export const FILE_KINDS: readonly OfficialDocFileKind[] = ['goc', 'bieu-mau'];

/** Tệp để tải nhanh ngoài danh sách: bản gốc đầu tiên, không có thì tệp đầu tiên; null nếu chưa có tệp. */
export function primaryFile(files: OfficialDocFile[]): OfficialDocFile | null {
  return files.find((f) => f.kind === 'goc') ?? files[0] ?? null;
}

export function groupFilesByKind(files: OfficialDocFile[]): Record<OfficialDocFileKind, OfficialDocFile[]> {
  return {
    goc: files.filter((x) => x.kind === 'goc'),
    'bieu-mau': files.filter((x) => x.kind === 'bieu-mau'),
  };
}

const sameFile = (a: OfficialDocFile, b: OfficialDocFile) =>
  a.kind === b.kind && a.repoId === b.repoId && a.path === b.path;

/** Thêm tệp vào danh sách, bỏ qua nếu đã có cùng loại, kho và đường dẫn. */
export function addDocFile(files: OfficialDocFile[], file: OfficialDocFile): OfficialDocFile[] {
  return files.some((x) => sameFile(x, file)) ? files : [...files, file];
}

export function removeDocFile(files: OfficialDocFile[], file: OfficialDocFile): OfficialDocFile[] {
  return files.filter((x) => !sameFile(x, file));
}

/** PDF và ảnh mở được ngay trong tab trình duyệt; định dạng khác chỉ tải về. */
export function canViewInBrowser(fileName: string): boolean {
  return /\.(pdf|png|jpe?g|webp|gif)$/i.test(fileName);
}

/** Mỗi loại tệp của văn bản có kho riêng: bản gốc ở kho Văn thư, biểu mẫu ở kho Biểu mẫu. */
export function repoKindOfFile(kind: OfficialDocFileKind): StorageRepoKind {
  return kind === 'goc' ? 'dispatch' : 'form';
}

/** Kho cho phép gắn tệp loại `kind` vào văn bản. Kho chung và kho cá nhân không dùng cho văn bản. */
export function selectableRepos(repos: StorageRepo[], kind: OfficialDocFileKind): StorageRepo[] {
  const wanted = repoKindOfFile(kind);
  return repos.filter((r) => r.kind === wanted);
}

/**
 * Tải tệp thẳng từ Hugging Face (không qua máy chủ ứng dụng). Ném lỗi tiếng Việt khi hỏng.
 * Blob được gắn kiểu theo đuôi tệp vì HF thường trả application/octet-stream, khiến PDF
 * bị tải xuống thay vì hiện trong tab.
 */
export async function fetchDocFileBlob(file: OfficialDocFile, token: string): Promise<Blob> {
  if (!token) {
    throw new Error('Chưa cấu hình kho lưu trữ. Liên hệ Master Admin để cấu hình token.');
  }
  try {
    const blob = await fetchHfFileBlob(hfFileUrl(file.repoId, file.path), token);
    return new Blob([blob], { type: guessMime(file.name) });
  } catch (err) {
    if (err instanceof HfApiError) {
      if (err.status === 404) {
        throw new Error(`Tệp "${file.name}" không còn trong Kho lưu trữ. Liên hệ admin để gắn lại tệp.`);
      }
      if (err.status === 401 || err.status === 403) {
        throw new Error(`Token kho lưu trữ bị từ chối (${err.status}). Liên hệ Master Admin để cập nhật token.`);
      }
    }
    throw err;
  }
}
