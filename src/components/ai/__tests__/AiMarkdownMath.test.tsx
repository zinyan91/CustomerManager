// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { AiMarkdownMessage } from '../AiMarkdownMessage';

afterEach(cleanup);

describe('AiMarkdownMessage hiển thị công thức', () => {
  it('công thức trong dòng được KaTeX vẽ, không còn ký hiệu $ hay \\text', async () => {
    const { container } = render(
      <AiMarkdownMessage content={'Tổng dư nợ dự kiến: $2 \\text{ tỷ (cũ)} + 2 \\text{ tỷ (mới)} = 4 \\text{ tỷ đồng}$ (Ngắn hạn).'} />
    );
    await waitFor(() => expect(container.querySelector('[data-math="katex"] .katex')).not.toBeNull());
    expect(container.textContent).not.toContain('\\text');
    expect(container.textContent).not.toContain('$');
    expect(container.textContent).toContain('Tổng dư nợ dự kiến:');
    expect(container.textContent).toContain('(Ngắn hạn).');
  });

  it('công thức đứng riêng trên nhiều dòng vẽ thành một khối', async () => {
    const { container } = render(<AiMarkdownMessage content={'Hệ số:\n$$\nDSCR = \\frac{CF}{P + I}\n$$'} />);
    await waitFor(() => expect(container.querySelector('div[data-math="katex"] .katex-display')).not.toBeNull());
  });

  it('dấu $ thường và chữ đậm vẫn như cũ', () => {
    render(<AiMarkdownMessage content={'Giá **$5** và $10 mỗi gói'} />);
    expect(screen.getByText('$5').tagName).toBe('STRONG');
    expect(document.querySelector('[data-math]')).toBeNull();
  });

  it('công thức viết sai thì hiện bản chữ thường, không hiện ký hiệu thô', async () => {
    const { container } = render(<AiMarkdownMessage content={'Lỗi: $\\frac{1}{2 \\badcommand$'} />);
    await new Promise((r) => setTimeout(r, 50));
    const el = container.querySelector('[data-math]');
    expect(el?.getAttribute('data-math')).toBe('plain');
    expect(el?.textContent).not.toContain('\\');
  });
});
