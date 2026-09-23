import { describe, it, expect } from 'vitest';
import { pathTo, type TreeNode } from '../treeNodes';

const CAY: TreeNode[] = [
  { id: 'a', label: 'A', children: [{ id: 'a/1', label: '1' }, { id: 'a/2', label: '2' }] },
  { id: 'b', label: 'B', children: [{ id: 'b/1', label: '1', children: [{ id: 'b/1/x', label: 'x' }] }] },
];

describe('pathTo', () => {
  it('trả thư mục cha của lá', () => expect(pathTo(CAY, 'a/2')).toEqual(['a']));
  it('trả đủ tổ tiên nhiều tầng', () => expect(pathTo(CAY, 'b/1/x')).toEqual(['b', 'b/1']));
  it('nút gốc không có tổ tiên', () => expect(pathTo(CAY, 'a')).toEqual([]));
  it('id không có trả mảng rỗng', () => expect(pathTo(CAY, 'zz')).toEqual([]));
});
