import { PiggyBank, Plus } from 'lucide-react';
import { WorkspacePageHeader } from '../ui/WorkspacePageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import { Button } from '../ui/Button';
import { ErrorState, LoadingState } from '../ui/FeedbackStates';
import { Toast } from '../Toast';
import { RADIUS_CONTROL, UI } from '../../lib/uiClasses';
import { fmtDate, fmtNumber } from '../../lib/utils';
import { useSavingsPledgeController, type SavingsPledgeTab } from '../../hooks/useSavingsPledgeController';
import { SavingsPledgeKpis, type KpiItem } from '../savingsPledge/SavingsPledgeKpis';
import { SavingsBookTable } from '../savingsPledge/SavingsBookTable';
import { SavingsBookDetail } from '../savingsPledge/SavingsBookDetail';
import { PledgeLoanTable } from '../savingsPledge/PledgeLoanTable';
import { PledgeLoanDetail } from '../savingsPledge/PledgeLoanDetail';
import { SavingsBookForm } from '../savingsPledge/SavingsBookForm';
import { PledgeLoanForm } from '../savingsPledge/PledgeLoanForm';
import { RepaymentDialog } from '../savingsPledge/RepaymentDialog';

const money = (v: number) => <>{fmtNumber(v)} <span className="text-[11px] font-normal text-ink-muted">đ</span></>;
const missingNote = (n: number) => (n > 0 ? `Chưa tính ${n} sổ thiếu thông tin` : undefined);
const daysLeft = (d: number | null) => (d === null ? undefined : d < 0 ? `quá ${-d} ngày` : `còn ${d} ngày`);

