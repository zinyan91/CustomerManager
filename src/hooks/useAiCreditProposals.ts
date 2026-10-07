import { useCallback, useEffect, useRef, useState } from 'react';
import type { AiAttachment } from '../types/ai';
import type { Customer } from '../types';
import { extractCreditProfile, type CreditExtraction, type ExtractedCollateral, type ExtractedCustomer } from '../lib/ai/creditExtract';
import { findCustomerForIntake, recordCreditIntake } from '../lib/api/creditIntakeApi';
import { validateCreditIntake } from '../lib/creditIntake';

export type CreditProposalStatus = 'reading' | 'ready' | 'saving' | 'saved' | 'error';

export interface CustomerMatchState {
  state: 'idle' | 'checking' | 'found' | 'new' | 'error';
  customer?: Customer;
  by?: 'cif' | 'nationalId';
  message?: string;
}

export interface CreditProposal {
  id: string;
  attachment: AiAttachment;
  status: CreditProposalStatus;
  data: CreditExtraction | null;
  match: CustomerMatchState;
  /** Song song với data.collaterals: tài sản nào đã lưu (không lưu lại khi bấm ghi lần nữa). */
  saved: boolean[];
  /** Kết quả lần ghi gần nhất: nói rõ đã tạo hay cập nhật gì. */
  summary: string | null;
  error: string | null;
}

interface Options {
  model: string;
  /** Sau khi ghi xong (cả khi chỉ ghi được một phần) để làm mới danh sách nơi khác. */
  onRecorded?: () => void;
}

const matchedStates = (m: CustomerMatchState) => m.state === 'found';

/**
 * Đề xuất nhập hồ sơ tín dụng từ tệp gửi cho AI: AI đọc tờ trình hoặc định giá TSĐB, trích khách hàng và tài sản,
 * báo khách hàng đã có hay sẽ tạo mới, người dùng xem và sửa rồi bấm ghi. AI không tự ghi vào CSDL.
 */
export function useAiCreditProposals({ model, onRecorded }: Options) {
  const [proposals, setProposals] = useState<CreditProposal[]>([]);
  const mounted = useRef(true);
  const ref = useRef<CreditProposal[]>([]);
  ref.current = proposals;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const patch = useCallback((id: string, change: Partial<CreditProposal>) => {
    if (!mounted.current) return;
    setProposals((list) => list.map((p) => (p.id === id ? { ...p, ...change } : p)));
  }, []);

  const lookup = useCallback(
    async (id: string, data?: CreditExtraction) => {
      const current = data ?? ref.current.find((p) => p.id === id)?.data;
      if (!current) return;
      const { cif, nationalId } = current.customer;
      if (!cif.trim() && !nationalId.trim()) {
        patch(id, { match: { state: 'new' } });
        return;
      }
      patch(id, { match: { state: 'checking' } });
      try {
        const found = await findCustomerForIntake(cif, nationalId);
        patch(id, { match: found ? { state: 'found', customer: found.customer, by: found.by } : { state: 'new' } });
      } catch (err) {
        patch(id, { match: { state: 'error', message: err instanceof Error ? err.message : String(err) } });
      }
    },
    [patch]
  );

  const propose = useCallback(
    (attachments: AiAttachment[]) => {
      if (attachments.length === 0) return;
      const added: CreditProposal[] = attachments.map((attachment) => ({
        id: `credit_${attachment.id}`,
        attachment,
        status: 'reading',
        data: null,
        match: { state: 'idle' },
        saved: [],
        summary: null,
        error: null,
      }));
      setProposals((list) => [...list.filter((p) => !added.some((a) => a.id === p.id)), ...added]);

      for (const p of added) {
        extractCreditProfile(p.attachment, model)
          .then((data) => {
            patch(p.id, { status: 'ready', data, saved: data.collaterals.map(() => false) });
            void lookup(p.id, data);
          })
          .catch((err) => patch(p.id, { status: 'error', error: err instanceof Error ? err.message : 'AI không đọc được tệp.' }));
      }
    },
    [model, patch, lookup]
  );

  const editCustomer = useCallback((id: string, change: Partial<ExtractedCustomer>) => {
    setProposals((list) => list.map((p) => (p.id === id && p.data ? { ...p, data: { ...p.data, customer: { ...p.data.customer, ...change } } } : p)));
  }, []);

  const editCollateral = useCallback((id: string, index: number, change: Partial<ExtractedCollateral>) => {
    setProposals((list) =>
      list.map((p) =>
        p.id === id && p.data ? { ...p, data: { ...p.data, collaterals: p.data.collaterals.map((c, i) => (i === index ? { ...c, ...change } : c)) } } : p
      )
    );
  }, []);

  const removeCollateral = useCallback((id: string, index: number) => {
    setProposals((list) =>
      list.map((p) =>
        p.id === id && p.data && !p.saved[index]
          ? { ...p, data: { ...p.data, collaterals: p.data.collaterals.filter((_, i) => i !== index) }, saved: p.saved.filter((_, i) => i !== index) }
          : p
      )
    );
  }, []);

  const record = useCallback(
    async (id: string) => {
      const current = ref.current.find((p) => p.id === id);
      if (!current?.data || current.status === 'saving' || current.status === 'saved') return;

      const pending = current.data.collaterals.filter((_, i) => !current.saved[i]);
      const invalid = validateCreditIntake(current.data.customer, pending, matchedStates(current.match));
      if (invalid) {
        patch(id, { error: invalid });
        return;
      }

      patch(id, { status: 'saving', error: null, summary: null });
      try {
        const skip = new Set(current.saved.flatMap((s, i) => (s ? [i] : [])));
        const result = await recordCreditIntake({ customer: current.data.customer, collaterals: current.data.collaterals, skip });

        const saved = current.saved.slice();
        for (const o of result.collaterals) if (o.ok) saved[o.index] = true;
        const failed = result.collaterals.filter((o) => !o.ok);
        const created = result.collaterals.filter((o) => o.ok && o.action === 'created').length;
        const updated = result.collaterals.filter((o) => o.ok && o.action === 'updated').length;

        const parts = [
          result.customerAction === 'created'
            ? `Đã tạo khách hàng mới ${result.customerName}`
            : result.customerAction === 'updated'
              ? `Đã cập nhật khách hàng ${result.customerName} (điền thêm: ${result.filled.join(', ')})`
              : `Khách hàng ${result.customerName} đã có, không thay đổi`,
          created > 0 ? `${created} tài sản mới` : '',
          updated > 0 ? `${updated} tài sản cập nhật` : '',
        ].filter(Boolean);
        const summary = `${parts.join('; ')}.`;

        if (failed.length > 0) {
          const detail = failed.map((o) => `Tài sản ${o.index + 1}: ${o.error}`).join(' ');
          patch(id, { status: 'ready', saved, summary, error: `Chưa lưu được ${failed.length} tài sản. ${detail}` });
        } else {
          patch(id, { status: 'saved', saved, summary });
        }
        patch(id, { match: { state: 'found', customer: { Id: result.customerId, FullName: result.customerName } as Customer, by: current.match.by } });
        onRecorded?.();
      } catch (err) {
        patch(id, { status: 'ready', error: err instanceof Error ? err.message : 'Không ghi được hồ sơ.' });
      }
    },
    [patch, onRecorded]
  );

  const dismiss = useCallback((id: string) => {
    setProposals((list) => list.filter((p) => p.id !== id));
  }, []);

  return { proposals, propose, editCustomer, editCollateral, removeCollateral, lookup, record, dismiss };
}
