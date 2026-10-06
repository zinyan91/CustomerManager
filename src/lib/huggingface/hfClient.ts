import type { HfConfig, HfFileItem, FolderTreeNode } from '../../types/huggingface';

const HF_API_BASE = 'https://huggingface.co/api';
const STORAGE_KEY_CONFIG = 'cm_hf_config_v1';

/**
 * Lấy cấu hình Hugging Face từ LocalStorage hoặc Biến môi trường
 */
export function getHfConfig(): HfConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.token || parsed.repoId) {
        return parsed;
      }
    }
  } catch {}

  const token = (
    import.meta.env.VITE_HF_TOKEN ||
    (import.meta.env as any).HF_TOKEN ||
    (typeof process !== 'undefined' && process.env ? (process.env.HF_TOKEN as string) : '') ||
    ''
  ).trim();

  const repoId = (
    import.meta.env.VITE_HF_DATASET_REPO ||
    (import.meta.env as any).HF_DATASET_REPO ||
    ''
  ).trim();

  return {
    token,
    repoId,
    isPrivate: true,
  };
}

/**
 * Lưu cấu hình Hugging Face vào LocalStorage
 */
export function saveHfConfig(config: HfConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  } catch {}
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
  folderPath: string = '',
  token?: string,
  recursive: boolean = true
): Promise<HfFileItem[]> {
  const cleanRepo = repoId.trim();
  if (!cleanRepo) return [];

  const cleanPath = folderPath.replace(/^\/+|\/+$/g, '');
  const encodedPath = cleanPath ? cleanPath.split('/').map(encodeURIComponent).join('/') : '';
  const baseUrl = encodedPath
    ? `${HF_API_BASE}/datasets/${cleanRepo}/tree/main/${encodedPath}`
    : `${HF_API_BASE}/datasets/${cleanRepo}/tree/main`;

  const url = recursive ? `${baseUrl}?recursive=true` : baseUrl;
  const headers: Record<string, string> = {};
  const activeToken = token || getHfConfig().token;
  if (activeToken) {
    headers.Authorization = `Bearer ${activeToken}`;
  }

  const res = await fetch(url, { headers, cache: 'no-store' });
  if (!res.ok) {
    if (res.status === 404) {
      return [];
    }
    throw new Error(`Lỗi tải danh sách tệp từ Hugging Face (${res.status})`);
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
 * Tải tệp lên Hugging Face Dataset qua REST upload
 */
export async function uploadFileToHf(
  repoId: string,
  filePath: string,
  file: File | Blob,
  token?: string
): Promise<{ success: boolean; url: string; error?: string }> {
  const activeToken = token || getHfConfig().token;
  if (!activeToken) {
    return { success: false, url: '', error: 'Chưa cấu hình HF Token với quyền write.' };
  }

  const cleanRepo = repoId.trim();
  const cleanPath = filePath.replace(/^\/+|\/+$/g, '');

  try {
    const uploadUrl = `${HF_API_BASE}/datasets/${cleanRepo}/upload/main/${encodeURIComponent(cleanPath)}`;
    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${activeToken}`,
      },
      body: file,
    });

    if (res.ok) {
      const downloadUrl = `https://huggingface.co/datasets/${cleanRepo}/resolve/main/${cleanPath}`;
      return { success: true, url: downloadUrl };
    }

    // Fallback qua Hub Commit API nếu upload trực tiếp báo lỗi
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Content = btoa(binary);

    const commitRes = await fetch(`${HF_API_BASE}/datasets/${cleanRepo}/commit/main`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${activeToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: `Upload document: ${cleanPath}`,
        operations: [
          {
            key: 'file',
            value: {
              content: base64Content,
              encoding: 'base64',
              path: cleanPath,
            },
            operation: 'addOrUpdate',
          },
        ],
      }),
    });

    if (!commitRes.ok) {
      const errText = await commitRes.text();
      return { success: false, url: '', error: `Lỗi upload HF (${commitRes.status}): ${errText}` };
    }

    const downloadUrl = `https://huggingface.co/datasets/${cleanRepo}/resolve/main/${cleanPath}`;
    return { success: true, url: downloadUrl };
  } catch (err: any) {
    return { success: false, url: '', error: err.message || 'Lỗi mạng khi tải lên Hugging Face' };
  }
}

/**
 * Xóa tệp khỏi Hugging Face Dataset qua Commit API
 */
export async function deleteFileFromHf(
  repoId: string,
  filePath: string,
  token?: string
): Promise<{ success: boolean; error?: string }> {
  const activeToken = token || getHfConfig().token;
  if (!activeToken) {
    return { success: false, error: 'Chưa cấu hình HF Token.' };
  }

  const cleanRepo = repoId.trim();
  const cleanPath = filePath.replace(/^\/+|\/+$/g, '');

  try {
    const res = await fetch(`${HF_API_BASE}/datasets/${cleanRepo}/commit/main`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${activeToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: `Delete document: ${cleanPath}`,
        operations: [
          {
            operation: 'delete',
            path: cleanPath,
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Lỗi xoá tệp (${res.status}): ${errText}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Lỗi mạng khi xoá tệp trên Hugging Face' };
  }
}

/**
 * Tải Blob từ Hugging Face (hỗ trợ cả Private Dataset với Authorization Bearer)
 */
export async function fetchHfFileBlob(downloadUrl: string, token?: string): Promise<Blob> {
  const activeToken = token || getHfConfig().token;
  const headers: Record<string, string> = {};
  if (activeToken) {
    headers.Authorization = `Bearer ${activeToken}`;
  }

  const res = await fetch(downloadUrl, { headers });
  if (!res.ok) {
    throw new Error(`Không thể tải tệp từ Hugging Face (${res.status})`);
  }
  return await res.blob();
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
