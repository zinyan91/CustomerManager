import type { HfFileItem, FolderTreeNode } from '../../types/huggingface';

const HF_API_BASE = 'https://huggingface.co/api';
const LIST_TIMEOUT_MS = 60_000;

/** Lỗi trả về từ API Hugging Face, mang theo mã HTTP để giao diện phân loại. */
export class HfApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'HfApiError';
    this.status = status;
  }
}

/** Đường dẫn tải trực tiếp của tệp trong dataset HF. */
export function hfFileUrl(repoId: string, filePath: string): string {
  const encoded = filePath.split('/').map(encodeURIComponent).join('/');
  return `https://huggingface.co/datasets/${repoId}/resolve/main/${encoded}`;
}

/**
 * Chuẩn hóa Repo ID và Folder từ chuỗi nhập vào
 * Xử lý thông minh URL Hugging Face hoặc chuỗi có dạng 'owner/repo/folder'
 */
export function normalizeHfRepoAndFolder(
  repoInput: string = '',
  folderInput: string = ''
): { repoId: string; folder: string } {
  let cleanRepo = repoInput.trim();
  let cleanFolder = folderInput.trim().replace(/^\/+|\/+$/g, '');

  // 1. Nếu dán URL Hugging Face (ví dụ: https://huggingface.co/datasets/owner/repo/tree/main/subfolder)
  if (cleanRepo.includes('huggingface.co/datasets/')) {
    const afterDatasets = cleanRepo.split('huggingface.co/datasets/')[1] || '';
    const parts = afterDatasets.split('/tree/main/');
    if (parts.length > 1) {
      cleanRepo = parts[0];
      if (!cleanFolder && parts[1]) {
        cleanFolder = parts[1].replace(/^\/+|\/+$/g, '');
      }
    } else {
      cleanRepo = parts[0];
    }
  }

  // 2. Cắt bỏ tiền tố datasets/ nếu người dùng gõ
  if (cleanRepo.startsWith('datasets/')) {
    cleanRepo = cleanRepo.substring('datasets/'.length);
  }

  // 3. Nếu chuỗi có nhiều hơn 2 đoạn (ví dụ: 'owner/repo/my-folder/sub')
  const segments = cleanRepo.split('/').filter(Boolean);
  if (segments.length >= 2) {
    cleanRepo = `${segments[0]}/${segments[1]}`;
    if (segments.length > 2 && !cleanFolder) {
      cleanFolder = segments.slice(2).join('/');
    }
  }

  return {
    repoId: cleanRepo,
    folder: cleanFolder,
  };
}

/**
 * Kiểm tra tính hợp lệ của token Hugging Face và lấy thông tin user
 */
