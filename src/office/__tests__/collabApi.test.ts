// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  calls: [] as Array<{ fn: string; args: Record<string, unknown> }>,
  reply: { data: null as unknown, error: null as null | { code?: string; message: string } },
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      h.calls.push({ fn, args });
      return h.reply;
    },
  },
}));

import {
  ConflictError, canEdit, canManageSharing, createSharedDocument, deleteSharedDocument, getSharedDocument, listInvitableUsers, listMembers,
  listSharedDocuments, saveSharedDocument, setMember, toCollabError,
} from '../collab/collabApi';
import type { WorkbookData } from '../calc/model/workbook';

const DATA = { sheets: [{ name: 'S' }] } as unknown as WorkbookData;

beforeEach(() => {
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
    expect(await listSharedDocuments()).toEqual([{ id: 'a', title: 'T', ownerId: 'o', ownerName: 'Chủ', role: 'editor', updatedAt: '2026-10-08', lastSeq: 4 }]);
    h.reply.data = null;
    expect(await listSharedDocuments()).toEqual([]);
  });

  it('mở tài liệu: trả nội dung, quyền, số thứ tự; thiếu bản ghi hay nội dung hỏng thì báo lỗi', async () => {
    h.reply.data = [{ id: 'a', title: 'T', data: DATA, role: 'viewer', last_seq: 7 }];
    expect(await getSharedDocument('a')).toEqual({ id: 'a', title: 'T', data: DATA, role: 'viewer', lastSeq: 7 });
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
