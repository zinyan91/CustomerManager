import { useCallback, useEffect, useRef, useState } from 'react';
import type { AiAttachment } from '../types/ai';
import { extractOfficialDocFields, type ExtractedDoc } from '../lib/ai/docExtract';
import { attachmentToFile, recordDocFromFile, resolveRecordTarget } from '../lib/officialDoc/recordFromAi';

export type ProposalStatus = 'reading' | 'ready' | 'saving' | 'saved' | 'error';

export interface DocProposal {
  id: string;
  attachment: AiAttachment;
  status: ProposalStatus;
  fields: ExtractedDoc | null;
  error: string | null;
}

interface Options {
  /** Chỉ admin được ghi nhận; tắt thì AI chỉ trả lời chữ như cũ. */
  enabled: boolean;
  model: string;
  onRecorded?: () => void;
}

/**
 * Đề xuất ghi nhận văn bản từ tệp gửi cho AI: AI đọc tệp, trích các trường, người dùng xem/sửa
 * rồi bấm ghi. AI không tự ghi vào CSDL: một thao tác xác nhận của admin là điều kiện bắt buộc.
 */
export function useAiDocProposals({ enabled, model, onRecorded }: Options) {
  const [proposals, setProposals] = useState<DocProposal[]>([]);
  const mounted = useRef(true);
  const proposalsRef = useRef<DocProposal[]>([]);
  proposalsRef.current = proposals;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const patch = useCallback((id: string, change: Partial<DocProposal>) => {
    if (!mounted.current) return;
    setProposals((list) => list.map((p) => (p.id === id ? { ...p, ...change } : p)));
  }, []);

  const propose = useCallback(
    (attachments: AiAttachment[]) => {
      if (!enabled || attachments.length === 0) return;
      const added: DocProposal[] = attachments.map((attachment) => ({
        id: `prop_${attachment.id}`,
        attachment,
        status: 'reading',
        fields: null,
        error: null,
      }));
      setProposals((list) => [...list.filter((p) => !added.some((a) => a.id === p.id)), ...added]);

      for (const p of added) {
        extractOfficialDocFields(p.attachment, model)
          .then((fields) => patch(p.id, { status: 'ready', fields }))
          .catch((err) =>
            patch(p.id, { status: 'error', error: err instanceof Error ? err.message : 'AI không đọc được tệp.' })
          );
      }
    },
    [enabled, model, patch]
  );

  const edit = useCallback(
    (id: string, change: Partial<ExtractedDoc>) => {
      setProposals((list) =>
        list.map((p) => (p.id === id && p.fields ? { ...p, fields: { ...p.fields, ...change } } : p))
      );
    },
    []
  );

  const record = useCallback(
    async (id: string) => {
      const current = proposalsRef.current.find((p) => p.id === id);
      if (!current?.fields || current.status === 'saving' || current.status === 'saved') return;
      patch(id, { status: 'saving', error: null });
      try {
        const target = await resolveRecordTarget();
        await recordDocFromFile({ file: attachmentToFile(current.attachment), fields: current.fields, target });
        patch(id, { status: 'saved' });
        onRecorded?.();
      } catch (err) {
        patch(id, { status: 'ready', error: err instanceof Error ? err.message : 'Không ghi nhận được văn bản.' });
      }
    },
    [patch, onRecorded]
  );

  const dismiss = useCallback((id: string) => {
    setProposals((list) => list.filter((p) => p.id !== id));
  }, []);

  return { proposals, propose, edit, record, dismiss };
}
