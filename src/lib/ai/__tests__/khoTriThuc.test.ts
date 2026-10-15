import { describe, it, expect } from 'vitest';
import { taiKhoTriThuc } from '../triThuc/khoTriThuc';

describe('taiKhoTriThuc', () => {
  it('tải một lần: gọi lại trả cùng kết quả, đã sắp theo id', async () => {
    const a = taiKhoTriThuc();
    expect(taiKhoTriThuc()).toBe(a);
    const kho = await a;
    expect(kho.map((c) => c.id)).toEqual([...kho.map((c) => c.id)].sort());
  });
});
