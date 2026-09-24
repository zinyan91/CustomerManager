import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/Dialog';
import { DateInput } from '../DateInput';
import { formatMoneyInput, parseMoneyInput } from '../../lib/utils';
import type { MortgageContractDraft } from '../../lib/mortgageContract';
import type { Collateral, CreditContract, MortgageContract } from '../../types';

const INPUT = 'w-full rounded-xl p-2.5 border border-line/70 bg-surface/80 focus:border-accent text-xs';
const LABEL = 'block mb-1 text-[11px] font-semibold text-ink-muted';

const Group: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="pl-3.5 border-l-2 border-line-strong">
    <div className="text-[11px] font-bold uppercase tracking-wider mb-2 text-ink">{title}</div>
    {children}
  </div>
);

function toggle(ids: number[], id: number): number[] {
  return ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id];
}

export const MortgageContractForm: React.FC<{
  draft: MortgageContractDraft;
  original: MortgageContract | null;
  errors: string[];
  saving: boolean;
  collaterals: Collateral[];
  creditContracts: CreditContract[];
  onChange: (d: MortgageContractDraft) => void;
  onSave: () => void;
  onDelete: (m: MortgageContract) => void;
  onClose: () => void;
}> = ({ draft, original, errors, saving, collaterals, creditContracts, onChange, onSave, onDelete, onClose }) => {
  const set = (p: Partial<MortgageContractDraft>) => onChange({ ...draft, ...p });
  const text = (v: string) => (v.trim() === '' ? null : v);
  const canDelete = Boolean(original?.IsReleased);

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent variant="drawer" size="lg">
        <DialogHeader>
          <DialogTitle>{original ? `Sửa HĐTC ${original.MortgageNumber}` : 'Thêm hợp đồng thế chấp'}</DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-5 text-xs overflow-y-auto">
          {errors.length > 0 && (
            <ul className="text-neg space-y-0.5" role="alert">
              {errors.map(e => <li key={e}>{e}</li>)}
            </ul>
          )}

          <Group title="Hợp đồng">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label htmlFor="mc-number" className={LABEL}>Số HĐTC</label>
                <input id="mc-number" className={INPUT} value={draft.MortgageNumber}
                  onChange={e => set({ MortgageNumber: e.target.value })} />
              </div>
              <div>
                <label className={LABEL}>Ngày ký</label>
                <DateInput value={draft.SignedDate ?? ''} onChange={v => set({ SignedDate: v || null })} className={INPUT} />
              </div>
              <div>
                <label htmlFor="mc-pledgor" className={LABEL}>Bên thế chấp (để trống nếu là chính khách hàng)</label>
                <input id="mc-pledgor" className={INPUT} value={draft.Pledgor ?? ''}
                  onChange={e => set({ Pledgor: text(e.target.value) })} />
              </div>
              <div>
                <label htmlFor="mc-max" className={LABEL}>Giá trị bảo đảm tối đa (VNĐ)</label>
                <input id="mc-max" className={`${INPUT} font-mono text-right`}
                  value={draft.MaxSecuredAmount === null || draft.MaxSecuredAmount === undefined ? '' : formatMoneyInput(String(draft.MaxSecuredAmount))}
                  onChange={e => set({ MaxSecuredAmount: e.target.value.trim() === '' ? null : parseMoneyInput(e.target.value) })} />
              </div>
            </div>
          </Group>

          <Group title="Công chứng và đăng ký giao dịch bảo đảm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label htmlFor="mc-notary-no" className={LABEL}>Số công chứng</label>
                <input id="mc-notary-no" className={INPUT} value={draft.NotaryNumber ?? ''}
                  onChange={e => set({ NotaryNumber: text(e.target.value) })} />
              </div>
              <div>
                <label className={LABEL}>Ngày công chứng</label>
                <DateInput value={draft.NotaryDate ?? ''} onChange={v => set({ NotaryDate: v || null })} className={INPUT} />
              </div>
              <div>
                <label htmlFor="mc-notary-office" className={LABEL}>Tổ chức công chứng</label>
                <input id="mc-notary-office" className={INPUT} value={draft.NotaryOffice ?? ''}
                  onChange={e => set({ NotaryOffice: text(e.target.value) })} />
              </div>
              <div>
                <label className={LABEL}>Ngày đăng ký GDBĐ</label>
                <DateInput value={draft.RegistrationDate ?? ''} onChange={v => set({ RegistrationDate: v || null })} className={INPUT} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="mc-reg-office" className={LABEL}>Cơ quan đăng ký</label>
                <input id="mc-reg-office" className={INPUT} value={draft.RegistrationOffice ?? ''}
                  onChange={e => set({ RegistrationOffice: text(e.target.value) })} />
              </div>
            </div>
          </Group>

          <Group title="Tài sản và HĐTD được bảo đảm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <fieldset>
                <legend className={LABEL}>Tài sản bảo đảm</legend>
                {collaterals.length === 0 && <p className="text-ink-faint">Khách chưa có tài sản.</p>}
                {collaterals.map(c => (
                  <label key={c.Id} className="flex items-center gap-2 py-0.5 cursor-pointer">
                    <input type="checkbox" checked={draft.CollateralIds.includes(c.Id)}
                      onChange={() => set({ CollateralIds: toggle(draft.CollateralIds, c.Id) })} />
                    <span className="font-mono">{c.AssetCode || c.AssetType || `TS #${c.Id}`}</span>
                  </label>
                ))}
              </fieldset>
              <fieldset>
                <legend className={LABEL}>HĐTD được bảo đảm</legend>
                {creditContracts.length === 0 && <p className="text-ink-faint">Khách chưa có HĐTD.</p>}
                {creditContracts.map(cc => (
                  <label key={cc.Id} className="flex items-center gap-2 py-0.5 cursor-pointer">
                    <input type="checkbox" checked={draft.CreditContractIds.includes(cc.Id)}
                      onChange={() => set({ CreditContractIds: toggle(draft.CreditContractIds, cc.Id) })} />
                    <span className="font-mono">{cc.HdtdNumber}</span>
                    {cc.IsClosed && <span className="text-ink-faint">(Đã đóng)</span>}
                  </label>
                ))}
              </fieldset>
            </div>
          </Group>

          <Group title="Giải chấp và ghi chú">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={draft.IsReleased}
                  onChange={e => set({ IsReleased: e.target.checked, ReleasedDate: e.target.checked ? draft.ReleasedDate : null })} />
                <span>Đã giải chấp</span>
              </label>
              {draft.IsReleased && (
                <div>
                  <label className={LABEL}>Ngày giải chấp</label>
                  <DateInput value={draft.ReleasedDate ?? ''} onChange={v => set({ ReleasedDate: v || null })} className={INPUT} />
                </div>
              )}
              <div className="sm:col-span-2">
                <label htmlFor="mc-note" className={LABEL}>Ghi chú</label>
                <textarea id="mc-note" className={INPUT} rows={2} value={draft.Note ?? ''}
                  onChange={e => set({ Note: text(e.target.value) })} />
              </div>
            </div>
          </Group>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-line/60">
            {original ? (
              <div className="flex items-center gap-2">
                <button type="button" disabled={!canDelete} onClick={() => onDelete(original)}
                  className="px-3 py-2 rounded-xl border border-neg/30 text-neg text-xs font-bold disabled:opacity-40 cursor-pointer">
                  Xoá HĐTC
                </button>
                {!canDelete && <span className="text-[11px] text-ink-faint">Chưa giải chấp nên chưa xoá được.</span>}
              </div>
            ) : <span />}
            <button type="button" disabled={saving} onClick={onSave}
              className="px-4 py-2 rounded-xl bg-accent text-accent-ink text-xs font-bold disabled:opacity-50 cursor-pointer">
              Lưu HĐTC
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
