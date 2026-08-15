import React from 'react';
import { UI } from '../../lib/uiClasses';
import { Copy, Check, Wallet } from 'lucide-react';
import type { MdsdvEntry } from '../../lib/mdsdv';

interface MdsdvTableViewProps {
  items: MdsdvEntry[];
  copiedKey: string | null;
  handleCopyCode: (code: string) => void;
}

export const MdsdvTableView: React.FC<MdsdvTableViewProps> = ({
  items,
  copiedKey,
  handleCopyCode,
}) => {
  const cardBg = UI.containerCardBg;

  return (
    <div className={`${cardBg} rounded-xl border border-line-strong shadow-xs overflow-hidden`}>
      <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-panel-muted/90 backdrop-blur-xs sticky top-0 z-10 border-b border-line text-[11px] font-bold text-ink-faint uppercase">
            <tr>
              <th className="py-2.5 px-4 w-44">MÃ CẤP 6</th>
              <th className="py-2.5 px-4 w-56">NGÀNH NGHỀ (CẤP 5)</th>
              <th className="py-2.5 px-4 min-w-[200px]">TÊN MỤC ĐÍCH SỬ DỤNG VỐN</th>
              <th className="py-2.5 px-4 min-w-[220px]">QUY ƯỚC FBE</th>
              <th className="py-2.5 px-4 w-32 text-center">ĐẶC THÙ</th>
              <th className="py-2.5 px-4 w-28 text-right">SAO CHÉP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {items.map(item => {
              const isCodeCopied = copiedKey === `code-${item.code}`;

              return (
                <tr
                  key={item.code}
                  className="hover:bg-panel-muted/50 transition-colors"
                >
                  {/* Mã Cấp 6 */}
                  <td className="py-2.5 px-4 font-mono whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-accent text-xs">
                        {item.code}
                      </span>
                      <span className="text-[10px] text-ink-faint bg-panel-muted px-1.5 py-0.2 rounded border border-line">
                        {item.detailCode}
                      </span>
                    </div>
                  </td>

                  {/* Ngành Cấp 5 */}
                  <td className="py-2.5 px-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold text-ink text-xs">{item.level5Code}</span>
                        <span className="text-ink-faint font-normal">• {item.level5Name}</span>
                      </div>
                      <div className="text-[10px] text-ink-faint truncate max-w-xs" title={`${item.level1Code} - ${item.level1Name}`}>
                        {item.level1Name}
                      </div>
                    </div>
                  </td>

                  {/* Tên Mục Đích */}
                  <td className="py-2.5 px-4">
                    <div className="font-semibold text-ink text-xs leading-snug">
                      {item.purposeName}
                    </div>
                  </td>

                  {/* Quy ước FBE */}
                  <td className="py-2.5 px-4 font-mono">
                    <div className="inline-flex items-center gap-1 bg-panel-muted px-2 py-0.5 rounded border border-line text-[11px] text-ink font-medium">
                      <span>{item.fbeName}</span>
                    </div>
                  </td>

                  {/* Đặc thù */}
                  <td className="py-2.5 px-4 text-center whitespace-nowrap">
                    {item.allowsOverdraft ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-pos-soft text-pos border border-pos/30 font-mono">
                        <Wallet className="w-3 h-3" />
                        <span>THẤU CHI</span>
                      </span>
                    ) : (
                      <span className="text-ink-faint font-mono text-[11px]">—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-2.5 px-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleCopyCode(item.code)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                        isCodeCopied
                          ? 'bg-pos-soft text-pos border-pos/40 font-bold'
                          : 'bg-panel border-line text-ink-muted hover:text-accent hover:border-accent/40 hover:bg-panel-muted'
                      }`}
                      title="Sao chép Mã Cấp 6"
                    >
                      {isCodeCopied ? <Check className="w-3 h-3 text-pos" /> : <Copy className="w-3 h-3" />}
                      <span>{isCodeCopied ? 'Đã chép' : 'Copy'}</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
