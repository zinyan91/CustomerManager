import { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import type { OfficialDoc, OfficialDocFile } from '../../types/officialDoc';
import { computeStatus } from '../../lib/officialDoc/status';
import { categoryLabel } from '../../lib/officialDoc/categories';
import type { DispatchDocument } from '../../types/dispatch';
import { FILE_KINDS, FILE_KIND_LABELS, canViewInBrowser, docFileToPreviewDocument, groupFilesByKind } from '../../lib/officialDoc/docFiles';
import { downloadDocFile, downloadDocFilesZip } from '../../lib/officialDoc/docFileActions';
import { docFolderSlug } from '../../lib/officialDoc/docPaths';
import { bundleFileName } from '../../lib/officialDoc/formBundle';
import { fmtDate, todayIso } from '../../lib/utils';
import { OfficialDocStatusBadge } from './OfficialDocStatusBadge';
import { DispatchPreviewModal } from './DispatchPreviewModal';

interface OfficialDocDetailProps {
  doc: OfficialDoc | null;
  onClose: () => void;
}

const linkBtn = 'text-blue-700 dark:text-blue-400 hover:underline disabled:opacity-50 cursor-pointer';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{label}</div>
      <div className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 min-h-9">
        {children}
      </div>
    </div>
  );
}

export function OfficialDocDetail({ doc, onClose }: OfficialDocDetailProps) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<DispatchDocument | null>(null);

  if (!doc) return null;
  const groups = groupFilesByKind(doc.files);

  const downloadAll = async (files: OfficialDocFile[], kind: OfficialDocFile['kind']) => {
    setError(null);
    setBusyKey(`all/${kind}`);
    try {
      const name = kind === 'bieu-mau' ? bundleFileName(doc.docNumber) : `${docFolderSlug(doc.docNumber)}-van-ban-goc.zip`;
      await downloadDocFilesZip(files, name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được tệp.');
    } finally {
      setBusyKey(null);
    }
  };

  const downloadFile = async (file: OfficialDocFile) => {
    setError(null);
    setBusyKey(`${file.repoId}/${file.path}`);
    try {
      await downloadDocFile(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được tệp.');
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto bg-slate-900/60">
      <div role="dialog" aria-label="Xem văn bản" className="w-full max-w-4xl my-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Xem văn bản</h2>
          <button type="button" onClick={onClose} aria-label="Đóng" className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div role="alert" className="mx-6 mt-4 flex items-start gap-2 text-sm text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <div className="space-y-4">
            <Field label="Số hiệu">{doc.docNumber}</Field>
            <Field label="Tiêu đề">{doc.title}</Field>
            <Field label="Tình trạng">
              <OfficialDocStatusBadge status={computeStatus(doc.effectiveFrom, doc.effectiveTo, todayIso())} />
            </Field>

            {FILE_KINDS.map((kind) => (
              <div key={kind}>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{FILE_KIND_LABELS[kind]}</div>
                  {groups[kind].length > 1 && (
                    <button type="button" disabled={busyKey !== null} onClick={() => void downloadAll(groups[kind], kind)} className={`text-xs ${linkBtn}`}>
                      Tải tất cả (ZIP)
                    </button>
                  )}
                </div>
                {groups[kind].length === 0 ? (
                  <div className="text-sm text-slate-400">Chưa có tệp</div>
                ) : (
                  <ul className="space-y-1 text-sm list-disc pl-5">
                    {groups[kind].map((file) => (
                      <li key={`${file.repoId}/${file.path}`} className="break-all">
                        <span className="text-slate-900 dark:text-slate-100">{file.name}</span>
                        {' | '}
                        {canViewInBrowser(file.name) && (
                          <>
                            <button type="button" disabled={busyKey !== null} onClick={() => setPreview(docFileToPreviewDocument(doc, file))} className={linkBtn}>
                              Xem
                            </button>
                            {' | '}
                          </>
                        )}
                        <button type="button" disabled={busyKey !== null} onClick={() => void downloadFile(file)} className={linkBtn}>
                          Tải về
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <Field label="Mục">{categoryLabel(doc.category)}</Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Ngày ban hành">{fmtDate(doc.issuedDate)}</Field>
              <Field label="Ngày hiệu lực">{fmtDate(doc.effectiveFrom)}</Field>
              <Field label="Ngày hết hiệu lực">{fmtDate(doc.effectiveTo)}</Field>
            </div>
          </div>
        </div>
      </div>
    </div>
    <DispatchPreviewModal document={preview} isOpen={preview !== null} onClose={() => setPreview(null)} />
    </>
  );
}
