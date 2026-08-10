import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import {
  fetchCustomersAPI, fetchBusinessPlansAPI, fetchBusinessPlanDebtsAPI,
  saveBusinessPlanAPI, deleteBusinessPlanAPI,
  fetchCollateralsByCustomerAPI, fetchCreditContractsByCustomerAPI,
} from '../../lib/api';
import type { BusinessPlan, BusinessPlanDebt, Collateral, CreditContract, Customer } from '../../types';
import {
  computeBusinessPlan, businessPlanInputFrom, emptyBusinessPlan,
} from '../../lib/businessPlan';
import { totalUsableCapacity } from '../../lib/collateralMath';
import type { ExportContext } from '../../lib/businessPlanExport';
import { fmtDate, todayIso } from '../../lib/utils';
import { UI } from '../../lib/uiClasses';
import { useWork } from '../../context/WorkContext';
import { Toast } from '../Toast';
import { BusinessPlanForm } from '../businessPlan/BusinessPlanForm';
import { BusinessPlanResultPanel } from '../businessPlan/BusinessPlanResultPanel';
import { UNIT_LABEL, type MoneyUnit } from '../businessPlan/units';

export const BusinessPlanView: React.FC = () => {
  const { selectedCustomerId, setSelectedCustomerId } = useWork();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [plans, setPlans] = useState<BusinessPlan[]>([]);
  const [collaterals, setCollaterals] = useState<Collateral[]>([]);
  const [creditContracts, setCreditContracts] = useState<CreditContract[]>([]);

  const [draft, setDraft] = useState<BusinessPlan | null>(null);
  const [debts, setDebts] = useState<BusinessPlanDebt[]>([]);
  const [dirty, setDirty] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [unit, setUnit] = useState<MoneyUnit>('million');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const today = todayIso();

  const showNotify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), type === 'error' ? 8000 : 4000);
  };

  useEffect(() => {
    fetchCustomersAPI({})
      .then(list => {
        list.sort((a, b) => (a.FullName || '').localeCompare(b.FullName || '', 'vi'));
        setCustomers(list);
      })
      .catch(err => showNotify('error', `Không tải được danh sách khách hàng: ${err.message}`));
  }, []);

  useEffect(() => {
    setDraft(null);
    setDebts([]);
    setDirty(false);
    if (!selectedCustomerId) {
      setPlans([]);
      setCollaterals([]);
      setCreditContracts([]);
      return;
    }
    loadCustomerData(selectedCustomerId);
  }, [selectedCustomerId]);

  const loadCustomerData = async (customerId: number) => {
    setLoading(true);
    try {
      const [ps, cols, ccs] = await Promise.all([
        fetchBusinessPlansAPI(customerId),
        fetchCollateralsByCustomerAPI(customerId),
        fetchCreditContractsByCustomerAPI(customerId),
      ]);
      setPlans(ps);
      setCollaterals(cols);
      setCreditContracts(ccs);
    } catch (err: any) {
      showNotify('error', `Không tải được phương án: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const openPlan = async (plan: BusinessPlan) => {
    setLoading(true);
    try {
      const rows = await fetchBusinessPlanDebtsAPI([plan.Id]);
      setDraft(plan);
      setDebts(rows);
      setDirty(false);
    } catch (err: any) {
      showNotify('error', `Không tải được danh sách dư nợ: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const newPlan = () => {
    if (!selectedCustomerId) return;
    setDraft(emptyBusinessPlan(selectedCustomerId, today));
    setDebts([]);
    setDirty(true);
  };

  const patch = <K extends keyof BusinessPlan>(field: K, value: BusinessPlan[K]) => {
    setDraft(prev => (prev ? { ...prev, [field]: value } : prev));
    setDirty(true);
  };

  const changeDebts = (rows: BusinessPlanDebt[]) => {
    setDebts(rows);
    setDirty(true);
  };

  const collateralCapacity = useMemo(
    () => totalUsableCapacity(collaterals, today),
    [collaterals, today]
  );

  const input = useMemo(
    () => (draft ? businessPlanInputFrom(draft, debts, collateralCapacity) : null),
    [draft, debts, collateralCapacity]
  );

  const result = useMemo(() => (input ? computeBusinessPlan(input) : null), [input]);

  const customer = customers.find(c => c.Id === selectedCustomerId) || null;

  const exportContext: ExportContext | null = draft && customer
    ? {
      customerName: customer.FullName,
      customerCif: customer.CifKh || '',
      balanceSheetDate: draft.BalanceSheetDate,
      actualYear: draft.ActualYear,
      planYear: draft.PlanYear,
      basis: {
        revenue: draft.BasisRevenue, cogs: draft.BasisCogs, staff: draft.BasisStaff,
        premises: draft.BasisPremises, utilities: draft.BasisUtilities,
        interest: draft.BasisInterest, depreciation: draft.BasisDepreciation,
        other: draft.BasisOther, tax: draft.BasisTax, profit: draft.BasisProfit,
      },
    }
    : null;

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const saved = await saveBusinessPlanAPI(draft, debts);
      showNotify('success', 'Đã lưu phương án kinh doanh.');
      setDirty(false);
      await loadCustomerData(draft.CustomerId);
      await openPlan(saved);
    } catch (err: any) {
      showNotify('error', err.message || 'Không lưu được phương án.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (plan: BusinessPlan) => {
    try {
      await deleteBusinessPlanAPI(plan.Id);
      showNotify('success', 'Đã xoá phương án.');
      if (draft?.Id === plan.Id) {
        setDraft(null);
        setDebts([]);
        setDirty(false);
      }
      await loadCustomerData(plan.CustomerId);
    } catch (err: any) {
      showNotify('error', err.message || 'Không xoá được phương án.');
    }
  };

  return (
    <div className="space-y-3 text-xs">
      <Toast toast={notification} onDismiss={() => setNotification(null)} />

      <div className={`${UI.containerCardBg} rounded-lg p-4 border`}>
        <h2 className="text-sm font-bold tracking-tight text-accent flex items-center gap-2">
          <ClipboardList className="w-5 h-5" />
          <span>PHƯƠNG ÁN KINH DOANH & HẠN MỨC</span>
        </h2>
        <p className="text-[11px] text-ink-faint mt-1">
          Khách hàng cá nhân và hộ kinh doanh. Xuất phụ lục Tình hình tài chính, Kết quả kinh doanh
          và Tính toán cấp hạn mức tín dụng.
        </p>
      </div>

      <div className={`${UI.containerCardBg} rounded-lg p-3 border grid grid-cols-1 md:grid-cols-3 gap-3 items-end`}>
        <label className="block md:col-span-2">
          <span className={`block mb-1 text-[11px] ${UI.labelStyle}`}>Khách hàng ({customers.length} KH)</span>
          <select value={selectedCustomerId ?? ''}
            onChange={e => setSelectedCustomerId(e.target.value ? parseInt(e.target.value, 10) : null)}
            className={`w-full rounded-md p-2.5 text-xs font-semibold border ${UI.inputStyle}`}>
            <option value="">— Chọn khách hàng —</option>
            {customers.map(c => (
              <option key={c.Id} value={c.Id}>{c.FullName} — CIF {c.CifKh}</option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1.5 justify-end">
          <span className="text-[10px] uppercase font-semibold text-ink-faint">Đơn vị nhập</span>
          {(['million', 'vnd'] as MoneyUnit[]).map(u => (
            <button key={u} type="button" onClick={() => setUnit(u)}
              className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold border transition-colors ${
                unit === u ? 'bg-accent text-accent-ink border-accent' : 'bg-panel-muted text-ink-muted border-line'
              }`}>
              {UNIT_LABEL[u]}
            </button>
          ))}
        </div>
      </div>

      {selectedCustomerId && (
        <div className={`${UI.containerCardBg} rounded-lg border overflow-hidden`}>
          <div className="p-3 border-b border-line bg-panel-muted flex items-center justify-between">
            <span className="font-bold text-xs">PHƯƠNG ÁN ĐÃ LẬP ({plans.length})</span>
            <button type="button" onClick={newPlan}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent text-accent-ink text-[11px] font-bold hover:opacity-90">
              <Plus className="w-3.5 h-3.5" /> Lập phương án mới
            </button>
          </div>

          {loading ? (
            <div className="p-6 text-center"><Loader2 className="w-5 h-5 animate-spin text-accent mx-auto" /></div>
          ) : plans.length === 0 ? (
            <div className="p-4 text-[11px] text-ink-faint">Khách hàng này chưa có phương án nào.</div>
          ) : (
            <div className="divide-y divide-line">
              {plans.map(p => (
                <div key={p.Id}
                  className={`p-2.5 flex items-center justify-between gap-3 ${
                    draft?.Id === p.Id ? 'bg-accent-soft' : ''
                  }`}>
                  <button type="button" onClick={() => openPlan(p)} className="flex-1 text-left">
                    <div className="font-semibold text-[11px]">
                      {p.PlanKind === 'limit' ? 'Cấp hạn mức tín dụng' : 'Cho vay từng lần'}
                      {' · '}{p.ActualYear} → {p.PlanYear}
                    </div>
                    <div className="text-[10px] text-ink-faint font-mono">
                      Cân đối {fmtDate(p.BalanceSheetDate)} · cập nhật {fmtDate(p.UpdatedAt?.slice(0, 10))}
                    </div>
                  </button>
                  <button type="button" onClick={() => remove(p)}
                    className="p-1.5 rounded-md border border-neg/30 text-neg hover:bg-neg-soft">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {draft && input && result && exportContext && (
        <>
          <BusinessPlanResultPanel
            input={input}
            result={result}
            context={exportContext}
            collateralCapacity={collateralCapacity}
            hasUnsavedChanges={dirty}
          />

          <BusinessPlanForm
            draft={draft}
            debts={debts}
            result={result}
            unit={unit}
            creditContracts={creditContracts}
            onChange={patch}
            onDebtsChange={changeDebts}
          />

          <div className="flex items-center justify-end gap-2 pb-2">
            <button type="button" onClick={() => { setDraft(null); setDebts([]); setDirty(false); }}
              className={`px-3 py-2 rounded-md text-xs font-semibold border border-line text-ink-muted`}>
              Đóng
            </button>
            <button type="button" onClick={save} disabled={saving || !dirty}
              className="px-3 py-2 rounded-md text-xs font-bold bg-accent hover:opacity-90 text-accent-ink flex items-center gap-1.5 disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Lưu phương án
            </button>
          </div>
        </>
      )}
    </div>
  );
};
