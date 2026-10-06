import { describe, it, expect, beforeEach } from 'vitest';
import { buildFolderTree, normalizeHfRepoAndFolder } from '../hfClient';
import { formatBytes } from '../../../types/huggingface';

describe('Hugging Face Client & Folder Tree', () => {
  const store: Record<string, string> = {};

  beforeEach(() => {
    for (const k in store) delete store[k];
    globalThis.localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { for (const k in store) delete store[k]; },
      length: 0,
      key: () => null,
    };
  });

  it('formatBytes định dạng chính xác các mức dung lượng', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1.00 KB');
    expect(formatBytes(1048576)).toBe('1.00 MB');
    expect(formatBytes(1073741824)).toBe('1.00 GB');
  });

  it('buildFolderTree tạo cây phân cấp chuẩn mực từ đường dẫn tệp', () => {
    const items = [
      { path: '2026/phap-quy/QD_112.pdf', size: 1000 },
      { path: '2026/phap-quy/TT_01.pdf', size: 2000 },
      { path: '2026/tin-dung/HDTD_01.pdf', size: 3000 },
      { path: '2025/tong-ket.pdf', size: 4000 },
      { path: 'goc.pdf', size: 500 },
    ];

    const tree = buildFolderTree(items);

    expect(tree.fileCount).toBe(5);
    expect(tree.totalBytes).toBe(10500);
    expect(tree.children.length).toBe(2); // '2025' và '2026'

    const node2026 = tree.children.find((c) => c.name === '2026');
    expect(node2026).toBeDefined();
    expect(node2026?.fileCount).toBe(3);
    expect(node2026?.totalBytes).toBe(6000);
    expect(node2026?.children.length).toBe(2); // 'phap-quy' và 'tin-dung'

    const nodePhapQuy = node2026?.children.find((c) => c.name === 'phap-quy');
    expect(nodePhapQuy?.fileCount).toBe(2);
    expect(nodePhapQuy?.totalBytes).toBe(3000);
  });

  it('normalizeHfRepoAndFolder tách repo và thư mục từ URL hoặc chuỗi dài', () => {
    expect(normalizeHfRepoAndFolder('https://huggingface.co/datasets/own/repo/tree/main/van-thu', '')).toEqual({
      repoId: 'own/repo',
      folder: 'van-thu',
    });
    expect(normalizeHfRepoAndFolder('datasets/own/repo', '/ho-so/')).toEqual({ repoId: 'own/repo', folder: 'ho-so' });
    expect(normalizeHfRepoAndFolder('own/repo/a/b', '')).toEqual({ repoId: 'own/repo', folder: 'a/b' });
  });
});
