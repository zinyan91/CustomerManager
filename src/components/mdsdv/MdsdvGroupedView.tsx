import React from 'react';
import { UI } from '../../lib/uiClasses';
import {
  Copy, Check, Wallet, ChevronRight, CheckCircle2,
  Hash, ArrowUpRight
} from 'lucide-react';
import type { MdsdvEntry } from '../../lib/mdsdv';
import type { MdsdvLevel5Group } from '../../hooks/useMdsdvController';

interface MdsdvGroupedViewProps {
  groupedResults: MdsdvLevel5Group[];
  copiedKey: string | null;
  handleCopyCode: (code: string) => void;
  handleCopyLevel5: (code: string, name: string) => void;
  handleCopyFull: (item: MdsdvEntry) => void;
}

export const MdsdvGroupedView: React.FC<MdsdvGroupedViewProps> = ({
  groupedResults,
  copiedKey,
  handleCopyCode,
  handleCopyLevel5,
  handleCopyFull,
}) => {
  const cardBg = UI.containerCardBg;

  return (
    <div className="space-y-4">
      {groupedResults.map(group => {
        const isL5Copied = copiedKey === `l5-${group.level5Code}`;
        return (
          <div
            key={group.level5Code}
            className={`${cardBg} rounded-xl border border-line-strong shadow-xs overflow-hidden`}
          >
            {/* Level 5 Sector Header */}
            <div className="bg-panel-muted/70 px-4 py-3 border-b border-line">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                {/* Left: Code badge & Name */}
                <div className="space-y-1">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-ink-faint">
                      NGÀNH CẤP 5:
                    </span>
                    <div className="inline-flex items-center gap-1.5 bg-accent-soft border border-accent/30 rounded-md px-2 py-0.5">
                      <Hash className="w-3 h-3 text-accent" />
                      <span className="font-mono font-extrabold text-accent text-xs">
                        {group.level5Code}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyLevel5(group.level5Code, group.level5Name)}
                        className="text-accent/70 hover:text-accent p-0.5 rounded transition-colors"
                        title="Sao chép Mã & Tên Cấp 5"
                      >
                        {isL5Copied ? <Check className="w-3 h-3 text-pos" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <h3 className="text-sm font-bold text-ink">
                      {group.level5Name}
                    </h3>
                  </div>

                  {/* Full Breadcrumb hierarchy */}
                  <div className="flex items-center flex-wrap gap-1 text-[11px] text-ink-faint">
                    <span className="font-semibold text-ink-muted">{group.level1Code} - {group.level1Name}</span>
                    {group.level2Name && (
                      <>
                        <ChevronRight className="w-3 h-3 text-line-strong shrink-0" />
                        <span>{group.level2Name}</span>
                      </>
                    )}
                    {group.level3Name && group.level3Name !== group.level2Name && (
                      <>
                        <ChevronRight className="w-3 h-3 text-line-strong shrink-0" />
                        <span>{group.level3Name}</span>
                      </>
                    )}
                    {group.level4Name && group.level4Name !== group.level3Name && (
                      <>
                        <ChevronRight className="w-3 h-3 text-line-strong shrink-0" />
                        <span>{group.level4Name}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right: Quantity badge */}
                <div className="shrink-0 flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-panel border border-line text-ink-muted font-mono">
                    {group.items.length} mục đích Cấp 6
                  </span>
                </div>
              </div>
            </div>

            {/* Level 6 Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-panel/40 border-b border-line text-[11px] font-bold text-ink-faint uppercase">
                  <tr>
                    <th className="py-2.5 px-4 w-44">MÃ CẤP 6</th>
                    <th className="py-2.5 px-4 min-w-[220px]">TÊN MỤC ĐÍCH SỬ DỤNG VỐN</th>
                    <th className="py-2.5 px-4 min-w-[240px]">QUY ƯỚC FBE (CORE BANKING)</th>
                    <th className="py-2.5 px-4 w-36 text-center">ĐẶC THÙ</th>
                    <th className="py-2.5 px-4 w-32 text-right">SAO CHÉP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {group.items.map(item => {
                    const isCodeCopied = copiedKey === `code-${item.code}`;
                    const isFullCopied = copiedKey === `full-${item.code}`;

                    return (
                      <tr
                        key={item.code}
                        className="hover:bg-panel-muted/50 transition-colors group"
                      >
                        {/* Mã cấp 6 */}
                        <td className="py-2.5 px-4 font-mono">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-accent text-xs tracking-tight">
                              {item.code}
                            </span>
                            <span className="text-[10px] text-ink-faint bg-panel-muted px-1.5 py-0.2 rounded border border-line">
                              {item.detailCode}
                            </span>
                          </div>
                        </td>

                        {/* Tên mục đích */}
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-ink text-xs leading-snug">
                            {item.purposeName}
                          </div>
                        </td>

                        {/* Quy ước FBE riêng 1 cột */}
                        <td className="py-2.5 px-4 font-mono">
                          <div className="inline-flex items-center gap-1 bg-panel-muted px-2 py-0.5 rounded border border-line text-[11px] text-ink font-medium max-w-full">
                            <span className="truncate" title={item.fbeName}>{item.fbeName}</span>
                          </div>
                        </td>

                        {/* Đặc thù */}
                        <td className="py-2.5 px-4 text-center">
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
                        <td className="py-2.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
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
                              <span>{isCodeCopied ? 'Đã chép' : 'Mã'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleCopyFull(item)}
                              className={`p-1 rounded-md border transition-colors ${
                                isFullCopied
                                  ? 'bg-pos-soft text-pos border-pos/40'
                                  : 'bg-panel border-line text-ink-faint hover:text-ink hover:bg-panel-muted'
                              }`}
                              title="Sao chép đầy đủ (Mã Cấp 6 + Tên Mục Đích + Ngành Cấp 5)"
                            >
                              {isFullCopied ? <CheckCircle2 className="w-3.5 h-3.5 text-pos" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
};
