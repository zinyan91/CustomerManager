// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  calls: [] as Array<{ fn: string; args: Record<string, unknown> }>,
  reply: { data: null as unknown, error: null as null | { code?: string; message: string } },
  channels: [] as Array<{ name: string; filter: unknown; handler: (payload: { new: Record<string, unknown> }) => void; status: ((s: string) => void) | null; removed: boolean }>,
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      h.calls.push({ fn, args });
      return h.reply;
    },
    channel: (name: string) => {
      const entry = { name, filter: null as unknown, handler: (() => {}) as (payload: { new: Record<string, unknown> }) => void, status: null as ((s: string) => void) | null, removed: false };
      h.channels.push(entry);
      const api = {
        on: (_type: string, filter: unknown, handler: typeof entry.handler) => {
          entry.filter = filter;
          entry.handler = handler;
          return api;
        },
        subscribe: (status: (s: string) => void) => {
          entry.status = status;
          return api;
        },
        entry,
      };
      return api;
    },
    removeChannel: async (channel: { entry: { removed: boolean } }) => {
      channel.entry.removed = true;
    },
  },
}));

import {
  appendOp, listOps, saveSnapshot, subscribeOps, mapOpRecord,
  ConflictError, canEdit, canManageSharing, createSharedDocument, deleteSharedDocument, getSharedDocument, listInvitableUsers, listMembers,
  listSharedDocuments, saveSharedDocument, setMember, toCollabError,
  createSharedWriter, getSharedWriter, saveSharedWriter,
} from '../collab/collabApi';
import type { WorkbookData } from '../calc/model/workbook';

const DATA = { sheets: [{ name: 'S' }] } as unknown as WorkbookData;

beforeEach(() => {
  h.channels = [];
  h.calls = [];
  h.reply = { data: null, error: null };
});

