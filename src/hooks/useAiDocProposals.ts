import { useCallback, useEffect, useRef, useState } from 'react';
import type { AiAttachment } from '../types/ai';
import type { OfficialDocFile } from '../types/officialDoc';
import { extractOfficialDocFields, type ExtractedDoc } from '../lib/ai/docExtract';
import { attachmentToFile, findFormFiles, recordDocFromFile, resolveRecordTarget } from '../lib/officialDoc/recordFromAi';

export type ProposalStatus = 'reading' | 'ready' | 'saving' | 'saved' | 'error';

export interface DocProposal {
  id: string;
  attachment: AiAttachment;
  /** Thư mục nén biểu mẫu người dùng gửi kèm; có thì không tự tra kho Biểu mẫu. */
  formZip: File | null;
  status: ProposalStatus;
  fields: ExtractedDoc | null;
  /** Biểu mẫu AI tự tìm thấy trong kho Biểu mẫu theo số hiệu; người dùng bỏ bớt được trước khi ghi. */
  formFiles: OfficialDocFile[];
  /** Đang tra kho Biểu mẫu. */
  searchingForms: boolean;
  /** Lý do chưa tra được biểu mẫu (chưa có kho, lỗi kết nối...); không chặn việc ghi văn bản. */
  formNote: string | null;
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
 * Gửi kèm thư mục nén thì nó thành biểu mẫu của văn bản; không kèm thì AI tự tra kho Biểu mẫu.
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

  const searchForms = useCallback(
    async (id: string, docNumber: string) => {
      patch(id, { searchingForms: true, formNote: null });
      try {
        const target = await resolveRecordTarget();
        const found = await findFormFiles(target, docNumber);
        patch(id, { searchingForms: false, formFiles: found.files, formNote: found.note });
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        patch(id, { searchingForms: false, formFiles: [], formNote: `Chưa tra được kho Biểu mẫu: ${reason}` });
      }
    },
    [patch]
  );

  const propose = useCallback(
    (attachments: AiAttachment[], formZip: File | null = null) => {
      if (!enabled || attachments.length === 0) return;
      const added: DocProposal[] = attachments.map((attachment) => ({
        id: `prop_${attachment.id}`,
        attachment,
        formZip,
        status: 'reading',
        fields: null,
        formFiles: [],
        searchingForms: false,
        formNote: null,
        error: null,
      }));
      setProposals((list) => [...list.filter((p) => !added.some((a) => a.id === p.id)), ...added]);

      for (const p of added) {
        extractOfficialDocFields(p.attachment, model)
          .then((fields) => {
            patch(p.id, { status: 'ready', fields });
            if (!p.formZip) void searchForms(p.id, fields.docNumber);
          })
          .catch((err) =>
            patch(p.id, { status: 'error', error: err instanceof Error ? err.message : 'AI không đọc được tệp.' })
          );
      }
    },
    [enabled, model, patch, searchForms]
  );

  const edit = useCallback(
    (id: string, change: Partial<ExtractedDoc>) => {
      setProposals((list) =>
        list.map((p) => (p.id === id && p.fields ? { ...p, fields: { ...p.fields, ...change } } : p))
      );
    },
    []
  );

  /** Bỏ một biểu mẫu AI đã tìm thấy khỏi danh sách sẽ gắn vào văn bản. */
  const removeForm = useCallback((id: string, file: OfficialDocFile) => {
    setProposals((list) =>
      list.map((p) =>
        p.id === id ? { ...p, formFiles: p.formFiles.filter((f) => !(f.repoId === file.repoId && f.path === file.path)) } : p
      )
    );
  }, []);

  /** Tra lại kho Biểu mẫu theo số hiệu hiện tại (sau khi người dùng sửa số hiệu). */
  const researchForms = useCallback(
    (id: string) => {
      const current = proposalsRef.current.find((p) => p.id === id);
      if (!current?.fields || current.formZip || current.searchingForms) return;
      void searchForms(id, current.fields.docNumber);
    },
    [searchForms]
  );

  const record = useCallback(
    async (id: string) => {
      const current = proposalsRef.current.find((p) => p.id === id);
      if (!current?.fields || current.status === 'saving' || current.status === 'saved') return;
      patch(id, { status: 'saving', error: null });
      try {
        const target = await resolveRecordTarget();
        await recordDocFromFile({
          file: attachmentToFile(current.attachment),
          fields: current.fields,
          target,
          formZip: current.formZip,
          formFiles: current.formFiles,
        });
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

  return { proposals, propose, edit, removeForm, researchForms, record, dismiss };
}
