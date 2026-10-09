import { supabase } from '../../lib/supabase';
import type { WorkbookData } from '../calc/model/workbook';
import type { Patch } from './patch';

/** Quyền của người đang mở trên một bảng tính chung (admin: Master Admin xem, quản lý chia sẻ, không sửa). */
export type SharedRole = 'owner' | 'editor' | 'viewer' | 'admin';
export type MemberRole = 'editor' | 'viewer';
/** Loại tài liệu chung: bảng tính hoặc văn bản. */
export type SharedKind = 'calc' | 'writer';

export interface SharedDocSummary {
  id: string;
  title: string;
  ownerId: string;
  ownerName: string;
  role: SharedRole;
  updatedAt: string;
  lastSeq: number;
  /** Máy chủ chưa áp migration 74 thì không trả loại: coi là bảng tính. */
  kind: SharedKind;
}

/** Văn bản chung: nội dung là cả khối (cây tài liệu và thiết lập trang), do màn Văn bản đọc ra. */
export interface SharedWriter {
  id: string;
  title: string;
  content: unknown;
  role: SharedRole;
  lastSeq: number;
}

export interface SharedDocument {
  id: string;
  title: string;
  data: WorkbookData;
  role: SharedRole;
  /** Số thứ tự hiện hành của tài liệu. */
  lastSeq: number;
  /** Số thứ tự mà `data` đang ứng với; bản hiện hành = data + các thao tác sau số này. Thiếu (máy chủ chưa áp migration 72) thì bằng lastSeq. */
  snapSeq: number;
}

/** Một thao tác trong nhật ký, đã được máy chủ xếp thứ tự. */
export interface SharedOp {
  seq: number;
  userId: string;
  clientId: string;
  patch: Patch;
  summary: Record<string, unknown>;
  createdAt: string;
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
  kind: row.kind === 'writer' ? 'writer' : 'calc',
});

export const mapWriter = (row: Row): SharedWriter => {
  if (row.data === null || row.data === undefined || typeof row.data !== 'object') throw new Error('Nội dung văn bản chung bị hỏng, không mở được.');
  return { id: text(row.id), title: text(row.title), content: row.data, role: toRole(row.role), lastSeq: num(row.last_seq) };
};

export const mapDocument = (row: Row): SharedDocument => {
  const data = row.data as WorkbookData | null;
  if (!data || !Array.isArray(data.sheets)) throw new Error('Nội dung bảng tính chung bị hỏng, không mở được.');
  const lastSeq = num(row.last_seq);
  return { id: text(row.id), title: text(row.title), data, role: toRole(row.role), lastSeq, snapSeq: row.snap_seq === undefined ? lastSeq : num(row.snap_seq) };
};

export const mapOp = (row: Row): SharedOp => ({
  seq: num(row.seq),
  userId: text(row.user_id),
  clientId: text(row.client_id),
  patch: Array.isArray(row.patch) ? (row.patch as Patch) : [],
  summary: row.summary && typeof row.summary === 'object' ? (row.summary as Record<string, unknown>) : {},
  createdAt: text(row.created_at),
});

/** Dòng Realtime của bảng nhật ký dùng tên cột CamelCase của bảng. */
export const mapOpRecord = (record: Row): SharedOp =>
  mapOp({ seq: record.Seq, user_id: record.UserId, client_id: record.ClientId, patch: record.Patch, summary: record.Summary, created_at: record.CreatedAt });

/** Hàm thiếu thuộc migration nào, suy từ tên hàm (hoặc tham số p_kind của migration 74) trong thông báo lỗi. */
function missingMigration(message: string): number {
  if (/p_kind/.test(message)) return 74;
  if (/office_(append_op|list_ops|save_snapshot)/.test(message)) return 72;
  if (/office_(save_version|list_versions|restore_version|rename_document)/.test(message)) return 73;
  return 71;
}

