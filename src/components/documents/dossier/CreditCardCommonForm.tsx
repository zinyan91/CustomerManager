import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, CreditCard } from 'lucide-react';
import type { DossierCommon, Party, CreditCardCommon, CardProductItem } from '../registry/types';
import { CustomerPicker } from '../../ui/CustomerPicker';
import { fetchCustomersAPI } from '../../../lib/api';
import type { Customer } from '../../../types';
import { CCCD_ISSUE_PLACES, SALE_SUPPORT_LIST } from '../../../lib/documentOptions';
import { loadCardFeeProfiles } from '../../../lib/cardFeeStore';
import {
  detectCardNetwork,
  type CardNetwork,
  DEFAULT_NETWORK_CARDS,
} from '../../../lib/cardFeeProfiles';
import { fmtDate } from '../../../lib/utils';

const ALL_NETWORKS: CardNetwork[] = ['Visa', 'Napas', 'Mastercard'];

const INPUT = 'w-full rounded-xl p-2.5 border border-line/70 bg-surface/80 focus:border-accent text-xs text-ink';
const LABEL = 'block mb-1 text-[11px] font-semibold text-ink-muted';

const Group: React.FC<{ title: string; accent?: string; children: React.ReactNode }> = ({
  title, accent = 'border-accent/40 text-accent', children,
}) => (
  <div className={`pl-3.5 border-l-2 ${accent.split(' ')[0]}`}>
    <div className={`text-[11px] font-bold uppercase tracking-wider mb-2.5 ${accent.split(' ')[1] ?? 'text-accent'}`}>
      {title}
    </div>
    {children}
  </div>
);

export interface CreditCardCommonFormProps {
  common: DossierCommon;
  patch: (p: Partial<DossierCommon>) => void;
  activeDocId?: string;
  activeSpecific?: unknown;
  patchSpecific?: (p: Record<string, unknown>) => void;
}

