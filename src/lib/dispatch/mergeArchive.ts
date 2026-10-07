import type { HfFileItem } from '../../types/huggingface';
import type { DispatchDocument } from '../../types/dispatch';

/** Id tạm cho tệp có trên Hugging Face nhưng chưa có dòng metadata trong DB. */
export const HF_ONLY_ID_PREFIX = 'hf_';

function folderOf(path: string): string {
  const parts = path.split('/');
  return parts.length > 1 ? parts.slice(0, -1).join('/') : '';
}

/**
 * Hợp nhất cây tệp Hugging Face (sự thật về tệp vật lý) với metadata trong DB.
 * - Tệp có dòng metadata khớp theo filePath: dùng metadata, cập nhật dung lượng theo HF.
 * - Tệp chưa có metadata: dựng bản ghi tạm (id bắt đầu bằng "hf_").
 * - Dòng metadata mà tệp đã biến mất khỏi HF: bỏ qua.
 */
export function mergeHfTreeWithDispatches(
  tree: HfFileItem[],
  dispatches: DispatchDocument[],
  now: string,
  repoId?: string
): DispatchDocument[] {
  const byPath = new Map<string, DispatchDocument>();
  for (const d of dispatches) {
    // Metadata thuộc repo khác thì không ghép (cùng đường dẫn ở hai repo là hai tệp khác nhau)
    if (d.filePath && (!repoId || !d.repoId || d.repoId === repoId)) byPath.set(d.filePath, d);
  }

  return tree
    .filter((item) => item.type === 'file')
    .map((item) => {
      const meta = byPath.get(item.path);
      if (meta) {
        return { ...meta, fileSize: item.size || meta.fileSize, fileUrl: meta.fileUrl || item.downloadUrl };
      }
      return {
        id: `${HF_ONLY_ID_PREFIX}${encodeURIComponent(item.path)}`,
        documentNumber: item.name.replace(/\.[^/.]+$/, ''),
        title: item.name,
        documentType: 'khac',
        issuer: 'Kho lưu trữ',
        documentDate: '',
        receivedDate: '',
        customerId: null,
        fileName: item.name,
        fileSize: item.size,
        fileType: guessMime(item.name),
        fileUrl: item.downloadUrl,
        filePath: item.path,
        folderPath: folderOf(item.path),
        repoId,
        storageProvider: 'huggingface',
        createdAt: item.lastModified || now,
        updatedAt: item.lastModified || now,
      } satisfies DispatchDocument;
    });
}

const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
  avif: 'image/avif',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  zip: 'application/zip',
  rar: 'application/vnd.rar',
  '7z': 'application/x-7z-compressed',
  tar: 'application/x-tar',
  gz: 'application/gzip',
  tgz: 'application/gzip',
  exe: 'application/vnd.microsoft.portable-executable',
  msi: 'application/x-msi',
};

export function guessMime(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXT[ext] ?? 'application/octet-stream';
}

/** Mọi thư mục cha xuất hiện trong cây (kể cả thư mục rỗng do HF trả về). */
export function collectFolders(tree: HfFileItem[]): string[] {
  const set = new Set<string>();
  for (const item of tree) {
    if (item.type === 'directory') {
      set.add(item.path);
      continue;
    }
    const parts = item.path.split('/');
    let acc = '';
    for (let i = 0; i < parts.length - 1; i++) {
      acc = acc ? `${acc}/${parts[i]}` : parts[i];
      set.add(acc);
    }
  }
  return Array.from(set);
}
