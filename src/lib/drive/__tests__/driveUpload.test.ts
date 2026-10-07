import { describe, expect, it } from 'vitest';
import { listDriveFiles } from '../driveClient';
import { planDriveUploads, uploadItemsToDrive } from '../driveUpload';
import { buildRepoEntries } from '../driveTree';
import type { UploadItem, UploadProgress } from '../../uploadItems';
import { createFakeDrive } from './fakeDrive';

const item = (relativePath: string, text = 'noi dung'): UploadItem => ({ file: new File([text], relativePath.split('/').pop()!, { type: 'application/pdf' }), relativePath });

describe('planDriveUploads', () => {
  it('đặt tệp dưới thư mục đích, giữ cấu trúc thư mục con', () => {
    const plan = planDriveUploads([item('a.pdf'), item('Hồ sơ/b.pdf')], 'VB', []);
    expect(plan.map((p) => p.path)).toEqual(['VB/a.pdf', 'VB/Hồ sơ/b.pdf']);
  });

  it('tải vào gốc kho', () => {
    expect(planDriveUploads([item('a.pdf')], '', []).map((p) => p.path)).toEqual(['a.pdf']);
  });

  it('trùng tên tệp có sẵn cùng thư mục thì thêm hậu tố, không phân biệt hoa thường, giữ chữ hoa của tên gốc', () => {
    const plan = planDriveUploads([item('Báo Cáo.PDF')], 'VB', ['VB/báo cáo.pdf']);
    expect(plan[0].path).toBe('VB/Báo Cáo-2.PDF');
  });

  it('trùng cả tên thư mục có sẵn (Drive cho phép cùng tên) cũng đổi tên', () => {
    expect(planDriveUploads([item('VB')], '', ['VB']).map((p) => p.path)).toEqual(['VB-2']);
  });

  it('trùng giữa các tệp cùng đợt thì đánh số tăng dần', () => {
    const plan = planDriveUploads([item('a.pdf'), item('a.pdf'), item('a.pdf')], '', ['a.pdf']);
    expect(plan.map((p) => p.path)).toEqual(['a-2.pdf', 'a-3.pdf', 'a-4.pdf']);
  });

  it('cùng tên ở thư mục khác nhau thì không đổi', () => {
    const plan = planDriveUploads([item('A/x.pdf'), item('B/x.pdf')], '', ['x.pdf']);
    expect(plan.map((p) => p.path)).toEqual(['A/x.pdf', 'B/x.pdf']);
  });

  it('tệp không có đuôi cũng được đánh số', () => {
    expect(planDriveUploads([item('README')], '', ['README']).map((p) => p.path)).toEqual(['README-2']);
  });
});

