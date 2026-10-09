// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { contentSizeProblem, MAX_CONTENT_BYTES } from '../collab/contentSize';

describe('contentSizeProblem', () => {
  it('nội dung nhỏ hơn giới hạn thì không có vấn đề', () => {
    expect(contentSizeProblem({ doc: 'xin chào' })).toBeNull();
  });

  it('đo theo byte UTF-8 chứ không theo số ký tự: chữ có dấu tính hai byte', () => {
    const letters = Math.floor(MAX_CONTENT_BYTES / 2) + 10;
    expect(contentSizeProblem({ doc: 'a'.repeat(letters) })).toBeNull();
    expect(contentSizeProblem({ doc: 'ế'.repeat(letters) })).toContain('vượt giới hạn 5 MB');
  });

  it('vượt giới hạn thì nêu cỡ thực tế bằng MB', () => {
    const message = contentSizeProblem({ doc: 'x'.repeat(MAX_CONTENT_BYTES + 1024 * 1024) });
    expect(message).toMatch(/lớn 6\.\d MB/);
  });
});
