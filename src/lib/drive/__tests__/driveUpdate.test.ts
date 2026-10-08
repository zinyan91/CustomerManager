import { describe, expect, it } from 'vitest';
import { downloadDriveBlob, updateDriveFile } from '../driveClient';
import { createFakeDrive } from './fakeDrive';

const blobOf = (text: string, type = 'application/octet-stream') => new Blob([text], { type });

describe('updateDriveFile', () => {
  it('ghi đè nội dung tệp đã có, giữ nguyên mã, tên và thư mục', async () => {
    const s = createFakeDrive();
    const folder = s.seedFolder('Báo cáo');
    const file = s.seedFile('so.xlsx', folder.id, 'cu');
    const updated = await updateDriveFile(s.ctx, file.id, blobOf('moi hoan toan'));
    expect(updated.id).toBe(file.id);
    expect(updated.name).toBe('so.xlsx');
    expect(updated.parents).toEqual([folder.id]);
    expect(await (await downloadDriveBlob(s.ctx, file.id)).text()).toBe('moi hoan toan');
    expect(s.byName('so.xlsx')).toHaveLength(1);
  });

  it('gửi nhiều đoạn khi tệp lớn hơn một đoạn', async () => {
    const s = createFakeDrive();
    const file = s.seedFile('lon.bin', s.driveId, 'x');
    const text = 'a'.repeat(256 * 1024 * 2 + 17);
    await updateDriveFile(s.ctx, file.id, blobOf(text), { chunkBytes: 256 * 1024 });
    expect((await (await downloadDriveBlob(s.ctx, file.id)).text()).length).toBe(text.length);
    expect(s.requests.filter((r) => r.method === 'PUT')).toHaveLength(3);
  });

  it('báo lỗi tiếng Việt khi tệp không còn, và từ chối tệp rỗng', async () => {
    const s = createFakeDrive();
    await expect(updateDriveFile(s.ctx, 'khong-co', blobOf('x'))).rejects.toBeDefined();
    const file = s.seedFile('a.docx', s.driveId, 'x');
    await expect(updateDriveFile(s.ctx, file.id, blobOf(''))).rejects.toThrow('tệp rỗng');
  });
});
