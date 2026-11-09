import { useEffect, useState } from 'react';
import { latexExpressionToPlain } from '../../lib/ai/plainMath';

type KatexApi = typeof import('katex')['default'];

let katexLoading: Promise<KatexApi> | null = null;

// KaTeX và phông chữ toán khá nặng nên chỉ tải lần đầu gặp công thức, không đưa vào gói tải trang
function loadKatex(): Promise<KatexApi> {
  katexLoading ??= Promise.all([import('katex'), import('katex/dist/katex.min.css'), import('./mathFormula.css')])
    .then(([mod]) => mod.default)
    .catch((err) => {
      katexLoading = null;
      throw err;
    });
  return katexLoading;
}

export function MathFormula({ tex, display }: { tex: string; display: boolean }) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setHtml(null);
    loadKatex()
      .then((katex) => {
        if (!active) return;
        try {
          setHtml(katex.renderToString(tex, { displayMode: display, throwOnError: true, output: 'html' }));
        } catch {
          setHtml(null);
        }
      })
      .catch(() => { if (active) setHtml(null); });
    return () => { active = false; };
  }, [tex, display]);

  const Tag = display ? 'div' : 'span';
  const className = display
    ? 'block my-1.5 overflow-x-auto overflow-y-hidden text-sm text-slate-900 dark:text-slate-100'
    : 'ai-math-inline text-slate-900 dark:text-slate-100';

  if (html === null) {
    return <Tag className={className} data-math="plain">{latexExpressionToPlain(tex).trim()}</Tag>;
  }
  // Chuỗi do KaTeX dựng (trust mặc định tắt, chữ trong công thức đã được thoát), không phải HTML do AI gửi
  return <Tag className={className} data-math="katex" dangerouslySetInnerHTML={{ __html: html }} />;
}
