import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { DossierCommon, LineItem, Party } from '../registry/types';
import type { PaymentStageItem } from '../DocumentForm';
import { DateInput } from '../../DateInput';
import { formatMoneyInput } from '../../../lib/utils';
import { CCCD_ISSUE_PLACES, BANK_LIST } from '../../../lib/documentOptions';

const INPUT = 'w-full rounded-xl p-2.5 border border-line/70 bg-surface/80 focus:border-accent text-xs';
const LABEL = 'block mb-1 text-[11px] font-semibold text-ink-muted';

const STATUS_LABELS: Record<PaymentStageItem['status'], string> = {
  paid: 'Đã thanh toán',
  current: 'Đề nghị thanh toán',
  future: 'Chờ thanh toán sau',
};

// Nhóm con dùng thanh màu trái + tiêu đề (theo quy ước de-nesting: không viền lồng).
const Group: React.FC<{ title: string; accent?: string; children: React.ReactNode }> = ({
  title, accent = 'border-accent/40 text-accent', children,
}) => (
  <div className={`pl-3.5 border-l-2 ${accent.split(' ')[0]}`}>
    <div className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${accent.split(' ')[1] ?? 'text-accent'}`}>
      {title}
    </div>
    {children}
  </div>
);

const PartyFields: React.FC<{ party: Party; set: (p: Partial<Party>) => void }> = ({ party, set }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
    <div>
      <label className={LABEL}>Họ tên</label>
      <input className={INPUT} value={party.name} onChange={e => set({ name: e.target.value })} />
    </div>
    <div>
      <label className={LABEL}>Địa chỉ</label>
      <input className={INPUT} value={party.address} onChange={e => set({ address: e.target.value })} />
    </div>
    <div>
      <label className={LABEL}>CCCD số</label>
      <input className={INPUT} value={party.cccd} onChange={e => set({ cccd: e.target.value })} />
    </div>
    <div>
      <label className={LABEL}>Ngày cấp CCCD</label>
      <input className={INPUT} placeholder="VD: 25/05/2023" value={party.cccdDate}
        onChange={e => set({ cccdDate: e.target.value })} />
    </div>
    <div>
      <label className={LABEL}>Nơi cấp CCCD</label>
      <select className={INPUT} value={party.cccdPlace} onChange={e => set({ cccdPlace: e.target.value })}>
        <option value="">-- Chọn nơi cấp --</option>
        {CCCD_ISSUE_PLACES.map(p => <option key={p} value={p}>{p}</option>)}
      </select>
    </div>
  </div>
);

export const CommonInfoForm: React.FC<{
  common: DossierCommon;
  patch: (p: Partial<DossierCommon>) => void;
}> = ({ common, patch }) => {
  const setPartyA = (p: Partial<Party>) => patch({ partyA: { ...common.partyA, ...p } });
  const setPartyB = (p: Partial<Party>) => patch({ partyB: { ...common.partyB, ...p } });
  const setBank = (p: Partial<DossierCommon['bank']>) => patch({ bank: { ...common.bank, ...p } });

  const setStage = (id: string, p: Partial<PaymentStageItem>) =>
    patch({ stages: common.stages.map(s => (s.id === id ? { ...s, ...p } : s)) });
  const addStage = () =>
    patch({ stages: [...common.stages, {
      id: Date.now().toString(),
      stageName: `Đợt ${common.stages.length + 1}`, amount: '0', status: 'future', note: '',
    }] });
  const removeStage = (id: string) =>
    patch({ stages: common.stages.filter(s => s.id !== id) });

  const setItem = (id: string, p: Partial<LineItem>) =>
    patch({ items: common.items.map(it => (it.id === id ? { ...it, ...p } : it)) });
  const addItem = () =>
    patch({ items: [...common.items, {
      id: Date.now().toString(), name: '', unit: '', quantity: 1, price: 0,
    }] });
  const removeItem = (id: string) =>
    patch({ items: common.items.filter(it => it.id !== id) });

  return (
    <details open className="rounded-xl border border-line/70 bg-surface/40 overflow-hidden">
      <summary className="px-4 py-3 cursor-pointer select-none font-bold text-accent uppercase tracking-wider text-xs">
        Thông tin chung (cả hồ sơ)
      </summary>

      <div className="p-4 space-y-5 border-t border-line/50">
        <Group title="Bên A" accent="border-accent/50 text-accent">
          <PartyFields party={common.partyA} set={setPartyA} />
        </Group>

        <Group title="Bên B" accent="border-pos/50 text-pos">
          <PartyFields party={common.partyB} set={setPartyB} />
        </Group>

        <Group title="Mốc thời gian" accent="border-warn/50 text-warn">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className={LABEL}>Ngày ký hợp đồng</label>
              <DateInput value={common.contractDate} onChange={v => patch({ contractDate: v })} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Ngày bắt đầu / giao hàng</label>
              <DateInput value={common.startDate} onChange={v => patch({ startDate: v })} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Ngày kết thúc / thanh toán hết</label>
              <DateInput value={common.endDate} onChange={v => patch({ endDate: v })} className={INPUT} />
            </div>
          </div>
        </Group>

        <Group title="Tài khoản ngân hàng" accent="border-accent/50 text-accent">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className={LABEL}>Chủ tài khoản</label>
              <input className={INPUT} value={common.bank.owner} onChange={e => setBank({ owner: e.target.value })} />
            </div>
            <div>
              <label className={LABEL}>Số tài khoản</label>
              <input className={INPUT} value={common.bank.accNo} onChange={e => setBank({ accNo: e.target.value })} />
            </div>
            <div>
              <label className={LABEL}>Ngân hàng</label>
              <select className={INPUT} value={common.bank.name} onChange={e => setBank({ name: e.target.value })}>
                <option value="">-- Chọn ngân hàng --</option>
                {BANK_LIST.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Chi nhánh</label>
              <input className={INPUT} value={common.bank.branch} onChange={e => setBank({ branch: e.target.value })} />
            </div>
          </div>
        </Group>

        <Group title="Tổng tiền" accent="border-accent/50 text-accent">
          <div className="sm:w-1/2">
            <label className={LABEL}>Tổng giá trị (VNĐ)</label>
            <input className={`${INPUT} font-mono font-bold text-accent`} value={common.totalAmount}
              onChange={e => patch({ totalAmount: formatMoneyInput(e.target.value) })} />
          </div>
        </Group>

        <Group title="Các đợt thanh toán" accent="border-warn/50 text-warn">
          <div className="space-y-2">
            {common.stages.map(stage => (
              <div key={stage.id} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-12 sm:col-span-4">
                  <label className={LABEL}>Tên đợt</label>
                  <input className={INPUT} value={stage.stageName}
                    onChange={e => setStage(stage.id, { stageName: e.target.value })} />
                </div>
                <div className="col-span-6 sm:col-span-3">
                  <label className={LABEL}>Số tiền (VNĐ)</label>
                  <input className={`${INPUT} font-mono text-right`} value={stage.amount}
                    onChange={e => setStage(stage.id, { amount: formatMoneyInput(e.target.value) })} />
                </div>
                <div className="col-span-6 sm:col-span-4">
                  <label className={LABEL}>Trạng thái</label>
                  <select className={INPUT} value={stage.status}
                    onChange={e => setStage(stage.id, { status: e.target.value as PaymentStageItem['status'] })}>
                    {(Object.keys(STATUS_LABELS) as PaymentStageItem['status'][]).map(s => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-12 sm:col-span-1 flex justify-end">
                  <button type="button" onClick={() => removeStage(stage.id)}
                    className="p-2 rounded-lg text-neg hover:bg-neg-soft transition-colors" title="Xóa đợt">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            <button type="button" onClick={addStage}
              className="flex items-center gap-1.5 bg-accent hover:opacity-90 text-accent-ink px-3 py-1.5 rounded-xl text-xs font-bold transition-all">
              <Plus className="w-3.5 h-3.5" /><span>Thêm đợt thanh toán</span>
            </button>
          </div>
        </Group>

        <Group title="Danh mục hàng hóa / hạng mục" accent="border-pos/50 text-pos">
          <div className="space-y-2">
            {common.items.map(item => (
              <div key={item.id} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-12 sm:col-span-4">
                  <label className={LABEL}>Tên mặt hàng</label>
                  <input className={INPUT} value={item.name}
                    onChange={e => setItem(item.id, { name: e.target.value })} />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <label className={LABEL}>ĐVT</label>
                  <input className={INPUT} value={item.unit}
                    onChange={e => setItem(item.id, { unit: e.target.value })} />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <label className={LABEL}>Số lượng</label>
                  <input type="number" min={0} className={`${INPUT} font-mono text-center`} value={item.quantity}
                    onChange={e => setItem(item.id, { quantity: Number(e.target.value) || 0 })} />
                </div>
                <div className="col-span-4 sm:col-span-3">
                  <label className={LABEL}>Đơn giá (VNĐ)</label>
                  <input type="number" min={0} className={`${INPUT} font-mono text-right`} value={item.price}
                    onChange={e => setItem(item.id, { price: Number(e.target.value) || 0 })} />
                </div>
                <div className="col-span-12 sm:col-span-1 flex justify-end">
                  <button type="button" onClick={() => removeItem(item.id)}
                    className="p-2 rounded-lg text-neg hover:bg-neg-soft transition-colors" title="Xóa dòng">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            <button type="button" onClick={addItem}
              className="flex items-center gap-1.5 bg-accent hover:opacity-90 text-accent-ink px-3 py-1.5 rounded-xl text-xs font-bold transition-all">
              <Plus className="w-3.5 h-3.5" /><span>Thêm mặt hàng</span>
            </button>
          </div>
        </Group>
      </div>
    </details>
  );
};
