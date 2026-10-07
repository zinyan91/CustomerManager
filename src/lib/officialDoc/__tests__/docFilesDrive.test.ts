import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OfficialDocFile } from '../../../types/officialDoc';
import { createFakeDrive } from '../../drive/__tests__/fakeDrive';
import { renameDriveFile, trashDriveFile } from '../../drive/driveClient';

const h = vi.hoisted(() => ({ ctx: null as unknown }));
vi.mock('../../drive/driveToken', () => ({
  get driveContext() {
    return h.ctx;
  },
}));

import { fetchDocFileBlob } from '../docFiles';

let drive: ReturnType<typeof createFakeDrive>;
const driveFile = (id: string, name: string, path = name): OfficialDocFile => ({ kind: 'goc', repoId: 'ROOT', path, name, fileId: id });

beforeEach(() => {
  drive = createFakeDrive();
  h.ctx = drive.ctx;
});

describe('fetchDocFileBlob', () => {
  it('tải theo mã tệp, gắn kiểu theo đuôi tên', async () => {
    const f = drive.seedFile('tb.pdf', drive.driveId, 'Xin chào Drive');
    const blob = await fetchDocFileBlob(driveFile(f.id, 'tb.pdf'));
    expect(await blob.text()).toBe('Xin chào Drive');
    expect(blob.type).toBe('application/pdf');
  });

  it('tệp được đổi tên hay di chuyển trong Kho thì văn bản vẫn mở được (tham chiếu theo mã, không theo đường dẫn)', async () => {
    const f = drive.seedFile('tb.pdf', drive.driveId, 'NOI DUNG');
    const folder = drive.seedFolder('Moi');
    await renameDriveFile(drive.ctx, f.id, 'ten-moi.pdf');
    f.parents = [folder.id];

    const stale = driveFile(f.id, 'tb.pdf', 'van-ban/2026/tb.pdf');
    expect(await (await fetchDocFileBlob(stale)).text()).toBe('NOI DUNG');
  });

  it('tệp đã vào thùng rác: báo rõ tên tệp và lý do bằng tiếng Việt', async () => {
    const f = drive.seedFile('tb.pdf', drive.driveId);
    await trashDriveFile(drive.ctx, f.id);
    await expect(fetchDocFileBlob(driveFile(f.id, 'tb.pdf'))).rejects.toThrow(/Tải "tb\.pdf" không được: không tìm thấy tệp hoặc thư mục trên Google Drive/);
  });

  it('tệp thiếu mã Google Drive thì báo rõ tên tệp, không gọi Drive', async () => {
    const old: OfficialDocFile = { kind: 'goc', repoId: 'o/van-thu', path: 'a/b.pdf', name: 'b.pdf' };
    await expect(fetchDocFileBlob(old)).rejects.toThrow(/thiếu mã tệp Google Drive/);
    expect(drive.requests).toHaveLength(0);
  });
});