describe('uploadItemsToDrive', () => {
  async function setup() {
    const drive = createFakeDrive();
    const root = drive.seedFolder('Kho');
    const entries = async () => buildRepoEntries(await listDriveFiles(drive.ctx), root.id);
    return { drive, root, entries };
  }

  it('tải tệp lên đúng thư mục, tạo thư mục con còn thiếu và dùng lại thư mục đã có', async () => {
    const { drive, root, entries } = await setup();
    drive.seedFolder('VB', root.id);
    const res = await uploadItemsToDrive(drive.ctx, root.id, 'VB', [item('a.pdf', 'AAA'), item('Con/b.pdf', 'BBBB'), item('Con/c.pdf')], ['VB']);
    expect(res.failed).toEqual([]);
    expect([...res.uploaded].sort()).toEqual(['VB/Con/b.pdf', 'VB/Con/c.pdf', 'VB/a.pdf']);
    expect((await entries()).map((e) => e.path).sort()).toEqual(['VB', 'VB/Con', 'VB/Con/b.pdf', 'VB/Con/c.pdf', 'VB/a.pdf']);
    expect(drive.byName('VB')).toHaveLength(1);
    expect(drive.byName('Con')).toHaveLength(1);
  });

  it('trả mã Drive của từng tệp đã lên, khớp đường dẫn, để văn bản tham chiếu theo mã', async () => {
    const { drive, root } = await setup();
    const res = await uploadItemsToDrive(drive.ctx, root.id, 'VB', [item('a.pdf'), item('Con/b.pdf')], []);
    expect(res.files).toHaveLength(2);
    for (const f of res.files) expect(drive.files.get(f.fileId)!.name).toBe(f.path.split('/').pop());
    expect(res.files.map((f) => f.path).sort()).toEqual(['VB/Con/b.pdf', 'VB/a.pdf']);
  });

  it('nội dung tệp lên đủ và đúng', async () => {
    const { drive, root } = await setup();
    await uploadItemsToDrive(drive.ctx, root.id, '', [item('a.pdf', 'Xin chào Drive')], []);
    expect(new TextDecoder().decode(drive.byName('a.pdf')[0].bytes)).toBe('Xin chào Drive');
  });

  it('tệp trùng tên thì lên với tên mới, tệp cũ không bị đè', async () => {
    const { drive, root, entries } = await setup();
    drive.seedFile('a.pdf', root.id, 'CU');
    const res = await uploadItemsToDrive(drive.ctx, root.id, '', [item('a.pdf', 'MOI')], ['a.pdf']);
    expect(res.uploaded).toEqual(['a-2.pdf']);
    expect((await entries()).map((e) => e.path).sort()).toEqual(['a-2.pdf', 'a.pdf']);
    expect(new TextDecoder().decode(drive.byName('a.pdf')[0].bytes)).toBe('CU');
    expect(new TextDecoder().decode(drive.byName('a-2.pdf')[0].bytes)).toBe('MOI');
  });

  it('tệp tên lạ vẫn lên đúng tên đã đổi (gói lại File với tên mới)', async () => {
    const { drive, root } = await setup();
    await uploadItemsToDrive(drive.ctx, root.id, '', [item('a.pdf')], ['a.pdf']);
    expect(drive.byName('a-2.pdf')).toHaveLength(1);
  });

  it('một tệp lỗi thì ghi lại thông điệp tiếng Việt kèm đường dẫn, các tệp khác vẫn lên', async () => {
    const { drive, root } = await setup();
    drive.failNext(/^POST \/upload\/drive\/v3\/files$/, new Response(JSON.stringify({ error: { code: 403, message: 'x', errors: [{ reason: 'storageQuotaExceeded' }] } }), { status: 403 }));
    const res = await uploadItemsToDrive(drive.ctx, root.id, '', [item('a.pdf'), item('b.pdf'), item('c.pdf')], []);
    expect(res.uploaded).toHaveLength(2);
    expect(res.failed).toHaveLength(1);
    expect(res.failed[0].error).toMatch(/Tải lên không được: Shared Drive đã hết dung lượng/);
    expect(['a.pdf', 'b.pdf', 'c.pdf']).toContain(res.failed[0].path);
  });

  it('báo tiến độ: bắt đầu 0, kết thúc đủ số tệp, tổng không đổi', async () => {
    const { drive, root } = await setup();
    const seen: UploadProgress[] = [];
    await uploadItemsToDrive(drive.ctx, root.id, '', [item('a.pdf'), item('b.pdf'), item('c.pdf'), item('d.pdf')], [], (p) => seen.push({ ...p }));
    expect(seen[0]).toMatchObject({ totalFiles: 4, uploadedFiles: 0, failedFiles: 0 });
    expect(seen[seen.length - 1]).toMatchObject({ totalFiles: 4, uploadedFiles: 4, failedFiles: 0 });
    expect(new Set(seen.map((p) => p.totalFiles))).toEqual(new Set([4]));
  });

  it('danh sách rỗng thì không làm gì', async () => {
    const { drive, root } = await setup();
    expect(await uploadItemsToDrive(drive.ctx, root.id, '', [], [])).toEqual({ uploaded: [], failed: [], files: [] });
    expect(drive.requests).toHaveLength(0);
  });

  it('thư mục đã biết sẵn (từ cây kho) thì tải thẳng vào, không tìm hay tạo lại', async () => {
    const { drive, root } = await setup();
    const vb = drive.seedFolder('VB', root.id);
    await uploadItemsToDrive(drive.ctx, root.id, 'VB', [item('a.pdf')], ['VB'], undefined, new Map([['VB', vb.id]]));
    expect(drive.requests.filter((r) => r.method === 'GET')).toHaveLength(0);
    expect(drive.requests.some((r) => r.method === 'POST' && r.url.endsWith('/drive/v3/files'))).toBe(false);
    expect(drive.byName('a.pdf')[0].parents).toEqual([vb.id]);
  });

  it('hai tệp cùng thư mục con mới chạy song song vẫn chỉ tạo một thư mục', async () => {
    const { drive, root } = await setup();
    await uploadItemsToDrive(drive.ctx, root.id, '', [item('Mới/a.pdf'), item('Mới/b.pdf'), item('Mới/c.pdf')], []);
    expect(drive.byName('Mới')).toHaveLength(1);
  });
});