export const CreditCardCommonForm: React.FC<CreditCardCommonFormProps> = ({
  common,
  patch,
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  useEffect(() => {
    fetchCustomersAPI().then(setCustomers).catch(() => {});
  }, []);

  const feeProfiles = useMemo(() => loadCardFeeProfiles(), []);

  const productPlans = useMemo(() => {
    const plans = new Set<string>();
    feeProfiles.forEach(p => plans.add(p.productMan));
    return Array.from(plans);
  }, [feeProfiles]);

  const card = common.creditCard || {};

  const cards: CardProductItem[] = useMemo(() => {
    if (card.cards && card.cards.length > 0) {
      return card.cards;
    }
    if (card.productPlan) {
      return [
        {
          id: 'card-1',
          network: detectCardNetwork(card.productPlan),
          productPlan: card.productPlan,
          feeIntProfile: card.feeIntProfile || '',
        },
      ];
    }
    return [
      {
        id: 'card-1',
        network: 'Visa',
        productPlan: 'MS - VISA_TIN DUNG MYSTYLE',
        feeIntProfile: 'MS_PREL2_VISA_MS 33% MIEN PHI TN 1 NAM',
      },
      {
        id: 'card-2',
        network: 'Napas',
        productPlan: 'NPC_STAND - NP TIN DUNG NOI DIA CHUAN',
        feeIntProfile: 'NPC_PRFL1_NAPAS TIN DUNG 18% THU PHI TN',
      },
      {
        id: 'card-3',
        network: 'Mastercard',
        productPlan: 'MCCR_PL - MASTERCARD CREDIT PLATINUM',
        feeIntProfile: 'MCCP_PRF05_MCCR_PL 33% MIEN PHI PH, TN 1 NAM',
      },
    ];
  }, [card.cards, card.productPlan, card.feeIntProfile]);

  const updateCards = (newCards: CardProductItem[]) => {
    patch({
      creditCard: {
        ...(common.creditCard || {}),
        cards: newCards,
        productPlan: newCards.map(c => c.productPlan).filter(Boolean).join('<br/>'),
        feeIntProfile: newCards.map(c => c.feeIntProfile).filter(Boolean).join('<br/>'),
      },
    });
  };

  const handleAddCard = (network?: CardNetwork) => {
    if (cards.length >= 3) return;
    const currentNetworks = new Set(cards.map(c => c.network || detectCardNetwork(c.productPlan)));
    const targetNet: CardNetwork = network || ALL_NETWORKS.find(n => !currentNetworks.has(n)) || 'Visa';
    const defaultData = DEFAULT_NETWORK_CARDS[targetNet];
    const newCard: CardProductItem = {
      id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      network: targetNet,
      productPlan: defaultData.productPlan,
      feeIntProfile: defaultData.feeIntProfile,
    };
    updateCards([...cards, newCard]);
  };

  const handleRemoveCard = (id: string) => {
    if (cards.length <= 1) return;
    updateCards(cards.filter(c => c.id !== id));
  };

  const handleCardNetworkChange = (id: string, newNet: CardNetwork) => {
    const defaultData = DEFAULT_NETWORK_CARDS[newNet];
    const updated = cards.map(c => {
      if (c.id === id) {
        return {
          ...c,
          network: newNet,
          productPlan: defaultData.productPlan,
          feeIntProfile: defaultData.feeIntProfile,
        };
      }
      return c;
    });
    updateCards(updated);
  };

  const handleCardPlanChange = (id: string, newPlan: string) => {
    const defaultFee = feeProfiles.find(f => f.productMan === newPlan)?.feeIntProfile || '';
    const updated = cards.map(c => {
      if (c.id === id) {
        return {
          ...c,
          productPlan: newPlan,
          feeIntProfile: defaultFee,
          network: detectCardNetwork(newPlan),
        };
      }
      return c;
    });
    updateCards(updated);
  };

  const handleCardFeeChange = (id: string, newFee: string) => {
    const updated = cards.map(c => {
      if (c.id === id) {
        return {
          ...c,
          feeIntProfile: newFee,
        };
      }
      return c;
    });
    updateCards(updated);
  };

  const patchCard = (p: Partial<CreditCardCommon>) => {
    patch({
      creditCard: {
        ...(common.creditCard || {}),
        ...p,
      },
    });
  };

  const patchPartyA = (p: Partial<Party>) => {
    patch({
      partyA: {
        ...common.partyA,
        ...p,
      },
    });
  };

  const handleSelectCustomer = (id: number | null) => {
    setSelectedCustomerId(id);
    if (id !== null) {
      const c = customers.find(item => item.Id === id);
      if (c) {
        const anyC = c as unknown as Record<string, unknown>;
        const bYear = anyC.DateOfBirth ? fmtDate(String(anyC.DateOfBirth)) : (anyC.BirthYear ? String(anyC.BirthYear) : '');
        const isMale = anyC.Gender === 'Male' || anyC.Gender === 'Nam';

        patchPartyA({
          name: c.FullName,
          cif: c.CifKh || '',
          cccd: c.NationalId || '',
          address: c.Address || '',
          currentAddress: c.Address || '',
          cccdDate: c.IdCardIssueDate ? fmtDate(c.IdCardIssueDate) : '',
          cccdPlace: c.IdCardIssuePlace || '',
          phone: c.Phone || (typeof anyC.MobilePhone === 'string' ? anyC.MobilePhone : ''),
          birthYear: bYear,
          gender: isMale ? 'male' : 'female',
          maritalStatus: c.MaritalStatus?.toLowerCase().includes('mar') ? 'married' : 'single',
        });
      }
    }
  };

  const partyA = common.partyA;

  return (
    <div className="space-y-5">
      {/* KHỐI 1: THÔNG TIN KHÁCH HÀNG (CHỦ THẺ CHÍNH) */}
      <Group title="Thông tin Khách hàng (Chủ thẻ chính)" accent="border-accent/60 text-accent">
        <div className="mb-3">
          <label className={LABEL}>Chọn nhanh từ Danh sách Khách hàng</label>
          <CustomerPicker
            customers={customers}
            selectedCustomerId={selectedCustomerId}
            onSelectCustomer={handleSelectCustomer}
            placeholder="— Tìm theo tên, CIF, CCCD để điền thông tin Chủ thẻ —"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className={LABEL}>Họ và tên</label>
            <input
              className={INPUT}
              value={partyA.name}
              onChange={e => patchPartyA({ name: e.target.value.toUpperCase() })}
              placeholder="VD: LÊ NGỌC QUẾ HÂN"
            />
          </div>

          <div>
            <label className={LABEL}>Mã CIF / Customer ID</label>
            <input
              className={INPUT}
              value={partyA.cif || ''}
              onChange={e => patchPartyA({ cif: e.target.value })}
              placeholder="VD: 005216683"
            />
          </div>

          <div>
            <label className={LABEL}>Số CCCD / GTTT</label>
            <input
              className={INPUT}
              value={partyA.cccd}
              onChange={e => patchPartyA({ cccd: e.target.value })}
              placeholder="VD: 0801 9401 3961"
            />
          </div>

          <div>
            <label className={LABEL}>Ngày cấp CCCD</label>
            <input
              className={INPUT}
              value={partyA.cccdDate}
              onChange={e => patchPartyA({ cccdDate: e.target.value })}
              placeholder="VD: 20/08/2021"
            />
          </div>

          <div className="sm:col-span-2">
            <label className={LABEL}>Nơi cấp CCCD</label>
            <select
              className={INPUT}
              value={partyA.cccdPlace}
              onChange={e => patchPartyA({ cccdPlace: e.target.value })}
            >
              <option value="">-- Chọn nơi cấp --</option>
              {CCCD_ISSUE_PLACES.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={LABEL}>Ngày sinh / Năm sinh</label>
            <input
              className={INPUT}
              value={partyA.birthYear}
              onChange={e => patchPartyA({ birthYear: e.target.value })}
              placeholder="VD: 19/01/1994"
            />
          </div>

          <div>
            <label className={LABEL}>Giới tính</label>
            <select
              className={INPUT}
              value={partyA.gender || 'female'}
              onChange={e => patchPartyA({ gender: e.target.value as 'male' | 'female' })}
            >
              <option value="female">Nữ</option>
              <option value="male">Nam</option>
            </select>
          </div>

          <div>
            <label className={LABEL}>Tình trạng hôn nhân</label>
            <select
              className={INPUT}
              value={partyA.maritalStatus || 'married'}
              onChange={e => patchPartyA({ maritalStatus: e.target.value as 'married' | 'single' | 'divorced' })}
            >
              <option value="married">Đã lập gia đình</option>
              <option value="single">Chưa kết hôn</option>
              <option value="divorced">Ly hôn / Góa</option>
            </select>
          </div>

          <div>
            <label className={LABEL}>Số điện thoại di động</label>
            <input
              className={INPUT}
              value={partyA.phone || ''}
              onChange={e => patchPartyA({ phone: e.target.value })}
              placeholder="VD: 0342925572"
            />
          </div>

          <div className="sm:col-span-2">
            <label className={LABEL}>Địa chỉ thường trú</label>
            <input
              className={INPUT}
              value={partyA.address}
              onChange={e => patchPartyA({ address: e.target.value })}
              placeholder="VD: Số nhà 59, Ấp Bình Lợi, Xã Vàm Cỏ, Tỉnh Tây Ninh"
            />
          </div>

          <div className="sm:col-span-2">
            <label className={LABEL}>Địa chỉ nơi ở hiện tại</label>
            <input
              className={INPUT}
              value={partyA.currentAddress || partyA.address}
              onChange={e => patchPartyA({ currentAddress: e.target.value })}
              placeholder="Để trống nếu trùng với Thường trú"
            />
          </div>
        </div>
      </Group>

      {/* KHỐI 2: CHÍNH SÁCH & DANH SÁCH LOẠI THẺ (TỐI ĐA 3 LOẠI: VISA, NAPAS, MASTERCARD) */}
      <Group title="Chính sách & Danh sách Thẻ đăng ký (Visa / Napas / Mastercard)" accent="border-pos/60 text-pos">
        <div className="space-y-3 mb-3">
          {cards.map((cItem, idx) => {
            const net = cItem.network || detectCardNetwork(cItem.productPlan);
            const networkPlans = productPlans.filter(p => detectCardNetwork(p) === net);
            const displayPlans = networkPlans.length > 0 ? networkPlans : productPlans;
            const finalPlans = displayPlans.includes(cItem.productPlan) ? displayPlans : [cItem.productPlan, ...displayPlans];

            const planFeeProfiles = feeProfiles.filter(p => p.productMan === cItem.productPlan);

            return (
              <div data-workspace-panel
                key={cItem.id}
                className="p-3 rounded-xl border border-line/70 bg-surface/50 space-y-2.5 relative group"
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-line/40">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-md bg-pos/15 text-pos">
                      <CreditCard size={13} />
                    </span>
                    <span className="font-bold text-xs text-ink">
                      Thẻ #{idx + 1}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Segmented Network Selector: Visa / Napas / Mastercard */}
                    <div className="flex items-center gap-0.5 bg-surface border border-line/60 rounded-lg p-0.5">
                      {ALL_NETWORKS.map(netOpt => {
                        const isSelected = net === netOpt;
                        return (
                          <button
                            key={netOpt}
                            type="button"
                            onClick={() => handleCardNetworkChange(cItem.id, netOpt)}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-ink text-surface shadow-xs'
                                : 'text-ink-muted hover:text-ink hover:bg-line/30'
                            }`}
                          >
                            {netOpt}
                          </button>
                        );
                      })}
                    </div>

                    {cards.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCard(cItem.id)}
                        className="text-neg hover:text-neg-hover p-1 rounded-lg hover:bg-neg/10 transition-colors text-xs flex items-center gap-0.5 cursor-pointer ml-1"
                        title="Xóa loại thẻ này"
                      >
                        <Trash2 size={13} />
                        <span className="text-[11px]">Xóa</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className={LABEL}>Loại thẻ ({net} - Product Plan)</label>
                    <select
                      className={INPUT}
                      value={cItem.productPlan}
                      onChange={e => handleCardPlanChange(cItem.id, e.target.value)}
                    >
                      {finalPlans.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={LABEL}>Mã phí thẻ (Fee Interest Profile)</label>
                    <select
                      className={INPUT}
                      value={cItem.feeIntProfile}
                      onChange={e => handleCardFeeChange(cItem.id, e.target.value)}
                    >
                      {planFeeProfiles.map(p => (
                        <option key={p.id} value={p.feeIntProfile}>{p.feeIntProfile}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}

          {cards.length < 3 ? (
            <div className="space-y-1.5 pt-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-ink-muted mr-1">Thêm nhanh:</span>
                {ALL_NETWORKS.filter(n => !cards.some(c => (c.network || detectCardNetwork(c.productPlan)) === n)).map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => handleAddCard(n)}
                    className="py-1 px-2.5 border border-dashed border-line hover:border-ink/60 rounded-lg text-xs font-semibold text-ink hover:bg-surface/80 transition-all flex items-center gap-1 cursor-pointer bg-surface/50"
                  >
                    <Plus size={12} />
                    <span>Thẻ {n}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleAddCard()}
                  className="py-1 px-2.5 border border-dashed border-line hover:border-ink/60 rounded-lg text-xs font-semibold text-ink-muted hover:text-ink hover:bg-surface/80 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={12} />
                  <span>Thêm loại khác</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="py-1.5 px-2.5 rounded-lg border border-line/50 bg-surface/40 text-[11px] font-medium text-ink-muted flex items-center gap-1.5">
              <span className="text-pos font-bold">✓</span>
              <span>Đã cấu hình đủ cả 3 loại thẻ: <strong>Visa</strong>, <strong>Napas</strong>, <strong>Mastercard</strong>.</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-line/40">
          <div>
            <label className={LABEL}>Hạn mức đề xuất (VNĐ)</label>
            <input
              className={INPUT}
              value={card.cardLimit || '30,000,000'}
              onChange={e => patchCard({ cardLimit: e.target.value })}
              placeholder="VD: 30,000,000"
            />
          </div>

          <div>
            <label className={LABEL}>Mã chính sách CMS</label>
            <input
              className={INPUT}
              value={card.creditPolicy || 'A2_KHCN_TSBD_BDS'}
              onChange={e => patchCard({ creditPolicy: e.target.value })}
              placeholder="VD: A2_KHCN_TSBD_BDS"
            />
          </div>
        </div>
      </Group>

      {/* KHỐI 3: CÁN BỘ & ĐƠN VỊ KINH DOANH */}
      <Group title="Cán bộ & Đơn vị phụ trách" accent="border-warn/60 text-warn">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="sm:col-span-2">
            <label className={LABEL}>Đơn vị kinh doanh (TTKD)</label>
            <input
              className={INPUT}
              value={card.ttkdName || 'TTKD NGUYỄN ẢNH THỦ'}
              onChange={e => patchCard({ ttkdName: e.target.value })}
              placeholder="VD: TTKD NGUYỄN ẢNH THỦ"
            />
          </div>

          <div>
            <label className={LABEL}>Cán bộ kinh doanh</label>
            <input
              className={INPUT}
              value={card.saleOfficerName || 'Lại Dương Công Bằng'}
              onChange={e => patchCard({ saleOfficerName: e.target.value })}
              placeholder="Họ tên CBKD"
            />
          </div>

          <div>
            <label className={LABEL}>SĐT Cán bộ kinh doanh</label>
            <input
              className={INPUT}
              value={card.saleOfficerPhone || '0772.750.714'}
              onChange={e => patchCard({ saleOfficerPhone: e.target.value })}
              placeholder="SĐT CBKD"
            />
          </div>

          <div>
            <label className={LABEL}>Mã CIF Sale Officer</label>
            <input
              className={INPUT}
              value={card.saleOfficerCif || '005247611'}
              onChange={e => patchCard({ saleOfficerCif: e.target.value })}
              placeholder="Mã CIF CBKD"
            />
          </div>

          <div>
            <label className={LABEL}>Trưởng đơn vị / GĐ TTKD</label>
            <input
              className={INPUT}
              value={card.directorName || 'Trần Đại Thời'}
              onChange={e => patchCard({ directorName: e.target.value })}
              placeholder="Họ tên Giám đốc"
            />
          </div>

          <div className="sm:col-span-2 pt-2 border-t border-line/40">
            <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2">
              Cán bộ Hỗ trợ kinh doanh (Sale Support)
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className={LABEL}>Chọn nhanh Cán bộ Sale Support</label>
            <select
              className={INPUT}
              value={
                SALE_SUPPORT_LIST.find(
                  s => s.cif === card.saleSupportCif || s.name.toUpperCase() === (card.saleSupportName || '').toUpperCase()
                )?.cif || ''
              }
              onChange={e => {
                const found = SALE_SUPPORT_LIST.find(s => s.cif === e.target.value);
                if (found) {
                  patchCard({
                    saleSupportCif: found.cif,
                    saleSupportName: found.name,
                  });
                }
              }}
            >
              <option value="">-- Chọn cán bộ Sale Support từ danh mục --</option>
              {SALE_SUPPORT_LIST.map(s => (
                <option key={s.cif} value={s.cif}>
                  {s.cif} - {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={LABEL}>Mã Sale Support CIF</label>
            <input
              className={INPUT}
              value={card.saleSupportCif || '005218997'}
              onChange={e => patchCard({ saleSupportCif: e.target.value })}
              placeholder="VD: 005218997"
            />
          </div>

          <div>
            <label className={LABEL}>Sale Support Name</label>
            <input
              className={INPUT}
              value={card.saleSupportName || 'NGUYỄN THỊ XUÂN NHƯ'}
              onChange={e => patchCard({ saleSupportName: e.target.value.toUpperCase() })}
              placeholder="VD: NGUYỄN THỊ XUÂN NHƯ"
            />
          </div>
        </div>
      </Group>
    </div>
  );
};
