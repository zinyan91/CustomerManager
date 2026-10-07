import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OfficialDocFile } from '../../../types/officialDoc';
import { createFakeDrive } from '../../drive/__tests__/fakeDrive';
import { renameDriveFile, trashDriveFile } from '../../drive/driveClient';

const h = vi.hoisted(() => ({ ctx: null as unknown, hfFetch: vi.fn() }));
vi.mock('../../drive/driveToken', () => ({
  get driveContext() {
    return h.ctx;
  },
}));
vi.mock('../../huggingface/hfClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../huggingface/hfClient')>()),
  fetchHfFileBlob: h.hfFetch,
}));

import { fetchDocFileBlob } from '../docFiles';

let drive: ReturnType<typeof createFakeDrive>;
const driveFile = (id: string, name: string, path = name): OfficialDocFile => ({ kind: 'goc', repoId: 'ROOT', path, name, fileId: id });

beforeEach(() => {
  drive = createFakeDrive();
  h.ctx = drive.ctx;
  h.hfFetch.mockReset();
});

describe('fetchDocFileBlob với tệp Google Drive', () => {
  it('tải theo mã tệp, không cần token Hugging Face, gắn kiểu theo đuôi tên', async () => {
    const f = drive.seedFile('tb.pdf', drive.driveId, 'Xin chào Drive');
    const blob = await fetchDocFileBlob(driveFile(f.id, 'tb.pdf'), '');
    expect(await blob.text()).toBe('Xin chào Drive');
    expect(blob.type).toBe('application/pdf');
    expect(h.hfFetch).not.toHaveBeenCalled();
  });

  it('tệp được đổi tên hay di chuyển trong Kho thì văn bản vẫn mở được (tham chiếu theo mã, không theo đường dẫn)', async () => {
    const f = drive.seedFile('tb.pdf', drive.driveId, 'NOI DUNG');
    const folder = drive.seedFolder('Moi');
    await renameDriveFile(drive.ctx, f.id, 'ten-moi.pdf');
    f.parents = [folder.id];

    const stale = driveFile(f.id, 'tb.pdf', 'van-ban/2026/tb.pdf');
    expect(await (await fetchDocFileBlob(stale, '')).text()).toBe('NOI DUNG');
  });

  it('tệp đã vào thùng rác: báo rõ tên tệp và lý do bằng tiếng Việt', async () => {
    const f = drive.seedFile('tb.pdf', drive.driveId);
    await trashDriveFile(drive.ctx, f.id);
    await expect(fetchDocFileBlob(driveFile(f.id, 'tb.pdf'), '')).rejects.toThrow(/Tải "tb\.pdf" không được: không tìm thấy tệp hoặc thư mục trên Google Drive/);
  });

  it('có mã tệp thì không đụng Hugging Face dù có token', async () => {
    const f = drive.seedFile('a.pdf', drive.driveId);
    await fetchDocFileBlob(driveFile(f.id, 'a.pdf'), 'hf_token');
    expect(h.hfFetch).not.toHaveBeenCalled();
  });
});

describe('fetchDocFileBlob giữ hành vi cũ với tệp Hugging Face', () => {
  const hfFile: OfficialDocFile = { kind: 'goc', repoId: 'o/van-thu', path: 'a/b.pdf', name: 'b.pdf' };

  it('thiếu token thì báo chưa cấu hình, không gọi Drive', async () => {
    await expect(fetchDocFileBlob(hfFile, '')).rejects.toThrow(/Chưa cấu hình kho lưu trữ/);
    expect(drive.requests).toHaveLength(0);
  });

  it('có token thì tải từ Hugging Face và gắn kiểu theo đuôi', async () => {
    h.hfFetch.mockResolvedValue(new Blob(['x'], { type: 'application/octet-stream' }));
    const blob = await fetchDocFileBlob(hfFile, 'tok');
    expect(blob.type).toBe('application/pdf');
    expect(h.hfFetch).toHaveBeenCalledWith(expect.stringContaining('o/van-thu'), 'tok');
    expect(drive.requests).toHaveLength(0);
  });
});