export async function validateHfToken(token: string): Promise<{
  valid: boolean;
  username: string;
  avatarUrl?: string;
  role?: string;
  error?: string;
}> {
  const cleanToken = token.trim();
  if (!cleanToken) {
    return { valid: false, username: '', error: 'Token không được để trống.' };
  }

  try {
    const res = await fetch(`${HF_API_BASE}/whoami-v2`, {
      headers: {
        Authorization: `Bearer ${cleanToken}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return {
        valid: false,
        username: '',
        error: res.status === 401 ? 'Token không hợp lệ hoặc đã hết hạn.' : `Lỗi ${res.status}`,
      };
    }

    const data = await res.json();
    return {
      valid: true,
      username: data.name || data.user || 'Unknown',
      avatarUrl: data.avatarUrl,
      role: data.auth?.accessToken?.role || 'write',
    };
  } catch (err: any) {
    return { valid: false, username: '', error: err.message || 'Không thể kết nối đến Hugging Face.' };
  }
}

/**
 * Liệt kê danh sách tệp và thư mục trong Dataset (Tree API)
 */
export async function listHfTree(
  repoId: string,
  folderPath: string,
  token: string,
  recursive: boolean = true
): Promise<HfFileItem[]> {
  const norm = normalizeHfRepoAndFolder(repoId, folderPath);
  const cleanRepo = norm.repoId;
  const cleanPath = norm.folder;
  if (!cleanRepo) return [];

  const encodedPath = cleanPath ? cleanPath.split('/').map(encodeURIComponent).join('/') : '';
  const baseUrl = encodedPath
    ? `${HF_API_BASE}/datasets/${cleanRepo}/tree/main/${encodedPath}`
    : `${HF_API_BASE}/datasets/${cleanRepo}/tree/main`;

  const url = recursive ? `${baseUrl}?recursive=true` : baseUrl;
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Có hạn chờ: liệt kê đệ quy cả kho có thể rất chậm, không để giao diện chờ vô hạn
  const res = await fetch(url, { headers, cache: 'no-store', signal: AbortSignal.timeout(LIST_TIMEOUT_MS) });
  if (!res.ok) {
    throw new HfApiError(res.status, `Lỗi tải danh sách tệp từ kho lưu trữ (${res.status})`);
  }

  const raw = await res.json();
  if (!Array.isArray(raw)) return [];

  const items: HfFileItem[] = raw
    .filter((item: any) => {
      // Lọc các file hệ thống git ẩn nếu không cần thiết
      const p = item.path || '';
      return !p.startsWith('.git') && p !== '.gitattributes' && p !== '.gitignore';
    })
    .map((item: any) => {
      const isLfs = Boolean(item.lfs);
      const size = isLfs && item.lfs?.size ? item.lfs.size : item.size || 0;
      const pathStr = item.path || '';
      const encodedDownloadPath = pathStr.split('/').map(encodeURIComponent).join('/');
      const downloadUrl = `https://huggingface.co/datasets/${cleanRepo}/resolve/main/${encodedDownloadPath}`;

      return {
        path: pathStr,
        name: pathStr.split('/').pop() || pathStr,
        type: item.type === 'directory' ? 'directory' : 'file',
        size,
        downloadUrl,
        lastModified: item.lastCommit?.date || null,
        sha: item.oid || item.lfs?.sha256 || null,
      };
    });

  return items;
}

/**
 * Tải Blob từ Hugging Face (hỗ trợ cả Private Dataset với Authorization Bearer)
 */
export async function fetchHfFileBlob(
  downloadUrl: string,
  token: string,
  options: { onBytes?: (loaded: number) => void; signal?: AbortSignal } = {}
): Promise<Blob> {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(downloadUrl, { headers, signal: options.signal });
  if (!res.ok) {
    throw new HfApiError(res.status, `Không thể tải tệp từ kho lưu trữ (${res.status})`);
  }
  if (!options.onBytes || !res.body) return await res.blob();

  // Đọc theo luồng để báo được số byte đã nhận
  const reader = res.body.getReader();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value as Uint8Array<ArrayBuffer>);
    loaded += value.byteLength;
    options.onBytes(loaded);
  }
  return new Blob(chunks, { type: res.headers.get('Content-Type') ?? '' });
}

/**
 * Xây dựng cây thư mục (Folder Tree) từ danh sách tệp Hugging Face / Văn thư
 */
export function buildFolderTree(items: Array<{ path: string; size: number }>): FolderTreeNode {
  const root: FolderTreeNode = {
    id: '',
    name: 'Tất cả tài liệu',
    path: '',
    children: [],
    fileCount: 0,
    totalBytes: 0,
  };

  const folderMap = new Map<string, FolderTreeNode>();
  folderMap.set('', root);

  for (const item of items) {
    const segments = item.path.split('/');
    root.fileCount++;
    root.totalBytes += item.size;

    // Duyệt qua các thư mục cha
    let currentPath = '';
    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i];
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${seg}` : seg;

      let folder = folderMap.get(currentPath);
      if (!folder) {
        folder = {
          id: currentPath,
          name: seg,
          path: currentPath,
          children: [],
          fileCount: 0,
          totalBytes: 0,
        };
        folderMap.set(currentPath, folder);

        const parentNode = folderMap.get(parentPath);
        if (parentNode) {
          parentNode.children.push(folder);
        }
      }

      folder.fileCount++;
      folder.totalBytes += item.size;
    }
  }

  // Sắp xếp các thư mục con theo tên tự nhiên A-Z
  function sortTree(node: FolderTreeNode) {
    node.children.sort((a, b) => a.name.localeCompare(b.name, 'vi', { numeric: true }));
    node.children.forEach(sortTree);
  }
  sortTree(root);

  return root;
}