describe('collabApi', () => {
  it('đưa lên hệ thống: gọi đúng hàm với tên và nội dung, trả mã tài liệu', async () => {
    h.reply.data = 'doc-1';
    expect(await createSharedDocument('Sổ', DATA)).toBe('doc-1');
    expect(h.calls).toEqual([{ fn: 'office_create_document', args: { p_title: 'Sổ', p_data: DATA } }]);
  });

  it('danh sách: đổi tên cột về dạng của mã, rỗng khi không có', async () => {
    h.reply.data = [{ id: 'a', title: 'T', owner_id: 'o', owner_name: 'Chủ', role: 'editor', updated_at: '2026-10-08', last_seq: '4' }];
    expect(await listSharedDocuments()).toEqual([{ id: 'a', title: 'T', ownerId: 'o', ownerName: 'Chủ', role: 'editor', updatedAt: '2026-10-08', lastSeq: 4, kind: 'calc' }]);
    h.reply.data = null;
    expect(await listSharedDocuments()).toEqual([]);
  });

  it('mở tài liệu: trả nội dung, quyền, số thứ tự; thiếu bản ghi hay nội dung hỏng thì báo lỗi', async () => {
    h.reply.data = [{ id: 'a', title: 'T', data: DATA, role: 'viewer', last_seq: 7 }];
    expect(await getSharedDocument('a')).toEqual({ id: 'a', title: 'T', data: DATA, role: 'viewer', lastSeq: 7, snapSeq: 7 });
    h.reply.data = [];
    await expect(getSharedDocument('a')).rejects.toThrow(/không tìm thấy tài liệu/);
    h.reply.data = [{ id: 'a', title: 'T', data: { x: 1 }, role: 'viewer', last_seq: 7 }];
    await expect(getSharedDocument('a')).rejects.toThrow(/bị hỏng/);
    h.reply.data = [{ id: 'a', title: 'T', data: DATA, role: 'god', last_seq: 7 }];
    await expect(getSharedDocument('a')).rejects.toThrow(/quyền không hợp lệ/);
  });

  it('lưu: gửi số thứ tự đang giữ, trả số mới; mã 40001 thành ConflictError', async () => {
    h.reply.data = 5;
    expect(await saveSharedDocument('a', 4, 'T', DATA)).toBe(5);
    expect(h.calls[0].args).toEqual({ p_doc: 'a', p_base_seq: 4, p_title: 'T', p_data: DATA });
    h.reply = { data: null, error: { code: '40001', message: 'Người khác đã lưu' } };
    const err = await saveSharedDocument('a', 4, 'T', DATA).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ConflictError);
  });

  it('hàm chưa có trên máy chủ: nói rõ cần áp migration 71, không để lộ lỗi thô', async () => {
    h.reply = { data: null, error: { code: 'PGRST202', message: 'Could not find the function public.office_list_documents' } };
    await expect(listSharedDocuments()).rejects.toThrow(/cần áp migration 71/);
    expect(toCollabError({ message: 'Could not find the function x in the schema cache' }, 'Làm gì').message).toContain('migration 71');
  });

  it('hàm thiếu: nêu đúng migration theo tên hàm (72, 73) hoặc tham số p_kind (74)', () => {
    const migration = (message: string) => toCollabError({ code: 'PGRST202', message }, 'Việc').message;
    expect(migration('Could not find the function public.office_append_op(p_client) in the schema cache')).toContain('migration 72');
    expect(migration('Could not find the function public.office_list_versions(p_doc)')).toContain('migration 73');
    expect(migration('Could not find the function public.office_create_document(p_data, p_kind, p_title) in the schema cache')).toContain('migration 74');
    expect(migration('Could not find the function public.office_get_document(p_doc)')).toContain('migration 71');
  });

  it('văn bản chung: tạo kèm loại, danh sách có kind, mở trả nội dung nguyên khối, lưu đúng số thứ tự', async () => {
    const content = { doc: { type: 'doc' }, pageSetup: {} };
    h.reply.data = 'w-1';
    expect(await createSharedWriter('Công văn', content)).toBe('w-1');
    expect(h.calls[0]).toEqual({ fn: 'office_create_document', args: { p_title: 'Công văn', p_data: content, p_kind: 'writer' } });
    h.reply.data = [{ id: 'a', title: 'T', owner_id: 'o', owner_name: '', role: 'owner', updated_at: '', last_seq: 1, kind: 'writer' }];
    expect((await listSharedDocuments())[0].kind).toBe('writer');
    h.reply.data = [{ id: 'a', title: 'T', data: content, role: 'editor', last_seq: 3, kind: 'writer' }];
    expect(await getSharedWriter('a')).toEqual({ id: 'a', title: 'T', content, role: 'editor', lastSeq: 3 });
    h.reply.data = 4;
    expect(await saveSharedWriter('a', 3, 'T', content)).toBe(4);
    expect(h.calls.at(-1)?.args).toEqual({ p_doc: 'a', p_base_seq: 3, p_title: 'T', p_data: content });
    h.reply = { data: null, error: { code: '40001', message: 'Người khác đã lưu' } };
    await expect(saveSharedWriter('a', 3, 'T', content)).rejects.toBeInstanceOf(ConflictError);
  });

  it('mở nhầm loại bị từ chối ở cả hai phía', async () => {
    h.reply.data = [{ id: 'a', title: 'T', data: DATA, role: 'editor', last_seq: 3, kind: 'calc' }];
    await expect(getSharedWriter('a')).rejects.toThrow(/đây là bảng tính/);
    h.reply.data = [{ id: 'a', title: 'T', data: { doc: {} }, role: 'editor', last_seq: 3, kind: 'writer' }];
    await expect(getSharedDocument('a')).rejects.toThrow(/đây là văn bản/);
  });

  it('lỗi khác giữ nguyên thông điệp của máy chủ kèm việc đang làm', async () => {
    h.reply = { data: null, error: { code: '42501', message: 'Bạn chỉ có quyền xem tài liệu này.' } };
    await expect(saveSharedDocument('a', 1, 'T', DATA)).rejects.toThrow('Không lưu được bảng tính chung: Bạn chỉ có quyền xem tài liệu này.');
  });

  it('mời, đổi quyền, gỡ, danh sách thành viên và tài khoản có thể mời, xóa', async () => {
    h.reply.data = [{ id: 'u1', full_name: 'An' }];
    expect(await listInvitableUsers()).toEqual([{ id: 'u1', fullName: 'An' }]);
    h.reply.data = [{ user_id: 'u1', full_name: 'An', role: 'viewer' }, { user_id: 'u2', full_name: '', role: 'editor' }];
    expect(await listMembers('a')).toEqual([{ userId: 'u1', fullName: 'An', role: 'viewer' }, { userId: 'u2', fullName: '', role: 'editor' }]);
    h.reply.data = null;
    await setMember('a', 'u1', 'editor');
    await setMember('a', 'u1', null);
    await deleteSharedDocument('a');
    expect(h.calls.slice(-3)).toEqual([
      { fn: 'office_set_member', args: { p_doc: 'a', p_user: 'u1', p_role: 'editor' } },
      { fn: 'office_set_member', args: { p_doc: 'a', p_user: 'u1', p_role: null } },
      { fn: 'office_delete_document', args: { p_doc: 'a' } },
    ]);
  });

  it('quyền: sửa cho chủ và người sửa; quản lý chia sẻ cho chủ và Master Admin', () => {
    expect(['owner', 'editor', 'viewer', 'admin'].map((r) => canEdit(r as never))).toEqual([true, true, false, false]);
    expect(['owner', 'editor', 'viewer', 'admin'].map((r) => canManageSharing(r as never))).toEqual([true, false, false, true]);
  });
});

