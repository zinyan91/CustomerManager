import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { joinMultilineMath, splitMathSegments } from '../../lib/ai/plainMath';
import { MathFormula } from './MathFormula';

export function AiMarkdownMessage({ content }: { content: string }) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Tách nội dung thành các dòng hoặc đoạn để parse cơ bản
  const lines = joinMultilineMath(content).split('\n');

  // Render bảng nếu gặp khối markdown table
  const renderTable = (tableLines: string[], key: number) => {
    if (tableLines.length < 2) return null;
    const headerRow = tableLines[0].split('|').filter((c) => c.trim().length > 0).map((c) => c.trim());
    const dataRows = tableLines.slice(2).map((row) =>
      row.split('|').filter((c) => c.trim().length > 0).map((c) => c.trim())
    );

    return (
      <div key={key} className="my-2.5 overflow-x-auto rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-200">
              {headerRow.map((h, i) => (
                <th key={i} className="px-3 py-2 border-r last:border-r-0 border-slate-300 dark:border-slate-700 font-medium">
                  {renderFormattedInline(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {dataRows.map((r, ri) => (
              <tr key={ri} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                {r.map((c, ci) => (
                  <td key={ci} className="px-3 py-1.5 border-r last:border-r-0 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    {renderFormattedInline(c)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Khối code
    if (line.trim().startsWith('```')) {
      const codeLines: string[] = [];
      const lang = line.trim().slice(3).trim();
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      const codeText = codeLines.join('\n');
      const curIdx = i;
      elements.push(
        <div key={curIdx} className="my-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-100 overflow-hidden text-xs">
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/80 border-b border-slate-700 text-[11px] text-slate-400">
            <span>{lang || 'code'}</span>
            <button
              type="button"
              onClick={() => handleCopy(codeText, curIdx)}
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              {copiedIndex === curIdx ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Đã chép</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Sao chép</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-3 overflow-x-auto font-mono leading-relaxed">
            <code>{codeText}</code>
          </pre>
        </div>
      );
      i++;
      continue;
    }

    // Khối bảng markdown
    if (line.includes('|') && i + 1 < lines.length && lines[i + 1].includes('|') && lines[i + 1].includes('---')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      elements.push(renderTable(tableLines, i));
      continue;
    }

    // Heading 3
    if (line.startsWith('### ')) {
      elements.push(
        <h4 key={i} className="font-bold text-sm text-slate-900 dark:text-slate-100 mt-2 mb-1">
          {renderFormattedInline(line.slice(4))}
        </h4>
      );
      i++;
      continue;
    }

    // Heading 2
    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={i} className="font-bold text-base text-slate-900 dark:text-slate-100 mt-2.5 mb-1.5 pb-1 border-b border-slate-200 dark:border-slate-800">
          {renderFormattedInline(line.slice(3))}
        </h3>
      );
      i++;
      continue;
    }

    // Heading 1
    if (line.startsWith('# ')) {
      elements.push(
        <h2 key={i} className="font-bold text-lg text-slate-900 dark:text-slate-100 mt-3 mb-2">
          {renderFormattedInline(line.slice(2))}
        </h2>
      );
      i++;
      continue;
    }

    // Bullet list
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ') || line.trim().startsWith('• ')) {
      const contentText = line.trim().replace(/^[-*•]\s+/, '');
      elements.push(
        <div key={i} className="flex items-start gap-2 text-xs leading-relaxed my-0.5 text-slate-800 dark:text-slate-200 pl-2">
          <span className="text-slate-400 select-none">•</span>
          <span>{renderFormattedInline(contentText)}</span>
        </div>
      );
      i++;
      continue;
    }

    // Numbered list
    const numMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      elements.push(
        <div key={i} className="flex items-start gap-2 text-xs leading-relaxed my-0.5 text-slate-800 dark:text-slate-200 pl-2">
          <span className="font-semibold text-slate-500 dark:text-slate-400 select-none min-w-[16px]">{numMatch[1]}.</span>
          <span>{renderFormattedInline(numMatch[2])}</span>
        </div>
      );
      i++;
      continue;
    }

    // Dòng trống
    if (!line.trim()) {
      elements.push(<div key={i} className="h-1.5" />);
      i++;
      continue;
    }

    // Dòng chỉ có một công thức đứng riêng ($$...$$ hoặc \[...\])
    const segments = splitMathSegments(line.trim());
    if (segments.length === 1 && segments[0].kind === 'math' && segments[0].display) {
      elements.push(<MathFormula key={i} tex={segments[0].tex} display />);
      i++;
      continue;
    }

    // Đoạn văn bản thông thường
    elements.push(
      <p key={i} className="text-xs leading-relaxed text-slate-800 dark:text-slate-200 my-0.5">
        {renderFormattedInline(line)}
      </p>
    );
    i++;
  }

  return <div className="space-y-0.5 text-xs break-words">{elements}</div>;
}

/** Định dạng trong dòng: công thức trước (để dấu * trong công thức không bị hiểu là in nghiêng), rồi đậm, nghiêng, code. */
function renderFormattedInline(text: string): React.ReactNode {
  return splitMathSegments(text).map((seg, idx) =>
    seg.kind === 'math'
      ? <MathFormula key={`m${idx}`} tex={seg.tex} display={false} />
      : <span key={`t${idx}`}>{renderEmphasis(seg.value)}</span>
  );
}

function renderEmphasis(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-semibold text-slate-900 dark:text-slate-100">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={idx} className="italic text-slate-600 dark:text-slate-300">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={idx}
          className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
