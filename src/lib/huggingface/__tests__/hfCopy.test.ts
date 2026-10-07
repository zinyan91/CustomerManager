import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PastePlan } from '../../storageClipboard';

const h = vi.hoisted(() => ({ fetchBlob: vi.fn() }));
vi.mock('../hfClient', async (importOriginal) => ({ ...(await importOriginal<object>()), fetchHfFileBlob: h.fetchBlob }));

import { HfApiError } from '../hfClient';
import { fetchPasteItems } from '../hfCopy';

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

describe('fetchPasteItems', () => {
  it('tải từng tệp từ repo nguồn bằng đường dẫn đã mã hóa, đặt tên và đường dẫn theo kế hoạch đã đổi tên', async () => {
    const items = await fetchPasteItems(PLAN, 'o/nguon', 'tok');
    expect(h.fetchBlob.mock.calls.map((c) => c[0])).toEqual([
      'https://huggingface.co/datasets/o/nguon/resolve/main/van%20ban/2026/a.pdf',
      'https://huggingface.co/datasets/o/nguon/resolve/main/van%20ban/2026/PL1.pdf',
    ]);
    expect(h.fetchBlob.mock.calls[0][1]).toBe('tok');
    expect(items.map((i) => [i.relativePath, i.file.name, i.file.type])).toEqual([
      ['2026/a-2.pdf', 'a-2.pdf', 'application/pdf'],
      ['2026/PL1.pdf', 'PL1.pdf', 'application/pdf'],
    ]);
    expect(await items[0].file.text()).toBe('abc');
  });

  it('báo tiến độ từ 0 tới tổng số tệp', async () => {
    const seen: Array<[number, number]> = [];
    await fetchPasteItems(PLAN, 'o/nguon', 'tok', (d, t) => seen.push([d, t]));
    expect(seen).toEqual([[0, 2], [1, 2], [2, 2]]);
  });

  it.each([
    [new HfApiError(401, 'x'), /Token kho lưu trữ bị từ chối khi tải "a\.pdf" \(401\)/],
    [new HfApiError(403, 'x'), /Token kho lưu trữ bị từ chối/],
    [new HfApiError(404, 'x'), /Tệp "a\.pdf" không còn trong kho nguồn/],
    [new TypeError('Failed to fetch'), /Không tải được "a\.pdf" từ kho nguồn: Failed to fetch/],
  ])('lỗi %# dừng ngay và nói rõ tệp nào', async (error, message) => {
    h.fetchBlob.mockRejectedValueOnce(error);
    await expect(fetchPasteItems(PLAN, 'o/nguon', 'tok')).rejects.toThrow(message);
    expect(h.fetchBlob).toHaveBeenCalledTimes(1);
  });

  it('kế hoạch rỗng thì trả rỗng, không gọi mạng', async () => {
    expect(await fetchPasteItems({ files: [], totalBytes: 0, names: [], renamed: 0 }, 'o/n', 't')).toEqual([]);
    expect(h.fetchBlob).not.toHaveBeenCalled();
  });
});
