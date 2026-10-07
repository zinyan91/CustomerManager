import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PastePlan } from '../../storageClipboard';

const h = vi.hoisted(() => ({ fetchBlob: vi.fn() }));
vi.mock('../hfClient', async (importOriginal) => ({ ...(await importOriginal<object>()), fetchHfFileBlob: h.fetchBlob }));

import { HfApiError } from '../hfClient';
import { fetchPasteItems, hfBlobFetcher } from '../hfCopy';

const PLAN: PastePlan = {
  files: [
    { sourcePath: 'van ban/2026/a.pdf', relativePath: '2026/a-2.pdf', size: 3 },
    { sourcePath: 'van ban/2026/PL1.pdf', relativePath: '2026/PL1.pdf', size: 3 },
  ],
  totalBytes: 6, names: ['2026'], renamed: 0,
};

beforeEach(() => {
  h.fetchBlob.mockReset();
  h.fetchBlob.mockImplementation(async () => new Blob(['abc'], { type: 'application/pdf' }));
});

describe('hfBlobFetcher', () => {
  it('tải từ repo nguồn bằng đường dẫn đã mã hóa và token', async () => {
    const blob = await hfBlobFetcher('o/nguon', 'tok')(PLAN.files[0]);
    expect(await blob.text()).toBe('abc');
    expect(h.fetchBlob).toHaveBeenCalledWith('https://huggingface.co/datasets/o/nguon/resolve/main/van%20ban/2026/a.pdf', 'tok');
  });

  it.each([
    [new HfApiError(401, 'x'), /Token kho lưu trữ bị từ chối khi tải "a\.pdf" \(401\)/],
    [new HfApiError(403, 'x'), /Token kho lưu trữ bị từ chối/],
    [new HfApiError(404, 'x'), /Tệp "a\.pdf" không còn trong kho nguồn/],
    [new TypeError('Failed to fetch'), /Không tải được "a\.pdf" từ kho nguồn: Failed to fetch/],
  ])('lỗi %# nói rõ tệp nào', async (error, message) => {
    h.fetchBlob.mockRejectedValueOnce(error);
    await expect(hfBlobFetcher('o/nguon', 'tok')(PLAN.files[0])).rejects.toThrow(message);
  });
});

describe('fetchPasteItems', () => {
  it('tải từng tệp, đặt tên và đường dẫn theo kế hoạch đã đổi tên', async () => {
    const items = await fetchPasteItems(PLAN, hfBlobFetcher('o/nguon', 'tok'));
    expect(h.fetchBlob.mock.calls.map((c) => c[0])).toEqual([
      'https://huggingface.co/datasets/o/nguon/resolve/main/van%20ban/2026/a.pdf',
      'https://huggingface.co/datasets/o/nguon/resolve/main/van%20ban/2026/PL1.pdf',
    ]);
    expect(items.map((i) => [i.relativePath, i.file.name, i.file.type])).toEqual([
      ['2026/a-2.pdf', 'a-2.pdf', 'application/pdf'],
      ['2026/PL1.pdf', 'PL1.pdf', 'application/pdf'],
    ]);
    expect(await items[0].file.text()).toBe('abc');
  });

  it('nguồn tùy ý (vd Google Drive): dùng hàm lấy tệp được đưa vào, truyền đủ thông tin tệp', async () => {
    const plan: PastePlan = { ...PLAN, files: [{ sourcePath: 'VB/B.docx', relativePath: 'B.docx', size: 0, fileId: 'DRV1', nativeMimeType: 'application/vnd.google-apps.document' }] };
    const fetchBlob = vi.fn(async () => new Blob(['x']));
    await fetchPasteItems(plan, fetchBlob);
    expect(fetchBlob).toHaveBeenCalledWith(expect.objectContaining({ fileId: 'DRV1', nativeMimeType: 'application/vnd.google-apps.document' }));
    expect(h.fetchBlob).not.toHaveBeenCalled();
  });

  it('báo tiến độ từ 0 tới tổng số tệp', async () => {
    const seen: Array<[number, number]> = [];
    await fetchPasteItems(PLAN, hfBlobFetcher('o/nguon', 'tok'), (d, t) => seen.push([d, t]));
    expect(seen).toEqual([[0, 2], [1, 2], [2, 2]]);
  });

  it('một tệp lỗi thì dừng ngay, không tải tiếp', async () => {
    const fetchBlob = vi.fn().mockRejectedValueOnce(new Error('Tệp "a.pdf" hỏng'));
    await expect(fetchPasteItems(PLAN, fetchBlob)).rejects.toThrow('Tệp "a.pdf" hỏng');
    expect(fetchBlob).toHaveBeenCalledTimes(1);
  });

  it('kế hoạch rỗng thì trả rỗng, không gọi nguồn', async () => {
    const fetchBlob = vi.fn();
    expect(await fetchPasteItems({ files: [], totalBytes: 0, names: [], renamed: 0 }, fetchBlob)).toEqual([]);
    expect(fetchBlob).not.toHaveBeenCalled();
  });
});
