import { supabase } from '../../lib/supabase';
import type { WorkbookData } from '../calc/model/workbook';

/** Quyền của người đang mở trên một bảng tính chung (admin: Master Admin xem, quản lý chia sẻ, không sửa). */
export type SharedRole = 'owner' | 'editor' | 'viewer' | 'admin';
export type MemberRole = 'editor' | 'viewer';

export interface SharedDocSummary {
  id: string;
  title: string;
  ownerId: string;
  ownerName: string;
  role: SharedRole;
  updatedAt: string;
  lastSeq: number;
}

export interface SharedDocument {
  id: string;
  title: string;
  data: WorkbookData;
  role: SharedRole;
  lastSeq: number;
}

export interface InvitableUser {
  id: string;
  fullName: string;
}

export interface SharedMember {
  userId: string;
  fullName: string;
  role: MemberRole;
}

/** Người khác đã lưu bảng tính này trước (mã 40001): phải tải lại bản mới nhất, không được ghi đè. */
export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

/** Chỉ người sửa được lưu; dùng để khóa lưới khi mở bằng quyền xem. */
export const canEdit = (role: SharedRole): boolean => role === 'owner' || role === 'editor';
export const canManageSharing = (role: SharedRole): boolean => role === 'owner' || role === 'admin';

type Row = Record<string, unknown>;

const text = (value: unknown): string => (typeof value === 'string' ? value : '');
const num = (value: unknown): number => Number(value) || 0;

function toRole(value: unknown): SharedRole {
  if (value === 'owner' || value === 'editor' || value === 'viewer' || value === 'admin') return value;
  throw new Error('Máy chủ trả về quyền không hợp lệ.');
}

export const mapSummary = (row: Row): SharedDocSummary => ({
  id: text(row.id),
  title: text(row.title),
  ownerId: text(row.owner_id),
  ownerName: text(row.owner_name),
  role: toRole(row.role),
  updatedAt: text(row.updated_at),
  lastSeq: num(row.last_seq),
});

export const mapDocument = (row: Row): SharedDocument => {
  const data = row.data as WorkbookData | null;
  if (!data || !Array.isArray(data.sheets)) throw new Error('Nội dung bảng tính chung bị hỏng, không mở được.');
  return { id: text(row.id), title: text(row.title), data, role: toRole(row.role), lastSeq: num(row.last_seq) };
};

/** Lỗi từ Supabase thành lỗi tiếng Việt: xung đột có kiểu riêng, hàm chưa có (chưa áp migration) được nói rõ. */
export function toCollabError(error: { code?: string; message: string }, doing: string): Error {
  if (error.code === '40001') return new ConflictError(error.message);
  if (error.code === 'PGRST202' || /Could not find the function/i.test(error.message)) {
    return new Error(`${doing}: máy chủ chưa có tính năng chia sẻ (cần áp migration 71 trên Supabase).`);
  }
  return new Error(`${doing}: ${error.message}`);
}

async function call<T>(fn: string, args: Record<string, unknown>, doing: string): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw toCollabError(error, doing);
  return data as T;
}

/** Đưa bảng tính lên hệ thống: người gọi thành chủ. Trả mã tài liệu. */
export async function createSharedDocument(title: string, data: WorkbookData): Promise<string> {
  return call<string>('office_create_document', { p_title: title, p_data: data }, 'Không đưa được bảng tính lên hệ thống');
}

export async function listSharedDocuments(): Promise<SharedDocSummary[]> {
  const rows = await call<Row[] | null>('office_list_documents', {}, 'Không đọc được danh sách bảng tính chung');
  return (rows ?? []).map(mapSummary);
}

export async function getSharedDocument(id: string): Promise<SharedDocument> {
  const rows = await call<Row[] | null>('office_get_document', { p_doc: id }, 'Không mở được bảng tính chung');
  if (!rows || rows.length === 0) throw new Error('Không mở được bảng tính chung: không tìm thấy tài liệu.');
  return mapDocument(rows[0]);
}

/** Lưu nội dung; trả số thứ tự mới. Ném ConflictError khi người khác đã lưu trước. */
export async function saveSharedDocument(id: string, baseSeq: number, title: string, data: WorkbookData): Promise<number> {
  return num(await call<number | string>('office_save_document', { p_doc: id, p_base_seq: baseSeq, p_title: title, p_data: data }, 'Không lưu được bảng tính chung'));
}

export async function listInvitableUsers(): Promise<InvitableUser[]> {
  const rows = await call<Row[] | null>('office_invitable_users', {}, 'Không đọc được danh sách tài khoản');
  return (rows ?? []).map((row) => ({ id: text(row.id), fullName: text(row.full_name) }));
}

export async function listMembers(id: string): Promise<SharedMember[]> {
  const rows = await call<Row[] | null>('office_list_members', { p_doc: id }, 'Không đọc được danh sách chia sẻ');
  return (rows ?? []).map((row) => ({ userId: text(row.user_id), fullName: text(row.full_name), role: row.role === 'viewer' ? 'viewer' : 'editor' }));
}

/** Mời hoặc đổi quyền; role null là gỡ. */
export async function setMember(id: string, userId: string, role: MemberRole | null): Promise<void> {
  await call<void>('office_set_member', { p_doc: id, p_user: userId, p_role: role }, 'Không đổi được việc chia sẻ');
}

export async function deleteSharedDocument(id: string): Promise<void> {
  await call<void>('office_delete_document', { p_doc: id }, 'Không xóa được bảng tính chung');
}
