import { useMemo, useState } from 'react';
import type { AlertSnapshot } from '../lib/reports/alertData';
import type { DebtGroupFilter } from '../lib/reports/debtGroup';
import { buildLoanPortfolioTables, type PortfolioTableId } from '../lib/reports/loanPortfolioTables';
import { exportLoanPortfolioExcel } from '../lib/reports/loanPortfolioWorkbook';
import { reportErrorMessage } from '../lib/reports/errorMessage';

interface PortfolioSource {
  snapshot: AlertSnapshot | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useLoanPortfolio(source: PortfolioSource) {
  const { snapshot, loading, error, reload } = source;
  const [filter, setFilter] = useState<DebtGroupFilter>('all');
  const [tableId, setTableId] = useState<PortfolioTableId>('secured');
  const [actionError, setActionError] = useState<string | null>(null);

  const tables = useMemo(
    () => (snapshot ? buildLoanPortfolioTables({ ...snapshot, todayStr: snapshot.today }, filter) : null),
    [snapshot, filter],
  );
  const table = tables?.find(t => t.id === tableId) ?? tables?.[0] ?? null;

  const exportExcel = () => {
    if (loading || error || !snapshot) return;
    setActionError(null);
    try {
      exportLoanPortfolioExcel({ ...snapshot, todayStr: snapshot.today }, filter);
    } catch (err) {
      setActionError(reportErrorMessage(err));
    }
  };

  return { filter, setFilter, tables, table, setTableId, loading, error, actionError, reload, exportExcel };
}

export type LoanPortfolioController = ReturnType<typeof useLoanPortfolio>;
