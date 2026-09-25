import React from 'react';
import { Plus, Trash2, Package } from 'lucide-react';
import type { DossierCommon, LineItem, Party } from '../registry/types';
import { partyTitle } from '../registry/types';
import type { PaymentStageItem } from '../../../types/documents';
import { DateInput } from '../../DateInput';
import { CustomerPicker } from '../../ui/CustomerPicker';
import { DisbursementPayeePicker } from '../../ui/DisbursementPayeePicker';
import { formatMoneyInput, fmtDate, formatMoneyWith } from '../../../lib/utils';
import { CCCD_ISSUE_PLACES, BANK_LIST } from '../../../lib/documentOptions';
import { fetchCustomersAPI } from '../../../lib/api';
import { fetchDisbursementPayeesDb, type DisbursementPayee } from '../../../lib/disbursementDb';
import type { Customer } from '../../../types';
import { InventoryItemPickerModal, type SelectedInventoryItemPayload } from '../../inventory/InventoryItemPickerModal';

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

interface PartyFieldsProps {
  idPrefix: string;
  party: Party;
  set: (p: Partial<Party>) => void;
  hideIdCard?: boolean;
  hideIssueDetails?: boolean;
  titleSelect?: React.ReactNode;
}

const PartyFields: React.FC<PartyFieldsProps> = ({
  idPrefix,
  party,
  set,
  hideIdCard = false,
  hideIssueDetails = false,
  titleSelect,
}) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
    <div>
      <label htmlFor={`${idPrefix}-name`} className={LABEL}>Họ tên</label>
      <div className="flex gap-1.5">
        {titleSelect}
        <input
          id={`${idPrefix}-name`}
          className={INPUT.replace('w-full', 'min-w-0 flex-1')}
          value={party.name}
          onChange={e => set({ name: e.target.value })}
        />
      </div>
    </div>
    <div>
      <label className={LABEL}>Địa chỉ</label>
      <input className={INPUT} value={party.address} onChange={e => set({ address: e.target.value })} />
    </div>
    {!hideIdCard && (
      <div>
        <label className={LABEL}>CCCD số</label>
        <input className={INPUT} value={party.cccd} onChange={e => set({ cccd: e.target.value })} />
      </div>
    )}
    {!hideIdCard && !hideIssueDetails && (
      <>
        <div>
          <label className={LABEL}>Ngày cấp CCCD</label>
          <input
            className={INPUT}
            placeholder="VD: 25/05/2023"
            value={party.cccdDate}
            onChange={e => set({ cccdDate: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={LABEL}>Nơi cấp CCCD</label>
          <select className={INPUT} value={party.cccdPlace} onChange={e => set({ cccdPlace: e.target.value })}>
            <option value="">-- Chọn nơi cấp --</option>
            {CCCD_ISSUE_PLACES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </>
    )}
  </div>
);

export interface CommonInfoFormProps {
  common: DossierCommon;
  patch: (p: Partial<DossierCommon>) => void;
  activeDocId?: string;
  dossierId?: string;
}

export const CommonInfoForm: React.FC<CommonInfoFormProps> = ({
  common,
  patch,
  activeDocId,
  dossierId,
}) => {
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [payees, setPayees] = React.useState<DisbursementPayee[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<number | null>(null);
  const [selectedPayeeId, setSelectedPayeeId] = React.useState<string | null>(null);
  const [isInventoryPickerOpen, setIsInventoryPickerOpen] = React.useState(false);

  React.useEffect(() => {
    fetchCustomersAPI().then(setCustomers).catch(() => {});
    fetchDisbursementPayeesDb().then(setPayees).catch(() => {});
  }, []);

  const handleSelectCustomer = (id: number | null) => {
    setSelectedCustomerId(id);
    if (id !== null) {
      const c = customers.find(item => item.Id === id);
      if (c) {
        setPartyA({
          name: c.FullName,
          cccd: c.NationalId || '',
          address: c.Address || '',
          cccdDate: c.IdCardIssueDate ? fmtDate(c.IdCardIssueDate) : '',
          cccdPlace: c.IdCardIssuePlace || '',
        });
      }
    }
  };

  const handleSelectPayeeB = (id: string | null) => {
    setSelectedPayeeId(id);
    if (id) {
      const p = payees.find(item => item.Id === id);
      if (p) {
        setPartyB({
          name: p.FullName,
          cccd: p.NationalId || '',
          address: common.partyB.address || '',
          cccdDate: p.IdCardIssueDate ? fmtDate(p.IdCardIssueDate) : '',
          cccdPlace: p.IdCardIssuePlace || '',
        });
        setBank({
          owner: p.FullName,
          accNo: p.AccountNumber || '',
          name: p.BankName || '',
          branch: p.BankBranch || '',
        });
      }
    }
  };

  const isBangKe = activeDocId === 'bang_ke' || activeDocId === 'payment_request_bang_ke';
  const docsWithPayMethod = ['bang_ke', 'sale_contract', 'payment_request_sale', 'payment_request_bang_ke', 'payment_request_const'];
  const showPayMethod = !activeDocId || docsWithPayMethod.includes(activeDocId);
  const isPaymentRequest = activeDocId?.startsWith('payment_request') ?? false;

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
  // "Lần 1" của HĐ mua bán chính là Đợt 1 của Đề nghị thanh toán; chưa có đợt nào thì tạo Đợt 1.
  const setFirstStageAmount = (amount: string) =>
    patch({ stages: common.stages.length > 0
      ? [{ ...common.stages[0], amount }, ...common.stages.slice(1)]
      : [{ id: Date.now().toString(), stageName: 'Đợt 1', amount, status: 'current', note: '' }] });
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

  const handleSelectInventoryItems = (selected: SelectedInventoryItemPayload[]) => {
    const newItems: LineItem[] = selected.map(it => ({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: it.name,
      unit: it.unit || 'Kg',
      quantity: it.qty || 1,
      price: it.unitPrice || 0,
    }));
    // Bỏ qua các dòng trống chưa có dữ liệu
    const validExisting = common.items.filter(it => it.name.trim() !== '' || it.price > 0);
    patch({ items: [...validExisting, ...newItems] });
    setIsInventoryPickerOpen(false);
  };

  let partyATitle = 'Bên A (Bên mua)';
  let partyBTitle = 'Bên B (Bên bán / Thụ hưởng)';
  let showItems = true;
  let showStages = true;

  if (dossierId === 'sua_chua_nha') {
    partyATitle = 'Bên A (Chủ nhà / Bên giao khoán)';
    partyBTitle = 'Bên B (Bên nhận khoán thi công)';
    showItems = false;
  } else if (dossierId === 'cho_thue') {
    partyATitle = 'Bên A (Bên cho thuê)';
    partyBTitle = 'Bên B (Bên thuê)';
    showItems = false;
    showStages = false;
  } else if (dossierId === 'khac') {
    partyATitle = 'Bên A (Bên giao / Bên cho vay)';
    partyBTitle = 'Bên B (Bên nhận / Bên vay)';
    showItems = false;
    showStages = false;
  }

  // Hồ sơ có danh mục hàng hóa: tổng giá trị là tổng bảng hàng, như văn bản đang tính — không hiện ô nhập tay.
  const computedItemsTotal = React.useMemo(() => {
    return common.items.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.price) || 0)), 0);
  }, [common.items]);

  React.useEffect(() => {
    if (showItems) {
      const formatted = formatMoneyWith(computedItemsTotal);
      if (common.totalAmount !== formatted) {
        patch({ totalAmount: formatted });
      }
    }
  }, [showItems, computedItemsTotal, common.totalAmount, patch]);

  return (
    <>
      <details open className="rounded-xl border border-line/70 bg-surface/40 overflow-hidden">
        <summary className="px-4 py-3 cursor-pointer select-none font-bold text-accent uppercase tracking-wider text-xs">
          Thông tin chung (cả hồ sơ)
        </summary>

        <div className="p-4 space-y-5 border-t border-line/50">
          <Group title={partyATitle} accent="border-accent/50 text-accent">
            <div className="mb-3">
              <CustomerPicker
                customers={customers}
                selectedCustomerId={selectedCustomerId}
                onSelectCustomer={handleSelectCustomer}
                placeholder="— Tìm theo tên, CIF, SĐT để điền Bên A —"
              />
            </div>
            <PartyFields
              idPrefix="partyA"
              party={common.partyA}
              set={setPartyA}
              hideIdCard={isBangKe}
              titleSelect={showStages ? (
                <select
                  aria-label="Xưng hô (Kính gửi trong Đề nghị thanh toán)"
                  title="Xưng hô trong Đề nghị thanh toán"
                  className={INPUT.replace('w-full', 'w-20 shrink-0')}
                  value={partyTitle(common.partyA)}
                  onChange={e => setPartyA({ gender: e.target.value === 'Bà' ? 'female' : 'male' })}
                >
                  <option value="Ông">Ông</option>
                  <option value="Bà">Bà</option>
                </select>
              ) : undefined}
            />
          </Group>

          <Group title={partyBTitle} accent="border-pos/50 text-pos">
            <div className="mb-3">
              <DisbursementPayeePicker
                payees={payees}
                selectedPayeeId={selectedPayeeId}
                onSelectPayee={handleSelectPayeeB}
                placeholder="— Tìm theo tên, CCCD, STK để điền Bên B —"
              />
            </div>
            <PartyFields
              idPrefix="partyB"
              party={common.partyB}
              set={setPartyB}
              hideIssueDetails={isBangKe}
            />
          </Group>

          <Group title="Mốc thời gian" accent="border-warn/50 text-warn">
            <div className={`grid grid-cols-1 ${isBangKe ? 'sm:grid-cols-1' : showItems ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-2.5`}>
              <div>
                <label className={LABEL}>{isBangKe ? 'Ngày lập bảng kê' : 'Ngày ký hợp đồng'}</label>
                <DateInput value={common.contractDate} onChange={v => patch({ contractDate: v })} className={INPUT} />
              </div>
              {!isBangKe && (
                <>
                  {/* Hồ sơ mua bán giao hàng ngay ngày ký nên chỉ cần Ngày ký hợp đồng. */}
                  {!showItems && (
                    <div>
                      <label className={LABEL}>Ngày bắt đầu / giao hàng</label>
                      <DateInput value={common.startDate} onChange={v => patch({ startDate: v })} className={INPUT} />
                    </div>
                  )}
                  <div>
                    <label className={LABEL}>Ngày kết thúc / thanh toán hết</label>
                    <DateInput value={common.endDate} onChange={v => patch({ endDate: v })} className={INPUT} />
                  </div>
                </>
              )}
            </div>
          </Group>

          {showPayMethod && (
            <Group title="Hình thức thanh toán cho Bên bán" accent="border-accent/50 text-accent">
              <div className="flex items-center gap-5 mb-2.5 text-xs font-semibold">
                {([['transfer', 'Chuyển khoản'], ['cash', 'Tiền mặt']] as const).map(([value, label]) => (
                  <label key={value} className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="dossierPayMethod"
                      checked={common.payMethod === value}
                      onChange={() => patch({ payMethod: value })}
                      className="accent-accent"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              {common.payMethod === 'cash' ? (
                <p className="text-[11px] text-ink-muted">
                  Văn bản ghi Họ tên và CCCD của Bên B làm người nhận tiền mặt.
                </p>
              ) : (
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
              )}
            </Group>
          )}

          {!showItems && (
            <Group title="Tổng tiền" accent="border-accent/50 text-accent">
              <div className="sm:w-1/2">
                <label htmlFor="dossier-total" className={LABEL}>Tổng giá trị (VNĐ)</label>
                <input
                  id="dossier-total"
                  className={`${INPUT} font-mono font-bold text-accent`}
                  value={common.totalAmount}
                  onChange={e => patch({ totalAmount: formatMoneyInput(e.target.value) })}
                />
              </div>
            </Group>
          )}

          {activeDocId === 'sale_contract' && (
            <Group title="Thanh toán" accent="border-warn/50 text-warn">
              <div className="sm:w-1/2">
                <label htmlFor="sale-stage1" className={LABEL}>Thanh toán Lần 1 (VNĐ)</label>
                <input
                  id="sale-stage1"
                  className={`${INPUT} font-mono text-right`}
                  value={common.stages[0]?.amount ?? ''}
                  onChange={e => setFirstStageAmount(formatMoneyInput(e.target.value))}
                />
              </div>
            </Group>
          )}

          {showStages && isPaymentRequest && !isBangKe && (
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
          )}

          {showItems && !isPaymentRequest && (
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

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center gap-1.5 bg-accent hover:opacity-90 text-accent-ink px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /><span>Thêm mặt hàng</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsInventoryPickerOpen(true)}
                    className="flex items-center gap-1.5 bg-pos/15 hover:bg-pos/25 text-pos border border-pos/30 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <Package className="w-3.5 h-3.5" /><span>Chọn từ Hàng tồn kho</span>
                  </button>
                </div>
              </div>
            </Group>
          )}
        </div>
      </details>

      <InventoryItemPickerModal
        isOpen={isInventoryPickerOpen}
        onClose={() => setIsInventoryPickerOpen(false)}
        onSelectItems={handleSelectInventoryItems}
        title="CHỌN MẶT HÀNG TỪ KHO VÀO HỒ SƠ"
        defaultQtyType="import"
      />
    </>
  );
};
