import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { UiClasses } from '../../../lib/uiClasses';
import type { ConstItem } from '../../../types/documents';

export interface EstimateFormProps {
  styles: UiClasses;
  constPartyAName: string;
  setConstPartyAName: (v: string) => void;
  constPartyBName: string;
  setConstPartyBName: (v: string) => void;
  constSiteAddress: string;
  setConstSiteAddress: (v: string) => void;
  constItems: ConstItem[];
  setConstItems: React.Dispatch<React.SetStateAction<ConstItem[]>>;
  handleAddConstItem: () => void;
}

export const EstimateForm: React.FC<EstimateFormProps> = ({
  styles,
  constPartyAName,
  setConstPartyAName,
  constPartyBName,
  setConstPartyBName,
  constSiteAddress,
  setConstSiteAddress,
  constItems,
  setConstItems,
  handleAddConstItem,
}) => {
  return (
    <div className="space-y-4 text-xs font-app animate-in fade-in duration-150">
      <div className="flex items-center justify-between border-b pb-2 border-line/60">
        <div className="font-bold text-accent uppercase tracking-wider text-xs">
          BẢNG DỰ TOÁN HẠNG MỤC CÔNG VIỆC THI CÔNG
        </div>
      </div>

      <div className="space-y-2.5 pb-4 border-b border-line/40">
        <div className="font-bold text-accent text-xs uppercase tracking-wider flex items-center gap-1.5 pb-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
          <span>THÔNG TIN CÔNG TRÌNH</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className={`block mb-1 text-[11px] ${styles.labelStyle}`}>Chủ Đầu Tư (Bên A)</label>
            <input type="text" value={constPartyAName} onChange={e => setConstPartyAName(e.target.value)} className={`w-full rounded-xl p-2.5 font-bold ${styles.inputStyle}`} />
          </div>
          <div>
            <label className={`block mb-1 text-[11px] ${styles.labelStyle}`}>Nhà Thầu Thi Công (Bên B)</label>
            <input type="text" value={constPartyBName} onChange={e => setConstPartyBName(e.target.value)} className={`w-full rounded-xl p-2.5 font-bold ${styles.inputStyle}`} />
          </div>
        </div>
        <div>
          <label className={`block mb-1 text-[11px] ${styles.labelStyle}`}>Địa điểm thi công</label>
          <input type="text" value={constSiteAddress} onChange={e => setConstSiteAddress(e.target.value)} className={`w-full rounded-xl p-2.5 ${styles.inputStyle}`} />
        </div>
      </div>

      <div className="border rounded-xl overflow-hidden border-line/70 bg-surface/60 shadow-2xs">
        <div className="p-3 bg-surface border-b border-line/70 font-bold flex items-center justify-between">
          <span className="text-xs uppercase text-accent font-bold">DANH MỤC HẠNG MỤC DỰ TOÁN ({constItems.length} HẠNG MỤC)</span>
          <button
            type="button"
            onClick={handleAddConstItem}
            className="flex items-center space-x-1.5 bg-accent hover:opacity-90 text-accent-ink px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-accent/20 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm hạng mục</span>
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-surface/95 backdrop-blur-md border-b border-line/80 text-[10px] uppercase font-bold tracking-[0.09em] text-ink-faint">
              <tr>
                <th className="px-2.5 py-2 text-center w-10">STT</th>
                <th className="px-2.5 py-2">HẠNG MỤC CÔNG VIỆC</th>
                <th className="px-2.5 py-2 text-center w-16">ĐVT</th>
                <th className="px-2.5 py-2 text-center w-20">KHỐI LƯỢNG</th>
                <th className="px-2.5 py-2 text-right w-28">ĐƠN GIÁ (VNĐ)</th>
                <th className="px-2.5 py-2 text-right w-32">THÀNH TIỀN (VNĐ)</th>
                <th className="px-2.5 py-2">GHI CHÚ</th>
                <th className="px-2.5 py-2 text-center w-10">XÓA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {constItems.map((item, idx) => (
                <tr key={item.id} className="hover:bg-panel-muted/40 transition-colors">
                  <td className="px-2.5 py-2 text-center font-bold text-ink-muted">{idx + 1}</td>
                  <td className="px-2.5 py-2">
                    <input
                      type="text"
                      value={item.name}
                      onChange={e => {
                        const next = [...constItems]; next[idx].name = e.target.value; setConstItems(next);
                      }}
                      className={`w-full rounded-lg p-1.5 ${styles.inputStyle}`}
                    />
                  </td>
                  <td className="px-2.5 py-2 text-center">
                    <input
                      type="text"
                      value={item.unit}
                      onChange={e => {
                        const next = [...constItems]; next[idx].unit = e.target.value; setConstItems(next);
                      }}
                      className={`w-16 rounded-lg p-1.5 text-center ${styles.inputStyle}`}
                    />
                  </td>
                  <td className="px-2.5 py-2 text-center">
                    <input
                      type="number"
                      step="0.1"
                      value={item.quantity}
                      onChange={e => {
                        const next = [...constItems]; next[idx].quantity = Number(e.target.value) || 0; setConstItems(next);
                      }}
                      className={`w-16 rounded-lg p-1.5 text-center font-mono ${styles.inputStyle}`}
                    />
                  </td>
                  <td className="px-2.5 py-2 text-right">
                    <input
                      type="number"
                      min={0}
                      value={item.price}
                      onChange={e => {
                        const next = [...constItems]; next[idx].price = Number(e.target.value) || 0; setConstItems(next);
                      }}
                      className={`w-24 rounded-lg p-1.5 text-right font-mono ${styles.inputStyle}`}
                    />
                  </td>
                  <td className="px-2.5 py-2 text-right font-mono font-bold text-accent">
                    {(item.quantity * item.price).toLocaleString('vi-VN')}
                  </td>
                  <td className="px-2.5 py-2">
                    <input
                      type="text"
                      value={item.note}
                      onChange={e => {
                        const next = [...constItems]; next[idx].note = e.target.value; setConstItems(next);
                      }}
                      className={`w-full rounded-lg p-1.5 ${styles.inputStyle}`}
                    />
                  </td>
                  <td className="px-2.5 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => setConstItems(constItems.filter(i => i.id !== item.id))}
                      className="p-1 rounded-lg text-neg hover:bg-neg-soft transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
