import { supabase } from '../supabase';
import { todayIso } from '../utils';
import type {
  OfficialDoc,
  OfficialDocCategory,
  OfficialDocFilter,
  OfficialDocInput,
} from '../../types/officialDoc';
import { OFFICIAL_CATEGORIES } from '../officialDoc/categories';
import { applyDocFilters, pageRange } from '../officialDoc/docQuery';
import { DEFAULT_DOC_SORT, sortOrder, type DocSort } from '../officialDoc/docSort';
import { mapOfficialDocRow, toOfficialDocRow } from '../officialDoc/mapRow';
import { validateOfficialDoc } from '../officialDoc/validate';

const TABLE = 'OfficialDocuments';

export interface DocSearchResult {
  docs: OfficialDoc[];
  total: number;
  /** Trang yêu cầu vượt quá số dòng hiện có (vd: vừa xóa dòng cuối của trang cuối). */
  outOfRange: boolean;
}

/** Một trang văn bản theo bộ lọc. Chỉ metadata nhỏ đi qua Supabase. Ném lỗi khi DB báo lỗi. */
export async function searchOfficialDocs(filter: OfficialDocFilter, page: number, sort: DocSort = DEFAULT_DOC_SORT): Promise<DocSearchResult> {
  const [from, to] = pageRange(page);
  let query = applyDocFilters(supabase.from(TABLE).select('*', { count: 'exact' }), filter, todayIso());
  // Ngày để trống (vd không hết hiệu lực) luôn xuống cuối, dù sắp tăng hay giảm
  for (const o of sortOrder(sort)) query = query.order(o.column, { ascending: o.ascending, nullsFirst: false });
  const { data, count, error } = await query.range(from, to);

  if (error) {
    if (error.code === 'PGRST103') return { docs: [], total: 0, outOfRange: true };
    if (error.message.includes('OfficialDocuments') || error.code === 'PGRST205') {
      throw new Error('Chưa áp dụng migration bảng OfficialDocuments trên Supabase. Vui lòng chạy file supabase/migrations/61_van_thu_van_ban.sql trong SQL Editor.');
    }
    throw new Error(`Không tìm được văn bản: ${error.message}`);
  }
  return { docs: (data ?? []).map(mapOfficialDocRow), total: count ?? 0, outOfRange: false };
}

export const DOC_INDEX_LIMIT = 500;

/**
 * Danh mục gọn mọi văn bản (số hiệu, tiêu đề, tệp) để AI chọn văn bản cần đọc. Chỉ metadata nhỏ qua
 * Supabase. Ném lỗi khi DB báo lỗi.
 */
export async function listDocIndex(): Promise<OfficialDoc[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('Id,Category,DocNumber,Title,IssuedDate,EffectiveFrom,EffectiveTo,Files,UpdatedAt')
    .order('IssuedDate', { ascending: false })
    .limit(DOC_INDEX_LIMIT);
  if (error) throw new Error(`Không đọc được danh mục văn bản: ${error.message}`);
  return (data ?? []).map(mapOfficialDocRow);
}

export type CategoryCounts = Record<OfficialDocCategory | 'all', number>;

/** Số văn bản từng mục theo cùng bộ lọc (trừ mục); `all` là tổng bốn mục. */
export async function countByCategory(filter: OfficialDocFilter): Promise<CategoryCounts> {
  const today = todayIso();
  const results = await Promise.all(
    OFFICIAL_CATEGORIES.map(async (c) => {
      const base = supabase.from(TABLE).select('Id', { count: 'exact', head: true });
      const { count, error } = await applyDocFilters(base, { ...filter, category: c.id }, today);
      if (error) {
        if (error.message.includes('OfficialDocuments') || error.code === 'PGRST205') {
          return [c.id, 0] as const;
        }
        throw new Error(`Không đếm được văn bản: ${error.message}`);
      }
      return [c.id, count ?? 0] as const;
    })
  );
  const counts: CategoryCounts = { all: 0, 'van-ban': 0, 'hop-dong': 0, 'cong-van': 0, khac: 0 };
  for (const [id, n] of results) {
    counts[id] = n;
    counts.all += n;
  }
  return counts;
}

/** Thêm mới (id null) hoặc sửa. Kiểm tra dữ liệu trước khi gọi DB; ném lỗi khi RLS từ chối. */
export async function saveOfficialDoc(id: string | null, input: OfficialDocInput): Promise<OfficialDoc> {
  const invalid = validateOfficialDoc(input);
  if (invalid) throw new Error(invalid);

  const row = toOfficialDocRow(input);
  const query = id === null
    ? supabase.from(TABLE).insert(row)
    : supabase.from(TABLE).update(row).eq('Id', Number(id));
  const { data, error } = await query.select().single();

  if (error) throw new Error(`Không lưu được văn bản: ${error.message}`);
  return mapOfficialDocRow(data);
}

export async function deleteOfficialDoc(id: string): Promise<void> {
  const { data, error } = await supabase.from(TABLE).delete().eq('Id', Number(id)).select('Id');
  if (error) throw new Error(`Không xóa được văn bản: ${error.message}`);
  if (!data || data.length === 0) throw new Error('Không xóa được văn bản: không đủ quyền hoặc văn bản không còn.');
}
