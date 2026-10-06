import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { UploadItem } from '../../uploadItems';

const hub = vi.hoisted(() => ({ commit: vi.fn(), createRepo: vi.fn() }));
vi.mock('@huggingface/hub', () => hub);

import { describeHfWriteError, uploadItemsToHf, deleteFileFromHf, createHfDataset } from '../hfWrite';

const T = { repoId: 'own/repo', token: 'hf_t' };
const item = (rel: string, size = 1): UploadItem => ({ file: new File([new Uint8Array(size)], rel.split('/').pop()!), relativePath: rel });
const apiError = (statusCode: number) => Object.assign(new Error('boom'), { statusCode });

beforeEach(() => {
  hub.commit.mockReset();
  hub.createRepo.mockReset();
});

describe('describeHfWriteError', () => {
  it('dịch theo mã trạng thái', () => {
    expect(describeHfWriteError(apiError(401))).toMatch(/hết hạn/);
    expect(describeHfWriteError(apiError(403))).toMatch(/quyền ghi/);
    expect(describeHfWriteError(apiError(404))).toMatch(/Không tìm thấy repo/);
    expect(describeHfWriteError(apiError(409))).toMatch(/đã tồn tại/);
    expect(describeHfWriteError(apiError(413))).toMatch(/quá lớn/);
  });

  it('lỗi mạng và lỗi lạ', () => {
    expect(describeHfWriteError(new TypeError('Failed to fetch'))).toMatch(/mạng/);
    expect(describeHfWriteError(new Error('Thông điệp riêng'))).toBe('Thông điệp riêng');
    expect(describeHfWriteError('x')).toMatch(/không xác định/);
  });
});

describe('uploadItemsToHf', () => {
  it('đặt tệp dưới thư mục đích, giữ cấu trúc con, dùng dataset và token', async () => {
    hub.commit.mockResolvedValue({});
    const res = await uploadItemsToHf(T, 'kho', [item('HoSo/a.pdf'), item('b.zip')]);

    expect(res.failed).toEqual([]);
    expect(res.uploaded).toEqual(['kho/HoSo/a.pdf', 'kho/b.zip']);
    expect(hub.commit).toHaveBeenCalledTimes(1);
    const arg = hub.commit.mock.calls[0][0];
    expect(arg.repo).toEqual({ type: 'dataset', name: 'own/repo' });
    expect(arg.accessToken).toBe('hf_t');
    expect(arg.operations.map((o: { path: string; operation: string }) => [o.operation, o.path])).toEqual([
      ['addOrUpdate', 'kho/HoSo/a.pdf'],
      ['addOrUpdate', 'kho/b.zip'],
    ]);
  });

  it('ghi thẳng lên Hugging Face: không cấu hình hubUrl/fetch trung gian (không qua máy chủ của ứng dụng)', async () => {
    hub.commit.mockResolvedValue({});
    await uploadItemsToHf(T, '', [item('a.pdf')]);
    const arg = hub.commit.mock.calls[0][0];
    expect(arg.hubUrl).toBeUndefined();
    expect(arg.fetch).toBeUndefined();
  });

  it('thư mục đích rỗng thì tệp nằm ở gốc repo', async () => {
    hub.commit.mockResolvedValue({});
    const res = await uploadItemsToHf(T, '', [item('x.pdf')]);
    expect(res.uploaded).toEqual(['x.pdf']);
  });

  it('commit cả lô hỏng thì thử lại từng tệp và chỉ báo đúng tệp lỗi', async () => {
    hub.commit.mockImplementation(async (p: { operations: Array<{ path: string }> }) => {
      if (p.operations.length > 1) throw apiError(500);
      if (p.operations[0].path.endsWith('hong.pdf')) throw apiError(403);
    });
    const res = await uploadItemsToHf(T, 'k', [item('ok.pdf'), item('hong.pdf'), item('ok2.pdf')]);

    expect(res.uploaded).toEqual(['k/ok.pdf', 'k/ok2.pdf']);
    expect(res.failed).toHaveLength(1);
    expect(res.failed[0].path).toBe('k/hong.pdf');
    expect(res.failed[0].error).toMatch(/quyền ghi/);
  });

  it('một tệp lỗi thì báo lỗi ngay, không thử lại', async () => {
    hub.commit.mockRejectedValue(apiError(401));
    const res = await uploadItemsToHf(T, '', [item('a.pdf')]);
    expect(hub.commit).toHaveBeenCalledTimes(1);
    expect(res.failed[0].error).toMatch(/hết hạn/);
  });

  it('báo tiến độ qua từng lô, bắt đầu từ 0', async () => {
    hub.commit.mockResolvedValue({});
    const many = Array.from({ length: 120 }, (_, i) => item(`f/${i}.txt`));
    const seen: Array<[number, number, number]> = [];
    await uploadItemsToHf(T, '', many, (p) => seen.push([p.uploadedFiles, p.batchIndex, p.batchCount]));

    expect(seen[0]).toEqual([0, 0, 3]);
    expect(seen[seen.length - 1]).toEqual([120, 3, 3]);
  });

  it('danh sách rỗng không gọi HF', async () => {
    const res = await uploadItemsToHf(T, '', []);
    expect(res).toEqual({ uploaded: [], failed: [] });
    expect(hub.commit).not.toHaveBeenCalled();
  });
});

describe('deleteFileFromHf', () => {
  it('commit thao tác delete với đúng đường dẫn', async () => {
    hub.commit.mockResolvedValue({});
    expect(await deleteFileFromHf('own/repo', 'kho/a.pdf', 'hf_t')).toEqual({ success: true });
    expect(hub.commit.mock.calls[0][0].operations).toEqual([{ operation: 'delete', path: 'kho/a.pdf' }]);
  });

  it('trả lỗi tiếng Việt khi HF từ chối, và khi thiếu token', async () => {
    hub.commit.mockRejectedValue(apiError(403));
    const res = await deleteFileFromHf('own/repo', 'a', 'hf_t');
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/quyền ghi/);
    expect((await deleteFileFromHf('own/repo', 'a', '')).success).toBe(false);
  });
});

describe('createHfDataset', () => {
  it('tạo dataset private', async () => {
    hub.createRepo.mockResolvedValue({ repoUrl: 'u', id: 'i' });
    await createHfDataset('hf_t', 'own/cm-kho-a');
    expect(hub.createRepo).toHaveBeenCalledWith({
      repo: { type: 'dataset', name: 'own/cm-kho-a' },
      accessToken: 'hf_t',
      visibility: 'private',
    });
  });

  it('ném lỗi tiếng Việt khi repo đã tồn tại, thiếu token hoặc tên sai', async () => {
    hub.createRepo.mockRejectedValue(apiError(409));
    await expect(createHfDataset('hf_t', 'o/r')).rejects.toThrow(/đã tồn tại/);
    await expect(createHfDataset('', 'o/r')).rejects.toThrow(/token/);
    await expect(createHfDataset('t', 'khong-co-owner')).rejects.toThrow(/owner/);
  });
});
