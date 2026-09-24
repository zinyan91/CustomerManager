import React from 'react';
import { FileSignature } from 'lucide-react';
import { Toast } from '../Toast';
import { EmptyState } from '../ui/FeedbackStates';
import { MortgageContractToolbar } from '../mortgage/MortgageContractToolbar';
import { MortgageContractTable } from '../mortgage/MortgageContractTable';
import { MortgageContractForm } from '../mortgage/MortgageContractForm';
import { useMortgageContractController } from '../../hooks/useMortgageContractController';

export const MortgageContractView: React.FC = () => {
  const c = useMortgageContractController();

  if (c.customerId === null) {
    return (
      <EmptyState
        icon={FileSignature}
        title="Chọn khách hàng"
        description="Chọn khách hàng ở thanh khách hàng phía trên để xem hợp đồng thế chấp."
      />
    );
  }

  return (
    <div className="space-y-4 font-app">
      <Toast toast={c.notification} onDismiss={() => c.setNotification(null)} />
      <MortgageContractToolbar
        status={c.status} onStatus={c.setStatus}
        query={c.query} onQuery={c.setQuery}
        onNew={c.openNew}
      />
      <MortgageContractTable
        rows={c.paged.rows} page={c.paged.page} totalPages={c.paged.totalPages} total={c.filtered.length}
        collaterals={c.collaterals} creditContracts={c.creditContracts}
        onOpen={c.openEdit} onPage={c.setPage}
      />
      {c.draft && (
        <MortgageContractForm
          draft={c.draft}
          original={c.mortgages.find(m => m.Id === c.draft?.Id) ?? null}
          errors={c.formErrors}
          saving={c.saving}
          collaterals={c.collaterals}
          creditContracts={c.creditContracts}
          onChange={c.setDraft}
          onSave={c.save}
          onDelete={c.remove}
          onClose={c.closeForm}
        />
      )}
    </div>
  );
};
