import { X } from 'lucide-react';
import type { HfAuth } from '../../types/huggingface';
import type { StorageRepo } from '../../types/storageRepo';
import { HfTokenSection } from './HfTokenSection';
import { StorageReposSection } from './StorageReposSection';

interface StorageSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  auth: HfAuth | null;
  repos: StorageRepo[];
  /** Gọi sau khi token hoặc danh sách repo đổi để nạp lại. */
  onChanged: () => void | Promise<void>;
}

/** Cấu hình kho lưu trữ: chỉ Master Admin mở được (nơi gọi quyết định). */
export function StorageSettingsModal({ isOpen, onClose, auth, repos, onChanged }: StorageSettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60" role="dialog" aria-modal="true" aria-label="Cấu hình kho lưu trữ">
      <div className="w-full max-w-3xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Cấu hình kho lưu trữ</h3>
          <button type="button" onClick={onClose} aria-label="Đóng" className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-6 overflow-y-auto">
          <section className="space-y-2">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase">Tài khoản Hugging Face</h4>
            <HfTokenSection auth={auth} onSaved={onChanged} />
          </section>

          <section className="space-y-2">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase">Danh sách repo</h4>
            <StorageReposSection auth={auth} repos={repos} onChanged={onChanged} />
          </section>
        </div>
      </div>
    </div>
  );
}