/** Lỗi từ Supabase thành lỗi tiếng Việt: xung đột có kiểu riêng, hàm chưa có (chưa áp migration) được nói rõ. */
export function toCollabError(error: { code?: string; message: string }, doing: string): Error {
  if (error.code === '40001') return new ConflictError(error.message);
  if (error.code === 'PGRST202' || /Could not find the function/i.test(error.message)) {
    return new Error(`${doing}: máy chủ chưa có tính năng chia sẻ (cần áp migration ${missingMigration(error.message)} trên Supabase).`);
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

/** Đưa văn bản lên hệ thống (cần migration 74). Nội dung là cả khối do màn Văn bản dựng. */
export async function createSharedWriter(title: string, content: object): Promise<string> {
  return call<string>('office_create_document', { p_title: title, p_data: content, p_kind: 'writer' }, 'Không đưa được văn bản lên hệ thống');
}

export async function listSharedDocuments(): Promise<SharedDocSummary[]> {
  const rows = await call<Row[] | null>('office_list_documents', {}, 'Không đọc được danh sách bảng tính chung');
  return (rows ?? []).map(mapSummary);
}

export async function getSharedDocument(id: string): Promise<SharedDocument> {
  const rows = await call<Row[] | null>('office_get_document', { p_doc: id }, 'Không mở được bảng tính chung');
  if (!rows || rows.length === 0) throw new Error('Không mở được bảng tính chung: không tìm thấy tài liệu.');
  if (rows[0].kind === 'writer') throw new Error('Không mở được bảng tính chung: đây là văn bản, hãy mở ở màn Văn bản.');
  return mapDocument(rows[0]);
}

export async function getSharedWriter(id: string): Promise<SharedWriter> {
  const rows = await call<Row[] | null>('office_get_document', { p_doc: id }, 'Không mở được văn bản chung');
  if (!rows || rows.length === 0) throw new Error('Không mở được văn bản chung: không tìm thấy tài liệu.');
  if (rows[0].kind !== 'writer') throw new Error('Không mở được văn bản chung: đây là bảng tính, hãy mở ở màn Bảng tính.');
  return mapWriter(rows[0]);
}

/** Lưu cả khối văn bản; trả số thứ tự mới. Ném ConflictError khi người khác đã lưu trước. */
export async function saveSharedWriter(id: string, baseSeq: number, title: string, content: object): Promise<number> {
  return num(await call<number | string>('office_save_document', { p_doc: id, p_base_seq: baseSeq, p_title: title, p_data: content }, 'Không lưu được văn bản chung'));
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

/** Một mốc phiên bản (không kèm nội dung). */
export interface SharedVersion {
  id: number;
  seq: number;
  label: string;
  createdBy: string;
  createdAt: string;
}

export const mapVersion = (row: Row): SharedVersion => ({
  id: num(row.id),
  seq: num(row.seq),
  label: text(row.label),
  createdBy: text(row.created_by),
  createdAt: text(row.created_at),
});

/** Ghi một thao tác vào nhật ký, trả số thứ tự máy chủ gán. `clientId` là mã của máy này để nhận ra thao tác của chính mình. */
export async function appendOp(id: string, clientId: string, patch: Patch, summary: object = {}): Promise<number> {
  return num(await call<number | string>('office_append_op', { p_doc: id, p_client: clientId, p_patch: patch, p_summary: summary }, 'Không gửi được thay đổi lên hệ thống'));
}

/** Các thao tác sau một số thứ tự (tối đa 1000 mỗi lần), để tải bù chỗ thiếu hoặc dựng bản hiện hành lúc mở. */
export async function listOps(id: string, after: number): Promise<SharedOp[]> {
  const rows = await call<Row[] | null>('office_list_ops', { p_doc: id, p_after: after }, 'Không đọc được nhật ký thay đổi');
  return (rows ?? []).map(mapOp);
}

/** Ghi bản chụp ở một số thứ tự đã có; máy chủ bỏ qua lặng lẽ nếu đã có bản chụp mới hơn. */
export async function saveSnapshot(id: string, seq: number, data: WorkbookData): Promise<void> {
  await call<void>('office_save_snapshot', { p_doc: id, p_seq: seq, p_data: data }, 'Không ghi được bản chụp');
}

/**
 * Nghe thao tác mới của một tài liệu qua Realtime. Trả hàm hủy đăng ký. `onStatus` báo trạng thái kênh để nơi gọi tải bù khi
 * nối lại sau khi mất kết nối.
 */
export function subscribeOps(id: string, onOp: (op: SharedOp) => void, onStatus?: (status: string) => void): () => void {
  const channel = supabase
    .channel(`office-ops-${id}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'OfficeDocumentOps', filter: `DocId=eq.${id}` }, (payload) => onOp(mapOpRecord(payload.new as Row)))
    .subscribe((status) => onStatus?.(status));
  return () => {
    void supabase.removeChannel(channel);
  };
}

/** Lưu một mốc: nội dung đầy đủ ở số thứ tự `seq`. Trả mã mốc. */
export async function saveVersion(id: string, seq: number, label: string, data: object): Promise<number> {
  return num(await call<number | string>('office_save_version', { p_doc: id, p_seq: seq, p_label: label, p_data: data }, 'Không lưu được mốc'));
}

/** Danh sách mốc, mới nhất trước, không kèm nội dung. */
export async function listVersions(id: string): Promise<SharedVersion[]> {
  const rows = await call<Row[] | null>('office_list_versions', { p_doc: id }, 'Không đọc được danh sách mốc');
  return (rows ?? []).map(mapVersion);
}

/** Nội dung đầy đủ của một mốc, để xem trước. Đọc thẳng bảng (RLS cho phép người có quyền trên tài liệu). */
export async function getVersionData(id: string, versionId: number): Promise<WorkbookData> {
  const { data, error } = await supabase.from('OfficeDocumentVersions').select('Data').eq('DocId', id).eq('Id', versionId).maybeSingle();
  if (error) throw toCollabError(error, 'Không đọc được nội dung mốc');
  if (!data) throw new Error('Không đọc được nội dung mốc: mốc không còn tồn tại hoặc bạn không có quyền xem.');
  return (data as { Data: WorkbookData }).Data;
}

/** Khôi phục một mốc thành bản hiện hành mới (không xóa gì). Trả số thứ tự mới. */
export async function restoreVersion(id: string, versionId: number): Promise<number> {
  return num(await call<number | string>('office_restore_version', { p_doc: id, p_version: versionId }, 'Không khôi phục được mốc'));
}

/** Đổi tên bảng tính chung; các máy khác nhận tên mới qua nhật ký. Trả số thứ tự mới. */
export async function renameDocument(id: string, title: string): Promise<number> {
  return num(await call<number | string>('office_rename_document', { p_doc: id, p_title: title }, 'Không đổi được tên bảng tính chung'));
}

/** Một người đang mở bảng tính chung và ô họ đang chọn. */
export interface PresencePerson {
  userId: string;
  name: string;
  sheet: string;
  cell: string;
}

export interface PresenceHandle {
  /** Báo ô mình đang chọn. */
  update: (sheet: string, cell: string) => void;
  leave: () => void;
}

/** Đọc danh sách người đang mở từ trạng thái presence của kênh (mỗi mã người dùng một mục, lấy bản mới nhất). */
export function peopleFromPresence(state: Record<string, unknown[]>, selfId: string): PresencePerson[] {
  const people: PresencePerson[] = [];
  for (const [key, entries] of Object.entries(state)) {
    if (key === selfId) continue;
    const last = entries[entries.length - 1] as Partial<PresencePerson> | undefined;
    if (!last) continue;
    people.push({ userId: key, name: text(last.name), sheet: text(last.sheet), cell: text(last.cell) });
  }
  return people.sort((a, b) => a.name.localeCompare(b.name) || a.userId.localeCompare(b.userId));
}

/** Vào kênh presence của tài liệu: ai đang mở và đang chọn ô nào. Không lưu gì xuống CSDL. */
export function joinPresence(id: string, me: { id: string; name: string }, onPeople: (people: PresencePerson[]) => void): PresenceHandle {
  const channel = supabase.channel(`office-presence-${id}`, { config: { presence: { key: me.id } } });
  let current = { name: me.name, sheet: '', cell: '' };
  let ready = false;
  channel
    .on('presence', { event: 'sync' }, () => onPeople(peopleFromPresence(channel.presenceState() as Record<string, unknown[]>, me.id)))
    .subscribe(async (status) => {
      if (status !== 'SUBSCRIBED') return;
      ready = true;
      await channel.track(current);
    });
  return {
    update: (sheet, cell) => {
      current = { name: me.name, sheet, cell };
      if (ready) void channel.track(current);
    },
    leave: () => {
      void supabase.removeChannel(channel);
    },
  };
}