describe('nhật ký thao tác (giai đoạn 2)', () => {
  it('mở tài liệu: có snap_seq thì dùng, thiếu (máy chủ chưa áp migration 72) thì bằng last_seq', async () => {
    h.reply.data = [{ id: 'a', title: 'T', data: DATA, role: 'owner', last_seq: 9, snap_seq: 4 }];
    expect(await getSharedDocument('a')).toMatchObject({ lastSeq: 9, snapSeq: 4 });
    h.reply.data = [{ id: 'a', title: 'T', data: DATA, role: 'owner', last_seq: 9 }];
    expect(await getSharedDocument('a')).toMatchObject({ lastSeq: 9, snapSeq: 9 });
  });

  it('ghi thao tác: gửi mã máy, thay đổi và tóm tắt; trả số thứ tự; báo lỗi tiếng Việt', async () => {
    h.reply.data = '12';
    expect(await appendOp('a', 'máy-1', [{ t: 'order', names: ['S'] }], { cells: 0 })).toBe(12);
    expect(h.calls[0]).toEqual({ fn: 'office_append_op', args: { p_doc: 'a', p_client: 'máy-1', p_patch: [{ t: 'order', names: ['S'] }], p_summary: { cells: 0 } } });
    h.reply = { data: null, error: { code: '54000', message: 'Thao tác lớn hơn 1 MB' } };
    await expect(appendOp('a', 'm', [])).rejects.toThrow('Không gửi được thay đổi lên hệ thống: Thao tác lớn hơn 1 MB');
  });

  it('đọc nhật ký sau một số thứ tự: đổi tên cột, thiếu dữ liệu thì mặc định an toàn', async () => {
    h.reply.data = [
      { seq: 3, user_id: 'u', client_id: 'c', patch: [{ t: 'order', names: [] }], summary: { x: 1 }, created_at: 't' },
      { seq: '4', user_id: null, client_id: null, patch: null, summary: null, created_at: null },
    ];
    const ops = await listOps('a', 2);
    expect(h.calls[0].args).toEqual({ p_doc: 'a', p_after: 2 });
    expect(ops[0]).toEqual({ seq: 3, userId: 'u', clientId: 'c', patch: [{ t: 'order', names: [] }], summary: { x: 1 }, createdAt: 't' });
    expect(ops[1]).toEqual({ seq: 4, userId: '', clientId: '', patch: [], summary: {}, createdAt: '' });
  });

  it('ghi bản chụp gọi đúng hàm', async () => {
    h.reply.data = null;
    await saveSnapshot('a', 7, DATA);
    expect(h.calls[0]).toEqual({ fn: 'office_save_snapshot', args: { p_doc: 'a', p_seq: 7, p_data: DATA } });
  });

  it('Realtime: nghe đúng tài liệu, đổi dòng CamelCase thành thao tác, báo trạng thái kênh, hủy khi dọn', () => {
    const got: unknown[] = [];
    const statuses: string[] = [];
    const stop = subscribeOps('doc-9', (op) => got.push(op), (s) => statuses.push(s));
    const channel = h.channels[0];
    expect(channel.name).toBe('office-ops-doc-9');
    expect(channel.filter).toEqual({ event: 'INSERT', schema: 'public', table: 'OfficeDocumentOps', filter: 'DocId=eq.doc-9' });
    channel.handler({ new: { Seq: 5, UserId: 'u', ClientId: 'c', Patch: [], Summary: { k: 1 }, CreatedAt: 't' } });
    expect(got).toEqual([{ seq: 5, userId: 'u', clientId: 'c', patch: [], summary: { k: 1 }, createdAt: 't' }]);
    channel.status?.('SUBSCRIBED');
    expect(statuses).toEqual(['SUBSCRIBED']);
    stop();
    expect(channel.removed).toBe(true);
    expect(mapOpRecord({ Seq: 1 }).seq).toBe(1);
  });
});
