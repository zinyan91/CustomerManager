import { joinArchivePath } from '../archivePath';
import type { UploadItem } from '../uploadItems';
import type { DriveEntry } from './driveTypes';

export type DuplicateChoice = 'skip' | 'keep';

/** Một tệp sắp tải lên trùng tên với tệp đã có ở đúng thư mục đích. */
export interface DuplicateMatch {
  /** Vị trí trong danh sách tải lên. */
  index: number;
  /** Đường dẫn đích đầy đủ trong kho. */
  path: string;
  name: string;
  newSize: number;
  /** Mili giây Unix, lấy từ tệp trên máy. */
  newModified: number;
  existing: { name: string; path: string; size: number; modifiedTime: string };
  /** Cùng dung lượng: nhiều khả năng cùng một tệp. Chưa so nội dung nên không khẳng định giống hệt. */
  sameSize: boolean;
}

const lower = (s: string) => s.toLowerCase();

/**
 * Các tệp tải lên trùng tên (không phân biệt hoa thường) với tệp đã có ở đúng thư mục đích. Chỉ so với tệp, không so với thư mục.
 * Hai tệp cùng tên trong một đợt không tính ở đây vì được tự đổi tên khi lên kế hoạch tải.
 */
export function findDuplicates(items: readonly UploadItem[], targetFolder: string, entries: readonly DriveEntry[]): DuplicateMatch[] {
  const files = new Map<string, DriveEntry>();
  for (const e of entries) if (!e.isFolder) files.set(lower(e.path), e);

  const out: DuplicateMatch[] = [];
  items.forEach((item, index) => {
    const path = joinArchivePath(targetFolder, item.relativePath);
    const existing = files.get(lower(path));
    if (!existing) return;
    out.push({
      index,
      path,
      name: item.file.name,
      newSize: item.file.size,
      newModified: item.file.lastModified,
      existing: { name: existing.name, path: existing.path, size: existing.size, modifiedTime: existing.modifiedTime },
      sameSize: existing.size === item.file.size,
    });
  });
  return out;
}

/** Cùng dung lượng thì bỏ qua (khả năng cao là tải lại cùng tệp); khác thì giữ cả hai, vì chỉ giữ cả hai là không làm mất gì. */
export const defaultChoice = (match: DuplicateMatch): DuplicateChoice => (match.sameSize ? 'skip' : 'keep');

/** Danh sách còn lại để tải lên sau khi bỏ các tệp được chọn "bỏ qua"; tệp "giữ cả hai" được đổi tên khi lên kế hoạch tải. */
export function applyDuplicateChoices(
  items: readonly UploadItem[],
  matches: readonly DuplicateMatch[],
  choices: ReadonlyMap<number, DuplicateChoice>,
): { items: UploadItem[]; skipped: string[] } {
  const skippedIndexes = new Set<number>();
  const skipped: string[] = [];
  for (const m of matches) {
    if ((choices.get(m.index) ?? defaultChoice(m)) === 'skip') {
      skippedIndexes.add(m.index);
      skipped.push(m.path);
    }
  }
  return { items: items.filter((_, i) => !skippedIndexes.has(i)), skipped };
}