export function SavingsPledgeView() {
  const c = useSavingsPledgeController();
  const { bookKpis: bk, loanKpis: lk } = c;

  const savingsKpis: KpiItem[] = [
    { label: 'Tổng tiền gửi', value: money(bk.activeTotal), sub: `${bk.activeCount} sổ`, tone: 'collateral' },
    { label: 'Tổng lãi nhận', value: bk.totalInterest === null ? '—' : money(bk.totalInterest), sub: missingNote(bk.missingCount), tone: 'pos' },
    { label: 'Tổng nhận cuối kỳ', value: bk.totalAtMaturity === null ? '—' : money(bk.totalAtMaturity), sub: missingNote(bk.missingCount), tone: 'accent' },
  ];
  const loanKpis: KpiItem[] = [
    { label: 'Dư nợ cầm cố', value: money(lk.outstanding), sub: `${lk.activeCount} khoản đang vay`, tone: 'accent' },
    { label: 'Lãi dồn tích đến hôm nay', value: money(lk.accruedToday), sub: `Tính đến ${fmtDate(c.today)}`, tone: 'accent' },
    { label: 'Phải trả khi đến hạn', value: money(lk.dueTotal), sub: 'Gốc + lãi cả kỳ', tone: 'accent' },
    { label: 'Đến hạn gần nhất', value: lk.nextDue ? fmtDate(lk.nextDue) : '—', sub: daysLeft(lk.daysToNextDue), tone: lk.daysToNextDue !== null && lk.daysToNextDue < 0 ? 'neg' : 'warn' },
  ];
  const openBookCount = c.bookRows.filter((r) => !r.book.IsClosed).length;
  const openLoanCount = c.loanRows.filter((r) => !r.loan.IsClosed).length;

  return (
    <div data-workspace-page className="space-y-0 w-full pb-8 font-app">
      <Toast toast={c.notification} onDismiss={() => c.setNotification(null)} />

      <WorkspacePageHeader
        title="Huy động & Cầm cố"
        icon={PiggyBank}
        actions={c.customer && (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={c.bookForm.openNew}>Thêm sổ tiết kiệm</Button>
            <Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => c.loanForm.openNew()}>Tạo khoản vay cầm cố</Button>
          </div>
        )}
      />

      {c.selectedCustomerId === null ? (
        <div data-workspace-panel className="workspace-toolbar px-4 py-3 border-b border-line">
          <div className="max-w-md space-y-2">
            <label htmlFor="sp-customer" className="block text-[11px] font-semibold text-ink-muted">Khách hàng</label>
            <select
              id="sp-customer"
              value=""
              onChange={(e) => c.setSelectedCustomerId(e.target.value ? Number(e.target.value) : null)}
              className={`w-full ${RADIUS_CONTROL} px-3 py-2 text-xs border cursor-pointer ${UI.inputStyle}`}
            >
              <option value="">— Chọn khách hàng ({c.customers.length}) —</option>
              {c.customers.map((k) => <option key={k.Id} value={k.Id}>{k.FullName} (CIF: {k.CifKh})</option>)}
            </select>
          </div>
        </div>
      ) : c.error ? (
        <div data-workspace-panel className="bg-panel p-4">
          <ErrorState title="Không tải được dữ liệu huy động và cầm cố" message={<span role="alert">{c.error}</span>} onRetry={() => void c.reload()} />
        </div>
      ) : c.loading && c.bookRows.length === 0 && c.loanRows.length === 0 ? (
        <div data-workspace-panel className="bg-panel p-4"><LoadingState /></div>
      ) : (
        <Tabs value={c.tab} onValueChange={(v) => c.setTab(v as SavingsPledgeTab)}>
          <div data-workspace-panel className="workspace-toolbar px-4 py-2 border-b border-line">
            <TabsList>
              <TabsTrigger value="savings">Sổ tiết kiệm ({openBookCount})</TabsTrigger>
              <TabsTrigger value="loans">Khoản vay cầm cố ({openLoanCount})</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="savings">
            <SavingsPledgeKpis items={savingsKpis} />
            {c.bookRows.length === 0 ? (
              <div data-workspace-panel className="bg-panel text-center py-10 text-xs text-ink-muted space-y-2">
                <p>Khách hàng chưa có sổ tiết kiệm nào.</p>
                <Button variant="secondary" size="sm" onClick={c.bookForm.openNew}>Thêm sổ tiết kiệm</Button>
              </div>
            ) : (
              <div data-workspace-panel className="bg-panel grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px]">
                <SavingsBookTable rows={c.bookRows} selectedId={c.bookDetail?.book.Id ?? null} onSelect={c.selectBook} />
                {c.bookDetail && (
                  <div className="border-t xl:border-t-0 xl:border-l border-line">
                    <SavingsBookDetail
                      row={c.bookDetail}
                      onGoToLoan={c.goToLoan}
                      onEdit={() => c.bookDetail && c.bookForm.openEdit(c.bookDetail.book)}
                      onNewLoan={() => c.bookDetail && c.loanForm.openNew(c.bookDetail.book.Id)}
                    />
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="loans">
            <SavingsPledgeKpis items={loanKpis} />
            {c.loanRows.length === 0 ? (
              <div data-workspace-panel className="bg-panel text-center py-10 text-xs text-ink-muted space-y-2">
                <p>Khách hàng chưa có khoản vay cầm cố nào.</p>
                <Button variant="secondary" size="sm" onClick={() => c.loanForm.openNew()}>Tạo khoản vay cầm cố</Button>
              </div>
            ) : (
              <div data-workspace-panel className="bg-panel grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px]">
                <PledgeLoanTable rows={c.loanRows} selectedId={c.loanDetail?.loan.Id ?? null} onSelect={c.selectLoan} />
                {c.loanDetail && (
                  <div className="border-t xl:border-t-0 xl:border-l border-line">
                    <PledgeLoanDetail
                      row={c.loanDetail}
                      onGoToBook={c.goToBook}
                      onRepay={() => c.loanDetail && c.repayDialog.openFor(c.loanDetail.loan.Id)}
                      onEdit={() => c.loanDetail && c.loanForm.openEdit(c.loanDetail.loan)}
                    />
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {c.bookForm.open && <SavingsBookForm key={c.bookForm.formKey} form={c.bookForm} />}
      {c.loanForm.open && <PledgeLoanForm key={c.loanForm.formKey} form={c.loanForm} bookRows={c.bookRows} bundle={c.bundle} />}
      <RepaymentDialog dialog={c.repayDialog} bundle={c.bundle} today={c.today} />
    </div>
  );
}
