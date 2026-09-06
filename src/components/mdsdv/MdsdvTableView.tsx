import React from 'react';
import { UI } from '../../lib/uiClasses';
import type { MdsdvEntry } from '../../lib/mdsdv';

interface MdsdvTableViewProps {
  items: MdsdvEntry[];
}

export const MdsdvTableView: React.FC<MdsdvTableViewProps> = ({ items }) => {
  const cardBg = UI.containerCardBg;

  return (
    <div className={`${cardBg} rounded-2xl border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card overflow-hidden font-app animate-in fade-in duration-150`}>
      <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse font-app">
          <thead className="bg-surface/95 backdrop-blur-md sticky top-0 z-10 border-b border-line/80 text-[10px] font-bold text-ink-faint uppercase tracking-[0.09em]">
            <tr>
              <th className="py-3.5 px-4 w-40">MÃ CẤP 5</th>
              <th className="py-3.5 px-4 min-w-[200px]">NGÀNH NGHỀ</th>
              <th className="py-3.5 px-4 min-w-[180px]">NGÀNH KINH TẾ</th>
              <th className="py-3.5 px-4 min-w-[220px]">QUY ƯỚC FBE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/40">
            {items.map(item => (
              <tr
                key={item.code}
                className="hover:bg-accent/[0.04] transition-colors"
              >
                {/* Mã Cấp 5 (tách riêng khỏi ngành nghề, bôi đen chọn nhanh để copy tay) */}
                <td className="py-3 px-4 font-mono whitespace-nowrap">
                  <span className="font-bold text-accent text-xs select-all">
                    {item.level5Code}
                  </span>
                </td>

                {/* Ngành nghề (tên ngành cấp 5) */}
                <td className="py-3 px-4">
                  <div className="font-medium text-ink text-xs leading-snug">
                    {item.level5Name}
                  </div>
                </td>

                {/* Ngành kinh tế cấp 1 (tách riêng) */}
                <td className="py-3 px-4">
                  <div
                    className="text-[11px] text-ink-muted leading-snug"
                    title={`${item.level1Code} - ${item.level1Name}`}
                  >
                    {item.level1Name}
                  </div>
                </td>

                {/* Quy ước FBE (bôi đen chọn nhanh để copy tay) */}
                <td className="py-3 px-4 font-mono">
                  <span className="inline-flex items-center gap-1 bg-surface px-2 py-0.5 rounded-lg border border-line/70 text-[11px] text-ink font-medium select-all">
                    {item.fbeName}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
