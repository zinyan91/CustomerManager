import { useMemo, useState } from 'react';
import type { PledgeBundle, PledgeLoan } from '../types';
import type { PledgeLoanLinkInput } from '../lib/api';
import { pledgeLoanWarnings } from '../lib/pledgeLoan';

export function useLoanFormState(initial: Partial<PledgeLoan>, initialLinks: PledgeLoanLinkInput[], bundle: PledgeBundle) {
  const [values, setValues] = useState<Partial<PledgeLoan>>(initial);
  const [links, setLinks] = useState<PledgeLoanLinkInput[]>(initialLinks);

  const warnings = useMemo(() => {
    if (!values.DueDate || !values.Amount) return [];
    const draft = { ...(values as PledgeLoan), Id: values.Id ?? -1, IsClosed: false };
    const otherLinks = bundle.links.filter((l) => l.PledgeLoanId !== draft.Id);
    const draftLinks = links.map((l, i) => ({ ...l, Id: -1 - i, PledgeLoanId: draft.Id, ReleasedDate: null }));
    return pledgeLoanWarnings(draft, [...otherLinks, ...draftLinks], bundle.books, bundle.loans, bundle.repayments);
  }, [values, links, bundle]);

  const setField = <K extends keyof PledgeLoan>(key: K, value: PledgeLoan[K] | undefined) =>
    setValues((v) => ({ ...v, [key]: value }));

  return { values, setField, links, setLinks, warnings };
}
