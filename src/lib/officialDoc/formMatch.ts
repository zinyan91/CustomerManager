import { docFolderSlug } from './docPaths';

/** Số hiệu quá ngắn (vd "12") khớp nhầm vào năm hay số thứ tự nên không dùng để tự tra. */
const MIN_SLUG_LENGTH = 4;

export interface TreeEntry {
  type: string;
  path: string;
  name: string;
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Biểu mẫu của một văn bản trong kho Biểu mẫu: tệp nào mà đường dẫn (tên thư mục hoặc tên tệp)
 * chứa nguyên số hiệu văn bản. Chỉ khớp theo số hiệu, không đoán theo nội dung.
 */
export function matchFormFiles<T extends TreeEntry>(tree: T[], docNumber: string): T[] {
  if (!docNumber.trim()) return [];
  const slug = docFolderSlug(docNumber);
  if (slug.length < MIN_SLUG_LENGTH) return [];
  const pattern = new RegExp(`(^|-)${escapeRegex(slug)}(-|$)`);
  return tree.filter((entry) => entry.type === 'file' && pattern.test(docFolderSlug(entry.path)));
}
