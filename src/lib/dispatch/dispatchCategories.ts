import type { DispatchDocument, DispatchDocumentType } from '../../types/dispatch';
import { joinArchivePath } from '../archivePath';

export type DispatchCategoryId = 'van-ban' | 'hop-dong' | 'cong-van' | 'khac';

export interface DispatchCategory {
  id: DispatchCategoryId;
  label: string;
  /** Loại văn bản mặc định thuộc mục này. */
  types: DispatchDocumentType[];
}

/** Bốn mục của sidebar Văn thư; id cũng là tên thư mục con trong repo van-thu-tin-dung. */
export const DISPATCH_CATEGORIES: readonly DispatchCategory[] = [
  { id: 'van-ban', label: 'Văn bản', types: ['quyet_dinh', 'thong_bao', 'bien_ban', 'to_trinh', 'giay_to_phap_ly'] },
  { id: 'hop-dong', label: 'Hợp đồng', types: ['hop_dong'] },
  { id: 'cong-van', label: 'Công văn', types: ['cong_van'] },
  { id: 'khac', label: 'Khác', types: ['khac'] },
];

export type DispatchCategoryFilter = DispatchCategoryId | 'all';

const CATEGORY_IDS = new Set<string>(DISPATCH_CATEGORIES.map((c) => c.id));

export function isCategoryId(value: string): value is DispatchCategoryId {
  return CATEGORY_IDS.has(value);
}

export function categoryLabel(id: DispatchCategoryId): string {
  return DISPATCH_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

/** Mục gợi ý theo loại văn bản. */
export function categoryOfType(type: DispatchDocumentType): DispatchCategoryId {
  return DISPATCH_CATEGORIES.find((c) => c.types.includes(type))?.id ?? 'khac';
}

/** Thư mục chứa văn bản, tính từ thư mục gốc cấu hình của repo; null nếu nằm ngoài gốc. */
function relativeFolder(doc: Pick<DispatchDocument, 'folderPath'>, rootFolder: string): string | null {
  const folder = joinArchivePath(doc.folderPath);
  const root = joinArchivePath(rootFolder);
  if (!root) return folder;
  if (folder === root) return '';
  return folder.startsWith(root + '/') ? folder.slice(root.length + 1) : null;
}

/**
 * Mục của một văn bản. Vị trí thật trong repo (thư mục con đầu tiên) được ưu tiên
 * vì admin chọn nơi bỏ vào khi upload; không khớp thì suy từ loại văn bản.
 */
export function categoryOfDoc(doc: Pick<DispatchDocument, 'folderPath' | 'documentType'>, rootFolder = ''): DispatchCategoryId {
  const rel = relativeFolder(doc, rootFolder);
  const first = rel ? rel.split('/')[0] : '';
  if (first && isCategoryId(first)) return first;
  return categoryOfType(doc.documentType);
}

export function filterByCategory<T extends Pick<DispatchDocument, 'folderPath' | 'documentType'>>(
  docs: T[],
  category: DispatchCategoryFilter,
  rootFolder = ''
): T[] {
  if (category === 'all') return docs;
  return docs.filter((d) => categoryOfDoc(d, rootFolder) === category);
}

export function countByCategory(
  docs: Array<Pick<DispatchDocument, 'folderPath' | 'documentType'>>,
  rootFolder = ''
): Record<DispatchCategoryFilter, number> {
  const counts: Record<DispatchCategoryFilter, number> = { all: docs.length, 'van-ban': 0, 'hop-dong': 0, 'cong-van': 0, khac: 0 };
  for (const d of docs) counts[categoryOfDoc(d, rootFolder)] += 1;
  return counts;
}

/** Thư mục đích khi upload: <gốc>/<mục>/<năm>. Thiếu năm hợp lệ thì dùng năm hiện tại. */
export function dispatchUploadFolder(rootFolder: string, category: DispatchCategoryId, documentDate: string, now: Date = new Date()): string {
  const year = /^\d{4}/.test(documentDate) ? documentDate.slice(0, 4) : String(now.getFullYear());
  return joinArchivePath(rootFolder, category, year);
}
