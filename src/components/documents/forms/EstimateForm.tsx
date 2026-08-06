import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { UiClasses } from '../../../lib/uiClasses';
import type { ConstItem } from '../DocumentForm';

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
      <div className={`${styles.containerCardBg} rounded-lg p-5 border space-y-4 text-xs`}>
        <div className="flex items-center justify-between border-b pb-2 border-line">
          <div className="font-bold text-accent uppercase tracking-wider text-sm">
            BẢNG DỰ TOÁN HẠNG MỤC CÔNG VIỆC THI CÔNG
          </div>
        </div>

        <div className="p-3.5 rounded-md border border-line  bg-panel-muted  space-y-2.5">
          <div className="font-bold text-accent text-xs uppercase border-b pb-1 border-line">THÔNG TIN CÔNG TRÌNH</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className={`block mb-1 ${styles.labelStyle}`}>Chủ Đầu Tư (Bên A)</label>
              <input type="text" value={constPartyAName} onChange={e => setConstPartyAName(e.target.value)} className={`w-full rounded-md p-2 font-bold ${styles.inputStyle}`} />
            </div>
            <div>
              <label className={`block mb-1 ${styles.labelStyle}`}>Nhà Thầu Thi Công (Bên B)</label>
              <input type="text" value={constPartyBName} onChange={e => setConstPartyBName(e.target.value)} className={`w-full rounded-md p-2 font-bold ${styles.inputStyle}`} />
            </div>
          </div>
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Địa điểm thi công</label>
            <input type="text" value={constSiteAddress} onChange={e => setConstSiteAddress(e.target.value)} className={`w-full rounded-md p-2 ${styles.inputStyle}`} />
          </div>
        </div>

        <div className="border rounded-md overflow-hidden border-line">
          <div className="p-2.5 bg-panel-muted font-bold flex items-center justify-between">
            <span>DANH MỤC HẠNG MỤC DỰ TOÁN ({constItems.length} HẠNG MỤC)</span>
            <button type="button" onClick={handleAddConstItem} className="flex items-center space-x-1 bg-accent hover:opacity-90 text-accent-ink px-3 py-1 rounded-lg text-xs">
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm hạng mục</span>
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className={styles.tableHeaderStyle}>
                <tr>
                  <th className="px-[var(--row-px)] py-[var(--row-py)]">STT</th>
                  <th className="px-[var(--row-px)] py-[var(--row-py)]">HẠNG MỤC CÔNG VIỆC</th>
                  <th className="px-[var(--row-px)] py-[var(--row-py)] text-center">ĐVT</th>
                  <th className="px-[var(--row-px)] py-[var(--row-py)] text-center">KHỐI LƯỢNG</th>
                  <th className="px-[var(--row-px)] py-[var(--row-py)] text-right">ĐƠN GIÁ (VNĐ)</th>
                  <th className="px-[var(--row-px)] py-[var(--row-py)] text-right">THÀNH TIỀN (VNĐ)</th>
                  <th className="px-[var(--row-px)] py-[var(--row-py)]">GHI CHÚ</th>
                  <th className="px-[var(--row-px)] py-[var(--row-py)] text-center">XÓA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {constItems.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="px-[var(--row-px)] py-[var(--row-py)] text-center font-bold">{idx + 1}</td>
                    <td className="px-[var(--row-px)] py-[var(--row-py)]">
                      <input type="text" value={item.name} onChange={e => {
                        const next = [...constItems]; next[idx].name = e.target.value; setConstItems(next);
                      }} className={`w-full rounded-lg p-1 ${styles.inputStyle}`} />
                    </td>
                    <td className="px-[var(--row-px)] py-[var(--row-py)] text-center">
                      <input type="text" value={item.unit} onChange={e => {
                        const next = [...constItems]; next[idx].unit = e.target.value; setConstItems(next);
                      }} className={`w-16 rounded-lg p-1 text-center ${styles.inputStyle}`} />
                    </td>
                    <td className="px-[var(--row-px)] py-[var(--row-py)] text-center">
                      <input type="number" step="0.1" value={item.quantity} onChange={e => {
                        const next = [...constItems]; next[idx].quantity = Number(e.target.value) || 0; setConstItems(next);
                      }} className={`w-16 rounded-lg p-1 text-center font-mono ${styles.inputStyle}`} />
                    </td>
                    <td className="px-[var(--row-px)] py-[var(--row-py)] text-right">
                      <input type="number" min={0} value={item.price} onChange={e => {
                        const next = [...constItems]; next[idx].price = Number(e.target.value) || 0; setConstItems(next);
                      }} className={`w-24 rounded-lg p-1 text-right font-mono ${styles.inputStyle}`} />
                    </td>
                    <td className="px-[var(--row-px)] py-[var(--row-py)] text-right font-mono font-bold text-accent">
                      {(item.quantity * item.price).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-[var(--row-px)] py-[var(--row-py)]">
                      <input type="text" value={item.note} onChange={e => {
                        const next = [...constItems]; next[idx].note = e.target.value; setConstItems(next);
                      }} className={`w-full rounded-lg p-1 ${styles.inputStyle}`} />
                    </td>
                    <td className="px-[var(--row-px)] py-[var(--row-py)] text-center">
                      <button type="button" onClick={() => setConstItems(constItems.filter(i => i.id !== item.id))} className="text-neg hover:text-neg">
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
