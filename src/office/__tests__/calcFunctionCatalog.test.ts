import { describe, expect, it } from 'vitest';
import { FUNCTIONS } from '../calc/engine/functions';
import { allFunctions, FUNCTION_GROUPS } from '../calc/engine/functionCatalog';

const SPECIAL = ['IF', 'IFS', 'IFERROR', 'IFNA', 'CHOOSE', 'OFFSET', 'INDIRECT', 'SWITCH'];

describe('thư viện hàm theo nhóm', () => {
  it('mọi hàm của engine đều được xếp đúng một nhóm, không có tên thừa', () => {
    const catalogued = allFunctions().map((f) => f.name);
    expect(new Set(catalogued).size).toBe(catalogued.length);
    const engine = [...Object.keys(FUNCTIONS), ...SPECIAL].sort();
    expect([...catalogued].sort()).toEqual(engine);
  });

  it('có đủ nhóm và nhóm nào cũng có hàm', () => {
    for (const names of Object.values(FUNCTION_GROUPS)) expect(names.length).toBeGreaterThan(0);
  });
});
